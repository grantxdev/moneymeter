# Moneymeter

**A constitution for money — so that life doesn't have to hold parliament every day.**

One app, two-plus books, three wallets each, four meetings a year. A private,
single-user instrument: no bank connections, no APIs, no daily engagement.

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
```

For production: `npm run build && npm start`.

## Login

One password for the one seat at the table. Default is `moneymeter`; change it by
setting an environment variable (see `.env.local.example`):

```
MONEYMETER_PASSWORD=your-password
```

## Where the data lives

Everything is stored in `data/db.json` — a plain JSON file next to the app
(git-ignored). Back it up by copying the file.

## The shape of the app

- **This Week** — the daily surface: the weekly number, what's left of it, and a
  one-line way to log a spend. Nothing else.
- **Books** (Personal + one per venture) — three wallets each: Operating (empties
  by design), Buffer (fills to a target, absorbs shocks), Wealth (one-way valve —
  the app refuses transfers out). Standing obligations, projects with three
  funding grammars (save-toward, ceiling-for-N-months, fraction-of-income — all
  enforced), and the ledger. Ventures carry a stage (seeded → probation →
  self-funding → contributing / wound down), cost buckets (burn / fuel /
  one-time), and a live runway figure.
- **Constitution** — the one page of standing answers: giving off the top, the
  owner's draw, the surplus split, articles, and the amendment log (mid-quarter
  drift is allowed only in daylight).
- **Board Meeting** — the quarterly sitting: weekly adherence, income by source,
  runway, the three-line chart per book (operating flat, buffer holds, wealth
  only steps upward), project ledgers, amendments to ratify, venture founding,
  and resolutions that stay in force until next quarter.
