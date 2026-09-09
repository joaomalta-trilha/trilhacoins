-- TrilhaCoins — Row Level Security (BRIEFING-trilhacoins.md §7)
--
-- Etapa 3 do briefing (§11): as regras de acesso passam a viver no
-- banco, não só no código. Toda tabela sensível fica com RLS
-- habilitado; quem loga e não tem linha em `usuarios` não enxerga
-- nada (§4).
--
-- Se você já rodou 0001_schema.sql antes desta linha ser adicionada
-- lá, rode este ALTER primeiro para religar `usuarios` ao Supabase Auth:
alter table usuarios
  add constraint usuarios_id_fkey foreign key (id) references auth.users (id) on delete cascade;

-- ---------------------------------------------------------------
-- helpers — leem a própria linha em `usuarios` (security definer:
-- olham a tabela ignorando RLS só para descobrir QUEM está chamando,
-- nunca para expor dado de outra pessoa; auth.uid() vem do JWT
-- validado pelo Supabase, o cliente não pode forjar isso).
-- ---------------------------------------------------------------
create or replace function usuario_papel()
returns papel_usuario
language sql stable security definer set search_path = public as $$
  select papel from usuarios where id = auth.uid() and ativo limit 1;
$$;

create or replace function usuario_assessor_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select assessor_id from usuarios where id = auth.uid() and ativo limit 1;
$$;

create or replace function eh_diretoria_ou_coordenacao()
returns boolean
language sql stable security definer set search_path = public as $$
  select usuario_papel() in ('diretoria', 'coordenacao');
$$;

-- ---------------------------------------------------------------
-- usuarios
-- ---------------------------------------------------------------
alter table usuarios enable row level security;

create policy usuarios_select on usuarios for select
  using (id = auth.uid() or usuario_papel() = 'diretoria');

create policy usuarios_insert on usuarios for insert
  with check (usuario_papel() = 'diretoria');

create policy usuarios_update on usuarios for update
  using (usuario_papel() = 'diretoria')
  with check (usuario_papel() = 'diretoria');

create policy usuarios_delete on usuarios for delete
  using (usuario_papel() = 'diretoria');

-- ---------------------------------------------------------------
-- niveis / metas / faixas_pontuacao — leitura liberada a qualquer
-- usuário provisionado (todo mundo precisa da régua pra ver o próprio
-- painel); escrita só diretoria (§7: "Editar tabela de pontuação").
-- ---------------------------------------------------------------
alter table niveis enable row level security;
alter table metas enable row level security;
alter table faixas_pontuacao enable row level security;

create policy niveis_select on niveis for select using (usuario_papel() is not null);
create policy niveis_write on niveis for all
  using (usuario_papel() = 'diretoria') with check (usuario_papel() = 'diretoria');

create policy metas_select on metas for select using (usuario_papel() is not null);
create policy metas_write on metas for all
  using (usuario_papel() = 'diretoria') with check (usuario_papel() = 'diretoria');

create policy faixas_select on faixas_pontuacao for select using (usuario_papel() is not null);
create policy faixas_write on faixas_pontuacao for all
  using (usuario_papel() = 'diretoria') with check (usuario_papel() = 'diretoria');

-- ---------------------------------------------------------------
-- assessores
-- ---------------------------------------------------------------
alter table assessores enable row level security;

create policy assessores_select on assessores for select
  using (eh_diretoria_ou_coordenacao() or id = usuario_assessor_id());

create policy assessores_write on assessores for all
  using (usuario_papel() = 'diretoria') with check (usuario_papel() = 'diretoria');

-- ---------------------------------------------------------------
-- apuracoes
-- ---------------------------------------------------------------
alter table apuracoes enable row level security;

create policy apuracoes_select on apuracoes for select
  using (
    eh_diretoria_ou_coordenacao()
    or (assessor_id = usuario_assessor_id() and status = 'fechada')
  );

create policy apuracoes_insert on apuracoes for insert
  with check (eh_diretoria_ou_coordenacao());

-- fechar (aberta -> fechada) pode diretoria ou coordenação; reabrir
-- (fechada -> aberta) e qualquer outra edição de mês fechado é só
-- diretoria (§7).
create policy apuracoes_update on apuracoes for update
  using (eh_diretoria_ou_coordenacao())
  with check (
    usuario_papel() = 'diretoria'
    or (usuario_papel() = 'coordenacao' and status = 'fechada')
  );

-- ---------------------------------------------------------------
-- lancamentos
-- ---------------------------------------------------------------
alter table lancamentos enable row level security;

create policy lancamentos_select on lancamentos for select
  using (
    eh_diretoria_ou_coordenacao()
    or exists (
      select 1 from apuracoes a
      where a.id = lancamentos.apuracao_id
        and a.assessor_id = usuario_assessor_id()
        and a.status = 'fechada'
    )
  );

-- lançar/editar/limpar em mês aberto: diretoria ou coordenação.
-- editar lançamento de mês já fechado: só diretoria (§7).
create policy lancamentos_write on lancamentos for all
  using (
    usuario_papel() = 'diretoria'
    or (
      usuario_papel() = 'coordenacao'
      and exists (
        select 1 from apuracoes a
        where a.id = lancamentos.apuracao_id and a.status = 'aberta'
      )
    )
  )
  with check (
    usuario_papel() = 'diretoria'
    or (
      usuario_papel() = 'coordenacao'
      and exists (
        select 1 from apuracoes a
        where a.id = lancamentos.apuracao_id and a.status = 'aberta'
      )
    )
  );

-- ---------------------------------------------------------------
-- promocoes
-- ---------------------------------------------------------------
alter table promocoes enable row level security;

create policy promocoes_select on promocoes for select
  using (eh_diretoria_ou_coordenacao() or assessor_id = usuario_assessor_id());

-- efetivar promoção é só diretoria (§7)
create policy promocoes_insert on promocoes for insert
  with check (usuario_papel() = 'diretoria');

-- ---------------------------------------------------------------
-- requisitos_macro_nivel (§5.4)
-- ---------------------------------------------------------------
alter table requisitos_macro_nivel enable row level security;

create policy requisitos_macro_select on requisitos_macro_nivel for select
  using (eh_diretoria_ou_coordenacao() or assessor_id = usuario_assessor_id());

create policy requisitos_macro_write on requisitos_macro_nivel for all
  using (usuario_papel() = 'diretoria') with check (usuario_papel() = 'diretoria');

-- ---------------------------------------------------------------
-- log — só diretoria lê; diretoria/coordenação podem gravar (as ações
-- que eles tomam é que geram entradas de log).
-- ---------------------------------------------------------------
alter table log enable row level security;

create policy log_select on log for select
  using (usuario_papel() = 'diretoria');

create policy log_insert on log for insert
  with check (eh_diretoria_ou_coordenacao());
