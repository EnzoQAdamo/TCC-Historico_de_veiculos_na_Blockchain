// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract VehicleLedger is AccessControl {

    // --- Papéis de Controle de Acesso (Roles) ---
    // Define "quem" pode adicionar "o quê".
    bytes32 public constant DMV_ROLE = keccak256("DMV_ROLE"); // DETRAN ou entidade de trânsito
    bytes32 public constant MECHANIC_ROLE = keccak256("MECHANIC_ROLE"); // Oficinas e concessionárias
    bytes32 public constant INSURER_ROLE = keccak256("INSURER_ROLE"); // Seguradoras
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE"); // Fabricante

    // --- Enums para Eficiência de Gás ---
    // Usar números (enums) é vastamente mais barato que strings.

    enum VehicleStyle { UNKNOWN, SEDAN, SUV, HATCHBACK, TRUCK, COUPE, VAN, MOTORCYCLE }
    enum OwnerType { UNKNOWN, PERSONAL, COMMERCIAL, FLEET, RENTAL }
    enum TitleType { UNKNOWN, CLEAN, SALVAGE, REBUILT, FLOOD, FIRE, LEMON }
    enum ImpactSeverity { UNKNOWN, LOW, MEDIUM, HIGH, TOTAL_LOSS }

    // --- Estruturas de Dados (Structs) ---
    /**
     * @notice Dados estáticos de identificação do veículo.
     * Estes dados são definidos na criação do registro e raramente mudam.
     */
    struct VehicleIdentification {
        string brand;           // Marca (ex: "Toyota")
        string model;           // Modelo (ex: "Corolla")
        uint16 year;            // Ano (ex: 2023)
        string trimLevel;       // Nível de acabamento (ex: "XEi")
        VehicleStyle style;     // Estilo (ex: SEDAN)
        uint blockTimestamp;    // Quando este registro foi criado
    }

    /**
     * @notice Um registro de propriedade.
     * Mostra quem possuiu o veículo, por quanto tempo e como foi usado.
     */
    struct OwnerRecord {
        uint startDate;         // Data de início da propriedade (timestamp)
        uint endDate;           // Data de término (0 se for o proprietário atual)
        string stateRegistered; // Estado onde foi registrado (ex: "SP")
        OwnerType usageType;    // Tipo de uso (ex: PERSONAL)
        address reporter;       // A entidade (DMV_ROLE) que reportou
    }

    /**
     * @notice Um registro de acidente.
     * Reportado por seguradoras ou autoridades.
     */
    struct AccidentRecord {
        uint accidentDate;
        string location;        // Local/Ângulo (ex: "Colisão frontal esquerda")
        ImpactSeverity severity;
        bool airbagsDeployed;
        bool structuralDamage;
        address reporter;       // A entidade (INSURER_ROLE) que reportou
    }

    /**
     * @notice Um registro de status do título (documento).
     */
    struct TitleRecord {
        uint reportDate;
        TitleType titleType;    // O status (ex: REBUILT)
        string details;         // Detalhes (ex: "Dano por inundação reportado")
        address reporter;       // A entidade (DMV_ROLE) que reportou
    }

    /**
     * @notice Um registro de leitura do odômetro (quilometragem).
     */
    struct MileageRecord {
        uint reportDate;
        uint32 mileage;         // Quilometragem
        address reporter;       // A entidade (MECHANIC_ROLE ou DMV_ROLE)
    }

    /**
     * @notice Um registro de serviço ou manutenção.
     */
    struct ServiceRecord {
        uint serviceDate;
        uint32 mileage;         // Quilometragem no momento do serviço
        string serviceNotes;    // Descrição (ex: "Troca de óleo e filtro")
        address serviceProvider; // Endereço da oficina (MECHANIC_ROLE)
    }

    /**
     * @notice Um registro de recall do fabricante.
     */
    struct RecallRecord {
        uint recallDate;
        string recallId;        // ID do recall (ex: "NHTSA 23V-100")
        string description;
        bool isResolved;        // Se o reparo do recall foi efetuado
        address reporter;       // A entidade (MANUFACTURER_ROLE)
    }

    // --- Mapeamentos (Mappings) - O "Banco de Dados" On-Chain ---
    // O 'vin' (chassi) é a nossa chave primária.

    // Mapeia um VIN para seus dados de identificação estáticos
    mapping(string => VehicleIdentification) public vehicleStaticData;

    // Mapeia um VIN para um array (histórico) de seus proprietários
    mapping(string => OwnerRecord[]) public ownerHistory;

    // Mapeia um VIN para um array (histórico) de seus acidentes
    mapping(string => AccidentRecord[]) public accidentHistory;

    // Mapeia um VIN para um array (histórico) de seus títulos
    mapping(string => TitleRecord[]) public titleHistory;

    // Mapeia um VIN para um array (histórico) de suas leituras de quilometragem
    mapping(string => MileageRecord[]) public mileageHistory;

    // Mapeia um VIN para um array (histórico) de seus serviços
    mapping(string => ServiceRecord[]) public serviceHistory;

    // Mapeia um VIN para um array (histórico) de seus recalls
    mapping(string => RecallRecord[]) public recallHistory;

    // Mapeamento para verificar rapidamente se um VIN já foi registrado
    mapping(string => bool) public vehicleExists;

    // --- Eventos ---
    // Essenciais para que seu aplicativo frontend possa "ouvir" as mudanças.

    event VehicleRegistered(string indexed vin, string brand, string model, uint16 year);
    event OwnerRecordAdded(string indexed vin, uint startDate, OwnerType usageType);
    event AccidentRecordAdded(string indexed vin, uint accidentDate, ImpactSeverity severity);
    event TitleRecordAdded(string indexed vin, uint reportDate, TitleType titleType);
    event MileageRecordAdded(string indexed vin, uint reportDate, uint32 mileage);
    event ServiceRecordAdded(string indexed vin, uint serviceDate, string serviceNotes);
    event RecallRecordAdded(string indexed vin, string recallId, bool isResolved);


    // --- Construtor ---
    constructor() {
        // O "dono" do contrato (quem faz o deploy) recebe o papel de administrador.
        // Este admin é responsável por conceder os papéis (DMV_ROLE, etc.)
        // para os endereços das entidades parceiras (DETRANs, Oficinas, etc.).
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // --- Funções de Escrita (Write Functions) ---
    // Funções que modificam o estado. Elas custam gas e são protegidas por papéis.

    /**
     * @notice Registra um novo veículo no sistema.
     * @dev Apenas fabricantes ou DETRANs podem fazer o registro inicial.
     * @param _vin O número do chassi (Veicule Identification Number).
     * @param _brand A marca (ex: "Ford").
     * @param _model O modelo (ex: "Mustang").
     * @param _year O ano de fabricação.
     * @param _style O estilo (ex: COUPE).
     */
    function registerVehicle(
        string calldata _vin,
        string calldata _brand,
        string calldata _model,
        uint16 _year,
        VehicleStyle _style,
        string calldata _trimLevel
    ) external onlyRole(MANUFACTURER_ROLE) {
        require(!vehicleExists[_vin], "VehicleLedger: VIN already registered");

        vehicleStaticData[_vin] = VehicleIdentification({
            brand: _brand,
            model: _model,
            year: _year,
            trimLevel: _trimLevel,
            style: _style,
            blockTimestamp: block.timestamp
        });
        
        vehicleExists[_vin] = true;
        emit VehicleRegistered(_vin, _brand, _model, _year);
    }

    /**
     * @notice Adiciona um novo registro de proprietário.
     * @dev Tipicamente chamado por um DETRAN (DMV_ROLE) durante uma transferência.
     */
    function addOwnerRecord(
        string calldata _vin,
        uint _startDate,
        string calldata _stateRegistered,
        OwnerType _usageType
    ) external onlyRole(DMV_ROLE) {
        require(vehicleExists[_vin], "VehicleLedger: VIN not found");

        // Opcional: Logica para fechar o 'endDate' do proprietário anterior
        uint numOwners = ownerHistory[_vin].length;
        if (numOwners > 0) {
            ownerHistory[_vin][numOwners - 1].endDate = _startDate;
        }

        ownerHistory[_vin].push(OwnerRecord({
            startDate: _startDate,
            endDate: 0, // 0 = atual
            stateRegistered: _stateRegistered,
            usageType: _usageType,
            reporter: msg.sender
        }));

        emit OwnerRecordAdded(_vin, _startDate, _usageType);
    }

    /**
     * @notice Adiciona um novo registro de acidente.
     * @dev Apenas seguradoras (INSURER_ROLE) podem reportar.
     */
    function addAccidentRecord(
        string calldata _vin,
        uint _accidentDate,
        string calldata _location,
        ImpactSeverity _severity,
        bool _airbagsDeployed,
        bool _structuralDamage
    ) external onlyRole(INSURER_ROLE) {
        require(vehicleExists[_vin], "VehicleLedger: VIN not found");

        accidentHistory[_vin].push(AccidentRecord({
            accidentDate: _accidentDate,
            location: _location,
            severity: _severity,
            airbagsDeployed: _airbagsDeployed,
            structuralDamage: _structuralDamage,
            reporter: msg.sender
        }));

        emit AccidentRecordAdded(_vin, _accidentDate, _severity);
    }

    /**
     * @notice Adiciona um novo registro de serviço/manutenção.
     * @dev Apenas oficinas (MECHANIC_ROLE) podem reportar.
     */
    function addServiceRecord(
        string calldata _vin,
        uint _serviceDate,
        uint32 _mileage,
        string calldata _serviceNotes
    ) external onlyRole(MECHANIC_ROLE) {
        require(vehicleExists[_vin], "VehicleLedger: VIN not found");

        serviceHistory[_vin].push(ServiceRecord({
            serviceDate: _serviceDate,
            mileage: _mileage,
            serviceNotes: _serviceNotes,
            serviceProvider: msg.sender
        }));

        // Também podemos aproveitar para registrar a quilometragem
        addMileageRecord(_vin, _serviceDate, _mileage);

        emit ServiceRecordAdded(_vin, _serviceDate, _serviceNotes);
    }

    /**
     * @notice Adiciona um registro de quilometragem.
     * @dev Pode ser chamado por oficinas (MECHANIC_ROLE) ou DETRANs (DMV_ROLE).
     */
    function addMileageRecord(
        string calldata _vin,
        uint _reportDate,
        uint32 _mileage
    ) public {
        // Permitimos que Múltiplos papéis chamem esta função
        require(
            hasRole(MECHANIC_ROLE, msg.sender) || hasRole(DMV_ROLE, msg.sender),
            "VehicleLedger: Not authorized to report mileage"
        );
        require(vehicleExists[_vin], "VehicleLedger: VIN not found");

        // Opcional: Lógica para previnir fraude (ex: a nova quilometragem
        // não pode ser menor que a última registrada).
        uint len = mileageHistory[_vin].length;
        if (len > 0) {
            require(_mileage >= mileageHistory[_vin][len - 1].mileage, "VehicleLedger: Mileage rollback detected");
        }

        mileageHistory[_vin].push(MileageRecord({
            reportDate: _reportDate,
            mileage: _mileage,
            reporter: msg.sender
        }));

        emit MileageRecordAdded(_vin, _reportDate, _mileage);
    }

    // ... (Implementações similares para addTitleRecord e addRecallRecord) ...


    // --- Funções de Leitura (View Functions) ---
    // Funções "gratuitas" que apenas leem dados.

    /**
     * @notice Retorna o número total de donos que um veículo teve.
     */
    function getOwnerCount(string calldata _vin) external view returns (uint) {
        require(vehicleExists[_vin], "VehicleLedger: VIN not found");
        return ownerHistory[_vin].length;
    }

    /**
     * @notice Retorna o último status de título registrado para o veículo.
     */
    function getLatestTitle(string calldata _vin) external view returns (TitleRecord memory) {
        require(vehicleExists[_vin], "VehicleLedger: VIN not found");
        uint len = titleHistory[_vin].length;
        require(len > 0, "VehicleLedger: No title history");
        return titleHistory[_vin][len - 1];
    }
    
    /**
     * @notice Retorna a última quilometragem registrada.
     */
    function getLatestMileage(string calldata _vin) external view returns (MileageRecord memory) {
        require(vehicleExists[_vin], "VehicleLedger: VIN not found");
        uint len = mileageHistory[_vin].length;
        require(len > 0, "VehicleLedger: No mileage history");
        return mileageHistory[_vin][len - 1];
    }

    // NOTA: Os getters para os arrays completos (ex: getOwnerHistory)
    // são fornecidos gratuitamente pelo Solidity porque os mapeamentos são `public`.
    // Seu frontend pode simplesmente chamar `VehicleLedger.ownerHistory("VIN_DO_CARRO")`.
}