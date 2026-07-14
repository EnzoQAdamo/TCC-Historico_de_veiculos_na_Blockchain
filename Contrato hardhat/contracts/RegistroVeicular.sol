// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * Arquitetura híbrida: contrato guarda estado mínimo para validação de escrita.
 * Todo histórico vive nos event logs (imutáveis on-chain) e é indexado off-chain.
 * Gas ~80% mais barato por registro vs armazenar strings em storage.
 */
contract RegistroVeicular is Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    // --- Roles ---
    bytes32 public constant DMV_ROLE          = keccak256("DMV_ROLE");
    bytes32 public constant MECHANIC_ROLE     = keccak256("MECHANIC_ROLE");
    bytes32 public constant INSURER_ROLE      = keccak256("INSURER_ROLE");
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant DEALER_ROLE       = keccak256("DEALER_ROLE");

    // --- Enums ---
    enum PapelAtor        { MONTADORA, AUTORIDADE, OFICINA, SEGURADORA, CONCESSIONARIA }
    enum EstiloVeiculo    { DESCONHECIDO, SEDAN, SUV, HATCHBACK, PICAPE, COUPE, VAN, MOTOCICLETA }
    enum TipoUso          { DESCONHECIDO, PESSOAL, COMERCIAL, FROTA, ALUGUEL }
    enum GravidadeImpacto { DESCONHECIDA, BAIXA, MEDIA, ALTA, PERDA_TOTAL }
    enum TipoTitulo       { DESCONHECIDO, LIMPO, LEILAO, RECONSTRUIDO, INUNDACAO, QUEIMADO }
    enum TipoServico      { PREVENTIVA, CORRETIVA, SINISTRO, REVISAO, RECALL, OUTROS }

    // --- Estado mínimo on-chain (só o necessário para validar escritas) ---

    struct Ator {
        string    nome;
        PapelAtor papel;
        bool      ativo;
        string    wmi;   // Código WMI ISO 3779 (3 chars) — obrigatório para MONTADORA
    }

    // slot 1: address(20) + uint48(6) = 26 bytes
    // slot 2: uint(32)
    struct VeiculoInfo {
        address assinatura_montadora;
        uint48  data_fabricacao;
        uint    id_modelo;
    }

    mapping(address => Ator)    public atores;
    address[]                   public enderecosAtores;
    mapping(address => uint)    private _atorIndex;

    mapping(uint => address)    private _modeloMontadora;  // id_modelo → montadora
    uint                        public  proximoIdModelo;

    mapping(bytes32 => VeiculoInfo) private _veiculos;        // keccak256(chassi) → info
    mapping(bytes32 => uint32)      private _ultimaKm;        // último odômetro para checagem monotônica

    // --- Eventos ricos — fonte de verdade para o indexador off-chain ---

    // Governança
    event AtorRegistrado(address indexed conta, string nome, PapelAtor papel, string wmi);
    event AtorRevogado(address indexed conta);

    // Modelos e veículos
    event ModeloAdicionado(
        uint indexed id_modelo,
        string       modelo,
        uint16       ano,
        EstiloVeiculo estilo,
        address indexed assinatura_marca
    );
    event VeiculoAdicionado(
        string  chassi,
        uint indexed id_modelo,
        uint48  data_fabricacao,
        string  cor,
        address indexed assinatura_montadora
    );

    // Histórico (todos os dados vão no evento — zero storage extra)
    event RegistroDonoAdicionado(
        string  chassi,
        address indexed novo_dono,
        uint48  data_comeco,
        uint32  localidade_id,
        TipoUso tipo_uso,
        address indexed assinatura_reportador
    );
    event RegistroAcidenteAdicionado(
        string  chassi,
        uint48  data,
        string  local,
        GravidadeImpacto gravidade,
        bool    airbags_acionados,
        bool    dano_estrutural,
        address indexed assinatura_reportador
    );
    event RegistroTituloAdicionado(
        string  chassi,
        uint48  data,
        TipoTitulo tipo_titulo,
        string  detalhes,
        address indexed assinatura_reportador
    );
    event RegistroOdometroAdicionado(
        string  chassi,
        uint48  data,
        uint32  quilometragem,
        address indexed assinatura_reportador
    );
    event RegistroServicoAdicionado(
        string  chassi,
        uint48  data,
        TipoServico tipo,
        string  descricao,
        address indexed assinatura_oficina
    );
    event RegistroRecallAdicionado(
        string  chassi,
        uint48  data,
        string  recall_id,
        string  descricao,
        bool    resolvido,
        address indexed assinatura_montadora
    );
    event RegistroIdentificacaoAdicionado(
        string  chassi,
        uint48  data,
        string  cor,
        string  placa,
        address indexed assinatura_reportador
    );

    // --- UUPS ---
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address _admin) external initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        atores[_admin] = Ator("Sistema Admin", PapelAtor.AUTORIDADE, true, "");
        enderecosAtores.push(_admin);
        _atorIndex[_admin] = 0;
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // --- Helpers ---

    function _key(string calldata chassi) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(chassi));
    }

    function veiculoExiste(string calldata chassi) public view returns (bool) {
        return _veiculos[_key(chassi)].assinatura_montadora != address(0);
    }

    modifier onlyOdometroRole() {
        require(
            hasRole(DMV_ROLE, msg.sender) ||
            hasRole(MANUFACTURER_ROLE, msg.sender) ||
            hasRole(MECHANIC_ROLE, msg.sender),
            "RegistroVeicular: Acesso negado"
        );
        _;
    }

    // Valida as 3 regras do VIN ISO 3779 que cabem no contrato (baratas em gas):
    // 1) exatamente 17 caracteres
    // 2) sem I, O e Q (proibidos pela norma)
    // 3) WMI do chassi bate com o WMI registrado da montadora
    function _validarVIN(bytes memory chassiBytes) internal view {
        require(chassiBytes.length == 17, "RegistroVeicular: Chassi deve ter exatamente 17 caracteres");

        for (uint i = 0; i < chassiBytes.length; i++) {
            require(
                chassiBytes[i] != 'I' && chassiBytes[i] != 'O' && chassiBytes[i] != 'Q',
                "RegistroVeicular: Chassi invalido: caracteres I, O e Q sao proibidos"
            );
        }

        bytes memory wmi = bytes(atores[msg.sender].wmi);
        require(
            wmi.length == 3 &&
            chassiBytes[0] == wmi[0] &&
            chassiBytes[1] == wmi[1] &&
            chassiBytes[2] == wmi[2],
            "RegistroVeicular: WMI do chassi nao corresponde a esta montadora"
        );
    }

    // --- Governança ---

    function registrarAtor(
        address _conta,
        string calldata _nome,
        PapelAtor _papel,
        string calldata _wmi
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bytes(_nome).length > 0, "RegistroVeicular: Nome obrigatorio");

        if (_papel == PapelAtor.MONTADORA) {
            require(bytes(_wmi).length == 3, "RegistroVeicular: WMI deve ter exatamente 3 caracteres para montadoras");
        }

        if (bytes(atores[_conta].nome).length == 0) {
            _atorIndex[_conta] = enderecosAtores.length;
            enderecosAtores.push(_conta);
        }

        atores[_conta] = Ator(_nome, _papel, true, _papel == PapelAtor.MONTADORA ? _wmi : "");

        if      (_papel == PapelAtor.MONTADORA)      _grantRole(MANUFACTURER_ROLE, _conta);
        else if (_papel == PapelAtor.AUTORIDADE)      _grantRole(DMV_ROLE, _conta);
        else if (_papel == PapelAtor.OFICINA)         _grantRole(MECHANIC_ROLE, _conta);
        else if (_papel == PapelAtor.SEGURADORA)      _grantRole(INSURER_ROLE, _conta);
        else if (_papel == PapelAtor.CONCESSIONARIA)  _grantRole(DEALER_ROLE, _conta);

        emit AtorRegistrado(_conta, _nome, _papel, _papel == PapelAtor.MONTADORA ? _wmi : "");
    }

    function revogarAtor(address _conta) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(atores[_conta].ativo, "RegistroVeicular: Ator nao esta ativo ou nao existe");

        atores[_conta].ativo = false;

        _revokeRole(MANUFACTURER_ROLE, _conta);
        _revokeRole(DMV_ROLE, _conta);
        _revokeRole(MECHANIC_ROLE, _conta);
        _revokeRole(INSURER_ROLE, _conta);
        _revokeRole(DEALER_ROLE, _conta);

        uint idx  = _atorIndex[_conta];
        uint last = enderecosAtores.length - 1;
        if (idx != last) {
            address lastAddr = enderecosAtores[last];
            enderecosAtores[idx] = lastAddr;
            _atorIndex[lastAddr] = idx;
        }
        enderecosAtores.pop();
        delete _atorIndex[_conta];

        emit AtorRevogado(_conta);
    }

    function getTodosAtores() external view returns (address[] memory, Ator[] memory) {
        uint total = enderecosAtores.length;
        Ator[] memory lista = new Ator[](total);
        for (uint i = 0; i < total; i++) {
            lista[i] = atores[enderecosAtores[i]];
        }
        return (enderecosAtores, lista);
    }

    // --- Escrita ---

    function addModelo(
        string calldata _modelo,
        uint16 _ano,
        EstiloVeiculo _estilo
    ) external onlyRole(MANUFACTURER_ROLE) {
        uint id = proximoIdModelo;
        _modeloMontadora[id] = msg.sender;
        proximoIdModelo++;
        emit ModeloAdicionado(id, _modelo, _ano, _estilo, msg.sender);
    }

    function addVeiculo(
        string calldata _chassi,
        uint    _id_modelo,
        uint48  _data_fabricacao,
        string calldata _cor
    ) external onlyRole(MANUFACTURER_ROLE) {
        bytes memory chassiBytes = bytes(_chassi);
        _validarVIN(chassiBytes);

        bytes32 key = _key(_chassi);
        require(_veiculos[key].assinatura_montadora == address(0), "RegistroVeicular: Chassi ja registrado");
        require(_modeloMontadora[_id_modelo] != address(0),         "RegistroVeicular: Modelo nao encontrado");
        require(_modeloMontadora[_id_modelo] == msg.sender,         "RegistroVeicular: Apenas a montadora do modelo pode registrar o veiculo");

        _veiculos[key] = VeiculoInfo({
            assinatura_montadora: msg.sender,
            data_fabricacao:      _data_fabricacao,
            id_modelo:            _id_modelo
        });
        emit VeiculoAdicionado(_chassi, _id_modelo, _data_fabricacao, _cor, msg.sender);
    }

    function addRegistroDono(
        string calldata _chassi,
        address _novo_dono,
        uint48  _data_registro,
        uint32  _localidade_id,
        TipoUso _tipo_uso
    ) external onlyRole(DMV_ROLE) {
        require(veiculoExiste(_chassi), "RegistroVeicular: Chassi nao encontrado");
        emit RegistroDonoAdicionado(_chassi, _novo_dono, _data_registro, _localidade_id, _tipo_uso, msg.sender);
    }

    function addRegistroAcidente(
        string calldata _chassi,
        uint48  _data,
        string calldata _local,
        GravidadeImpacto _gravidade,
        bool _airbags_acionados,
        bool _dano_estrutural
    ) external onlyRole(DMV_ROLE) {
        require(veiculoExiste(_chassi), "RegistroVeicular: Chassi nao encontrado");
        emit RegistroAcidenteAdicionado(_chassi, _data, _local, _gravidade, _airbags_acionados, _dano_estrutural, msg.sender);
    }

    function addRegistroTitulo(
        string calldata _chassi,
        uint48  _data,
        TipoTitulo _tipo_titulo,
        string calldata _detalhes
    ) external onlyRole(DMV_ROLE) {
        require(veiculoExiste(_chassi), "RegistroVeicular: Chassi nao encontrado");
        emit RegistroTituloAdicionado(_chassi, _data, _tipo_titulo, _detalhes, msg.sender);
    }

    function addRegistroOdometro(
        string calldata _chassi,
        uint48  _data,
        uint32  _quilometragem
    ) external onlyOdometroRole {
        bytes32 key = _key(_chassi);
        require(_veiculos[key].assinatura_montadora != address(0), "RegistroVeicular: Chassi nao encontrado");
        require(_quilometragem > _ultimaKm[key], "RegistroVeicular: A nova quilometragem deve ser maior que a anterior.");

        _ultimaKm[key] = _quilometragem;
        emit RegistroOdometroAdicionado(_chassi, _data, _quilometragem, msg.sender);
    }

    function addRegistroServico(
        string calldata _chassi,
        uint48  _data,
        string calldata _descricao,
        TipoServico _tipo
    ) external onlyRole(MECHANIC_ROLE) {
        require(veiculoExiste(_chassi), "RegistroVeicular: Chassi nao encontrado");
        emit RegistroServicoAdicionado(_chassi, _data, _tipo, _descricao, msg.sender);
    }

    function addManutencao(
        string calldata _chassi,
        uint48  _data,
        uint32  _quilometragem,
        string calldata _descricao,
        TipoServico _tipo
    ) external onlyRole(MECHANIC_ROLE) {
        bytes32 key = _key(_chassi);
        require(_veiculos[key].assinatura_montadora != address(0), "RegistroVeicular: Chassi nao encontrado");
        require(_quilometragem > _ultimaKm[key], "RegistroVeicular: A nova quilometragem deve ser maior que a anterior.");

        _ultimaKm[key] = _quilometragem;
        emit RegistroOdometroAdicionado(_chassi, _data, _quilometragem, msg.sender);
        emit RegistroServicoAdicionado(_chassi, _data, _tipo, _descricao, msg.sender);
    }

    function addRegistroRecall(
        string calldata _chassi,
        uint48  _data,
        string calldata _recall_id,
        string calldata _descricao,
        bool _resolvido
    ) external onlyRole(MANUFACTURER_ROLE) {
        require(veiculoExiste(_chassi), "RegistroVeicular: Chassi nao encontrado");
        emit RegistroRecallAdicionado(_chassi, _data, _recall_id, _descricao, _resolvido, msg.sender);
    }

    function addRegistroIdentificacao(
        string calldata _chassi,
        string calldata _cor,
        string calldata _placa
    ) external onlyRole(DMV_ROLE) {
        require(veiculoExiste(_chassi), "RegistroVeicular: Chassi nao encontrado");
        emit RegistroIdentificacaoAdicionado(_chassi, uint48(block.timestamp), _cor, _placa, msg.sender);
    }

    // --- Leitura (estado mínimo on-chain) ---

    function getVeiculo(string calldata _chassi) external view returns (VeiculoInfo memory) {
        bytes32 key = _key(_chassi);
        require(_veiculos[key].assinatura_montadora != address(0), "RegistroVeicular: Chassi nao encontrado");
        return _veiculos[key];
    }

    function getUltimaKm(string calldata _chassi) external view returns (uint32) {
        return _ultimaKm[_key(_chassi)];
    }

    function getModeloMontadora(uint _id_modelo) external view returns (address) {
        return _modeloMontadora[_id_modelo];
    }
}
