const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("RegistroVeicular", function () {
  let registroVeicular;
  let owner, manufacturer, dmv, mechanic, otherAccount;
  let MANUFACTURER_ROLE, DMV_ROLE, MECHANIC_ROLE;

  const now = () => Math.floor(Date.now() / 1000);
  const IBGE_SP = 3550308;
  const IBGE_RJ = 3304557;

  // WMIs de teste (3 chars, sem I/O/Q)
  const WMI_A = "MFG";
  const WMI_B = "ALT";

  // VINs válidos: 17 chars, sem I/O/Q, WMI correto
  const VIN_A1 = "MFGAAABBBR0000001";
  const VIN_A2 = "MFGAAABBBR0000002";
  const VIN_B1 = "ALTAAABBBR0000001";

  beforeEach(async function () {
    [owner, manufacturer, dmv, mechanic, otherAccount] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("RegistroVeicular");
    registroVeicular = await upgrades.deployProxy(Factory, [owner.address], {
      kind: "uups",
      initializer: "initialize",
    });

    MANUFACTURER_ROLE = await registroVeicular.MANUFACTURER_ROLE();
    DMV_ROLE          = await registroVeicular.DMV_ROLE();
    MECHANIC_ROLE     = await registroVeicular.MECHANIC_ROLE();

    // Usar registrarAtor para que o WMI fique gravado (necessário para validação de VIN)
    await registroVeicular.connect(owner).registrarAtor(manufacturer.address, "Montadora Teste", 0, WMI_A);
    await registroVeicular.connect(owner).registrarAtor(dmv.address,          "DETRAN Teste",    1, "");
    await registroVeicular.connect(owner).registrarAtor(mechanic.address,     "Oficina Teste",   2, "");
  });

  async function setupVeiculo(chassi = VIN_A1) {
    await registroVeicular.connect(manufacturer).addModelo("Corolla", 2023, 1);
    await registroVeicular.connect(manufacturer).addVeiculo(chassi, 0, now(), "Prata");
  }

  // ===== Deploy e Roles =====
  describe("Deploy e Roles", function () {
    it("deve conceder DEFAULT_ADMIN_ROLE ao deployer", async function () {
      const ADMIN = await registroVeicular.DEFAULT_ADMIN_ROLE();
      expect(await registroVeicular.hasRole(ADMIN, owner.address)).to.be.true;
    });

    it("deve conceder os papéis corretamente via registrarAtor", async function () {
      expect(await registroVeicular.hasRole(MANUFACTURER_ROLE, manufacturer.address)).to.be.true;
      expect(await registroVeicular.hasRole(DMV_ROLE,          dmv.address)).to.be.true;
      expect(await registroVeicular.hasRole(MECHANIC_ROLE,     mechanic.address)).to.be.true;
    });
  });

  // ===== Governança =====
  describe("Governança", function () {
    it("registrarAtor: registra e atribui role correta", async function () {
      await registroVeicular.connect(owner).registrarAtor(otherAccount.address, "Oficina X", 2, "");
      expect(await registroVeicular.hasRole(MECHANIC_ROLE, otherAccount.address)).to.be.true;
      const ator = await registroVeicular.atores(otherAccount.address);
      expect(ator.nome).to.equal("Oficina X");
      expect(ator.ativo).to.be.true;
    });

    it("registrarAtor: emite evento AtorRegistrado com WMI", async function () {
      await expect(registroVeicular.connect(owner).registrarAtor(otherAccount.address, "Oficina X", 2, ""))
        .to.emit(registroVeicular, "AtorRegistrado")
        .withArgs(otherAccount.address, "Oficina X", 2, "");
    });

    it("registrarAtor: grava WMI corretamente para montadora", async function () {
      const ator = await registroVeicular.atores(manufacturer.address);
      expect(ator.wmi).to.equal(WMI_A);
    });

    it("registrarAtor: WMI obrigatório para montadora — reverte se ausente", async function () {
      await expect(
        registroVeicular.connect(owner).registrarAtor(otherAccount.address, "Nova Montadora", 0, "")
      ).to.be.revertedWith("RegistroVeicular: WMI deve ter exatamente 3 caracteres para montadoras");
    });

    it("registrarAtor: WMI deve ter exatamente 3 chars — reverte com 2 chars", async function () {
      await expect(
        registroVeicular.connect(owner).registrarAtor(otherAccount.address, "Nova Montadora", 0, "AB")
      ).to.be.revertedWith("RegistroVeicular: WMI deve ter exatamente 3 caracteres para montadoras");
    });

    it("registrarAtor: não-montadora não precisa de WMI", async function () {
      await expect(
        registroVeicular.connect(owner).registrarAtor(otherAccount.address, "Seguradora X", 3, "")
      ).to.not.be.reverted;
    });

    it("revogarAtor: revoga e remove do array (swap-and-pop)", async function () {
      await registroVeicular.connect(owner).registrarAtor(otherAccount.address, "Oficina Y", 2, "");
      await registroVeicular.connect(owner).revogarAtor(otherAccount.address);

      expect((await registroVeicular.atores(otherAccount.address)).ativo).to.be.false;
      expect(await registroVeicular.hasRole(MECHANIC_ROLE, otherAccount.address)).to.be.false;

      const [enderecos] = await registroVeicular.getTodosAtores();
      expect(enderecos).to.not.include(otherAccount.address);
    });

    it("revogarAtor: falha se ator não existe", async function () {
      await expect(registroVeicular.connect(owner).revogarAtor(otherAccount.address))
        .to.be.revertedWith("RegistroVeicular: Ator nao esta ativo ou nao existe");
    });
  });

  // ===== Modelos e Veículos =====
  describe("Modelos e Veículos", function () {
    it("addModelo: emite ModeloAdicionado com todos os campos", async function () {
      await expect(registroVeicular.connect(manufacturer).addModelo("Civic", 2024, 1))
        .to.emit(registroVeicular, "ModeloAdicionado")
        .withArgs(0, "Civic", 2024, 1, manufacturer.address);
    });

    it("addModelo: conta não autorizada reverte", async function () {
      await expect(registroVeicular.connect(otherAccount).addModelo("Fusion", 2022, 1))
        .to.be.revertedWithCustomError(registroVeicular, "AccessControlUnauthorizedAccount");
    });

    it("addVeiculo: emite VeiculoAdicionado com todos os campos", async function () {
      await registroVeicular.connect(manufacturer).addModelo("Corolla", 2023, 1);
      const ts = now();
      await expect(registroVeicular.connect(manufacturer).addVeiculo(VIN_A1, 0, ts, "Branco"))
        .to.emit(registroVeicular, "VeiculoAdicionado")
        .withArgs(VIN_A1, 0, ts, "Branco", manufacturer.address);
    });

    it("addVeiculo: chassi duplicado reverte", async function () {
      await setupVeiculo(VIN_A1);
      await expect(registroVeicular.connect(manufacturer).addVeiculo(VIN_A1, 0, now(), "Azul"))
        .to.be.revertedWith("RegistroVeicular: Chassi ja registrado");
    });

    it("addVeiculo: montadora com WMI errado não pode registrar chassi de outra marca", async function () {
      await registroVeicular.connect(manufacturer).addModelo("Corolla", 2023, 1);
      await registroVeicular.connect(owner).registrarAtor(otherAccount.address, "Outra Montadora", 0, WMI_B);
      // otherAccount tem WMI_B mas tenta usar VIN com WMI_A
      await expect(
        registroVeicular.connect(otherAccount).addVeiculo(VIN_A1, 0, now(), "Azul")
      ).to.be.revertedWith("RegistroVeicular: WMI do chassi nao corresponde a esta montadora");
    });

    it("addVeiculo: WMI correto mas modelo de outra montadora reverte", async function () {
      await registroVeicular.connect(manufacturer).addModelo("Corolla", 2023, 1); // modelo 0 pertence a manufacturer
      await registroVeicular.connect(owner).registrarAtor(otherAccount.address, "Outra Montadora", 0, WMI_B);
      // otherAccount tem WMI_B correto para VIN_B1, mas modelo 0 pertence a manufacturer
      await expect(
        registroVeicular.connect(otherAccount).addVeiculo(VIN_B1, 0, now(), "Azul")
      ).to.be.revertedWith("RegistroVeicular: Apenas a montadora do modelo pode registrar o veiculo");
    });

    // ===== Validações de VIN =====
    describe("Validação de VIN (ISO 3779)", function () {
      beforeEach(async function () {
        await registroVeicular.connect(manufacturer).addModelo("Corolla", 2023, 1);
      });

      it("addVeiculo: chassis com menos de 17 chars reverte", async function () {
        await expect(
          registroVeicular.connect(manufacturer).addVeiculo("MFGAAA123", 0, now(), "Prata")
        ).to.be.revertedWith("RegistroVeicular: Chassi deve ter exatamente 17 caracteres");
      });

      it("addVeiculo: chassis com mais de 17 chars reverte", async function () {
        await expect(
          registroVeicular.connect(manufacturer).addVeiculo("MFGAAABBBR00000011", 0, now(), "Prata")
        ).to.be.revertedWith("RegistroVeicular: Chassi deve ter exatamente 17 caracteres");
      });

      it("addVeiculo: chassis com letra I reverte", async function () {
        await expect(
          registroVeicular.connect(manufacturer).addVeiculo("MFGAAIBBBR0000001", 0, now(), "Prata")
        ).to.be.revertedWith("RegistroVeicular: Chassi invalido: caracteres I, O e Q sao proibidos");
      });

      it("addVeiculo: chassis com letra O reverte", async function () {
        await expect(
          registroVeicular.connect(manufacturer).addVeiculo("MFGAAOBBBR0000001", 0, now(), "Prata")
        ).to.be.revertedWith("RegistroVeicular: Chassi invalido: caracteres I, O e Q sao proibidos");
      });

      it("addVeiculo: chassis com letra Q reverte", async function () {
        await expect(
          registroVeicular.connect(manufacturer).addVeiculo("MFGAAQBBBR0000001", 0, now(), "Prata")
        ).to.be.revertedWith("RegistroVeicular: Chassi invalido: caracteres I, O e Q sao proibidos");
      });

      it("addVeiculo: WMI não corresponde à montadora reverte", async function () {
        await expect(
          registroVeicular.connect(manufacturer).addVeiculo(VIN_B1, 0, now(), "Prata")
        ).to.be.revertedWith("RegistroVeicular: WMI do chassi nao corresponde a esta montadora");
      });

      it("addVeiculo: VIN válido é aceito", async function () {
        await expect(
          registroVeicular.connect(manufacturer).addVeiculo(VIN_A1, 0, now(), "Prata")
        ).to.emit(registroVeicular, "VeiculoAdicionado");
      });
    });

    it("veiculoExiste: retorna true/false corretamente", async function () {
      await setupVeiculo(VIN_A1);
      expect(await registroVeicular.veiculoExiste(VIN_A1)).to.be.true;
      expect(await registroVeicular.veiculoExiste("NAO_EXISTE")).to.be.false;
    });

    it("getVeiculo: retorna VeiculoInfo correto", async function () {
      await setupVeiculo(VIN_A1);
      const v = await registroVeicular.getVeiculo(VIN_A1);
      expect(v.assinatura_montadora).to.equal(manufacturer.address);
      expect(v.id_modelo).to.equal(0);
    });
  });

  // ===== Eventos de Histórico =====
  describe("Eventos de Histórico", function () {
    beforeEach(async function () {
      await setupVeiculo(VIN_A1);
    });

    it("addRegistroDono: emite evento com todos os campos", async function () {
      const ts = now();
      await expect(
        registroVeicular.connect(dmv).addRegistroDono(VIN_A1, otherAccount.address, ts, IBGE_SP, 1)
      ).to.emit(registroVeicular, "RegistroDonoAdicionado")
        .withArgs(VIN_A1, otherAccount.address, ts, IBGE_SP, 1, dmv.address);
    });

    it("addRegistroAcidente: emite evento com todos os campos", async function () {
      const ts = now();
      await expect(
        registroVeicular.connect(dmv).addRegistroAcidente(VIN_A1, ts, "Frontal", 2, true, false)
      ).to.emit(registroVeicular, "RegistroAcidenteAdicionado")
        .withArgs(VIN_A1, ts, "Frontal", 2, true, false, dmv.address);
    });

    it("addRegistroTitulo: emite evento com todos os campos", async function () {
      const ts = now();
      await expect(
        registroVeicular.connect(dmv).addRegistroTitulo(VIN_A1, ts, 3, "Recuperação de sinistro")
      ).to.emit(registroVeicular, "RegistroTituloAdicionado")
        .withArgs(VIN_A1, ts, 3, "Recuperação de sinistro", dmv.address);
    });

    it("addRegistroServico: emite evento com todos os campos", async function () {
      const ts = now();
      await expect(
        registroVeicular.connect(mechanic).addRegistroServico(VIN_A1, ts, "Troca de óleo", 0)
      ).to.emit(registroVeicular, "RegistroServicoAdicionado")
        .withArgs(VIN_A1, ts, 0, "Troca de óleo", mechanic.address);
    });

    it("addRegistroRecall: emite evento com todos os campos", async function () {
      const ts = now();
      await expect(
        registroVeicular.connect(manufacturer).addRegistroRecall(VIN_A1, ts, "REC-001", "Airbag defeituoso", false)
      ).to.emit(registroVeicular, "RegistroRecallAdicionado")
        .withArgs(VIN_A1, ts, "REC-001", "Airbag defeituoso", false, manufacturer.address);
    });

    it("addRegistroIdentificacao: emite evento com placa e cor", async function () {
      await expect(
        registroVeicular.connect(dmv).addRegistroIdentificacao(VIN_A1, "Prata", "ABC1D23")
      ).to.emit(registroVeicular, "RegistroIdentificacaoAdicionado");
    });

    it("addRegistroOdometro: aceita roles corretas e rejeita errada", async function () {
      const ts = now();
      await registroVeicular.connect(dmv).addRegistroOdometro(VIN_A1, ts, 10000);
      await registroVeicular.connect(manufacturer).addRegistroOdometro(VIN_A1, ts + 1, 11000);
      await registroVeicular.connect(mechanic).addRegistroOdometro(VIN_A1, ts + 2, 12000);

      await expect(
        registroVeicular.connect(otherAccount).addRegistroOdometro(VIN_A1, ts + 3, 13000)
      ).to.be.revertedWith("RegistroVeicular: Acesso negado");
    });

    it("addRegistroOdometro: quilometragem regressiva reverte", async function () {
      const ts = now();
      await registroVeicular.connect(mechanic).addRegistroOdometro(VIN_A1, ts, 50000);
      await expect(
        registroVeicular.connect(mechanic).addRegistroOdometro(VIN_A1, ts + 1, 40000)
      ).to.be.revertedWith("RegistroVeicular: A nova quilometragem deve ser maior que a anterior.");
    });

    it("getUltimaKm: retorna último odômetro registrado", async function () {
      const ts = now();
      await registroVeicular.connect(mechanic).addRegistroOdometro(VIN_A1, ts, 30000);
      await registroVeicular.connect(mechanic).addRegistroOdometro(VIN_A1, ts + 1, 35000);
      expect(await registroVeicular.getUltimaKm(VIN_A1)).to.equal(35000);
    });

    it("histórico em chassi inexistente reverte", async function () {
      await expect(
        registroVeicular.connect(dmv).addRegistroDono("NAO_EXISTE", otherAccount.address, now(), IBGE_SP, 1)
      ).to.be.revertedWith("RegistroVeicular: Chassi nao encontrado");
    });
  });
});
