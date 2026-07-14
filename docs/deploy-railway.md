# Deploy do Listener no Railway

O listener é um processo Node.js que fica em execução contínua escutando eventos emitidos pelo contrato na blockchain e gravando-os no Supabase. Como o Vercel é serverless (sem processos persistentes), o Railway é a plataforma gratuita recomendada para hospedar o listener em produção.

## Arquitetura

```
Sepolia (blockchain)
    │  eventos on-chain
    ▼
listener/index.js   ──►  Supabase (PostgreSQL off-chain)
    │                          │
    │  poll por bloco          │  leitura
    │                          ▼
    └─────────────────  Front-end (Vercel)
```

O listener:
- Conecta ao nó RPC da Sepolia via `RPC_URL`
- Escuta cada novo bloco e busca todos os eventos do contrato naquele bloco
- Grava (upsert) os dados no Supabase
- No boot (`start:prod`), faz um **replay** para recuperar eventos perdidos enquanto estava offline, depois entra no modo live

## Pré-requisitos

- Conta gratuita em [railway.app](https://railway.app) (login com GitHub)
- Repositório no GitHub com o código commitado (incluindo `listener/RegistroVeicular.json`)
- Supabase configurado com o schema de `listener/schema.sql`
- `DEPLOY_BLOCK` do contrato (veja abaixo como encontrar)

## Encontrar o DEPLOY_BLOCK

1. Acesse [sepolia.etherscan.io](https://sepolia.etherscan.io)
2. Busque pelo endereço do contrato (`CONTRACT_ADDRESS`)
3. Na aba **Contract**, clique em **"Contract Creation"** na lista de transações
4. Copie o número do bloco dessa transação — esse é o `DEPLOY_BLOCK`

Sem essa variável, o listener varre os últimos 100 000 blocos no replay, o que é suficiente mas mais lento.

## Variáveis de ambiente necessárias

| Variável | Onde encontrar |
|---|---|
| `RPC_URL` | Alchemy → seu app Sepolia → API Key URL |
| `CONTRACT_ADDRESS` | Endereço do proxy UUPS deployado |
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_SECRET_KEY` | Supabase → Settings → API → `service_role` secret |
| `DEPLOY_BLOCK` | Etherscan → transação de criação do contrato |

> **Atenção:** o listener usa a chave `service_role` (secret) do Supabase, não a `anon`. Essa chave bypassa o Row Level Security e nunca deve ser exposta no frontend.

## Passo a passo do deploy

### 1. Commit do código

Certifique-se de que os seguintes arquivos estão commitados no repositório:

```
listener/
├── index.js
├── package.json
├── railway.json
├── RegistroVeicular.json   ← ABI do contrato (necessário no Railway)
└── .env.example
```

O `RegistroVeicular.json` precisa estar commitado porque o `artifacts/` do Hardhat está no `.gitignore`.

### 2. Criar o projeto no Railway

1. Acesse [railway.app](https://railway.app) → **New Project**
2. Escolha **Deploy from GitHub repo** → selecione o repositório
3. Railway detecta automaticamente o Node.js pelo `package.json`

### 3. Configurar o Root Directory

No painel do serviço Railway:
1. Vá em **Settings → Source**
2. Em **Root Directory**, coloque `listener`
3. Railway vai usar o `railway.json` de dentro dessa pasta, que define o comando `npm run start:prod`

### 4. Adicionar as variáveis de ambiente

No painel do serviço:
1. Vá em **Variables**
2. Clique em **New Variable** e adicione cada variável da tabela acima
3. Railway reinicia o serviço automaticamente após salvar

### 5. Verificar o deploy

Na aba **Deployments → Logs**, você deve ver:

```
Conectado: chain 11155111 | contrato 0xB35dc17...
Iniciando replay de todos os eventos históricos...
Varrendo a partir do bloco 8000000 (XXXX blocos)
AtorRegistrado: 5 eventos processados
ModeloAdicionado: 6 eventos processados
VeiculoAdicionado: 6 eventos processados
...
Replay concluído.
Listeners ativos (poll por bloco). Aguardando eventos...
```

A partir desse ponto o listener está ativo 24/7. Qualquer transação feita no frontend aparecerá no Supabase em ~15 segundos (tempo médio de bloco na Sepolia).

## Comportamento em caso de queda

O `railway.json` configura `restartPolicyType: ON_FAILURE` com até 10 tentativas. Quando o Railway reinicia o processo, ele executa `start:prod` (com `--replay`), o que garante que nenhum evento fique para trás.

## Custo

O listener usa recursos mínimos (poll de bloco a cada ~12 segundos, operações leves de I/O). O Railway oferece **$5/mês de crédito gratuito** no plano Hobby, e um serviço desse porte consome aproximadamente **$0,50–1,50/mês** — dentro do crédito gratuito.

## Atualizando o ABI após upgrade do contrato

Se o contrato for atualizado via `scripts/upgrade.js`, o ABI pode mudar. Nesse caso:

```bash
cp "Contrato hardhat/artifacts/contracts/RegistroVeicular.sol/RegistroVeicular.json" "listener/RegistroVeicular.json"
git add listener/RegistroVeicular.json
git commit -m "chore: sync listener ABI after contract upgrade"
git push
```

O Railway faz redeploy automaticamente ao detectar o push.
