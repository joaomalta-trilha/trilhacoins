-- Nota de exigência por critério (Clientes → coluna Carteira).
--
-- Até aqui o cliente guardava só o total (`exigencia_pts`, 7 a 25). O
-- pop-up da carteira passa a gravar a nota de cada um dos sete critérios
-- da planilha de controle de carteira, para dar para rever a nota depois
-- sem refazer a conta de cabeça. O total continua em `exigencia_pts`: é o
-- que a soma da carteira, as estrelas e o teto por nível já usam.
--
-- Formato: {"volume": 2, "complexidade": 1, "relacionamento": 3,
-- "canais": 2, "urgencia": 1, "reunioes": 2, "importancia": 5}. Quem
-- valida as chaves e as faixas é o app (src/lib/hub/exigencia.ts).
--
-- Idempotente e aditiva: pode rodar de novo sem efeito. Quem pode gravar
-- continua sendo a policy de update de `clientes` (migration 0007).

alter table clientes
  add column if not exists exigencia_criterios jsonb
    check (exigencia_criterios is null or jsonb_typeof(exigencia_criterios) = 'object');

comment on column clientes.exigencia_criterios is
  'Notas dos sete critérios de exigência (chave → nota de 1 ao peso do critério). O total fica em exigencia_pts.';
