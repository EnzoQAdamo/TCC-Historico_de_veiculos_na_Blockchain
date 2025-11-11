const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RegistroVeicular", function () {
  let registroVeicular;
  let owner, manufacturer, dmv, mechanic, otherAccount;
  let MANUFACTURER_ROLE, DMV_ROLE, MECHANIC_ROLE;

  // Prepara o ambiente antes de cada teste
  beforeEach(async function () {
    // Obtém as contas do Hardhat
    [owner, manufacturer, dmv, mechanic, otherAccount] = await ethers.getSigners();

    // Faz o deploy de um novo contrato
    const RegistroVeicularFactory = await ethers.getContractFactory("RegistroVeicular");
    registroVeicular = await RegistroVeicularFactory.deploy();
    
    // Obtém os hashes dos Atores
    MANUFACTURER_ROLE = await registroVeicular.MANUFACTURER_ROLE();
    DMV_ROLE = await registroVeicular.DMV_ROLE();
    MECHANIC_ROLE = await registroVeicular.MECHANIC_ROLE();

    // Concede os papéis para as Atores de teste
    await registroVeicular.connect(owner).grantRole(MANUFACTURER_ROLE, manufacturer.address);
    await registroVeicular.connect(owner).grantRole(DMV_ROLE, dmv.address);
    await registroVeicular.connect(owner).grantRole(MECHANIC_ROLE, mechanic.address);
  });

  // Descreve o teste para os Atores
  describe("Deployment e Roles", function () {
    it("Deve conceder o DEFAULT_ADMIN_ROLE ao deployer", async function () {
      const ADMIN_ROLE = await registroVeicular.DEFAULT_ADMIN_ROLE();
      expect(await registroVeicular.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Deve conceder os papéis corretamente", async function () {
      expect(await registroVeicular.hasRole(MANUFACTURER_ROLE, manufacturer.address)).to.be.true;
      expect(await registroVeicular.hasRole(DMV_ROLE, dmv.address)).to.be.true;
      expect(await registroVeicular.hasRole(MECHANIC_ROLE, mechanic.address)).to.be.true;
    });
  });

  // Descreva os teste para funções de escrita
  describe("Funções de Escrita", function () {
    const chassi = "123456789ABCDEFGH";
    const idModelo = 0;

    beforeEach(async function() {
      // Adiciona um modelo e um veículo base para os testes de registros
      await registroVeicular.connect(manufacturer).addModelo("Corolla", 2023, 1 /* SEDAN */);
      await registroVeicular.connect(manufacturer).addVeiculo(chassi, idModelo, Date.now());
    });
    
    // Teste de insersão de novo Modelo
    it("addModelo: Montadora deve adicionar um modelo e emitir evento", async function () {
      await expect(registroVeicular.connect(manufacturer).addModelo("Civic", 2024, 1))
        .to.emit(registroVeicular, "ModeloAdicionado")
        .withArgs(1, "Civic", 2024, manufacturer.address);
    });

    // Teste de insersão de Modelo com Ator errado
    it("addModelo: Conta não autorizada não deve adicionar um modelo", async function () {
      await expect(registroVeicular.connect(otherAccount).addModelo("Fusion", 2022, 1))
        .to.be.revertedWithCustomError(registroVeicular, "AccessControlUnauthorizedAccount");
    });

    // Teste de insersão de um Veiculo novo com o Modelo acima
    it("addVeiculo: Montadora correta deve adicionar um veículo", async function () {
        const novoChassi = "987654321ZYXWVUTSR";
        await expect(registroVeicular.connect(manufacturer).addVeiculo(novoChassi, idModelo, Date.now()))
            .to.emit(registroVeicular, "VeiculoAdicionado")
            .withArgs(novoChassi, idModelo, manufacturer.address);
    });

    // Teste de insersão de um Veiculo com Ator errado
    it("addVeiculo: Conta não autorizada não deve adicionar um veículo", async function () {
        const novoChassi = "987654321ZYXWVUTSR";
        await expect(registroVeicular.connect(otherAccount).addVeiculo(novoChassi, idModelo, Date.now()))
            .to.be.revertedWithCustomError(registroVeicular, "AccessControlUnauthorizedAccount");
    });

    it("addVeiculo: Montadora incorreta não deve adicionar veículo com modelo de outra montadora", async function () {
        const novoChassi = "OUTROCHASSI12345";
        const manufacturer2 = otherAccount; // Usar otherAccount como a segunda montadora
        await registroVeicular.connect(owner).grantRole(MANUFACTURER_ROLE, manufacturer2.address);

        // manufacturer (primeira montadora) já adicionou o modelo 0 ("Corolla") no beforeEach
        // manufacturer2 tenta adicionar um veículo usando o modelo 0 (que pertence a manufacturer)
        await expect(registroVeicular.connect(manufacturer2).addVeiculo(novoChassi, idModelo, Date.now()))
            .to.be.revertedWith("RegistroVeicular: Apenas a montadora do modelo pode registrar o veiculo");
    });

    // Teste de insersão de um Dono
    it("addRegistroDono: DMV deve adicionar o primeiro registro de dono", async function () {
      const dataComeco = Math.floor(Date.now() / 1000);
      const primeiroDono = otherAccount;

      await expect(registroVeicular.connect(dmv).addRegistroDono(chassi, primeiroDono.address, dataComeco, "SP", 1 /* PESSOAL */))
        .to.emit(registroVeicular, "RegistroDonoAdicionado")
        .withArgs(chassi, primeiroDono.address, dataComeco, dmv.address);
      
      const donoAtual = await registroVeicular.getDonoAtual(chassi);
      expect(donoAtual.dono).to.equal(primeiroDono.address);
    });

    // Teste de insersão de um segundo Dono
    it("addRegistroDono: Deve registrar um segundo dono (transferência)", async function () {
      const primeiroDono = otherAccount;
      const segundoDono = owner;
      const dataPrimeiroRegistro = Math.floor(Date.now() / 1000);
      const dataTransferencia = dataPrimeiroRegistro + 1000;

      // 1. Adiciona o primeiro dono
      await registroVeicular.connect(dmv).addRegistroDono(chassi, primeiroDono.address, dataPrimeiroRegistro, "SP", 1);

      // 2. Adiciona o segundo dono
      await registroVeicular.connect(dmv).addRegistroDono(chassi, segundoDono.address, dataTransferencia, "RJ", 2);

      // 3. Verifica se o novo dono atual é o segundo dono
      const novoDonoAtual = await registroVeicular.getDonoAtual(chassi);
      expect(novoDonoAtual.dono).to.equal(segundoDono.address);
      expect(novoDonoAtual.data_comeco).to.equal(dataTransferencia);

      // 4. Verifica o histórico de donos
      const historico = await registroVeicular.getHistoricoDonos(chassi);
      expect(historico.length).to.equal(2);
      expect(historico[0].dono).to.equal(primeiroDono.address);
      expect(historico[1].dono).to.equal(segundoDono.address);
    });

    // Teste de insersão de um Dono com o Ator errado
    it("addRegistroDono: Conta não autorizada não deve adicionar registro de dono", async function () {
      const dataComeco = Math.floor(Date.now() / 1000);
      await expect(registroVeicular.connect(otherAccount).addRegistroDono(chassi, otherAccount.address, dataComeco, "SP", 1))
        .to.be.revertedWithCustomError(registroVeicular, "AccessControlUnauthorizedAccount");
    });

    // Teste de insersão de registro de odometro
    it("addRegistroOdometro: Múltiplos papéis devem poder adicionar registro", async function () {
        const data = Math.floor(Date.now() / 1000);
        await registroVeicular.connect(dmv).addRegistroOdometro(chassi, data, 10000);
        await registroVeicular.connect(manufacturer).addRegistroOdometro(chassi, data + 1, 11000);
        await registroVeicular.connect(mechanic).addRegistroOdometro(chassi, data + 2, 12000);
    });

    // Teste de insersão de registro de odometro com Km menor e igual a atual
    it("addRegistroOdometro: Deve falhar se a nova quilometragem for menor ou igual", async function () {
      const data = Math.floor(Date.now() / 1000);
      await registroVeicular.connect(mechanic).addRegistroOdometro(chassi, data, 50000);

      // Tenta adicionar quilometragem menor
      await expect(registroVeicular.connect(mechanic).addRegistroOdometro(chassi, data + 1, 49000))
        .to.be.revertedWith("RegistroVeicular: A nova quilometragem deve ser maior que a anterior.");

      // Tenta adicionar quilometragem igual
      await expect(registroVeicular.connect(mechanic).addRegistroOdometro(chassi, data + 2, 50000))
        .to.be.revertedWith("RegistroVeicular: A nova quilometragem deve ser maior que a anterior.");
    });

    // Teste de insersão de registro de odometro com Ator errado
    it("addRegistroOdometro: Conta não autorizada não deve adicionar registro", async function () {
        await expect(registroVeicular.connect(otherAccount).addRegistroOdometro(chassi, Date.now(), 10000))
            .to.be.revertedWith("RegistroVeicular: Acesso negado");
    });
  });

  describe("Funções de Leitura", function () {
    const chassi = "123456789ABCDEFGH";
    const idModelo = 0;

    beforeEach(async function() {
      // Adiciona um modelo e um veículo base
      await registroVeicular.connect(manufacturer).addModelo("Corolla", 2023, 1 /* SEDAN */);
      await registroVeicular.connect(manufacturer).addVeiculo(chassi, idModelo, Math.floor(Date.now() / 1000));
    });

    // Teste da busca do Odometro com duas entradas
    it("getOdometro: Deve retornar o odômetro mais recente", async function () {
      const data = Math.floor(Date.now() / 1000);
      await registroVeicular.connect(mechanic).addRegistroOdometro(chassi, data, 50000);
      await registroVeicular.connect(mechanic).addRegistroOdometro(chassi, data + 1, 55000);

      const odometro = await registroVeicular.getOdometro(chassi);
      expect(odometro.quilometragem).to.equal(55000);
      expect(odometro.data).to.equal(data + 1);
    });

    // Teste da busca do Odometro vazio 
    it("getOdometro: Deve falhar se não houver registros", async function () {
        await expect(registroVeicular.getOdometro(chassi))
            .to.be.revertedWith("RegistroVeicular: Nenhum registro de odometro encontrado");
    });

    // Teste da busca do Dono atual
    it("getDonoAtual: Deve retornar o dono mais recente após uma transferência", async function () {
      const primeiroDono = otherAccount;
      const segundoDono = owner;
      const dataPrimeiroRegistro = Math.floor(Date.now() / 1000);
      const dataTransferencia = dataPrimeiroRegistro + 1000;

      await registroVeicular.connect(dmv).addRegistroDono(chassi, primeiroDono.address, dataPrimeiroRegistro, "SP", 1);
      await registroVeicular.connect(dmv).addRegistroDono(chassi, segundoDono.address, dataTransferencia, "RJ", 2);

      const dono = await registroVeicular.getDonoAtual(chassi);
      expect(dono.dono).to.equal(segundoDono.address);
      expect(dono.estado_registrado).to.equal("RJ");
    });

    // Teste da busca do historico de acidentes
    it("getHistoricoAcidentes: Deve retornar todos os acidentes", async function () {
      await registroVeicular.connect(dmv).addRegistroAcidente(chassi, Date.now(), "Av. Paulista", 2, true, false);
      await registroVeicular.connect(dmv).addRegistroAcidente(chassi, Date.now() + 1, "Av. Faria Lima", 3, true, true);

      const acidentes = await registroVeicular.getHistoricoAcidentes(chassi);
      expect(acidentes.length).to.equal(2);
      expect(acidentes[1].gravidade).to.equal(3); // GravidadeImpacto.ALTA
    });

    // Teste da busca do historico de titulos
    it("getTituloAtual: Deve retornar o título mais recente", async function () {
        await registroVeicular.connect(dmv).addRegistroTitulo(chassi, Date.now(), 1, "Título limpo inicial");
        await registroVeicular.connect(dmv).addRegistroTitulo(chassi, Date.now() + 1, 2, "Veículo foi a leilão");

        const titulo = await registroVeicular.getTituloAtual(chassi);
        expect(titulo.tipo_titulo).to.equal(2); // TipoTitulo.LEILAO
        expect(titulo.detalhes).to.equal("Veículo foi a leilão");
    });

    // Teste da busca do historico de serviços
    it("getHistoricoServicos: Deve retornar todos os serviços", async function () {
        await registroVeicular.connect(mechanic).addRegistroServico(chassi, Date.now(), "Troca de oleo");
        await registroVeicular.connect(mechanic).addRegistroServico(chassi, Date.now() + 1, "Troca de pastilhas de freio");

        const servicos = await registroVeicular.getHistoricoServicos(chassi);
        expect(servicos.length).to.equal(2);
        expect(servicos[0].descricao).to.equal("Troca de oleo");
    });

    // Teste da busca dos modelos da montadora
    it("getModelosPorMontadora: Deve retornar apenas os modelos da montadora especificada", async function () {
        // manufacturer já tem o modelo "Corolla" do beforeEach
        await registroVeicular.connect(manufacturer).addModelo("Hilux", 2023, 4 /* PICAPE */);

        // Configura uma segunda montadora
        const manufacturer2 = otherAccount;
        await registroVeicular.connect(owner).grantRole(MANUFACTURER_ROLE, manufacturer2.address);
        await registroVeicular.connect(manufacturer2).addModelo("Civic", 2022, 1 /* SEDAN */);

        // Busca modelos da primeira montadora
        const modelosMan1 = await registroVeicular.getModelosPorMontadora(manufacturer.address);
        expect(modelosMan1.length).to.equal(2);
        expect(modelosMan1[0].modelo).to.equal("Corolla");
        expect(modelosMan1[1].modelo).to.equal("Hilux");

        // Busca modelos da segunda montadora
        const modelosMan2 = await registroVeicular.getModelosPorMontadora(manufacturer2.address);
        expect(modelosMan2.length).to.equal(1);
        expect(modelosMan2[0].modelo).to.equal("Civic");

        // Busca modelos de uma conta sem modelos
        const modelosMan3 = await registroVeicular.getModelosPorMontadora(dmv.address);
        expect(modelosMan3.length).to.equal(0);
    });
  });
});
