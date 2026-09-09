-- Carteira de assessores por coordenador: até aqui, qualquer usuário
-- com papel "coordenacao" via `eh_diretoria_ou_coordenacao()` via as
-- mesmas linhas que a diretoria (o time inteiro). Agora cada
-- coordenador é vinculado a um subconjunto específico de assessores
-- (tabela nova, N:N), e o RLS passa a filtrar por essa carteira em vez
-- de liberar tudo. Diretoria continua sem restrição nenhuma.

create table coordenacoes_assessores (
  usuario_id uuid not null references usuarios (id) on delete cascade,
  assessor_id uuid not null references assessores (id) on delete cascade,
  primary key (usuario_id, assessor_id)
);

alter table coordenacoes_assessores enable row level security;

create policy coordenacoes_assessores_select on coordenacoes_assessores for select
  using (usuario_papel() = 'diretoria' or usuario_id = auth.uid());

create policy coordenacoes_assessores_write on coordenacoes_assessores for all
  using (usuario_papel() = 'diretoria') with check (usuario_papel() = 'diretoria');

-- ---------------------------------------------------------------
-- pode_acessar_assessor(id) — núcleo do novo filtro. Diretoria: sempre
-- true. Assessor: só a própria linha. Coordenação: só quem está na
-- carteira dela. Usada em toda policy que hoje checava
-- eh_diretoria_ou_coordenacao() e é sobre dados de UM assessor.
-- ---------------------------------------------------------------
create or replace function public.pode_acessar_assessor(assessor_id_alvo uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    usuario_papel() = 'diretoria'
    or assessor_id_alvo = usuario_assessor_id()
    or (
      usuario_papel() = 'coordenacao'
      and exists (
        select 1 from coordenacoes_assessores ca
        where ca.usuario_id = auth.uid() and ca.assessor_id = assessor_id_alvo
      )
    );
$$;

revoke all on function public.pode_acessar_assessor(uuid) from public;
grant execute on function public.pode_acessar_assessor(uuid) to authenticated;

-- ---------------------------------------------------------------
-- assessores
-- ---------------------------------------------------------------
drop policy if exists assessores_select on assessores;
create policy assessores_select on assessores for select
  using (pode_acessar_assessor(id));

-- ---------------------------------------------------------------
-- apuracoes
-- ---------------------------------------------------------------
drop policy if exists apuracoes_select on apuracoes;
create policy apuracoes_select on apuracoes for select
  using (
    (usuario_papel() in ('diretoria', 'coordenacao') and pode_acessar_assessor(assessor_id))
    or (assessor_id = usuario_assessor_id() and status = 'fechada')
  );

drop policy if exists apuracoes_insert on apuracoes;
create policy apuracoes_insert on apuracoes for insert
  with check (
    usuario_papel() = 'diretoria'
    or (usuario_papel() = 'coordenacao' and pode_acessar_assessor(assessor_id))
  );

drop policy if exists apuracoes_update on apuracoes;
create policy apuracoes_update on apuracoes for update
  using (
    usuario_papel() = 'diretoria'
    or (usuario_papel() = 'coordenacao' and pode_acessar_assessor(assessor_id))
  )
  with check (
    usuario_papel() = 'diretoria'
    or (usuario_papel() = 'coordenacao' and pode_acessar_assessor(assessor_id) and status = 'fechada')
  );

-- ---------------------------------------------------------------
-- lancamentos
-- ---------------------------------------------------------------
drop policy if exists lancamentos_select on lancamentos;
create policy lancamentos_select on lancamentos for select
  using (
    exists (
      select 1 from apuracoes a
      where a.id = lancamentos.apuracao_id
        and (
          (usuario_papel() in ('diretoria', 'coordenacao') and pode_acessar_assessor(a.assessor_id))
          or (a.assessor_id = usuario_assessor_id() and a.status = 'fechada')
        )
    )
  );

drop policy if exists lancamentos_write on lancamentos;
create policy lancamentos_write on lancamentos for all
  using (
    usuario_papel() = 'diretoria'
    or (
      usuario_papel() = 'coordenacao'
      and exists (
        select 1 from apuracoes a
        where a.id = lancamentos.apuracao_id and a.status = 'aberta' and pode_acessar_assessor(a.assessor_id)
      )
    )
  )
  with check (
    usuario_papel() = 'diretoria'
    or (
      usuario_papel() = 'coordenacao'
      and exists (
        select 1 from apuracoes a
        where a.id = lancamentos.apuracao_id and a.status = 'aberta' and pode_acessar_assessor(a.assessor_id)
      )
    )
  );

-- ---------------------------------------------------------------
-- promocoes / requisitos_macro_nivel (leitura só — escrita já era
-- diretoria-only, carteira não muda isso)
-- ---------------------------------------------------------------
drop policy if exists promocoes_select on promocoes;
create policy promocoes_select on promocoes for select
  using (
    (usuario_papel() in ('diretoria', 'coordenacao') and pode_acessar_assessor(assessor_id))
    or assessor_id = usuario_assessor_id()
  );

drop policy if exists requisitos_macro_select on requisitos_macro_nivel;
create policy requisitos_macro_select on requisitos_macro_nivel for select
  using (
    (usuario_papel() in ('diretoria', 'coordenacao') and pode_acessar_assessor(assessor_id))
    or assessor_id = usuario_assessor_id()
  );
