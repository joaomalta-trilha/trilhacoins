-- Etapa 4 (briefing §11) — ranking do mês, pódio nomeado (§7).
--
-- Problema: calcular o ranking exige comparar o % da base de TODO
-- mundo, mas o RLS de `apuracoes`/`lancamentos` (0002_rls.sql) restringe
-- um usuário com papel "assessor" a enxergar só os próprios
-- lançamentos — de propósito, é o que impede ver os coins dos colegas.
-- Isso torna impossível montar o ranking a partir de uma sessão comum
-- de assessor: ele não consegue nem ler os dados dos outros para somar.
--
-- Solução: uma função security definer que já devolve só o resultado
-- agregado (nome + % da base), nunca a lista de metas/coins por
-- trás — ela roda com o dono da função (bypassa o RLS por baixo), mas
-- só expõe o que está no `select`. Continua valendo "quem não tem
-- linha ativa em usuarios não vê nada" (checado via usuario_papel()).

create or replace function public.ranking_mes(mes_param date)
returns table (assessor_id uuid, nome text, pct_base numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id as assessor_id,
    a.nome,
    coalesce(sum(l.coins) filter (where m.grupo = 'recorrente'), 0) / 1300.0 * 100 as pct_base
  from assessores a
  left join apuracoes ap on ap.assessor_id = a.id and ap.mes = mes_param
  left join lancamentos l on l.apuracao_id = ap.id
  left join metas m on m.codigo = l.meta_codigo
  where a.ativo = true and usuario_papel() is not null
  group by a.id, a.nome
  order by pct_base desc, a.nome;
$$;

revoke all on function public.ranking_mes(date) from public;
grant execute on function public.ranking_mes(date) to authenticated;
