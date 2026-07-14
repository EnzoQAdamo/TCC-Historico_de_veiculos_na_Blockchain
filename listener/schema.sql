-- Schema Supabase — RegistroVeicular
-- Execute no SQL Editor do Supabase Dashboard

-- Atores registrados no sistema
create table if not exists atores (
  address       text primary key,
  nome          text not null,
  papel         smallint not null,  -- enum PapelAtor: 0=MONTADORA,1=AUTORIDADE,2=OFICINA,3=SEGURADORA,4=CONCESSIONARIA
  wmi           text,               -- WMI ISO 3779 (3 chars), preenchido apenas para MONTADORA
  ativo         boolean not null default true,
  tx_hash       text,
  bloco         bigint,
  created_at    timestamptz default now()
);

-- Modelos de veículos
create table if not exists modelos (
  id_modelo     integer primary key,
  nome          text not null,
  ano           smallint not null,
  estilo        smallint not null,  -- enum EstiloVeiculo
  montadora     text not null references atores(address),
  tx_hash       text,
  bloco         bigint,
  created_at    timestamptz default now()
);

-- Veículos registrados
create table if not exists veiculos (
  chassi            text primary key,
  id_modelo         integer not null references modelos(id_modelo),
  data_fabricacao   timestamptz not null,
  cor_fabrica       text not null,
  montadora         text not null references atores(address),
  tx_hash           text,
  bloco             bigint,
  created_at        timestamptz default now()
);

-- Histórico de proprietários
create table if not exists historico_donos (
  id                    bigserial primary key,
  chassi                text not null references veiculos(chassi),
  dono                  text not null,
  data_comeco           timestamptz not null,
  localidade_id         integer not null,
  tipo_uso              smallint not null,
  assinatura_reportador text not null,
  tx_hash               text not null,
  log_index             integer default 0,
  bloco                 bigint,
  created_at            timestamptz default now(),
  constraint uq_donos_tx unique (tx_hash)
);

-- Histórico de acidentes
create table if not exists historico_acidentes (
  id                    bigserial primary key,
  chassi                text not null references veiculos(chassi),
  data                  timestamptz not null,
  local                 text not null,
  gravidade             smallint not null,
  airbags_acionados     boolean not null,
  dano_estrutural       boolean not null,
  assinatura_reportador text not null,
  tx_hash               text not null,
  log_index             integer default 0,
  bloco                 bigint,
  created_at            timestamptz default now(),
  constraint uq_acidentes_tx unique (tx_hash)
);

-- Histórico de títulos
create table if not exists historico_titulos (
  id                    bigserial primary key,
  chassi                text not null references veiculos(chassi),
  data                  timestamptz not null,
  tipo_titulo           smallint not null,
  detalhes              text,
  assinatura_reportador text not null,
  tx_hash               text not null,
  log_index             integer default 0,
  bloco                 bigint,
  created_at            timestamptz default now(),
  constraint uq_titulos_tx unique (tx_hash)
);

-- Histórico de odômetro
create table if not exists historico_odometro (
  id                    bigserial primary key,
  chassi                text not null references veiculos(chassi),
  data                  timestamptz not null,
  quilometragem         integer not null,
  assinatura_reportador text not null,
  tx_hash               text not null,
  log_index             integer default 0,
  bloco                 bigint,
  created_at            timestamptz default now(),
  constraint uq_odometro_tx unique (tx_hash)
);

-- Histórico de serviços/manutenções
create table if not exists historico_servicos (
  id                  bigserial primary key,
  chassi              text not null references veiculos(chassi),
  data                timestamptz not null,
  tipo                smallint not null,
  descricao           text not null,
  assinatura_oficina  text not null,
  tx_hash             text not null,
  log_index           integer default 0,
  bloco               bigint,
  created_at          timestamptz default now(),
  constraint uq_servicos_tx unique (tx_hash)
);

-- Histórico de recalls
create table if not exists historico_recalls (
  id                    bigserial primary key,
  chassi                text not null references veiculos(chassi),
  data                  timestamptz not null,
  recall_id             text not null,
  descricao             text not null,
  resolvido             boolean not null default false,
  assinatura_montadora  text not null,
  tx_hash               text not null,
  log_index             integer default 0,
  bloco                 bigint,
  created_at            timestamptz default now(),
  constraint uq_recalls_tx unique (tx_hash)
);

-- Histórico de identificação (placa e cor)
create table if not exists historico_identificacao (
  id                    bigserial primary key,
  chassi                text not null references veiculos(chassi),
  data                  timestamptz not null,
  cor                   text not null,
  placa                 text not null,
  assinatura_reportador text not null,
  tx_hash               text not null,
  log_index             integer default 0,
  bloco                 bigint,
  created_at            timestamptz default now(),
  constraint uq_identificacao_tx unique (tx_hash)
);

-- Índices para buscas comuns no frontend
create index if not exists idx_veiculos_montadora       on veiculos(montadora);
create index if not exists idx_historico_donos_chassi   on historico_donos(chassi);
create index if not exists idx_historico_donos_dono     on historico_donos(dono);
create index if not exists idx_historico_acidentes      on historico_acidentes(chassi);
create index if not exists idx_historico_titulos        on historico_titulos(chassi);
create index if not exists idx_historico_odometro       on historico_odometro(chassi);
create index if not exists idx_historico_servicos       on historico_servicos(chassi);
create index if not exists idx_historico_recalls        on historico_recalls(chassi);
create index if not exists idx_historico_identificacao  on historico_identificacao(chassi);
-- Busca por placa — caso de uso principal
create index if not exists idx_placa                    on historico_identificacao(placa);

-- View: placa atual de cada veículo (última identificação)
create or replace view veiculo_identificacao_atual as
select distinct on (chassi)
  chassi, placa, cor, data, assinatura_reportador
from historico_identificacao
order by chassi, data desc;

-- View: dono atual de cada veículo
create or replace view veiculo_dono_atual as
select distinct on (chassi)
  chassi, dono, data_comeco, localidade_id, tipo_uso
from historico_donos
order by chassi, data_comeco desc;

-- View: título atual de cada veículo
create or replace view veiculo_titulo_atual as
select distinct on (chassi)
  chassi, tipo_titulo, detalhes, data
from historico_titulos
order by chassi, data desc;
