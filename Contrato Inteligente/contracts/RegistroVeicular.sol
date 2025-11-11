// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract RegistroVeicular is AccessControl {

    // --- Papéis de Controle de Acesso (Roles) ---
    // Mantidos por enquanto, mas a lógica de "Atores" pode substituí-los.
    bytes32 public constant DMV_ROLE = keccak256("DMV_ROLE"); // DETRAN ou entidade de trânsito
    bytes32 public constant MECHANIC_ROLE = keccak256("MECHANIC_ROLE"); // Oficinas e concessionárias
    bytes32 public constant INSURER_ROLE = keccak256("INSURER_ROLE"); // Seguradoras
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE"); // Fabricante

    // --- Enums para Eficiência e Clareza ---

    enum PapelAtor { MONTADORA, AUTORIDADE, OFICINA, SEGURADORA }
    enum EstiloVeiculo { DESCONHECIDO, SEDAN, SUV, HATCHBACK, PICAPE, COUPE, VAN, MOTOCICLETA }
    enum TipoUso { DESCONHECIDO, PESSOAL, COMERCIAL, FROTA, ALUGUEL }
    enum GravidadeImpacto { DESCONHECIDA, BAIXA, MEDIA, ALTA, PERDA_TOTAL }
    enum TipoTitulo { DESCONHECIDO, LIMPO, LEILAO, RECONSTRUIDO, INUNDACAO, QUEIMADO }

    // --- Estruturas de Dados (Structs) ---

    struct Ator {
        string nome;        // Ex: "Oficina do João", "Porto Seguro", "Ford"
        PapelAtor papel;    // O tipo do ator
    }

    struct Modelo {
        string modelo;              // Nome do modelo (ex: "Corolla")
        uint16 ano;                 // Ano do modelo
        EstiloVeiculo estilo;       // Estilo do veículo
        address assinatura_marca;   // Endereço da montadora
    }

    struct Veiculo {
        uint id_modelo;             // ID do modelo que o carro pertence
        uint data_fabricacao;       // Data de fabricação (timestamp)
        address assinatura_montadora; // Assinatura da montadora
    }

    struct RegistroDono {
        address dono;               // Endereço do proprietário do veículo
        uint data_comeco;           // Data que comprou o carro
        string estado_registrado;   // Estado de registro (ex: "SP")
        TipoUso tipo_uso;           // Tipo de uso do veículo
        address assinatura_reportador; // Quem reportou a mudança
    }

    struct RegistroAcidente {
        uint data;                  // Data do acidente
        string local;               // Local onde foi batido
        GravidadeImpacto gravidade; // Gravidade da batida
        bool airbags_acionados;     // Se o airbag foi acionado
        bool dano_estrutural;       // Se houve dano estrutural
        address assinatura_reportador; // Quem reportou
    }

    struct RegistroTitulo {
        uint data;                  // Data da alteração do título
        TipoTitulo tipo_titulo;     // O novo tipo do título
        string detalhes;            // Detalhes adicionais
        address assinatura_reportador; // Quem reportou
    }

    struct RegistroOdometro {
        uint data;                  // Data da marcação
        uint32 quilometragem;       // Quilometragem do veículo
        address assinatura_reportador; // Quem reportou
    }

    struct RegistroServico {
        uint data;                  // Data do serviço
        string descricao;           // Descrição do serviço
        address assinatura_oficina; // Assinatura da oficina
    }

    struct RegistroRecall {
        uint data;                  // Data da inclusão do recall
        string recall_id;           // ID oficial do recall
        string descricao;           // Descrição do recall
        bool resolvido;             // Se o recall foi resolvido
        address assinatura_montadora; // Assinatura da montadora
    }

    struct RegistroIdentificacao {
        string cor;                 // Cor do carro
        string placa;               // Placa do carro
        address assinatura_reportador; // Quem reportou a identificação
    }

    // --- Mapeamentos (Mappings) - O "Banco de Dados" On-Chain ---

    // Mapeia um endereço para um Ator registrado
    mapping(address => Ator) public atores;

    // Mapeia um ID para um Modelo de veículo
    mapping(uint => Modelo) public modelos; 
    uint public proximoIdModelo; // Contador para gerar IDs de modelo

    // Mapeia um chassi para os dados do Veículo
    mapping(string => Veiculo) public veiculos;

    // Mapeia um chassi para seus históricos
    mapping(string => RegistroDono[]) public historicoDonos;
    mapping(string => RegistroAcidente[]) public historicoAcidentes;
    mapping(string => RegistroTitulo[]) public historicoTitulos;
    mapping(string => RegistroOdometro[]) public odometro;
    mapping(string => RegistroServico[]) public historicoServicos;
    mapping(string => RegistroRecall[]) public historicoRecall;
    mapping(string => RegistroIdentificacao[]) public historicoIdentificacao;

    // Mapeamento para verificar rapidamente se um chassi já foi registrado
    mapping(string => bool) public veiculoExiste;

    // --- Eventos ---
    event ModeloAdicionado(uint indexed id_modelo, string modelo, uint16 ano, address indexed assinatura_marca);
    event VeiculoAdicionado(string indexed chassi, uint indexed id_modelo, address indexed assinatura_montadora);
    event RegistroDonoAdicionado(string indexed chassi, address indexed novo_dono, uint data_comeco, address indexed assinatura_reportador);
    event RegistroAcidenteAdicionado(string indexed chassi, uint data, GravidadeImpacto gravidade, address indexed assinatura_reportador);
    event RegistroTituloAdicionado(string indexed chassi, uint data, TipoTitulo tipo_titulo, address indexed assinatura_reportador);
    event RegistroOdometroAdicionado(string indexed chassi, uint data, uint32 quilometragem, address indexed assinatura_reportador);
    event RegistroServicoAdicionado(string indexed chassi, uint data, address indexed assinatura_oficina);
    event RegistroRecallAdicionado(string indexed chassi, string recall_id, bool resolvido, address indexed assinatura_montadora);
    event RegistroIdentificacaoAdicionado(string indexed chassi, string placa, string cor, address indexed assinatura_reportador);

    // --- Construtor ---
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // --- Funções de Escrita ---
    
    // Apenas uma conta com MANUFACTURER_ROLE pode chamar esta função.
    function addModelo(string calldata _modelo, uint16 _ano, EstiloVeiculo _estilo) external onlyRole(MANUFACTURER_ROLE) {
        uint id = proximoIdModelo;
        modelos[id] = Modelo({
            modelo: _modelo,
            ano: _ano,
            estilo: _estilo,
            assinatura_marca: msg.sender
        });
        proximoIdModelo++;
        emit ModeloAdicionado(id, _modelo, _ano, msg.sender);
    }

    // Apenas a mesma conta MANUFACTURER_ROLE que registrou o modelo pode registrar o veículo.
    function addVeiculo(string calldata _chassi, uint _id_modelo, uint _data_fabricacao) external onlyRole(MANUFACTURER_ROLE) {
        require(!veiculoExiste[_chassi], "RegistroVeicular: Chassi ja registrado");
        require(modelos[_id_modelo].assinatura_marca != address(0), "RegistroVeicular: Modelo nao encontrado");
        require(modelos[_id_modelo].assinatura_marca == msg.sender, "RegistroVeicular: Apenas a montadora do modelo pode registrar o veiculo");

        veiculos[_chassi] = Veiculo({
            id_modelo: _id_modelo,
            data_fabricacao: _data_fabricacao,
            assinatura_montadora: msg.sender
        });
        veiculoExiste[_chassi] = true;
        emit VeiculoAdicionado(_chassi, _id_modelo, msg.sender);
    }

    // Apenas DMV_ROLE pode chamar. Se for uma transferência, atualiza o dono anterior.
    function addRegistroDono(
        string calldata _chassi,
        address _novo_dono,
        uint _data_registro,
        string calldata _estado_registrado,
        TipoUso _tipo_uso
    ) external onlyRole(DMV_ROLE) {
        require(veiculoExiste[_chassi], "RegistroVeicular: Chassi nao encontrado");
        // Adiciona o novo dono ao histórico.
        historicoDonos[_chassi].push(RegistroDono({
            dono: _novo_dono,
            data_comeco: _data_registro,
            estado_registrado: _estado_registrado,
            tipo_uso: _tipo_uso,
            assinatura_reportador: msg.sender
        }));

        emit RegistroDonoAdicionado(_chassi, _novo_dono, _data_registro, msg.sender);
    }

    // Apenas uma conta com DMV_ROLE pode chamar esta função.
    function addRegistroAcidente(string calldata _chassi, uint _data, string calldata _local, GravidadeImpacto _gravidade, bool _airbags_acionados, bool _dano_estrutural) external onlyRole(DMV_ROLE) {
        require(veiculoExiste[_chassi], "RegistroVeicular: Chassi nao encontrado");
        historicoAcidentes[_chassi].push(RegistroAcidente({
            data: _data,
            local: _local,
            gravidade: _gravidade,
            airbags_acionados: _airbags_acionados,
            dano_estrutural: _dano_estrutural,
            assinatura_reportador: msg.sender
        }));
        emit RegistroAcidenteAdicionado(_chassi, _data, _gravidade, msg.sender);
    }

    // Apenas uma conta com DMV_ROLE pode chamar esta função.
    function addRegistroTitulo(string calldata _chassi, uint _data, TipoTitulo _tipo_titulo, string calldata _detalhes) external onlyRole(DMV_ROLE) {
        require(veiculoExiste[_chassi], "RegistroVeicular: Chassi nao encontrado");
        historicoTitulos[_chassi].push(RegistroTitulo({
            data: _data,
            tipo_titulo: _tipo_titulo,
            detalhes: _detalhes,
            assinatura_reportador: msg.sender
        }));
        emit RegistroTituloAdicionado(_chassi, _data, _tipo_titulo, msg.sender);
    }

    // Contas com DMV_ROLE, MANUFACTURER_ROLE ou MECHANIC_ROLE podem chamar.
    function addRegistroOdometro(string calldata _chassi, uint _data, uint32 _quilometragem) external {
        require(
            hasRole(DMV_ROLE, msg.sender) ||
            hasRole(MANUFACTURER_ROLE, msg.sender) ||
            hasRole(MECHANIC_ROLE, msg.sender),
            "RegistroVeicular: Acesso negado"
        );
        require(veiculoExiste[_chassi], "RegistroVeicular: Chassi nao encontrado");

        // Verifica se a quilometragem é maior que a última registrada
        if (odometro[_chassi].length > 0) {
            RegistroOdometro storage ultimoOdometro = odometro[_chassi][odometro[_chassi].length - 1];
            require(_quilometragem > ultimoOdometro.quilometragem, "RegistroVeicular: A nova quilometragem deve ser maior que a anterior.");
        }

        odometro[_chassi].push(RegistroOdometro({
            data: _data,
            quilometragem: _quilometragem,
            assinatura_reportador: msg.sender
        }));
        emit RegistroOdometroAdicionado(_chassi, _data, _quilometragem, msg.sender);
    }

    // Apenas uma conta com MECHANIC_ROLE pode chamar.
    function addRegistroServico(string calldata _chassi, uint _data, string calldata _descricao) external onlyRole(MECHANIC_ROLE) {
        require(veiculoExiste[_chassi], "RegistroVeicular: Chassi nao encontrado");
        historicoServicos[_chassi].push(RegistroServico({
            data: _data,
            descricao: _descricao,
            assinatura_oficina: msg.sender
        }));
        emit RegistroServicoAdicionado(_chassi, _data, msg.sender);
    }

    // Apenas uma conta com MANUFACTURER_ROLE pode chamar.
    function addRegistroRecall(string calldata _chassi, uint _data, string calldata _recall_id, string calldata _descricao, bool _resolvido) external onlyRole(MANUFACTURER_ROLE) {
        require(veiculoExiste[_chassi], "RegistroVeicular: Chassi nao encontrado");
        historicoRecall[_chassi].push(RegistroRecall({
            data: _data,
            recall_id: _recall_id,
            descricao: _descricao,
            resolvido: _resolvido,
            assinatura_montadora: msg.sender
        }));
        emit RegistroRecallAdicionado(_chassi, _recall_id, _resolvido, msg.sender);
    }

    // Apenas uma conta com DMV_ROLE pode chamar.
    function addRegistroIdentificacao(string calldata _chassi, string calldata _cor, string calldata _placa) external onlyRole(DMV_ROLE) {
        require(veiculoExiste[_chassi], "RegistroVeicular: Chassi nao encontrado");
        historicoIdentificacao[_chassi].push(RegistroIdentificacao({
            cor: _cor,
            placa: _placa,
            assinatura_reportador: msg.sender
        }));
        emit RegistroIdentificacaoAdicionado(_chassi, _placa, _cor, msg.sender);
    }

    // --- Funções de Leitura ---

    // Retorna o registro de odômetro mais recente.
    function getOdometro(string calldata _chassi) external view returns (RegistroOdometro memory) {
        require(veiculoExiste[_chassi], "RegistroVeicular: Chassi nao encontrado");
        require(odometro[_chassi].length > 0, "RegistroVeicular: Nenhum registro de odometro encontrado");
        return odometro[_chassi][odometro[_chassi].length - 1];
    }

    // Retorna o registro do dono atual.
    function getDonoAtual(string calldata _chassi) external view returns (RegistroDono memory) {
        require(veiculoExiste[_chassi], "RegistroVeicular: Chassi nao encontrado");
        require(historicoDonos[_chassi].length > 0, "RegistroVeicular: Nenhum registro de dono encontrado");
        // O dono atual é o último registro na lista.
        return historicoDonos[_chassi][historicoDonos[_chassi].length - 1];
    }

    // Retorna um array com todos os registros de donos.
    function getHistoricoDonos(string calldata _chassi) external view returns (RegistroDono[] memory) {
        require(veiculoExiste[_chassi], "RegistroVeicular: Chassi nao encontrado");
        return historicoDonos[_chassi];
    }

    // Retorna um array de todos os registros de acidentes.
    function getHistoricoAcidentes(string calldata _chassi) external view returns (RegistroAcidente[] memory) {
        require(veiculoExiste[_chassi], "RegistroVeicular: Chassi nao encontrado");
        return historicoAcidentes[_chassi];
    }

    // Retorna o registro de título mais recente.
    function getTituloAtual(string calldata _chassi) external view returns (RegistroTitulo memory) {
        require(veiculoExiste[_chassi], "RegistroVeicular: Chassi nao encontrado");
        require(historicoTitulos[_chassi].length > 0, "RegistroVeicular: Nenhum registro de titulo encontrado");
        return historicoTitulos[_chassi][historicoTitulos[_chassi].length - 1];
    }

    // Retorna um array de todos os registros de serviço.
    function getHistoricoServicos(string calldata _chassi) external view returns (RegistroServico[] memory) {
        require(veiculoExiste[_chassi], "RegistroVeicular: Chassi nao encontrado");
        return historicoServicos[_chassi];
    }

    // Retorna um array de todos os registros de recall.
    function getHistoricoRecall(string calldata _chassi) external view returns (RegistroRecall[] memory) {
        require(veiculoExiste[_chassi], "RegistroVeicular: Chassi nao encontrado");
        return historicoRecall[_chassi];
    }

    // Retorna o registro de identificação mais recente.
    function getIdentificacao(string calldata _chassi) external view returns (RegistroIdentificacao memory) {
        require(veiculoExiste[_chassi], "RegistroVeicular: Chassi nao encontrado");
        require(historicoIdentificacao[_chassi].length > 0, "RegistroVeicular: Nenhum registro de identificacao encontrado");
        return historicoIdentificacao[_chassi][historicoIdentificacao[_chassi].length - 1];
    }

    // Retorna um array de todos os modelos da montadora.
    function getModelosPorMontadora(address _montadora) external view returns (Modelo[] memory) {
        uint count = 0;
        for (uint i = 0; i < proximoIdModelo; i++) {
            if (modelos[i].assinatura_marca == _montadora) {
                count++;
            }
        }

        // Preencher o array com os modelos encontrados.
        Modelo[] memory resultado = new Modelo[](count);
        uint index = 0;
        for (uint i = 0; i < proximoIdModelo; i++) {
            if (modelos[i].assinatura_marca == _montadora) {
                resultado[index] = modelos[i];
                index++;
            }
        }

        return resultado;
    }
}