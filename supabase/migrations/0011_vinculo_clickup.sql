-- Vínculo cliente do Hub ↔ ClickUp (fase 3, primeiro passo).
--
-- A regra: toda tarefa de cliente no ClickUp (reuniões, check-ins,
-- entregas) leva o cliente no campo suspenso "Clientes". Cada cliente do
-- Hub guarda o ID da opção desse campo em clientes.clickup_cliente_opcao
-- (coluna da migration 0007), e a tarefa chega ao cliente por esse ID,
-- nunca pelo nome da tarefa. Mais de um cliente pode apontar para a mesma
-- opção (um grupo que o ClickUp trata como um cliente só).
--
-- Esta migration guarda as opções do campo no banco, para a gestão
-- escolher a opção de cada cliente no Hub. Os nomes das opções são nomes
-- de clientes: a carga fica fora do git (data/seed), e quem lê é só a
-- gestão. Idempotente e aditiva: pode rodar de novo sem efeito.

create table if not exists clickup_opcoes_clientes (
  id uuid primary key,          -- ID da opção no ClickUp (não muda quando a opção é renomeada)
  nome text not null,
  ordem int,
  atualizado_em timestamptz not null default now()
);

comment on table clickup_opcoes_clientes is
  'Opções do campo suspenso "Clientes" do ClickUp. clientes.clickup_cliente_opcao aponta para uma delas.';

alter table clickup_opcoes_clientes enable row level security;

drop policy if exists clickup_opcoes_select on clickup_opcoes_clientes;
create policy clickup_opcoes_select on clickup_opcoes_clientes for select
  using (eh_diretoria_ou_coordenacao());

drop policy if exists clickup_opcoes_escrita on clickup_opcoes_clientes;
create policy clickup_opcoes_escrita on clickup_opcoes_clientes for all
  using (usuario_papel() = 'diretoria')
  with check (usuario_papel() = 'diretoria');

create index if not exists idx_clientes_clickup_opcao on clientes (clickup_cliente_opcao);
