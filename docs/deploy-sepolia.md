# Como rodar a aplicação

## 1. Ambiente local (desenvolvimento)

Use este fluxo para rodar tudo na sua máquina sem gastar nada.

### Pré-requisitos
- Node.js 18+
- MetaMask instalado no navegador

### Passo a passo

```bash
# 1. Instalar dependências
cd "Contrato hardhat" && npm install
cd ../Front-end && npm install
cd ../listener && npm install
```

```bash
# 2. Iniciar a blockchain local (deixar rodando em um terminal)
cd "Contrato hardhat"
npx hardhat node
```

```bash
# 3. Em outro terminal: deploy + seed
cd "Contrato hardhat"
npx hardhat run scripts/deployAndSeed.js --network localhost
```

```bash
# 4. Atualizar o endereço do contrato no .env do frontend e do listener
# Front-end/.env.development → VITE_CONTRACT_ADDRESS=0x...
# listener/.env             → CONTRACT_ADDRESS=0x...
```

```bash
# 5. Iniciar o listener (em outro terminal)
cd listener
node index.js --replay
```

```bash
# 6. Iniciar o frontend (modo local)
cd Front-end
npm run dev
```

### MetaMask — rede local

| Campo    | Valor          |
|----------|----------------|
| Rede     | Localhost 8545 |
| Chain ID | 31337          |
| Símbolo  | ETH            |

Importe as contas de teste usando as chaves privadas impressas pelo `npx hardhat node`. Cada conta começa com 10.000 ETH de teste.

---

## 2. Testnet Sepolia (deploy público)

### Pré-requisitos

- 4 contas no MetaMask (Admin, Montadora, DETRAN, Oficina)
- ETH Sepolia na conta Admin — faucets:
  - https://sepoliafaucet.com (Google login, 0.5 ETH/dia)
  - https://www.alchemy.com/faucets/ethereum-sepolia
- Conta no Alchemy para RPC de escrita: https://www.alchemy.com

### Configurar os .env

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

CONTRACT_ADDRESS=   # preenchido após o deploy
```

**`listener/.env`**
```env
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
CONTRACT_ADDRESS=0x...   # preenchido após o deploy
SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...   # chave secreta — nunca expor no frontend
DEPLOY_BLOCK=                        # bloco do deploy (veja no Etherscan)
```

**`Front-end/.env.sepolia`**
```env
VITE_CONTRACT_ADDRESS=0x...          # mesmo endereço do deploy
VITE_CHAIN_ID=11155111
VITE_RPC_FALLBACK=https://ethereum-sepolia-rpc.publicnode.com
VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...   # chave pública (anon) — segura para o browser
```

> **Atenção:** o frontend usa a chave **publishable/anon** do Supabase (acesso limitado por RLS).
> O listener usa a chave **secret** (acesso total). Nunca coloque a secret no frontend.

### Passo a passo

```bash
# 1. Compilar o contrato
cd "Contrato hardhat"
npx hardhat compile

# 2. Deploy + registrar os 4 atores
npx hardhat run scripts/deploy.js --network sepolia
```

Anote o endereço do contrato e atualize `CONTRACT_ADDRESS` em:
- `Contrato hardhat/.env`
- `listener/.env`
- `Front-end/.env.sepolia` → `VITE_CONTRACT_ADDRESS`

```bash
# 3. Distribuir ETH entre as contas de role
npx hardhat run scripts/rebalance.js --network sepolia

# 4. Popular dados de teste (cada role assina suas próprias transações)
npx hardhat run scripts/seed.js --network sepolia

# 5. Rebalancear após o seed (opcional)
npx hardhat run scripts/rebalance.js --network sepolia
```

```bash
# 6. Sincronizar blockchain → Supabase
cd listener
node index.js --replay
```

```bash
# 7. Manter o listener rodando para capturar novos eventos
node index.js
```

```bash
# 8. Iniciar o frontend apontando para Sepolia
cd Front-end
npm run dev:sepolia
```

### MetaMask — Sepolia

- Vá em **Configurações → Avançado → Mostrar redes de teste**
- Selecione **Sepolia**
- Conecte com cada conta para acessar o painel correspondente

### Verificar o contrato no Etherscan (recomendado para a banca)

1. Crie conta em https://etherscan.io → gere API key
2. Adicione no `.env`: `ETHERSCAN_API_KEY=SUA_KEY`
3. Execute:
```bash
npx hardhat verify --network sepolia 0xENDERECO_DO_CONTRATO
```

---

## Infraestrutura e serviços

| Componente | Serviço | Plano | Finalidade |
|------------|---------|-------|------------|
| RPC (escrita) | [Alchemy](https://www.alchemy.com) | Gratuito | Deploy e seed — envio de transações |
| RPC (leitura) | [PublicNode](https://publicnode.com) | Gratuito, sem conta | Listener — leitura de eventos históricos |
| Banco off-chain | [Supabase](https://supabase.com) | Gratuito | PostgreSQL para busca rápida e consultas complexas |
| Blockchain | Ethereum Sepolia | Testnet gratuita | Armazenamento imutável do histórico veicular |
| Frontend | Vite + React | — | Interface por papel/role |

### Por que dois RPCs diferentes?

- **Alchemy** tem limites estritos em leituras históricas (`eth_getLogs`) no plano gratuito (10 blocos por query), mas é confiável para envio de transações.
- **PublicNode** não tem rate limit em leituras, ideal para o replay do listener que precisa varrer milhares de blocos.

### Por que arquitetura híbrida (blockchain + Supabase)?

| Aspecto | Só blockchain | Híbrido (blockchain + Supabase) |
|---------|--------------|----------------------------------|
| Escrita | Imutável, auditável | Imutável, auditável |
| Leitura | Lenta, cara em produção | Rápida, SQL, busca por placa/cidade |
| Busca por placa | Impossível sem indexar | `SELECT * WHERE placa = 'ABC1234'` |
| Integridade | Garantida pelo contrato | Verificável: hash on-chain = hash off-chain |

---

## Resumo dos scripts

| Script | Rede | O que faz |
|--------|------|-----------|
| `deployAndSeed.js` | localhost | Deploy + roles + seed (tudo junto) |
| `deploy.js` | sepolia | Deploy + registra os 4 atores |
| `seed.js` | sepolia | Popula dados de teste, cada role assina o que é dela |
| `rebalance.js` | sepolia | Equaliza saldos ETH entre as 4 contas (25% cada) |

## Contas e roles

| Role | Painel | Permissões |
|------|--------|------------|
| `DEFAULT_ADMIN_ROLE` | AdminPanel | Registrar e revogar atores |
| `MANUFACTURER_ROLE` | ManufacturerPanel | Cadastrar modelos e veículos |
| `DMV_ROLE` | DMVPanel | Transferência, acidentes, títulos, identificação |
| `MECHANIC_ROLE` | WorkshopPanel | Odômetro e serviços |
| `DEALER_ROLE` | DealerPanel | Consulta histórico (somente leitura) |
| `INSURER_ROLE` | InsurancePanel | Consulta histórico e score de risco (somente leitura) |
| — | PublicSearch | Busca pública sem autenticação |

## Veículos de teste (seed)

| Chassi | Placa | Modelo | Cenário |
|--------|-------|--------|---------|
| 9BWZZZ377RT000001 | GHT7A21 | Corolla XEi 2024 | Histórico limpo, 2 donos |
| 9BWZZZ377RT000002 | HND4B32 | Civic Touring 2023 | Batida traseira leve reparada |
| 9BWZZZ377RT000003 | GTX5E00 | Mustang GT 2022 | Sinistro total, dano estrutural |
| 9BWZZZ377RT000004 | GTI4C23 | Golf GTI 2021 | Leilão judicial + incêndio no motor |
| 9BWZZZ377RT000005 | SW4-2D50 | SW4 Diamond 2020 | Frota corporativa, recall atendido |
| 9BWZZZ377RT000006 | MBZ-1C80 | C 180 2021 | Recall de airbag Takata pendente |
