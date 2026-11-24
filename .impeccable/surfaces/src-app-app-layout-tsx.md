---
version: 1
slug: "src-app-app-layout-tsx"
primary_target: "src/app/(app)/layout.tsx"
related_targets: []
---

# Trilha Hub — app shell and all authenticated screens

Mode: Operate (desktop first, phone must work).
Scope: shell/navigation, Início, Visão geral, Clientes, cliente (dossiê), Trilha do Assessor, Trilha Coins, Usuários, login.
Replaces the previous "dark sidebar + bordered boxes" look entirely (user: "parece sistema dos anos 2000").
Pinned reference (user-provided): the agency's own "Saúde dos Clientes" panel. The brief wins over category habit.
User answers: computer first; top bar with pill navigation (logo left, sections center, profile right); Início leads with today's routine and who needs attention, carteira/Coins numbers below.

## Direction contract

THESIS: A calm cockpit, not an admin panel. Each screen answers "what now?" in large light type on a warm paper ground, and pushes reference detail into a dark rounded band below. Refuses the sidebar-plus-bordered-tables default and grey label soup.

OWN-WORLD: Paper #e6e6e3 with a blurred brown→orange→amber glow behind the top; borderless white cards, 26px radius; PolySans Slim for body and big numbers (light, tight tracking), PolySans Median for titles and labels; ink #141414 pills 40px with a black pressed state; black 36px circle with ↗ that turns 45° on hover; thin outlined icon circles; dark band #111110 with 32px top radius and notch, inner panels #1b1b1a; orange #ee4c20 only for state and "hoje".

STORY: The assessor sees today's ritos per client and who is at risk before anything else, opens a client in one click, and checks carteira and Coins below. Gestão sees the operation's numbers, then each assessor's portfolio load ranked in the dark band, and acts (link client, approve person, close month).

FIRST VIEWPORT: Top bar (mark + "trilha hub" left, section pills center, Gestão|Assessor segmented switch + avatar right). Início: left, greeting h1 ~54px with date and "N ritos em M clientes" lede plus weekday sub-pills; right, the "pedem atenção" gradient card with client chips; below, white routine cards per client in 3 columns. Visão geral: h1 + lede left, big light "clientes ativos" number right, then 3×2 metric cards with go arrows; dark band with ranked carteira rows.

FORM: Two-layer dashboard (light hero + dark band), fixed by the pinned reference and the user's three answers; no structure dice or seed were used.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
