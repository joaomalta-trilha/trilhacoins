---
name: Trilha Hub
description: The agency's internal operations hub, a calm cockpit on warm paper with a dark band for reference detail.
colors:
  paper: "#e6e6e3"
  card-white: "#ffffff"
  ink: "#141414"
  ink-2: "#4a4d4b"
  muted: "#5f625f"
  placeholder: "#6f7370"
  line: "#dcdcd8"
  line-soft: "#ececea"
  soft: "#f3f3f1"
  trilha-orange: "#ee4c20"
  orange-ink: "#c93d18"
  amber: "#f3a23a"
  band: "#111110"
  band-panel: "#1b1b1a"
  band-panel-hover: "#232321"
  band-line: "#2a2a28"
  band-muted: "#8d8d88"
  band-ink: "#ededea"
  band-soft: "#d9d9d5"
  ok: "#5fbf8a"
  warn: "#f0a531"
  bad: "#e0492a"
  ok-bg: "#e3f2e9"
  ok-ink: "#23633f"
  wait-bg: "#fdf0dc"
  wait-ink: "#8a5a00"
  bad-bg: "#fbe7e1"
  bad-ink: "#a8321a"
typography:
  display:
    fontFamily: "PolySans, Helvetica Neue, Arial, sans-serif"
    fontSize: "108px"
    fontWeight: 400
    lineHeight: 0.84
    letterSpacing: "-0.045em"
    fontFeature: "tnum"
  headline:
    fontFamily: "PolySans, Helvetica Neue, Arial, sans-serif"
    fontSize: "54px"
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "-0.02em"
  section:
    fontFamily: "PolySans, Helvetica Neue, Arial, sans-serif"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  number:
    fontFamily: "PolySans, Helvetica Neue, Arial, sans-serif"
    fontSize: "38px"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  title:
    fontFamily: "PolySans, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.3
  body:
    fontFamily: "PolySans, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  lede:
    fontFamily: "PolySans, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "PolySans, Helvetica Neue, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.3
  button:
    fontFamily: "PolySans, Helvetica Neue, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1
rounded:
  field: "12px"
  sm: "14px"
  note: "18px"
  md: "20px"
  panel: "22px"
  popover: "24px"
  card: "26px"
  band: "32px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "16px"
  card-x: "22px"
  hero-gap: "40px"
  gutter: "40px"
  gutter-tablet: "20px"
  gutter-phone: "16px"
  section: "56px"
  band-top: "72px"
  container: "1320px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card-white}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "#2e2e2c"
  button-secondary:
    backgroundColor: "rgba(255, 255, 255, 0.55)"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 20px"
  button-secondary-hover:
    backgroundColor: "{colors.card-white}"
  button-danger:
    backgroundColor: "{colors.orange-ink}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.pill}"
    height: "40px"
  pill:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 20px"
  pill-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card-white}"
  sub-pill:
    backgroundColor: "rgba(255, 255, 255, 0.35)"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "34px"
    padding: "0 16px"
  sub-pill-active:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
  card:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px 22px 22px"
  band:
    backgroundColor: "{colors.band}"
    textColor: "{colors.band-ink}"
    rounded: "{rounded.band}"
    padding: "56px 0 96px"
  band-panel:
    backgroundColor: "{colors.band-panel}"
    textColor: "{colors.band-ink}"
    rounded: "{rounded.panel}"
    padding: "22px 24px 24px"
  go-arrow:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.pill}"
    size: "36px"
  icon-circle:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    size: "36px"
  input:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "9px 12px"
    height: "38px"
  search-pill:
    backgroundColor: "rgba(255, 255, 255, 0.55)"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 16px"
  chip:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  chip-choice:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    height: "28px"
    padding: "0 11px"
  chip-choice-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card-white}"
  switch:
    backgroundColor: "#d3d3ce"
    rounded: "{rounded.pill}"
    width: "38px"
    height: "22px"
  switch-on:
    backgroundColor: "{colors.ink}"
---

# Design System: Trilha Hub

## Overview

**Creative North Star: "The Calm Cockpit"**

Trilha Hub is the agency's own "Saúde dos Clientes" panel grown into a whole working tool. Every screen answers "what now?" in large, light type on a warm paper ground, then pushes reference detail down into a dark rounded band. It is a two-layer dashboard: a light hero layer where the day's routine, who needs attention and the headline number live, and a dark layer below where rankings, weekly calendars and portfolio panels sit.

The density is Operate-mode but unhurried. White cards carry no border and no resting shadow; they float on paper by tone alone. Numbers are set big and thin rather than bold, so a figure reads as calm information instead of an alarm. Black does the work of emphasis (pressed pills, the arrow circle, primary buttons), and Trilha orange is spent only on state: something needs attention, something is complete, something is today. Behind the top of every screen a blurred brown, orange and amber glow drifts slowly; it is the one atmospheric gesture, and nothing else on the page animates on load.

This world explicitly replaces a "dark sidebar plus bordered boxes" admin look. Navigation is a top bar of pills, never a sidebar; containers are tonal, never boxed in hairlines.

**Key Characteristics:**
- Warm paper ground with a single drifting orange glow behind the top.
- Borderless white cards with a generous 26px radius; depth by tone, shadow only on hover.
- PolySans in two self-hosted faces: Slim for text and big light numbers, Median for small titles, buttons and emphasis.
- Ink-black pills and a black arrow circle as the interactive vocabulary.
- A dark band with a 32px top radius and a notch holds ranked and reference content.
- Orange is state, never decoration.

## Colors

A near-neutral warm-grey system with one brand orange held in reserve and a second, near-black world for the band.

### Primary
- **Trilha Orange** (trilha-orange): the brand accent. Used only for state: the attention dot on icon circles, count badges, the "completa" fill of progress bars, the first place in a ranking or podium, star ratings, the focus ring, text caret and the "hoje" marker. Also the hot core of the top glow.
- **Burnt Orange Ink** (orange-ink): orange for small text on light grounds, where Trilha Orange would fail contrast ("hoje" inside a sub-pill, highlighted summary numbers), and the fill of destructive buttons.
- **Glow Amber** (amber): appears only inside the blurred glows (top of page, the dark Coins card); never as a fill or text color.

### Neutral
- **Warm Paper** (paper): the page ground everywhere, including the notch cut into the band.
- **Card White** (card-white): cards, popovers, inputs, the sticky anchor rail.
- **Ink** (ink): text, pressed pills, primary buttons, the arrow circle, the brand mark disc, switch and toggle "on".
- **Graphite** (ink-2): secondary text, ledes, body copy inside cards.
- **Sage Grey** (muted): labels, counts, captions, helper text.
- **Placeholder Grey** (placeholder): placeholder text in fields and search.
- **Hairline** (line) and **Soft Hairline** (line-soft): table header rules, field strokes, dividers inside cards. Hairlines separate rows, never outline cards.
- **Mist** (soft): chip fill, mini-tab track, fieldset ground, blockquotes, inline code.

### Band (dark layer)
- **Night** (band): the dark band and the dark Coins card.
- **Night Panel** (band-panel) and **Night Panel Lifted** (band-panel-hover): panels, ranked rows and weekday cards inside the band; the lifted tone is their hover.
- **Night Line** (band-line): dividers and outlined links inside the band.
- **Night Muted** (band-muted), **Night Ink** (band-ink), **Night Soft** (band-soft): captions, default text and body text on dark.

### Status
- **Confirm Green** (ok), **Wait Amber** (warn), **Alert Red** (bad): progress fills, done-task circles and SWOT markers.
- Tinted pairs for chips and notices: ok-bg / ok-ink, wait-bg / wait-ink, bad-bg / bad-ink. On the band these become translucent fills with lightened text.

### Named Rules
**The Orange Is State Rule.** Trilha Orange marks a condition (needs attention, complete, first, today, focused). It is never a heading color, a section fill, a decorative stripe or a brand flourish. If removing the orange would lose no information, it should not be orange.

**The Small Orange Rule.** Orange text under 18px on a light ground uses Burnt Orange Ink, never Trilha Orange.

## Typography

**Display Font:** PolySans Slim (self-hosted woff2, weights 100–449), with Helvetica Neue, Arial fallback
**Body Font:** PolySans Slim
**Title / Label Emphasis Font:** PolySans Median (self-hosted woff2, weights 450–1000)

**Character:** One family, two cuts. Slim is light and wide-set, which lets very large numbers and headings feel quiet; Median is the only emphasis, used small. Any weight from 450 up lands on Median, and `font-synthesis-weight: none` guarantees bold is never faked. There is no serif and no third face (a monospace stack appears only for code and the Markdown editor).

### Hierarchy
- **Display** (Slim 400, 108px, line-height 0.84, -0.045em, tabular): the single headline number of a screen (the placar). The Coins balance uses the same voice at 88px; card numbers step down to 64px, 38px and 30px.
- **Headline** (Slim 400, 54px, line-height 1.04, -0.02em, balanced wrap): the page h1. 46px under 1000px, 38px under 640px.
- **Section** (Slim 400, 26px, line-height 1.1, -0.01em): section and group h2s on light and dark grounds; 23px on phones.
- **Number** (Slim 400, 38px, line-height 0.9, -0.03em, tabular): metric values in cards and panels, with a 12px muted unit beside them.
- **Title** (Median 500, 14px, line-height 1.3): card titles, panel heads, weekday names, collapsible summaries. Client card titles go to 15px.
- **Body** (Slim 400, 14px, line-height 1.45): default text. Long-form Markdown runs at 14.5px / 1.6, and Trilha do Assessor reading pages at 16px / 1.65 within 780px.
- **Lede** (Slim 400, 15px, line-height 1.5, max 62ch): the sentence under each h1, in Graphite.
- **Label** (Slim 400, 12px, line-height 1.3): field captions, counts, table heads (11.5px), meta lines, in Sage Grey. Sentence case, no tracking.
- **Button** (Median 500, 13px): action buttons. Navigation pills use Slim 400 13px; the pressed state, not the weight, shows the current page.

### Named Rules
**The Light Numbers Rule.** Big figures are Slim at weight 400 with negative tracking and tabular digits. Never set a headline number in Median or bold.

**The Two Faces Rule.** Large headings are Slim; Median is reserved for small titles, buttons and emphasis. Labels stay sentence case with no letter-spacing; there are no uppercase tracked labels above headings.

## Layout

A centered container of 1320px with 40px side gutters (20px under 900px, 16px under 480px). Each screen opens with the top bar, then a hero grid: text column left (h1, lede, sub-pills) and the screen's answer right, at a 5:7 split (also a 1:1 and a single-column variant), with a 40px gap. Below the hero, sections sit 56px apart; card grids use 16px gaps (3 columns for metrics, routines and track stages; auto-fill at 268px for client cards). The dark band starts 72px below the last light section and runs to the page bottom; blocks inside it are 64px apart with a Night Line divider.

The top bar is a three-column grid: brand mark left, section pills centered, account controls right. Below 1180px the Gestão | Assessor switch leaves the bar and lives in the account popover. Below 1100px the wordmark text hides. Below 900px the center pills disappear and a dark floating dock (52px items, white pressed state) takes navigation to the bottom of the screen; page padding grows so content clears it. Grids collapse 3 → 2 at 1000px and to 1 column at 640px; the hero stacks at 1000px.

The client dossiê uses a sticky white anchor rail (pills inside a pill, 12px from the top) to jump between sections.

**The Fade-While-Hidden Rule.** Anything that scrolls sideways (wide tables in a card, the anchor rail, phone sub-pill rows) shows a soft fade on the edge only while content remains hidden in that direction, and drops it when the end is reached. A hard cut at the edge must never suggest the content ended.

## Elevation & Depth

Flat by default. Depth comes from tone: white cards on paper, Night Panels on the Night band. Shadows appear only as a response (hover lift) or on things that truly float above the page (the account popover, the sticky anchor rail, the phone dock). The atmospheric depth is the top glow, a set of radial gradients blurred 48px and masked out toward the bottom so it fades without a cut line.

### Shadow Vocabulary
- **Hover lift** (`box-shadow: 0 22px 40px -24px rgba(0, 0, 0, 0.4)`): link cards on hover, together with a 4px rise.
- **Shortcut lift** (`box-shadow: 0 16px 30px -22px rgba(0, 0, 0, 0.45)`): small shortcut tiles on hover, with a 2px rise.
- **Popover** (`box-shadow: 0 30px 80px -30px rgba(0, 0, 0, 0.5), 0 2px 10px rgba(0, 0, 0, 0.06)`): the account popover.
- **Rail** (`box-shadow: 0 12px 30px -18px rgba(0, 0, 0, 0.45)`): the sticky anchor rail.
- **Dock** (`box-shadow: 0 18px 40px -16px rgba(0, 0, 0, 0.55)`): the phone dock.

### Named Rules
**The Tone Not Line Rule.** Cards and panels are separated from their ground by tone, never by a border or a resting shadow. Hairlines are for rows and dividers inside a container.

**The One Glow Rule.** The orange glow lives behind the top of the page (and, smaller, inside the dark Coins card). It is never repeated as a decorative blob elsewhere.

## Shapes

Everything is round. Containers use large soft radii stepped by size: cards 26px, the band 32px (top corners only when it runs to the page bottom, all corners for a mid-page band), popover 24px, panels and weekday cards 22px, ranked rows and shortcut tiles 20px, notices and fact tiles 18px, notes 16px, fields 12px. Every control is a full pill or circle: pills, buttons, chips, search, selects, toggles, the 36px arrow circle, the 36px icon circle, the 40px avatar and brand disc.

The band carries a notch: a 64 × 10px tab of paper cut into the center of its top edge, rounded 12px at the bottom. Dashed 1.5px outlines are reserved for "em breve" placeholders, empty states and the Markdown preview.

## Components

### Buttons
Ink and confident, always pill-shaped and 40px tall.
- **Shape:** full pill (999px), 0 20px padding, Median 13px.
- **Primary:** Ink fill, white text; hover lightens to #2e2e2c; press scales to 0.97.
- **Secondary:** translucent white (55%) with a 16% ink stroke; hover goes solid white with an ink stroke. Inside the band it becomes a transparent outline on Night Line.
- **Danger:** Burnt Orange Ink fill, hover to bad-ink.
- **Link:** underlined text with a faint ink underline that turns orange on hover.
- **Disabled:** 45% opacity, not-allowed cursor.
- **Focus:** a 2px Trilha Orange outline offset 3px, globally.

### Pills and Navigation
- **Section pills:** 40px, transparent with a 16% ink stroke, Slim 13px; hover darkens the stroke; the current page is a solid ink pill with white text; press scales to 0.96.
- **Sub-pills:** 34px, 12px text on 35% white; the pressed one turns solid white with an ink stroke (white-pressed, not black). A count can sit inside in a dimmed `em`; the "hoje" count turns Burnt Orange Ink.
- **Gestão | Assessor switch:** a 40px segmented pill with an ink indicator that slides between halves (0.45s ease-out).
- **Account:** a 40px ink avatar circle opens a native popover card (white, 24px radius) with the person, the switch below 1180px, and sign-out.
- **Phone dock:** below 900px, a Night pill floating 10px above the bottom edge with icon-over-label items; the current item is a white pill.
- **Anchor rail:** sticky white pill holding 32px link pills; current section is ink.

### Arrow Circle (signature)
A 36px ink circle holding a thin up-right arrow (13px). When its link is hovered or focused, the arrow circle rotates 45° (0.4s ease-out). A white variant sits on dark gradients. It is the universal "open this" affordance on cards and panels.

### Icon Circle
A 36px circle with a 1px Hairline stroke holding a 15px outline icon (lucide, stroke 1.6–1.8) or two initials. An 11px Trilha Orange dot at the top-right means "needs attention"; an orange count badge shows how many.

### Cards / Containers
- **Corner Style:** 26px.
- **Background:** Card White on paper; no border.
- **Shadow Strategy:** none at rest; link cards rise 4px with the hover lift.
- **Internal Padding:** 20px 22px 22px (18px on phones). Head row (icon circle + arrow), title, then a footer pushed to the bottom with the number.
- **Attention card:** the "pedem atenção" card is the one warm-dark card: a slate-to-rust radial gradient on #3a302c with white text and translucent black row chips; its gradient slides slowly on hover (desktop only).
- **Calm state:** when nothing needs attention the same slot becomes a plain white card with a short reassuring line.

### Dark Band
A Night section with 32px top corners and the paper notch, 56px top padding. Inside: Night Panels (22px radius, hover lifts to the lighter panel tone and 2px), ranked rows (20px radius, position number in Slim 26px, first place in orange, a big score, a meter and chips), and the weekly routine calendar (five Night weekday cards; today has a warm brown gradient, an inset rim and an orange-tinted "hoje" tag).

### Chips
- **Style:** 11.5px Slim on Mist, full pill, 5px 10px.
- **State:** tinted ok / wait / alert pairs; a solid ink variant; an outline variant. On the band chips switch to translucent fills with lightened text.

### Choices and Switches
- **Multiple choice:** a wrapping row of 28px pill toggles; off is white with a Hairline stroke, on is solid ink with white text. Never a native multi-select list.
- **On / off:** a drawn 38 × 22px switch (pale grey track, white 16px knob with a small shadow); on turns the track ink and slides the knob 16px. Never the browser checkbox.
- **Tasks in Markdown:** "[ ]" items render as 10px drawn circles in Night Muted; done ones fill Confirm Green.

### Inputs / Fields
- **Style:** white field, 1px Hairline stroke, 12px radius (16px for textareas), 38px min height, Slim 13px; selects carry a drawn chevron.
- **Focus:** ink stroke plus a 3px soft ink halo; no orange.
- **Search and pill selects:** 40px pills on 55% white with a 16% ink stroke; focus turns the search solid white.
- **Disabled / error:** 60% opacity; errors are 12px bad-ink text under the field.

### Tables
Inside a zero-padding card: Slim 11.5px muted heads over a Hairline, 13px tabular rows divided by Soft Hairlines, 22px outer cell padding, a barely-there row hover (#fafaf8). Wide tables scroll inside RolagemX with the right-edge fade.
- **Control table (Clientes):** the row header is the client (icon circle with initials + name over a muted sub-line); heads are buttons that sort, with a 12px arrow on the active one and `aria-sort`. Controls inside rows stay 32px pills: the status select carries a leading state dot (Confirm Green, Amber, grey), the score cell is a pill button (stars + points; dashed when empty) that opens the dialog. Empty cells say what is missing in Placeholder grey ("Sem vínculo"); "Sem assessor" goes Burnt Orange Ink. An inactive client stays in the table, muted.

### Dialog
The native `<dialog>` as a modal, only when the task needs protected focus (scoring a client's seven criteria). White, 26px radius, popover shadow, centered, up to 860px wide and the viewport height minus 48px; the backdrop is Night at 42%. Three rows: a head with the 26px title, the explanation and a close circle; a scrolling body; a footer with the live result on the left and Cancel + the primary action on the right. Choice scales are 38px number circles (white with a Hairline; checked is solid ink). Opens with a 0.26s rise and fade; Esc, Cancel and a backdrop click close without saving. Below 640px it takes the width minus 16px and the rows stack.

## Do's and Don'ts

### Do:
- **Do** put the screen's answer in the first viewport: h1 and lede left, the big light number or the attention card right.
- **Do** push ranked, weekly and reference content into the dark band (#111110, 32px top radius, notch).
- **Do** use the 36px ink arrow circle as the "open" affordance on every link card and panel, rotating 45° on hover.
- **Do** mark "needs attention" with the orange dot on a thin icon circle, not with an orange card or orange text.
- **Do** keep every control a 40px pill (34px for sub-pills, 28px for choice chips) and every pressed state either solid ink or, for sub-pills, solid white.
- **Do** fade the edge of any sideways-scrolling row while content remains hidden there.
- **Do** keep motion to state changes (hover lifts, the arrow turn, the sliding switch) on the shared ease-out curve; the glow drift is the only ambient motion, and it is off on phones and under reduced motion.

### Don't:
- **Don't** add a sidebar or boxed, bordered panels; navigation is the top pill bar (and the dock on phones).
- **Don't** use Trilha Orange for headings, fills, stripes or decoration; it is state only, and small orange text on light grounds is Burnt Orange Ink.
- **Don't** set big numbers or headings in Median or bold; they are Slim 400 with negative tracking.
- **Don't** add page-load entrance choreography (staggered fade-ins, slide-ups); content appears at once.
- **Don't** add a serif or a third typeface, and never redraw the Trilha symbol or wordmark in another font.
- **Don't** put uppercase tracked labels or eyebrow lines above headings.
- **Don't** use native multi-select lists or bare browser checkboxes; use pill toggles and the drawn switch.
- **Don't** put client, person or internal data in examples; use neutral placeholders such as "Cliente Exemplo".
