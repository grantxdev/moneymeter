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

- **This Week** — the daily surface. The week's number, what's left of it, and
  one bar to log a spend *against a rhythm*. Nothing else.
- **Rhythms** — the habit system, and the spine of the app. A set list of named
  lines, each with an amount and a cadence (weekly / monthly / quarterly /
  annual), and each of two kinds: a **ceiling** you stay under (groceries, gas)
  or an **obligation** you pay (rent, tithe, payroll). Every rhythm tracks
  whether it held in each completed period, a streak, and a history strip. The
  weekly number is not declared — it is the sum of the weekly rhythms.
- **Earned a review** — when a rhythm is overspent in most of the last four
  periods it is flagged, and surfaces at the board meeting with the number
  editable in place. Consistent overspend is evidence the guess was wrong, not
  that you failed.
- **Books** (Personal + one per venture) — three wallets each: Operating (empties
  by design), Buffer (fills to a target, absorbs shocks), Wealth (a one-way valve —
  the app refuses transfers out). One entry form (Spend / Receive / Move),
  projects with three enforced funding grammars (save-toward, ceiling-for-N-months,
  fraction-of-income), and the ledger. Ventures carry a stage (seeded → probation
  → self-funding → contributing / wound down), cost buckets, and live runway.
- **Constitution** — the standing answers: giving off the top, the owner's draw,
  the surplus split, articles, and the amendment log (drift allowed only in
  daylight).
- **Board Meeting** — the quarterly sitting: rhythms holding, rhythms that earned
  a review, income by source, runway, the three-line chart per book, project
  ledgers, amendments to ratify, venture founding, and resolutions in force until
  next quarter.

## Design

Off-white ground (`#FAFAF7`), Instrument Sans self-hosted as a variable font,
fully rounded controls, and Apple system colors used semantically — `#34C759`
holding, `#FF3B30` over, `#FF9500` due or near the line, `#007AFF` for actions.
The chart palette (orange / teal / indigo) is checked for color-vision
separation. Single-theme by intent: the off-white *is* the identity.
