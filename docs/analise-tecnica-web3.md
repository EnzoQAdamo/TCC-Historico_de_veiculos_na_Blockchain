# Análise Técnica — RegistroVeicular.sol

---

## 1. Problemas de Gas

### 1.1 Strings on-chain

Armazenar `string` no storage do EVM custa ~20.000 gas por slot de 32 bytes. Campos como `descricao`, `local`, `detalhes` e `nome` tornam cada transação cara.

**Exemplo de custo estimado:**
- `addRegistroServico` com descrição de 100 caracteres: ~200.000+ gas
- Na Ethereum mainnet a 30 gwei: aprox. R$ 5–15 por registro
- Escala para 10 milhões de veículos brasileiros: inviável financeiramente

**Solução:** Mover strings descritivas para off-chain (banco de dados ou IPFS) e armazenar apenas o hash `keccak256` dos dados on-chain.

---

### 1.2 Loops O(n) sem limite de crescimento

```solidity
// getModelosPorMontadora — dois loops sobre todos os modelos
for (uint i = 0; i < proximoIdModelo; i++) { ... }

// getTodosAtores — itera todo o array enderecosAtores
for (uint i = 0; i < total; i++) { ... }
```

Funções `view` não cobram gas ao chamador direto, mas nós RPC têm limite de execução (`eth_call` timeout). Com 10.000 modelos cadastrados, essas funções podem falhar em produção.

**Solução:** Adicionar paginação (`offset` + `limit`) nas getters, e usar indexadores off-chain (The Graph) para consultas complexas.

---

### 1.3 Três chamadas `hasRole` sequenciais em `addRegistroOdometro`

```solidity
require(
    hasRole(DMV_ROLE, msg.sender) ||
    hasRole(MANUFACTURER_ROLE, msg.sender) ||
    hasRole(MECHANIC_ROLE, msg.sender),
    "Acesso negado"
);
```

Cada `hasRole` é uma leitura de storage (SLOAD ~2.100 gas). No pior caso, três leituras antes de rejeitar a transação.

**Solução:** Criar um modifier customizado que agrupe as roles permitidas, ou usar um bitmap de permissões.

---

### 1.4 `string chassi` como chave de mapping

O EVM computa `keccak256(slot + key)` para resolver mappings. Chaves do tipo `string` são mais custosas que `bytes32`.

**Solução:**
```solidity
// Na escrita, converter uma vez:
bytes32 chassiKey = keccak256(abi.encodePacked(chassiStr));
mapping(bytes32 => Veiculo) public veiculos;
```

Redução estimada de ~15% no gas das funções de escrita.

---

### 1.5 Slots de storage mal empacotados

O EVM aloca variáveis em slots de 32 bytes. Tipos menores que 256 bits podem compartilhar o mesmo slot se declarados consecutivamente.

**Exemplo — struct `Veiculo` atual:**
```solidity
struct Veiculo {
    uint id_modelo;              // 256 bits — slot próprio
    uint data_fabricacao;        // 256 bits — slot próprio
    address assinatura_montadora; // 160 bits — slot próprio (desperdício de 96 bits)
    string cor;                  // dinâmico
}
```

**Versão otimizada:**
```solidity
struct Veiculo {
    uint48 data_fabricacao;       // válido até ano ~8.900.000
    address assinatura_montadora; // 160 bits
    // data_fabricacao (48) + address (160) = 208 bits — cabem no mesmo slot
    uint id_modelo;
    string cor;
}
```

Aplicar a todos os structs que usam `uint` para timestamps.

---

### 1.6 Mapping `veiculoExiste` redundante

```solidity
mapping(string => bool) public veiculoExiste; // gasta SSTORE extra por veículo
```

A verificação já pode ser feita checando o campo `assinatura_montadora`:

```solidity
// Antes:
require(!veiculoExiste[_chassi], "Chassi já registrado");

// Depois (sem custo extra de storage):
require(veiculos[_chassi].assinatura_montadora == address(0), "Chassi já registrado");
```

---

## 2. Problemas de Arquitetura do Contrato

### 2.1 Dualidade de sistemas de permissão

O contrato mantém dois mecanismos paralelos de controle de acesso:
- **OpenZeppelin AccessControl** com `bytes32 roles` (`DMV_ROLE`, `MECHANIC_ROLE`, etc.)
- **Mapping `atores`** com `PapelAtor` enum e flag `ativo`

Ambos precisam ficar sincronizados manualmente em `registrarAtor` e `revogarAtor`. Se um admin chamar `grantRole` diretamente (função pública do AccessControl), o mapping `atores` não é atualizado, quebrando a consistência.

**Solução:** Escolher um único sistema. Para um TCC, o caminho mais limpo é sobrescrever `_grantRole` e `_revokeRole` para manter os dois sincronizados automaticamente, ou abandonar o mapping `atores` e usar só AccessControl com eventos para rastrear nomes.

---

### 2.2 Sem upgradeability (sem padrão proxy)

Contratos Solidity são imutáveis por padrão. Um bug encontrado após o deploy exige:
1. Novo deploy do contrato corrigido
2. Migração manual de todos os dados históricos
3. Atualização do endereço em todos os clientes

Para um sistema governamental de registro veicular, isso representa risco operacional grave.

**Solução recomendada:** Padrão [UUPS Proxy](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable) do OpenZeppelin. Separa lógica (implementação) de estado (proxy), permitindo atualizar a lógica sem perder os dados.

---

### 2.3 Array `enderecosAtores` cresce sem limite e sem limpeza

```solidity
address[] public enderecosAtores;
```

Atores revogados permanecem no array para sempre. Ao iterar em `getTodosAtores`, todos são retornados incluindo inativos. Com o tempo, o array fica grande e a iteração cara.

**Solução:** Filtrar inativos no frontend (já feito parcialmente), ou usar padrão de swap-and-pop para remoção eficiente:

```solidity
// Troca o elemento a remover com o último e faz pop
enderecosAtores[index] = enderecosAtores[enderecosAtores.length - 1];
enderecosAtores.pop();
```

---

### 2.4 Getters sem paginação

`getHistoricoServicos`, `getHistoricoAcidentes`, `getHistoricoDonos`, etc. retornam arrays completos. Um veículo com 20 anos de manutenção pode ter centenas de registros, gerando respostas enormes e potencial timeout no RPC.

**Solução:**
```solidity
function getHistoricoServicos(
    string calldata _chassi,
    uint offset,
    uint limit
) external view returns (RegistroServico[] memory) {
    RegistroServico[] storage todos = historicoServicos[_chassi];
    uint total = todos.length;
    if (offset >= total) return new RegistroServico[](0);
    uint fim = offset + limit > total ? total : offset + limit;
    RegistroServico[] memory pagina = new RegistroServico[](fim - offset);
    for (uint i = offset; i < fim; i++) {
        pagina[i - offset] = todos[i];
    }
    return pagina;
}
```

---

## 3. Proposta de Arquitetura Híbrida

### 3.1 O problema central

O contrato atual usa a blockchain como banco de dados completo, incluindo dados descritivos. Isso funciona para um protótipo, mas é economicamente inviável em produção com escala real.

**Premissa da arquitetura híbrida:** A blockchain deve ser uma *prova criptográfica*, não um banco de dados.

---

### 3.2 Padrão Anchor Hash

```
┌─────────────────────────────────────────────────────────┐
│                    BLOCKCHAIN (on-chain)                  │
│  - Hash keccak256 do registro                            │
│  - Timestamp do bloco                                    │
│  - Address do reportador (assinatura)                    │
│  - Enums críticos (TipoTitulo, GravidadeImpacto)         │
│  - Eventos imutáveis                                     │
└──────────────────────┬──────────────────────────────────┘
                       │ verificação de integridade
┌──────────────────────▼──────────────────────────────────┐
│                  BANCO OFF-CHAIN (ex: Supabase)          │
│  - Strings descritivas completas                         │
│  - Dados para exibição no frontend                       │
│  - Índices de busca (por placa, marca, cidade)           │
│  - Cache de históricos                                   │
└─────────────────────────────────────────────────────────┘
```

**Fluxo de escrita:**
1. Actor preenche dados no frontend
2. Frontend computa `keccak256(dados)` localmente
3. Transação on-chain armazena apenas o hash + enums críticos
4. Backend armazena dados completos no banco off-chain
5. Qualquer um pode verificar integridade: recomputa hash e compara com on-chain

**Fluxo de leitura:**
1. Frontend busca dados do banco off-chain (rápido, grátis)
2. Para auditoria: compara hash do banco com hash on-chain

---

### 3.3 Eventos como fonte de verdade para indexação

O contrato já emite eventos para todas as operações. Isso é metade da solução híbrida pronta.

**Arquitetura com indexador:**

```
Contrato emite eventos
        │
        ▼
Indexador (The Graph / serviço próprio)
        │  lê eventos em tempo real
        ▼
Banco de dados SQL (PostgreSQL/Supabase)
        │
        ▼
Frontend consulta banco (não o nó RPC)
```

**Benefícios imediatos:**
- Busca por placa (hoje impossível on-chain — não existe índice reverso)
- Busca por marca, cidade, ano
- Filtros e paginação sem loops on-chain
- Performance: leitura de banco vs chamadas RPC lentas
- Custo zero para leituras (sem rate limits de RPC)

---

### 3.4 O que permanece on-chain vs off-chain

| Dado | On-chain | Off-chain | Justificativa |
|------|----------|-----------|---------------|
| Hash do registro | ✅ | — | Prova de integridade |
| Tipo do título (enum) | ✅ | — | Crítico, imutável |
| Gravidade de acidente (enum) | ✅ | — | Crítico, imutável |
| Address do reportador | ✅ | — | Responsabilidade |
| Timestamp | ✅ | — | Imutabilidade temporal |
| Descrição do serviço | — | ✅ | Descritivo, caro on-chain |
| Localização textual | — | ✅ | Usa IBGE ID on-chain |
| Detalhes do título | — | ✅ | Texto livre |
| Nome do ator | — | ✅ | Mutável, descritivo |
| Histórico completo para PDF | — | ✅ | Volume alto de dados |

---

## 4. Roteiro de Melhorias

| Prioridade | Melhoria | Impacto no Gas | Esforço |
|---|---|---|---|
| Alta | `bytes32` no lugar de `string chassi` | ~15% redução em writes | Baixo |
| Alta | Remove `veiculoExiste`, usa check em `veiculos` | ~20.000 gas por `addVeiculo` | Baixo |
| Alta | Empacotamento de structs (`uint48` para timestamps) | ~30% redução em storage | Médio |
| Alta | Indexador de eventos + banco off-chain | Busca por placa/marca/etc | Alto |
| Média | UUPS Proxy para upgradeability | — (segurança operacional) | Médio |
| Média | Unificação do sistema de roles | Menos superfície de bug | Médio |
| Média | Paginação nas funções getter | Escalabilidade | Baixo |
| Baixa | Strings descritivas → IPFS hash on-chain | Maior redução de gas | Alto |

---

## 5. Referências para o TCC

- [EVM Storage Layout — Solidity Docs](https://docs.soliditylang.org/en/latest/internals/layout_in_storage.html)
- [OpenZeppelin AccessControl](https://docs.openzeppelin.com/contracts/5.x/access-control)
- [OpenZeppelin UUPS Upgradeable Proxy](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable)
- [The Graph — Indexing Protocol](https://thegraph.com/docs/en/)
- [Gas Optimization Techniques — rareskills.io](https://www.rareskills.io/post/gas-optimization)
- [IPFS + Blockchain Hybrid Pattern](https://docs.ipfs.tech/concepts/usage-ideas-examples/)
- Buterin, V. (2014). *Ethereum White Paper*
