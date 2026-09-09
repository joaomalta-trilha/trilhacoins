-- TrilhaCoins — modelo de dados (BRIEFING-trilhacoins.md §4)
--
-- RLS fica para a etapa 4 (auth Google + papéis), conforme a ordem de
-- implementação do briefing (§11): as etapas 1–3 rodam sem
-- autenticação, com dados reais, para achar os casos de borda antes
-- de travar o acesso. Este arquivo cobre só a etapa 1: tabelas e
-- tabelas de pontuação.

create extension if not exists "pgcrypto";

create type papel_usuario as enum ('diretoria', 'coordenacao', 'assessor');
create type status_apuracao as enum ('aberta', 'fechada');
create type tipo_meta as enum ('escala', 'percentual', 'contagem', 'livre');
create type grupo_meta as enum ('recorrente', 'bonus');

-- ---------------------------------------------------------------
-- niveis — os 10 degraus da trilha e o custo de cada transição
-- ---------------------------------------------------------------
create table niveis (
  codigo text primary key,
  nome text not null,
  ordem int not null unique,
  -- custo, em coins, para SAIR deste nível. null no nível máximo (Partner).
  custo_promocao int
);

-- ---------------------------------------------------------------
-- metas — as 9 metas (3.1–3.9). Vive em dado: mudar teto ou tipo é
-- editar linha, não fazer deploy (§4).
-- ---------------------------------------------------------------
create table metas (
  codigo text primary key, -- "3.1".."3.9"
  nome text not null,
  descricao text,
  tipo tipo_meta not null,
  grupo grupo_meta not null,
  teto int, -- null quando não há teto (metas de bônus)
  ordem int not null,
  por_unidade int, -- só para tipo "contagem": coins por unidade lançada
  vigente_de date not null default current_date,
  vigente_ate date -- null = ainda vigente
);

-- ---------------------------------------------------------------
-- faixas_pontuacao — as opções/faixas de cada meta
-- ---------------------------------------------------------------
create table faixas_pontuacao (
  id uuid primary key default gen_random_uuid(),
  meta_codigo text not null references metas (codigo),
  rotulo text not null,
  valor_minimo numeric, -- limite inferior inclusive, só para tipo "percentual"
  coins int not null,
  ordem int not null,
  unique (meta_codigo, rotulo)
);

-- ---------------------------------------------------------------
-- assessores
-- ---------------------------------------------------------------
create table assessores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nivel text not null references niveis (codigo),
  saldo_inicial int not null default 0,
  ativo boolean not null default true,
  entrou_em date not null default current_date,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- usuarios — quem loga e não tem linha aqui entra sem acesso a nada
-- ---------------------------------------------------------------
create table usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  assessor_id uuid references assessores (id), -- null para quem não é assessor
  papel papel_usuario not null,
  ativo boolean not null default true
);

-- ---------------------------------------------------------------
-- apuracoes — uma linha por assessor por mês; container do lançamento
-- ---------------------------------------------------------------
create table apuracoes (
  id uuid primary key default gen_random_uuid(),
  assessor_id uuid not null references assessores (id),
  mes date not null, -- sempre dia 1 do mês de referência
  status status_apuracao not null default 'aberta',
  fechada_em timestamptz,
  fechada_por uuid references usuarios (id),
  unique (assessor_id, mes)
);

-- ---------------------------------------------------------------
-- lancamentos — uma linha por meta por apuração
-- ---------------------------------------------------------------
create table lancamentos (
  id uuid primary key default gen_random_uuid(),
  apuracao_id uuid not null references apuracoes (id) on delete cascade,
  meta_codigo text not null references metas (codigo),
  valor text, -- rótulo da escala, percentual ou contagem (como string)
  -- coins gravado no lançamento: se a tabela de pontuação mudar depois,
  -- o histórico não se reescreve sozinho (§4).
  coins int not null,
  lancado_por uuid not null references usuarios (id),
  lancado_em timestamptz not null default now(),
  unique (apuracao_id, meta_codigo)
);

-- ---------------------------------------------------------------
-- promocoes
-- ---------------------------------------------------------------
create table promocoes (
  id uuid primary key default gen_random_uuid(),
  assessor_id uuid not null references assessores (id),
  de_nivel text not null references niveis (codigo),
  para_nivel text not null references niveis (codigo),
  custo int not null,
  checkpoint date not null,
  aprovada_por uuid not null references usuarios (id),
  criada_em timestamptz not null default now()
);

-- pré-requisito qualitativo de macro-nível (§5.4) — flag booleana por
-- assessor, marcada pela diretoria, com data e responsável no log.
create table requisitos_macro_nivel (
  id uuid primary key default gen_random_uuid(),
  assessor_id uuid not null references assessores (id),
  nivel text not null references niveis (codigo),
  atendido boolean not null default false,
  marcado_por uuid references usuarios (id),
  marcado_em timestamptz,
  unique (assessor_id, nivel)
);

-- ---------------------------------------------------------------
-- log — tudo que altera saldo ou permissão
-- ---------------------------------------------------------------
create table log (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios (id),
  acao text not null,
  entidade text not null,
  entidade_id uuid,
  valor_anterior jsonb,
  valor_novo jsonb,
  criado_em timestamptz not null default now()
);

create index idx_apuracoes_assessor_mes on apuracoes (assessor_id, mes);
create index idx_lancamentos_apuracao on lancamentos (apuracao_id);
create index idx_promocoes_assessor on promocoes (assessor_id);
create index idx_log_entidade on log (entidade, entidade_id);
create index idx_usuarios_assessor on usuarios (assessor_id);
