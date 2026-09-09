<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TrilhaCoins

Sistema interno de gestão do plano de carreira dos Assessores de Marketing
da Trilha Performance Digital. Especificação completa em
`BRIEFING-trilhacoins.md` (na raiz do repo, referenciado aqui pelo mesmo
caminho) — onde o briefing e qualquer protótipo divergirem, **o briefing
vence**.

Ordem de implementação (briefing §11) — não pule etapas:

1. Modelo de dados e tabelas de pontuação (`supabase/migrations/`,
   `supabase/seed.sql`), motor de cálculo com testes — **feito**,
   ver `src/lib/trilhacoins/`.
2. Telas de coordenação sem autenticação, com dados reais de um mês —
   **feito**: Equipe, Lançar mês, Assessor e Ajustes, ver `src/app/(app)/`.
3. Auth Google (domínio `somostrilha.com.br`) + papéis + RLS — **feito**.
   `src/lib/supabase/` (client/server/proxy), `src/lib/auth/sessao.ts`
   (sessão cruzada com `usuarios`), `src/app/login/`, `src/app/auth/`,
   `src/proxy.ts` (renomeado de middleware no Next 16). RLS em
   `supabase/migrations/0002_rls.sql`. `src/lib/data/repo.ts` fala
   direto com o Supabase (RLS filtra por papel) — não existe mais store
   local; a única exceção é a tabela de pontuação (`metas`/`niveis`),
   que ainda vem das constantes de `src/lib/trilhacoins`, não do banco
   (não há tela de edição para elas ainda — ver pendência abaixo).
4. Painel do assessor e ranking — **feito**. `/assessor/[id]` some com
   o seletor e a aba vira "Meu painel" para quem tem papel `assessor`
   (§8.2). O ranking do mês é a function `ranking_mes` do banco
   (`supabase/migrations/0004_nomes_ranking.sql`), não uma query
   direta nas tabelas: uma sessão de assessor não tem RLS para ler o
   lançamento dos colegas e recalcular sozinha, então a function roda
   como security definer e devolve só `id, nome, pct_base` agregado —
   nunca a meta a meta de ninguém. `src/lib/trilhacoins/ranking.ts` tem
   `montarRankingDePctBase` para montar posição/pódio a partir disso
   (`calcularRankingMes`, usado no motor puro, continua existindo para
   quem já tem os lançamentos brutos em mãos). Componente:
   `src/components/ranking-mes.tsx`.
5. Log e fluxo de reabertura — **feito**. Seção "Log" em Ajustes
   (`src/components/ajustes-log.tsx`, `repo.listarLog`), os 50 mais
   recentes. `apuracoes.foi_reaberta` (`supabase/migrations/0005_apuracao_reaberta.sql`)
   é um flag que nunca volta a `false` depois de uma reabertura —
   sinaliza no painel do assessor (Detalhamento do mês) que aquele mês
   foi ajustado depois do fechamento original, atendendo o §9 ("o
   assessor deve ver que houve ajuste").
6. Notificação de fechamento do mês (n8n).

**Provisionamento de acesso** (não é uma das etapas do §11, mas era
pendência): `supabase/migrations/0003_provisionar_usuario.sql` cria
uma linha em `usuarios` automaticamente (inativa, papel `assessor`
por padrão) no primeiro login de qualquer pessoa, via trigger em
`auth.users`. A diretoria aprova — define papel, vincula ao assessor
correspondente se for o caso, marca ativo — na seção "Usuários" de
Ajustes (`src/components/ajustes-usuarios.tsx`). Continua valendo o
"quem loga sem cadastro aprovado não entra em nada" do §4.

O motor de cálculo (`src/lib/trilhacoins/`) é puro e cobre por teste
todas as fórmulas do §6 do briefing — trate esse contrato como
autoritativo antes de alterar qualquer fórmula. `metas`/`niveis` são
recebidos como parâmetros pelas funções de pontuação (não hardcoded):
a régua vive em dado, nunca em código (§4).

