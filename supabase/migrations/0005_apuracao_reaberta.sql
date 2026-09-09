-- Etapa 5 (briefing §11, §9): "o assessor deve ver que houve ajuste"
-- quando um mês fechado é reaberto e editado. `fechada_em` sozinho não
-- basta pra sinalizar isso (fechar de novo depois de reabrir também
-- atualiza esse campo). Um flag que nunca volta a false depois de uma
-- reabertura resolve sem precisar reconstruir histórico a partir do log.

alter table apuracoes
  add column if not exists foi_reaberta boolean not null default false;
