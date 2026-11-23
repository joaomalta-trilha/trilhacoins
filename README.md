# Trilha Hub

O hub da operação da Trilha Performance Digital. Um login (Google
`@somostrilha.com.br`) e duas experiências:

- **Assessor** — Início com a rotina do dia, Minha carteira com o dossiê de
  cada cliente, Trilha do Assessor (processos e cultura) e Trilha Coins.
- **Gestão** (coordenação, gerente e diretoria) — Visão geral das
  carteiras, cadastro de clientes, edição e liberação de dossiês, edição da
  Trilha do Assessor, Usuários e o Trilha Coins completo.

O Hub nasceu do repositório do TrilhaCoins: o Coins virou um módulo em
`/coins`, com as mesmas telas e regras (ver `BRIEFING-trilhacoins.md`).

Stack: Next.js 16 (App Router) + TypeScript + Supabase (Postgres, RLS, Auth
Google) + Vercel (`gru1`).

## Quem vê o quê

| | Assessor | Coordenação | Diretoria / Gestão |
|---|---|---|---|
| Clientes e dossiês | os da carteira + os liberados pela gestão | os da carteira de assessores dela | todos |
| Editar cliente e dossiê | — | os da carteira | todos |
| Liberar dossiê para outros assessores | — | — | ✅ |
| Editar a Trilha do Assessor | — | — | ✅ |
| Usuários e papéis | — | — | ✅ |
| Trilha Coins | o próprio painel | regras do briefing do Coins | regras do briefing do Coins |

O gerente de performance entra com o papel **Diretoria / Gestão** (mesmos
acessos); o cargo é só o nome que aparece na tela. Toda regra de acesso
vive no banco (RLS, `supabase/migrations/`) — o menu só esconde links.

## Estrutura

- `src/app/(app)/` — telas atrás do login: `inicio/`, `clientes/`,
  `trilha/`, `gestao/` e `coins/` (o TrilhaCoins).
- `src/lib/hub/` — regras puras do Hub, com testes: navegação por papel,
  leitura do dossiê em Markdown, nota de exigência da carteira.
- `src/lib/trilhacoins/` — motor de cálculo do Coins, com testes.
- `src/lib/data/hub.ts` e `src/lib/data/repo.ts` — únicas portas para o
  banco (o RLS filtra por papel).
- `src/app/hub-actions.ts` e `src/app/actions.ts` — Server Actions.
- `supabase/migrations/` — schema, em ordem. `0007_hub_fundacao.sql` cria
  clientes, dossiês, liberações e conteúdos do Hub.
- `scripts/importacao/` — gera a importação a partir da Trilha do Assessor.
  Os dados ficam em `data/` (fora do git: o repositório é público).

## Rodando localmente

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # regras do Hub e motor do Coins (vitest)
npm run lint
```

## Colocando a fase 1 no ar — passo a passo

1. **Banco.** No Supabase, abra *SQL Editor → New query*, cole o conteúdo de
   `supabase/migrations/0007_hub_fundacao.sql` e clique em *Run*. Ela só
   acrescenta coisas: o Coins continua funcionando igual.
2. **Clientes.** Rode `data/seed/10_clientes.sql` do mesmo jeito. A última
   consulta lista quem ficou sem assessor vinculado — vincule depois em
   *Clientes → Editar*.
3. **Dossiês.** Rode `data/seed/11_dossies_parte1.sql` até a `parte4`, um
   de cada vez.
4. **Trilha do Assessor.** Rode `data/seed/20_trilha_conteudos.sql`.
5. **Pessoas.** No Hub, em *Gestão → Usuários*, preencha nome e cargo de
   cada pessoa (ex.: "Gerente de Performance" com papel Diretoria / Gestão)
   e o ID do ClickUp.

Os arquivos de importação podem ser rodados de novo sem apagar nada do que
foi editado no Hub.

Para gerar a importação de novo (quando a Trilha do Assessor mudar):
`python3 -I scripts/importacao/gerar_seed.py`.

## Endereços

Os endereços antigos do Coins (`/equipe`, `/lancar`, `/assessor`,
`/ajustes`) redirecionam para `/coins/...`. Quando o domínio
`hub.trilhaperformance.com.br` for adicionado ao mesmo projeto da Vercel,
`coins.trilhaperformance.com.br` continua funcionando.

## Próximas fases

Ver `BRIEFING-trilhahub.md` (fora do git): fase 2 (rotinas como checklist),
fase 3 (ClickUp: tarefas em atraso, reuniões realizadas, check-ins) e fase 4
(painel de saúde dos grupos de WhatsApp dentro do Hub, com login).
