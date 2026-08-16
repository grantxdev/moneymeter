# Moneymeter

**A constitution for money — so that life doesn't have to hold parliament every day.**

One app, two-plus books, three wallets each, four meetings a year. A private,
single-user instrument: no bank connections, no APIs, no daily engagement.

## Get it running

```bash
git clone https://github.com/grantxdev/moneymeter.git
cd moneymeter
git checkout claude/private-test-webapp-dxbcib
npm install
npm run preview        # → http://localhost:4000
```

Password: `moneymeter`.

That's the current app. `npm run preview` rebuilds the single-file build and
serves it — no framework, no database, no build watch. Edit
`static/index.template.html`, re-run, refresh.

## Two builds, and which one is current

There are two implementations in this repo. **They are not in sync.**

| | `static/` — **current** | `src/` — Next.js, **behind** |
|---|---|---|
| Run | `npm run preview` | `npm run dev` |
| Storage | browser `localStorage` | `data/db.json` on disk |
| Rhythms / habit system | yes | **no — still the old obligations model** |
| Multi-device | no | yes (one server) |

Work in `static/index.template.html`. The Next.js version predates the rhythms
rebuild and is kept only so the server-side persistence isn't thrown away; port
it forward or delete it, but don't assume it matches what you see in the browser.

### Editing the single-file app

Everything lives in `static/index.template.html` — styles, markup, logic, in that
order. The two `__FONT_N__` / `__FONT_I__` placeholders are filled with
base64 Instrument Sans by `scripts/build-static.mjs`; `static/index.html` is the
generated output, so never edit it directly.

```bash
npm run build:static   # regenerate static/index.html
npm run preview        # build + serve
```

## Where the data lives

The single-file build keeps everything in `localStorage` under
`moneymeter.db.v2` — one browser, one machine. The footer has **Reload demo
data** and **Start empty**. To move your data between machines, copy that key's
value out of the browser console.

The password gate is cosmetic in a static build — a page that ships to the
browser can't keep a secret. Treat it as a doorway, not a lock, and don't host
it publicly with real numbers in it.

## The shape of the app

Three places, and that is the whole navigation: **Home**, **Constitution**,
**Board Meeting**. Books are reached by tapping their card, so five ventures
never wrap the nav bar.

On a phone the bar carries only the wordmark and **Sign out** — the wordmark is
the way Home — and Constitution and Board Meeting move to a list at the foot of
the page. You open the constitution quarterly, not hourly; a narrow bar is
better spent on the mark than on a door you rarely use.

- **Home** — the card wall. It opens straight on the three actions; there is no
  dateline, because every card states its own period and the wall only ever
  reads the present one. One quiet card per book, read top to bottom: the
  book's name as a small caption, then what's left of *its own* period as the
  headline, then `$207 of $250 this week`, then the card's real work — **a bar
  composed of one segment per rhythm, and a legend that decodes it.** The bar is
  one continuous run, squared off and split by hairlines the colour of the card:
  rounded pills per segment read as separate objects, and this is one quantity
  divided up. Each legend swatch is a slice of that bar stood upright.

  A single fill would only say how much is gone; this says
  where it went, which is the complaint the app was built around. The legend
  names the unfilled track too (`Left`), so it accounts for the whole bar; past
  four rhythms the tail rolls into `N more`. Segment colour is keyed to the
  rhythm's own position so a category doesn't change hue week to week, and the
  palette deliberately excludes green and red — those mean *holding* and *over*
  everywhere else, and a category that merely happens to be third in the list
  must not borrow that meaning. Every card is identical, personal and venture
  alike: no stage pill, no runway pill — those belong to the full book, not the
  door. The card is a door, not a dashboard.

  The wall reads the present period and only that — there is no stepping back
  through past weeks. Old periods are the board meeting's business, not the
  daily surface's.
- **Every book runs on its own beat.** A book's cadence is the finest one it
  actually keeps rhythms for: Personal is weekly, a venture whose rhythms are
  payroll and tax set-aside is monthly. Its card and its page both speak in that
  unit — *left of $250 this week*, *over its month*. The period is not a place;
  it is a property every book has, Personal included.
- **A book's period** — tap any card. This is the daily surface: the number,
  what's left, the three action buttons, one bar to log a spend against a
  rhythm, this period's rhythms, and everything logged in it. A `‹ name ›`
  switcher steps to the next book without going back to the wall, so five
  ventures are five taps apart. A link at the foot opens the full book below.
- **The three buttons** (top right of Home) — move ⇄, spend −, receive +. Each
  opens an action sheet: one large amount, then where it belongs — which book,
  which rhythm, which project, which wallet, which bucket. Changing the book
  re-points the rhythm and project lists in place. If a rule refuses the entry
  (wealth is a one-way valve; a project can't break its funding grammar) the
  sheet stays open with everything still in it.
- **The full book** (Personal + one per venture) — everything about one book in
  one place. **Its rhythms**, grouped by cadence, each with its state, streak and
  history strip, plus the form to set a new one. Three wallets: Operating (empties
  by design), Buffer (fills to a target, absorbs shocks), Wealth (a one-way valve —
  the app refuses transfers out). One entry form (Spend / Receive / Move), a
  **bulk entry** block for logging a stack of receipts in one commit,
  projects with three enforced funding grammars (save-toward, ceiling-for-N-months,
  fraction-of-income), and the ledger. Ventures carry a stage (seeded → probation
  → self-funding → contributing / wound down), cost buckets, and live runway.

  A rhythm is a named line with an amount and a cadence (weekly / monthly /
  quarterly / annual), of two kinds — a **ceiling** you stay under (groceries,
  gas) or an **obligation** you pay (rent, tithe, payroll). Rhythms live on the
  book they charge, not in a global list.
- **Constitution** — the standing answers that aren't tied to one book: giving
  off the top, the owner's draw, the surplus split, articles, and the amendment
  log (drift allowed only in daylight). No book's number is declared; each is the
  sum of that book's rhythms at its own cadence, set on that book's page.
- **Earned a review** — when a rhythm is overspent in most of the last four
  periods it is flagged on its book, but nothing is decided there — the flag
  points at the board meeting, where the number is editable in place. Consistent
  overspend is evidence the guess was wrong, not that you failed.
- **Board Meeting** — the quarterly sitting: rhythms holding, rhythms that earned
  a review, income by source, runway, the three-line chart per book, project
  ledgers, amendments to ratify, venture founding, and resolutions in force until
  next quarter.

## Design

**Fluid first, breakpoints second.** Type sizes, gutters and card padding are
`clamp()` values on `:root` (`--t-hero`, `--t-h1`, `--t-stat`, `--gutter`,
`--pad-card`), and every multi-column grid is `repeat(auto-fit, minmax(min(100%,
N), 1fr))`. So the layout responds continuously at *every* width rather than
only at the four someone remembered to write. Media queries are reserved for
the places where the shape genuinely changes: the card wall going single-column,
the action sheet becoming a thumb-reachable bottom sheet below 600px, a stat
card turning into a label-left/number-right row below 440px, and the quarterly
chart scrolling at a legible size instead of shrinking its axis labels into
noise. Safe-area insets are honoured on the bar and the page; interactive
controls clear a 44px hit target. Verified 375 / 768 / 1600.

`<meta name="viewport">` is set — without it the media queries never fire and
mobile renders at a 980px layout viewport.

**The three actions say what they do.** Move / Spend / Receive are labelled
pill buttons, not bare glyphs — they're the app's primary controls and an
unlabelled `⇄` is a quiz, not a button. On a phone the row spans the width and
splits into three even thumb targets.

Off-white ground (`#FAFAF7`), Instrument Sans self-hosted as a variable font,
fully rounded controls, and Apple system colors used semantically — `#34C759`
holding, `#FF3B30` over, `#FF9500` due or near the line, `#007AFF` for actions.
The chart palette (orange / teal / indigo) is checked for color-vision
separation. Single-theme by intent: the off-white *is* the identity.
