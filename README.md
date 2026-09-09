# TrilhaCoins

Sistema interno de gestão do plano de carreira dos Assessores de Marketing
da Trilha Performance Digital. A especificação completa está em
[`BRIEFING-trilhacoins.md`](./BRIEFING-trilhacoins.md) — leia-a antes de
mexer em regra de negócio. O protótipo React de referência (layout e
comportamento, sem backend) está em
[`reference/trilhacoins-dashboard.jsx`](./reference/trilhacoins-dashboard.jsx).
Onde os dois divergirem, o briefing vence.

Stack: Next.js (App Router) + Supabase (Postgres/RLS/Auth Google).

## Estrutura

- `src/lib/trilhacoins/` — motor de cálculo puro (saldo, pontuação,
  projeção, checkpoint, ranking). Sem dependência de UI, banco ou
  auth. Cada arquivo tem seu `*.test.ts` ao lado.
- `src/lib/data/repo.ts` — única porta de entrada para dados. Fala
  direto com o Supabase; o RLS do banco decide o que cada papel vê,
  não o código aqui.
- `src/lib/supabase/` — clients Supabase (`client.ts` navegador,
  `server.ts` Server Components/Actions, `middleware.ts` usado pelo
  `src/proxy.ts` — "Proxy" é o nome do middleware a partir do Next 16).
- `src/lib/auth/sessao.ts` — sessão do usuário logado cruzada com a
  tabela `usuarios` (papel, assessor vinculado).
- `src/app/(app)/` — telas atrás do login: `equipe/`, `lancar/`,
  `assessor/[id]/` e `ajustes/` (§8.1), mais o layout que faz o gate de
  auth e o nav por papel. `src/app/actions.ts` reúne os Server Actions
  de dados; `src/app/auth/` os de login/logout. `src/app/login/` é a
  única tela pública.
- `src/components/` — UI compartilhada (cards, tabelas, gráfico de
  histórico, seletores de mês/assessor).
- `supabase/migrations/` — schema (tabelas de `assessores`,
  `usuarios`, `apuracoes`, `lancamentos`, `metas`,
  `faixas_pontuacao`, `niveis`, `promocoes`, `log`).
- `supabase/seed.sql` — seed das tabelas de pontuação, espelhando
  `src/lib/trilhacoins/{metas,niveis}.ts`.

## Rodando localmente

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # suíte do motor de cálculo (vitest)
npm run test:watch
npm run lint
```

## Ordem de implementação (briefing §11)

1. **Modelo de dados + motor de cálculo, com testes.** ✅
2. **Telas de coordenação sem autenticação, com dados reais de um mês.** ✅
3. **Auth Google (`somostrilha.com.br`) + papéis + RLS.** ✅
4. **Painel do assessor e ranking.** ✅ Sem seletor para quem só tem o
   próprio painel (`papel: assessor`); ranking do mês (pódio nomeado +
   própria posição, nunca a lista inteira) via function do banco.
5. **Log e fluxo de reabertura.** ✅ Seção "Log" em Ajustes (só
   diretoria vê, RLS). Um mês reaberto e reajustado fica marcado — o
   assessor vê no próprio painel que houve correção depois do
   fechamento original (§9).
6. Notificação de fechamento do mês (n8n).

Configuração necessária: copie `.env.example` para `.env.local` e
preencha com a URL e a `anon key` do projeto Supabase (Project
Settings > Data API). Rode as migrations em `supabase/migrations/` em
ordem, uma vez cada, no SQL Editor do Supabase.

Dar acesso a uma pessoa nova: ela loga uma vez com a conta
`@somostrilha.com.br` (cai em "Sem acesso" — esperado) e aparece
inativa na seção **Usuários** de Ajustes. A diretoria define o papel,
vincula ao assessor correspondente se for o caso, e marca ativo.

## Pendências de decisão (briefing §12)

- Saldo inicial dos 7 assessores (hoje em 0 no seed — critério ainda
  não definido pela diretoria).
- Pódio nomeado no ranking vs. só posição relativa.
- Apuração proporcional para quem entra no meio do mês.
