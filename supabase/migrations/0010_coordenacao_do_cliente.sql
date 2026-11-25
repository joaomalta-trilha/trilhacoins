-- Coordenação do cliente (Clientes → coluna Coordenação, editável na linha).
--
-- Até aqui a coordenação de um cliente era derivada do assessor (via
-- coordenacoes_assessores). Na operação ela é do cliente: a planilha de
-- controle de carteira e o campo "Coordenador" do ClickUp guardam uma
-- coordenadora por cliente. Esta migration:
--
--   1. cria clientes.coordenacao_id, preenchida com a coordenação de hoje
--      (a do assessor de cada cliente);
--   2. mantém o padrão sozinha: cliente novo herda a coordenação do
--      assessor; trocar o assessor leva a coordenação junto quando ela
--      acompanhava o assessor antigo (ou estava vazia). Quem trocou a
--      coordenação à mão continua com a escolha;
--   3. deixa a coordenadora do cliente ver e editar o cliente, mesmo que o
--      assessor não esteja na carteira dela (só soma acesso, não tira).
--
-- coordenacoes_assessores continua valendo para o Coins e para o padrão
-- acima. Idempotente e aditiva: pode rodar de novo sem efeito.

alter table clientes
  add column if not exists coordenacao_id uuid references usuarios (id) on delete set null;

create index if not exists idx_clientes_coordenacao on clientes (coordenacao_id);

comment on column clientes.coordenacao_id is
  'Coordenadora do cliente. Padrão: a coordenação do assessor (trigger clientes_coordenacao_padrao).';

-- ---------------------------------------------------------------
-- a coordenação de um assessor (uma pessoa; com mais de uma, a primeira
-- por nome, para ser sempre a mesma)
-- ---------------------------------------------------------------
create or replace function public.coordenacao_do_assessor(assessor_id_alvo uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ca.usuario_id
  from coordenacoes_assessores ca
  join usuarios u on u.id = ca.usuario_id
  where ca.assessor_id = assessor_id_alvo
    and u.papel = 'coordenacao'
    and u.ativo
    and u.removido_em is null
  order by u.nome nulls last, u.email
  limit 1;
$$;

revoke all on function public.coordenacao_do_assessor(uuid) from public;
grant execute on function public.coordenacao_do_assessor(uuid) to authenticated;

-- ---------------------------------------------------------------
-- padrão da coordenação ao criar o cliente e ao trocar o assessor
-- ---------------------------------------------------------------
create or replace function public.clientes_coordenacao_padrao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  do_novo uuid;
begin
  if tg_op = 'INSERT' then
    if new.coordenacao_id is null and new.assessor_id is not null then
      new.coordenacao_id := coordenacao_do_assessor(new.assessor_id);
    end if;
    return new;
  end if;

  -- troca de assessor sem escolha explícita de coordenação no mesmo update
  if new.assessor_id is distinct from old.assessor_id
     and new.coordenacao_id is not distinct from old.coordenacao_id
     and (old.coordenacao_id is null
          or old.coordenacao_id is not distinct from coordenacao_do_assessor(old.assessor_id)) then
    do_novo := coordenacao_do_assessor(new.assessor_id);
    if do_novo is not null then
      new.coordenacao_id := do_novo;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists clientes_coordenacao_padrao on clientes;
create trigger clientes_coordenacao_padrao
  before insert or update of assessor_id on clientes
  for each row execute function public.clientes_coordenacao_padrao();

-- ---------------------------------------------------------------
-- preenche a coordenação de hoje (só onde ainda está vazia)
-- ---------------------------------------------------------------
update clientes c
set coordenacao_id = coordenacao_do_assessor(c.assessor_id)
where c.coordenacao_id is null
  and c.assessor_id is not null
  and coordenacao_do_assessor(c.assessor_id) is not null;

-- ---------------------------------------------------------------
-- acesso: a coordenadora do cliente vê e edita o cliente.
-- Mesmo corpo da migration 0007, com uma condição a mais.
-- ---------------------------------------------------------------
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
        or (usuario_papel() = 'coordenacao' and c.coordenacao_id = auth.uid())
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
    or (
      select pode_gerir_cliente(c.assessor_id)
        or (usuario_papel() = 'coordenacao' and c.coordenacao_id = auth.uid())
      from clientes c
      where c.id = cliente_id_alvo
    ),
    false
  );
$$;

drop policy if exists clientes_update on clientes;
create policy clientes_update on clientes for update
  using (
    pode_gerir_cliente(assessor_id)
    or usuario_papel() = 'diretoria'
    or (usuario_papel() = 'coordenacao' and coordenacao_id = auth.uid())
  )
  with check (
    pode_gerir_cliente(assessor_id)
    or usuario_papel() = 'diretoria'
    or (usuario_papel() = 'coordenacao' and coordenacao_id = auth.uid())
  );
