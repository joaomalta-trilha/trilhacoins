-- Trilha Hub — fase 1 (BRIEFING-trilhahub.md §7 e §11).
--
-- Aditiva: não muda nenhuma regra do TrilhaCoins. Cria o que o Hub
-- precisa para ser o dono do cadastro de pessoas e clientes:
--   * nome/cargo em `usuarios` (o cargo é só rótulo — "Gerente de
--     Performance" entra com papel `diretoria`, mesmos acessos);
--   * `clientes`, com histórico de troca de assessor;
--   * `dossies` (Markdown, versionado) e `dossie_liberacoes`;
--   * `conteudos` (Trilha do Assessor: processos e cultura).
--
-- Regra de visibilidade do dossiê (decisão de 2026-11-19): o assessor
-- vê os clientes da própria carteira e os que a diretoria liberar —
-- para ele ou para todos. Coordenação vê a carteira dos assessores
-- dela. Diretoria vê tudo e é a única que libera.
--
-- Pode rodar de novo sem erro (idempotente).

-- ---------------------------------------------------------------
-- pessoas
-- ---------------------------------------------------------------
alter table usuarios
  add column if not exists nome text,
  add column if not exists cargo text,
  add column if not exists clickup_user_id bigint,
  add column if not exists telefone text;

-- Diretório: nomes e cargos de quem está ativo, para qualquer pessoa
-- ativa. Não expõe nível, saldo nem nada do Coins (briefing do Coins
-- §7: o assessor nunca vê a progressão dos colegas).
create or replace function public.diretorio_pessoas()
returns table (id uuid, nome text, cargo text, papel papel_usuario, assessor_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    coalesce(nullif(trim(u.nome), ''), a.nome, split_part(u.email, '@', 1)) as nome,
    u.cargo,
    u.papel,
    u.assessor_id
  from usuarios u
  left join assessores a on a.id = u.assessor_id
  where u.ativo and usuario_papel() is not null
  order by 2;
$$;

create or replace function public.diretorio_assessores()
returns table (id uuid, nome text)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.nome
  from assessores a
  where a.ativo and usuario_papel() is not null
  order by a.nome;
$$;

revoke all on function public.diretorio_pessoas() from public;
revoke all on function public.diretorio_assessores() from public;
grant execute on function public.diretorio_pessoas() to authenticated;
grant execute on function public.diretorio_assessores() to authenticated;

-- ---------------------------------------------------------------
-- clientes
-- ---------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_cliente') then
    create type status_cliente as enum ('ativo', 'pausado', 'saiu');
  end if;
end
$$;

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  status status_cliente not null default 'ativo',
  assessor_id uuid references assessores (id) on delete set null,
  -- nome como veio da importação, para a gestão vincular quem não casou
  assessor_importado text,
  squad text,
  pacote text,
  nicho text,
  frase text,
  objetivo text,
  pede_atencao boolean not null default false,
  piloto_assistente boolean not null default false,
  exigencia_pts int check (exigencia_pts between 7 and 25),
  -- atalhos para as tasks recorrentes do cliente no ClickUp
  -- ({relatorio, otimizacao, checkin, recorrencia, funil})
  links jsonb not null default '{}'::jsonb,
  dossie_aberto_a_todos boolean not null default false,
  clickup_cliente_opcao uuid,
  clickup_cadastro_task_id text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_clientes_assessor on clientes (assessor_id);

create table if not exists clientes_historico_assessor (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete cascade,
  assessor_id uuid references assessores (id) on delete set null,
  de date not null default current_date,
  ate date
);

create index if not exists idx_historico_cliente on clientes_historico_assessor (cliente_id);

create table if not exists dossie_liberacoes (
  cliente_id uuid not null references clientes (id) on delete cascade,
  assessor_id uuid not null references assessores (id) on delete cascade,
  liberado_por uuid references usuarios (id) on delete set null default auth.uid(),
  liberado_em timestamptz not null default now(),
  primary key (cliente_id, assessor_id)
);

create index if not exists idx_liberacoes_assessor on dossie_liberacoes (assessor_id);

-- ---------------------------------------------------------------
-- regras de acesso a clientes (security definer: leem as tabelas só
-- para decidir; nunca devolvem dado de ninguém)
-- ---------------------------------------------------------------

-- Pode editar cliente cujo assessor é `assessor_id_alvo`?
-- Diretoria: sempre. Coordenação: se o assessor está na carteira dela.
create or replace function public.pode_gerir_cliente(assessor_id_alvo uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    usuario_papel() = 'diretoria'
    or (
      usuario_papel() = 'coordenacao'
      and assessor_id_alvo is not null
      and pode_acessar_assessor(assessor_id_alvo)
    ),
    false
  );
$$;

create or replace function public.pode_ver_cliente(cliente_id_alvo uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select
        usuario_papel() = 'diretoria'
        or (c.assessor_id is not null and c.assessor_id = usuario_assessor_id())
        or (
          usuario_papel() = 'coordenacao'
          and c.assessor_id is not null
          and pode_acessar_assessor(c.assessor_id)
        )
        or (c.dossie_aberto_a_todos and usuario_papel() is not null)
        or exists (
          select 1 from dossie_liberacoes l
          where l.cliente_id = c.id and l.assessor_id = usuario_assessor_id()
        )
      from clientes c
      where c.id = cliente_id_alvo
    ),
    false
  );
$$;

create or replace function public.pode_editar_cliente(cliente_id_alvo uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    usuario_papel() = 'diretoria'
    or (select pode_gerir_cliente(c.assessor_id) from clientes c where c.id = cliente_id_alvo),
    false
  );
$$;

revoke all on function public.pode_gerir_cliente(uuid) from public;
revoke all on function public.pode_ver_cliente(uuid) from public;
revoke all on function public.pode_editar_cliente(uuid) from public;
grant execute on function public.pode_gerir_cliente(uuid) to authenticated;
grant execute on function public.pode_ver_cliente(uuid) to authenticated;
grant execute on function public.pode_editar_cliente(uuid) to authenticated;

-- ---------------------------------------------------------------
-- gatilhos de clientes
-- ---------------------------------------------------------------
create or replace function public.clientes_antes_de_salvar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.atualizado_em := now();
  -- auth.uid() nulo = SQL Editor / importação: liberado.
  if auth.uid() is not null and coalesce(usuario_papel() = 'diretoria', false) = false then
    if (tg_op = 'INSERT' and new.dossie_aberto_a_todos)
       or (tg_op = 'UPDATE' and new.dossie_aberto_a_todos is distinct from old.dossie_aberto_a_todos) then
      raise exception 'Só a diretoria libera o dossiê para todos os assessores.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists clientes_antes_de_salvar on clientes;
create trigger clientes_antes_de_salvar
  before insert or update on clientes
  for each row execute function public.clientes_antes_de_salvar();

create or replace function public.clientes_registrar_assessor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.assessor_id is not null then
      insert into clientes_historico_assessor (cliente_id, assessor_id) values (new.id, new.assessor_id);
    end if;
  elsif new.assessor_id is distinct from old.assessor_id then
    update clientes_historico_assessor set ate = current_date
      where cliente_id = new.id and ate is null;
    if new.assessor_id is not null then
      insert into clientes_historico_assessor (cliente_id, assessor_id) values (new.id, new.assessor_id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists clientes_registrar_assessor on clientes;
create trigger clientes_registrar_assessor
  after insert or update of assessor_id on clientes
  for each row execute function public.clientes_registrar_assessor();

-- ---------------------------------------------------------------
-- dossiês (Markdown, versionado a cada alteração de texto)
-- ---------------------------------------------------------------
create table if not exists dossies (
  cliente_id uuid primary key references clientes (id) on delete cascade,
  conteudo_md text not null default '',
  versao int not null default 1,
  atualizado_por uuid references usuarios (id) on delete set null,
  atualizado_em timestamptz not null default now()
);

create table if not exists dossies_versoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete cascade,
  versao int not null,
  conteudo_md text not null,
  atualizado_por uuid references usuarios (id) on delete set null,
  atualizado_em timestamptz not null,
  unique (cliente_id, versao)
);

create or replace function public.dossies_antes_de_salvar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.conteudo_md is distinct from old.conteudo_md then
    insert into dossies_versoes (cliente_id, versao, conteudo_md, atualizado_por, atualizado_em)
    values (old.cliente_id, old.versao, old.conteudo_md, old.atualizado_por, old.atualizado_em)
    on conflict (cliente_id, versao) do nothing;
    new.versao := old.versao + 1;
  end if;
  new.atualizado_em := now();
  new.atualizado_por := coalesce(auth.uid(), new.atualizado_por);
  return new;
end;
$$;

drop trigger if exists dossies_antes_de_salvar on dossies;
create trigger dossies_antes_de_salvar
  before insert or update on dossies
  for each row execute function public.dossies_antes_de_salvar();

-- ---------------------------------------------------------------
-- conteúdos (Trilha do Assessor)
-- ---------------------------------------------------------------
create table if not exists conteudos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  secao text not null default 'trilha',
  ordem int not null default 0,
  etapa text,
  titulo text not null,
  resumo text,
  corpo_md text not null default '',
  publicado boolean not null default true,
  atualizado_por uuid references usuarios (id) on delete set null,
  atualizado_em timestamptz not null default now()
);

create or replace function public.conteudos_antes_de_salvar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := coalesce(auth.uid(), new.atualizado_por);
  return new;
end;
$$;

drop trigger if exists conteudos_antes_de_salvar on conteudos;
create trigger conteudos_antes_de_salvar
  before insert or update on conteudos
  for each row execute function public.conteudos_antes_de_salvar();

-- ---------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------
alter table clientes enable row level security;
alter table clientes_historico_assessor enable row level security;
alter table dossie_liberacoes enable row level security;
alter table dossies enable row level security;
alter table dossies_versoes enable row level security;
alter table conteudos enable row level security;

drop policy if exists clientes_select on clientes;
create policy clientes_select on clientes for select
  using (pode_ver_cliente(id));

drop policy if exists clientes_insert on clientes;
create policy clientes_insert on clientes for insert
  with check (pode_gerir_cliente(assessor_id) or usuario_papel() = 'diretoria');

drop policy if exists clientes_update on clientes;
create policy clientes_update on clientes for update
  using (pode_gerir_cliente(assessor_id) or usuario_papel() = 'diretoria')
  with check (pode_gerir_cliente(assessor_id) or usuario_papel() = 'diretoria');

drop policy if exists clientes_delete on clientes;
create policy clientes_delete on clientes for delete
  using (usuario_papel() = 'diretoria');

drop policy if exists historico_select on clientes_historico_assessor;
create policy historico_select on clientes_historico_assessor for select
  using (pode_editar_cliente(cliente_id));

drop policy if exists liberacoes_select on dossie_liberacoes;
create policy liberacoes_select on dossie_liberacoes for select
  using (
    usuario_papel() = 'diretoria'
    or assessor_id = usuario_assessor_id()
    or (usuario_papel() = 'coordenacao' and pode_acessar_assessor(assessor_id))
  );

drop policy if exists liberacoes_write on dossie_liberacoes;
create policy liberacoes_write on dossie_liberacoes for all
  using (usuario_papel() = 'diretoria')
  with check (usuario_papel() = 'diretoria');

drop policy if exists dossies_select on dossies;
create policy dossies_select on dossies for select
  using (pode_ver_cliente(cliente_id));

drop policy if exists dossies_insert on dossies;
create policy dossies_insert on dossies for insert
  with check (pode_editar_cliente(cliente_id));

drop policy if exists dossies_update on dossies;
create policy dossies_update on dossies for update
  using (pode_editar_cliente(cliente_id))
  with check (pode_editar_cliente(cliente_id));

drop policy if exists dossies_delete on dossies;
create policy dossies_delete on dossies for delete
  using (usuario_papel() = 'diretoria');

drop policy if exists dossies_versoes_select on dossies_versoes;
create policy dossies_versoes_select on dossies_versoes for select
  using (pode_editar_cliente(cliente_id));

drop policy if exists conteudos_select on conteudos;
create policy conteudos_select on conteudos for select
  using ((publicado and usuario_papel() is not null) or usuario_papel() = 'diretoria');

drop policy if exists conteudos_write on conteudos;
create policy conteudos_write on conteudos for all
  using (usuario_papel() = 'diretoria')
  with check (usuario_papel() = 'diretoria');
