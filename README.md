# RegistroVeicular — Rastreamento de Histórico Veicular com Blockchain

> Trabalho de Conclusão de Curso (TCC) — Sistema descentralizado de registro e rastreamento de histórico veicular, inspirado no DETRAN, construído sobre Ethereum com arquitetura híbrida blockchain + banco de dados off-chain.

**Demo ao vivo:** [tcc.eqadamo.dev.br](https://tcc.eqadamo.dev.br)  
**Contrato Sepolia:** [`0xA6f280215d40b3674fCaCbB844fDE59B87A3bBF1`](https://sepolia.etherscan.io/address/0xA6f280215d40b3674fCaCbB844fDE59B87A3bBF1)

---

## Sobre o Projeto

Atores com papéis distintos (Admin, Montadora, DETRAN, Oficina, Seguradora, Concessionária) interagem com um único contrato Solidity. Todo evento — transferência de propriedade, acidente, revisão, recall — é gravado imutavelmente na blockchain via _event logs_. Um listener Node.js indexa esses eventos em um banco PostgreSQL (Supabase) para consultas rápidas e busca por placa ou cidade.

### Por que arquitetura híbrida?

| Aspecto | Só blockchain | Híbrido (blockchain + Supabase) |
|---|---|---|
| Escrita | Imutável, auditável | Imutável, auditável |
| Leitura | Lenta, cara em produção | Rápida, SQL, filtrável |
| Busca por placa | Impossível sem indexar | `SELECT * WHERE placa = 'ABC1234'` |
| Integridade | Garantida pelo contrato | Verificável: hash on-chain = hash off-chain |

---

## Papéis e Painéis

| Role | Painel | Permissões |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | AdminPanel | Registrar e revogar atores |
| `MANUFACTURER_ROLE` | ManufacturerPanel | Cadastrar modelos e veículos |
| `DMV_ROLE` | DMVPanel | Transferência de propriedade, acidentes, títulos, identificação |
| `MECHANIC_ROLE` | WorkshopPanel | Odômetro e registros de serviço |
| `DEALER_ROLE` | DealerPanel | Consulta de histórico (somente leitura) |
| `INSURER_ROLE` | InsurancePanel | Histórico e score de risco (somente leitura) |
| — | PublicSearch | Busca pública sem autenticação |

---

## Stack

| Camada | Tecnologias |
|---|---|
| Smart Contract | Solidity 0.8.20, OpenZeppelin v5 (AccessControl UUPS upgradeable) |
| Blockchain | Ethereum Sepolia (testnet) / Hardhat (local) |
| Listener | Node.js + Ethers.js v6 + Supabase JS |
| Banco off-chain | PostgreSQL via Supabase |
| Frontend | React 18, Vite, TypeScript 5.5, Tailwind CSS |
| Web3 | Ethers.js v6, MetaMask |
| Extras | jsPDF (relatórios), QRCode, Lucide icons |

---

## Screenshots

| Consulta Pública | Painel Admin |
|---|---|
| ![Consulta Pública](Imagens/ConsultaPublica.png) | ![Painel Admin](Imagens/PainelAdmin.png) |

| Painel Montadora | Painel DETRAN |
|---|---|
| ![Painel Montadora](Imagens/PainelMontadora.png) | ![Painel DETRAN](Imagens/PainelDETRAN.png) |

| Painel Oficina | Acesso Negado |
|---|---|
| ![Painel Oficina](Imagens/PainelOficina.png) | ![Acesso Negado](Imagens/AcessoNegado.png) |

---

## Pré-requisitos

- Node.js 18+
- MetaMask instalado no navegador
- Docker (apenas para Supabase local)
- Supabase CLI (apenas para desenvolvimento local)

---

## 1. Ambiente Local (Hardhat + Supabase local)

### Instalar dependências

```bash
cd "Contrato hardhat" && npm install
cd ../Front-end && npm install
cd ../listener && npm install
```

### Passo a passo (4 terminais)

**Terminal 1 — Blockchain local**
```bash
cd "Contrato hardhat"
npx hardhat node
```
Deixe rodando. A rede sobe em `http://127.0.0.1:8545` (Chain ID: 31337).

**Terminal 2 — Deploy e seed**
```bash
cd "Contrato hardhat"
npx hardhat run scripts/deployAndSeed.js --network localhost
```
Anote o endereço do contrato impresso e atualize:
- `Front-end/.env.development` → `VITE_CONTRACT_ADDRESS=0x...`
- `listener/.env` → `CONTRACT_ADDRESS=0x...`

**Terminal 3 — Supabase local**
```bash
# Subir os containers
~/.local/bin/supabase start

# Primeira vez: criar as tabelas
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f listener/schema.sql

# Indexar eventos históricos e ficar ouvindo novos blocos
cd listener
node index.js --replay
```

**Terminal 4 — Frontend**
```bash
cd Front-end
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173).

### MetaMask — rede local

| Campo | Valor |
|---|---|
| Nome da rede | Hardhat Local |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Símbolo | ETH |

Importe as contas de teste usando as chaves privadas impressas pelo `npx hardhat node`. Após o seed, os papéis ficam assim:

| Conta (índice) | Papel |
|---|---|
| 0 | Admin |
| 1 | Montadora |
| 2 | DETRAN |
| 3 | Oficina |
| 4 | Seguradora |
| 5 | Concessionária |

> **Dica:** se o MetaMask exibir erro de "Nonce incorreto", vá em **Configurações → Avançado → Limpar dados de atividade da aba**.

---

## 2. Testnet Sepolia (deploy público)

### Pré-requisitos extras

- ETH Sepolia na conta Admin — faucets: [sepoliafaucet.com](https://sepoliafaucet.com) · [alchemy.com/faucets/ethereum-sepolia](https://www.alchemy.com/faucets/ethereum-sepolia)
- Conta no [Alchemy](https://www.alchemy.com) para RPC de escrita
- Projeto no [Supabase](https://supabase.com) (plano gratuito é suficiente)

### Configurar variáveis de ambiente

```bash
cp "Contrato hardhat/.env.example" "Contrato hardhat/.env"
cp listener/.env.example listener/.env
cp Front-end/.env.example Front-end/.env.sepolia
```

**`Contrato hardhat/.env`**
```env
DEPLOYER_PRIVATE_KEY=chave_privada_do_admin
MONTADORA_PRIVATE_KEY=chave_privada_da_montadora
DETRAN_PRIVATE_KEY=chave_privada_do_detran
OFICINA_PRIVATE_KEY=chave_privada_da_oficina

SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/SUA_KEY
CONTRACT_ADDRESS=   # preencher após o deploy
```

**`listener/.env`**
```env
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
CONTRACT_ADDRESS=0x...
SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
DEPLOY_BLOCK=       # bloco do deploy (ver no Etherscan)
```

**`Front-end/.env.sepolia`**
```env
VITE_CONTRACT_ADDRESS=0x...
VITE_CHAIN_ID=11155111
VITE_RPC_FALLBACK=https://ethereum-sepolia-rpc.publicnode.com
VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

> O frontend usa a chave **anon** (acesso limitado por RLS). O listener usa a chave **secret** (acesso total). Nunca coloque a secret no frontend.

### Deploy e seed

```bash
# Compilar
cd "Contrato hardhat"
npx hardhat compile

# Deploy + registrar os atores
npx hardhat run scripts/deploy.js --network sepolia

# Equalizar saldos ETH entre as contas
npx hardhat run scripts/rebalance.js --network sepolia

# Popular dados de teste
npx hardhat run scripts/seed.js --network sepolia
```

Atualize `CONTRACT_ADDRESS` nos três arquivos `.env` com o endereço impresso.

### Indexar e manter o listener

```bash
cd listener
node index.js --replay   # sincroniza histórico; fica ouvindo novos blocos
```

### Iniciar o frontend

```bash
cd Front-end
npm run dev:sepolia      # aponta para Sepolia + Supabase online
```

### MetaMask — Sepolia

Vá em **Configurações → Avançado → Mostrar redes de teste** e selecione **Sepolia**. Conecte com cada conta para acessar o painel correspondente ao papel dela.

### Verificar o contrato no Etherscan (recomendado)

```bash
# Adicione no .env: ETHERSCAN_API_KEY=SUA_KEY
npx hardhat verify --network sepolia 0xENDERECO_DO_CONTRATO
```

---

## Veículos de Teste (seed)

Use estes chassis na **Busca Pública** ou nos painéis para testar diferentes cenários:

| Chassi | Placa | Modelo | Cenário |
|---|---|---|---|
| `9BWZZZ377RT000001` | GHT7A21 | Corolla XEi 2024 | Histórico limpo, 2 donos |
| `9BWZZZ377RT000002` | HND4B32 | Civic Touring 2023 | Batida traseira leve, reparada |
| `9BWZZZ377RT000003` | GTX5E00 | Mustang GT 2022 | Sinistro total, dano estrutural — **score baixo** |
| `9BWZZZ377RT000004` | GTI4C23 | Golf GTI 2021 | Leilão judicial + incêndio no motor |
| `9BWZZZ377RT000005` | SW4-2D50 | SW4 Diamond 2020 | Frota corporativa, recall atendido |
| `9BWZZZ377RT000006` | MBZ-1C80 | C 180 2021 | **Recall de airbag Takata pendente** |

---

## Scripts de Suporte

| Script | Rede | O que faz |
|---|---|---|
| `deployAndSeed.js` | localhost | Deploy + roles + seed (tudo em um comando) |
| `deploy.js` | sepolia | Deploy + registra os 4 atores |
| `seed.js` | sepolia | Popula dados de teste, cada role assina suas próprias transações |
| `rebalance.js` | sepolia | Equaliza saldos ETH entre as 4 contas (25% cada) |

---

## Estrutura do Repositório

```
├── Contrato hardhat/     # Hardhat: contrato Solidity, testes, scripts de deploy
│   ├── contracts/        # RegistroVeicular.sol (UUPS upgradeable)
│   ├── scripts/          # deploy.js, deployAndSeed.js, seed.js, rebalance.js
│   └── test/             # Testes Hardhat/Chai
│
├── Front-end/            # SPA React + Vite + TypeScript
│   └── src/
│       ├── config/       # Endereço do contrato, role hashes, ABI
│       ├── context/      # AuthContext (wallet, signer, role)
│       ├── pages/        # AdminPanel, ManufacturerPanel, DMVPanel, WorkshopPanel…
│       └── utils/        # pdfGenerator.ts, vinValidator.ts
│
├── listener/             # Node.js: indexa eventos on-chain no Supabase
│   ├── index.js          # Listener principal (suporte a --replay)
│   └── schema.sql        # DDL das tabelas PostgreSQL
│
├── supabase/             # Configuração do Supabase CLI (ambiente local)
└── docs/                 # Guias de deploy e análise técnica
```

---

## Testes do Contrato

```bash
cd "Contrato hardhat"
npx hardhat test                          # suíte completa
npx hardhat test --grep "odômetro"        # filtrar por nome
npx hardhat coverage                      # relatório de cobertura
```

---

## Infraestrutura de Produção

| Componente | Serviço | Finalidade |
|---|---|---|
| RPC (escrita) | Alchemy | Deploy e seed — envio de transações |
| RPC (leitura) | PublicNode | Listener — replay de milhares de blocos sem rate limit |
| Banco off-chain | Supabase | PostgreSQL para busca rápida e consultas complexas |
| Blockchain | Ethereum Sepolia | Armazenamento imutável do histórico veicular |
| Listener | Railway | Processo Node.js sempre ativo |
| Frontend | Vercel | SPA com rewrite rules para roteamento client-side |
