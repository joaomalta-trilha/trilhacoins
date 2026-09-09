-- Seed das tabelas de pontuação. Espelha exatamente
-- src/lib/trilhacoins/{niveis,metas}.ts — mantenha os dois em sincronia
-- até a etapa 4, quando o app passa a ler estas tabelas do banco em
-- vez das constantes TS.

insert into niveis (codigo, nome, ordem, custo_promocao) values
  ('Júnior I', 'Júnior I', 1, 2700),
  ('Júnior II', 'Júnior II', 2, 4000),
  ('Júnior III', 'Júnior III', 3, 6800),
  ('Pleno I', 'Pleno I', 4, 8100),
  ('Pleno II', 'Pleno II', 5, 8100),
  ('Pleno III', 'Pleno III', 6, 8100),
  ('Sênior I', 'Sênior I', 7, 12200),
  ('Sênior II', 'Sênior II', 8, 12200),
  ('Sênior III', 'Sênior III', 9, 16200),
  ('Partner', 'Partner', 10, null);

insert into metas (codigo, nome, tipo, grupo, teto, ordem, por_unidade) values
  ('3.1', 'Nota de relacionamento', 'escala', 'recorrente', 300, 1, null),
  ('3.2', 'Taxa de churn', 'escala', 'recorrente', 200, 2, null),
  ('3.3', 'Adesão a feedback', 'escala', 'recorrente', 200, 3, null),
  ('3.4', 'Entregas no prazo', 'percentual', 'recorrente', 200, 4, null),
  ('3.5', 'Reuniões com clientes', 'percentual', 'recorrente', 200, 5, null),
  ('3.6', 'Presença e cultura', 'escala', 'recorrente', 200, 6, null),
  ('3.7', 'Upsell de serviços', 'escala', 'bonus', null, 7, null),
  ('3.8', 'Indicação de novos clientes', 'contagem', 'bonus', null, 8, 300),
  ('3.9', 'Certificações', 'livre', 'bonus', null, 9, null);

insert into faixas_pontuacao (meta_codigo, rotulo, valor_minimo, coins, ordem) values
  ('3.1', 'Excelente', null, 300, 1),
  ('3.1', 'Boa', null, 150, 2),
  ('3.1', 'Insatisfatória', null, 0, 3),

  ('3.2', '0 churns', null, 200, 1),
  ('3.2', '1 churn', null, 50, 2),
  ('3.2', '2+ churns', null, 0, 3),

  ('3.3', 'Muito', null, 200, 1),
  ('3.3', 'Razoável', null, 100, 2),
  ('3.3', 'Pouco', null, 50, 3),
  ('3.3', 'Nenhum', null, 0, 4),

  ('3.4', '≥ 90%', 90, 200, 1),
  ('3.4', '80–89%', 80, 100, 2),
  ('3.4', '70–79%', 70, 50, 3),
  ('3.4', '< 70%', 0, 0, 4),

  ('3.5', '≥ 90%', 90, 200, 1),
  ('3.5', '70–89%', 70, 100, 2),
  ('3.5', '50–69%', 50, 50, 3),
  ('3.5', '< 50%', 0, 0, 4),

  ('3.6', 'Excelente', null, 200, 1),
  ('3.6', 'Bom', null, 100, 2),
  ('3.6', 'Regular', null, 50, 3),
  ('3.6', 'Insatisfatório', null, 0, 4),

  ('3.7', 'Acima de R$ 2.000', null, 300, 1),
  ('3.7', 'R$ 1.000 a 2.000', null, 200, 2),
  ('3.7', 'R$ 500 a 1.000', null, 100, 3),
  ('3.7', 'Até R$ 500', null, 50, 4),
  ('3.7', 'Nenhum', null, 0, 5);

-- 3.8 (contagem) e 3.9 (livre) não têm faixas — o valor lançado
-- alimenta o cálculo direto (qtd × por_unidade / coins livres).

-- ---------------------------------------------------------------
-- Assessores — placeholders genéricos, não os nomes/níveis reais da
-- equipe (esse dado já está cadastrado direto no Supabase de produção;
-- este arquivo é público no repositório, então não é o lugar pra
-- informação de RH de ninguém). saldo_inicial fica em 0 de propósito:
-- é uma decisão pendente do briefing (§12, "Saldo inicial dos 7
-- assessores"), não algo para inventar no seed.
-- ---------------------------------------------------------------
insert into assessores (nome, nivel, saldo_inicial) values
  ('Assessor 1', 'Sênior II', 0),
  ('Assessor 2', 'Sênior I', 0),
  ('Assessor 3', 'Pleno I', 0),
  ('Assessor 4', 'Sênior I', 0),
  ('Assessor 5', 'Júnior I', 0),
  ('Assessor 6', 'Pleno I', 0),
  ('Assessor 7', 'Sênior I', 0);
