# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## What it is

Trilha Hub is the internal operations hub of a performance-marketing agency
(Trilha Performance Digital). One login, two experiences:

- **Assessor** (the account manager who runs a portfolio of clients): sees
  today's routine per client, who needs attention, the client dossiês, the
  agency's process and culture track ("Trilha do Assessor") and their own
  career-plan progress ("Trilha Coins").
- **Gestão** (coordination, performance manager, directors): sees the whole
  operation or their coordination portfolio, edits clients and dossiês,
  decides who can read which dossiê, runs the monthly Coins close and
  approves user access. Gestão can switch to "ver como assessor" to see the
  hub exactly as a given assessor sees it.

## Users and jobs

- Assessor, at the desk at the start of the day and between client calls:
  "what do I have to do today, for which client, and who is at risk?" Then
  opens a client's dossiê to work (objective, contacts, account shortcuts,
  weekly routine, cautions, SWOT, account reading).
- Coordination and directors, reviewing the operation: portfolio load per
  assessor (sum of client demand points against the level's ceiling),
  clients flagged as needing attention, clients without a dossiê, people
  waiting for access, the month's Coins close.

Desktop is the primary device (confirmed); phone use must still work.

## Roles and access

Three roles: `diretoria`, `coordenacao`, `assessor`. The performance manager
has the `diretoria` role. Coordination sees only the assessors linked to
them. An assessor sees their own clients plus dossiês released by gestão.
Row-level security in the database is the real barrier; the UI only mirrors
it.

## Terminology (pt-BR, keep in the product's own words)

Carteira (portfolio), dossiê, rotina / ritos (weekly per-client rituals),
"pede atenção" (flag set by coordination), nota de exigência (1–5 stars,
7–25 points per client), teto do nível (portfolio ceiling per career level:
júnior 85, pleno 120, sênior 160 points), Trilha Coins (career plan: monthly
recurring base of 1,300 coins, bonuses, checkpoints, promotions), Lançar mês,
checkpoint.

## Constraints

- The repository is public: no client, person or internal data in code,
  copy, comments, tests or design docs. Data lives in the database.
- Brand: Trilha orange `#EE4C20` as accent; PolySans is the brand typeface;
  the Trilha symbol and wordmark are never redrawn in another font.
- Interface language: Brazilian Portuguese, plain words, written for
  non-technical readers.
- Modules still to come and shown as "em breve": tasks and meetings from
  ClickUp, WhatsApp group health, routine checklists.

## Stack

Next.js 16 (App Router, Server Components and Server Actions), React 19,
Supabase (Postgres + RLS + Google auth), global CSS in `src/app/globals.css`
(Tailwind is imported but screens use their own classes), lucide-react icons.
Deployed on Vercel.
