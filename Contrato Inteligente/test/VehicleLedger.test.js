// test/VehicleLedger.test.js

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VehicleLedger", function () {
    let VehicleLedger;
    let ledger; // Contrato "deployado"
    let owner, dmv, mechanic, insurer, manufacturer, user1; // Contas de teste

    // Constantes para os papéis (roles)
    let DMV_ROLE;
    let MECHANIC_ROLE;
    let INSURER_ROLE;
    let MANUFACTURER_ROLE;

    // Dados de teste
    const TEST_VIN = "1GKS19ED0F3123456";
    const BRAND = "Toyota";
    const MODEL = "Corolla";
    const YEAR = 2023;
    const STYLE = 1; // 1 = SEDAN (conforme enum)
    const TRIM = "XEi";

    // Hook `beforeEach` é executado antes de *cada* teste (`it` block)
    // Isso nos dá um contrato "limpo" para cada cenário de teste
    beforeEach(async function () {
        // 1. Obter as contas de teste do Hardhat
        [owner, dmv, mechanic, insurer, manufacturer, user1] = await ethers.getSigners();

        // 2. Fazer o deploy do contrato
        VehicleLedger = await ethers.getContractFactory("VehicleLedger");
        ledger = await VehicleLedger.deploy();
        
        // 3. Obter os hashes dos papéis (roles)
        DMV_ROLE = await ledger.DMV_ROLE();
        MECHANIC_ROLE = await ledger.MECHANIC_ROLE();
        INSURER_ROLE = await ledger.INSURER_ROLE();
        MANUFACTURER_ROLE = await ledger.MANUFACTURER_ROLE();

        // 4. Configurar as permissões (MUITO IMPORTANTE)
        // O 'owner' (dono do contrato) concede os papéis para as outras contas
        await ledger.connect(owner).grantRole(DMV_ROLE, dmv.address);
        await ledger.connect(owner).grantRole(MECHANIC_ROLE, mechanic.address);
        await ledger.connect(owner).grantRole(INSURER_ROLE, insurer.address);
        await ledger.connect(owner).grantRole(MANUFACTURER_ROLE, manufacturer.address);
    });

    // --- Cenário 1: Deploy e Configuração de Papéis ---
    describe("Deployment and Access Control", function () {
        it("Should set the right admin role to the deployer", async function () {
            const ADMIN_ROLE = await ledger.DEFAULT_ADMIN_ROLE();
            expect(await ledger.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
        });

        it("Should grant roles to partner accounts", async function () {
            expect(await ledger.hasRole(DMV_ROLE, dmv.address)).to.be.true;
            expect(await ledger.hasRole(MECHANIC_ROLE, mechanic.address)).to.be.true;
            expect(await ledger.hasRole(INSURER_ROLE, insurer.address)).to.be.true;
            expect(await ledger.hasRole(MANUFACTURER_ROLE, manufacturer.address)).to.be.true;
        });

        it("Should NOT grant roles to random users", async function () {
            expect(await ledger.hasRole(DMV_ROLE, user1.address)).to.be.false;
        });
    });

    // --- Cenário 2: Registro de Veículo ---
    describe("Vehicle Registration (registerVehicle)", function () {
        it("Should allow a MANUFACTURER to register a new vehicle", async function () {
            // Chama a função 'registerVehicle' conectado como a conta 'manufacturer'
            const tx = await ledger.connect(manufacturer).registerVehicle(
                TEST_VIN,
                BRAND,
                MODEL,
                YEAR,
                STYLE,
                TRIM
            );
            
            // Verifica se o evento foi emitido corretamente
            await expect(tx)
                .to.emit(ledger, "VehicleRegistered")
                .withArgs(TEST_VIN, BRAND, MODEL, YEAR);

            // Verifica se os dados estáticos foram salvos
            const data = await ledger.vehicleStaticData(TEST_VIN);
            expect(data.brand).to.equal(BRAND);
            expect(data.model).to.equal(MODEL);
            expect(data.year).to.equal(YEAR);
            expect(await ledger.vehicleExists(TEST_VIN)).to.be.true;
        });

        it("Should FAIL if a non-manufacturer tries to register a vehicle", async function () {
            // Espera-se que esta transação falhe (reverted)
            // A mensagem de erro é longa, vinda do AccessControl da OpenZeppelin
            await expect(
                ledger.connect(user1).registerVehicle(TEST_VIN, BRAND, MODEL, YEAR, STYLE, TRIM)
            ).to.be.reverted; // RevertedWith("AccessControl: account ... is missing role ...")
        });

        it("Should FAIL if registering a VIN that already exists", async function () {
            // Registra o veículo (caminho feliz)
            await ledger.connect(manufacturer).registerVehicle(TEST_VIN, BRAND, MODEL, YEAR, STYLE, TRIM);
            
            // Tenta registrar o *mesmo* VIN novamente
            await expect(
                ledger.connect(manufacturer).registerVehicle(TEST_VIN, "Outra", "Marca", 2000, 1, "Base")
            ).to.be.revertedWith("VehicleLedger: VIN already registered");
        });
    });

    // --- Cenário 3: Adição de Histórico (Proprietários, Serviços, Acidentes) ---
    describe("Adding Vehicle History Records", function () {
        
        // Antes de testar as adições, precisamos *sempre* ter um veículo registrado
        beforeEach(async function () {
            await ledger.connect(manufacturer).registerVehicle(TEST_VIN, BRAND, MODEL, YEAR, STYLE, TRIM);
        });

        it("Should allow DMV to add an owner record", async function () {
            const startDate = Math.floor(Date.now() / 1000); // Timestamp atual
            const state = "SP";
            const usageType = 1; // 1 = PERSONAL

            await ledger.connect(dmv).addOwnerRecord(TEST_VIN, startDate, state, usageType);

            const history = await ledger.ownerHistory(TEST_VIN);
            expect(history.length).to.equal(1);
            expect(history[0].stateRegistered).to.equal(state);
            expect(history[0].usageType).to.equal(usageType);
            expect(history[0].reporter).to.equal(dmv.address);
        });

        it("Should allow MECHANIC to add a service and mileage record", async function () {
            const serviceDate = Math.floor(Date.now() / 1000);
            const mileage = 15000;
            const notes = "Troca de oleo e filtro";

            await ledger.connect(mechanic).addServiceRecord(TEST_VIN, serviceDate, mileage, notes);

            // Verifica o histórico de serviço
            const serviceHistory = await ledger.serviceHistory(TEST_VIN);
            expect(serviceHistory.length).to.equal(1);
            expect(serviceHistory[0].serviceNotes).to.equal(notes);
            expect(serviceHistory[0].mileage).to.equal(mileage);

            // Verifica se a quilometragem também foi registrada (lógica interna do contrato)
            const mileageHistory = await ledger.mileageHistory(TEST_VIN);
            expect(mileageHistory.length).to.equal(1);
            expect(mileageHistory[0].mileage).to.equal(mileage);
        });

        it("Should allow INSURER to add an accident record", async function () {
            const accidentDate = Math.floor(Date.now() / 1000);
            const severity = 2; // 2 = MEDIUM

            await ledger.connect(insurer).addAccidentRecord(
                TEST_VIN,
                accidentDate,
                "Colisao frontal",
                severity,
                true, // airbags acionados
                false // sem dano estrutural
            );

            const history = await ledger.accidentHistory(TEST_VIN);
            expect(history.length).to.equal(1);
            expect(history[0].severity).to.equal(severity);
            expect(history[0].airbagsDeployed).to.be.true;
        });

        it("Should FAIL if a random user tries to add an owner record", async function () {
            const startDate = Math.floor(Date.now() / 1000);
            await expect(
                ledger.connect(user1).addOwnerRecord(TEST_VIN, startDate, "RJ", 1)
            ).to.be.reverted;
        });

        it("Should prevent mileage rollback", async function () {
            // Reporta a primeira quilometragem (ex: 15.000)
            await ledger.connect(mechanic).addServiceRecord(TEST_VIN, Math.floor(Date.now() / 1000), 15000, "Servico 1");

            // Tenta reportar uma quilometragem menor (ex: 10.000)
            await expect(
                ledger.connect(dmv).addMileageRecord(TEST_VIN, Math.floor(Date.now() / 1000) + 10, 10000)
            ).to.be.revertedWith("VehicleLedger: Mileage rollback detected");

            // Tenta reportar uma quilometragem maior (válido)
            await expect(
                ledger.connect(dmv).addMileageRecord(TEST_VIN, Math.floor(Date.now() / 1000) + 20, 16000)
            ).to.not.be.reverted;
        });
    });
});