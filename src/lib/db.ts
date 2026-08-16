import fs from "fs";
import path from "path";

export type WalletId = "operating" | "buffer" | "wealth";

export type VentureStage =
  | "seeded"
  | "probation"
  | "self-funding"
  | "contributing"
  | "wound-down";

export type Book = {
  id: string;
  name: string;
  kind: "personal" | "venture";
  bufferTarget: number; // cents
  weeklyNumber?: number; // cents — personal book
  monthlyBurn?: number; // cents — venture books, for runway
  stage?: VentureStage;
  seedCeiling?: number; // cents
  seedDeadline?: string; // e.g. "Board meeting Q1 2027"
  createdAt: string;
};

export type TxnKind = "income" | "expense" | "transfer";
export type CostBucket = "burn" | "fuel" | "one-time";

export type Txn = {
  id: string;
  bookId: string;
  date: string; // YYYY-MM-DD
  kind: TxnKind;
  wallet: WalletId; // income: receiving wallet; expense: paying wallet; transfer: from
  toWallet?: WalletId; // transfer only
  amount: number; // cents, always positive
  source?: string; // income source label
  note?: string;
  projectId?: string; // expense drawn against a project
  obligationId?: string; // expense that settles a standing obligation
  bucket?: CostBucket; // venture cost classification
};

export type Obligation = {
  id: string;
  bookId: string;
  name: string;
  amount: number; // cents
  cadence: "weekly" | "monthly" | "quarterly" | "annual";
  dueDay?: number; // day of month for monthly
};

export type ProjectRule =
  | { type: "save"; target: number } // save-toward: spends only what it holds
  | { type: "ceiling"; cap: number; months: number } // capped spend for a period
  | { type: "fraction"; fraction: number }; // max share of the book's own income

export type Project = {
  id: string;
  bookId: string;
  name: string;
  purpose?: string;
  rule: ProjectRule;
  start: string;
  endNote?: string; // when/how it ends
  status: "active" | "ended";
};

export type Amendment = {
  id: string;
  date: string;
  title: string;
  reason: string;
  status: "pending" | "ratified" | "rejected";
  decidedAt?: string;
};

export type Meeting = {
  id: string;
  label: string; // "Q3 2026"
  date: string;
  resolutions: string[];
  notes?: string;
};

export type Constitution = {
  givingPct: number; // % off the top of personal income
  drawAmount: number; // cents
  drawCadence: "weekly" | "biweekly" | "monthly";
  surplusSplit: { wealth: number; growth: number; onward: number }; // %
  notes?: string;
};

export type DB = {
  books: Book[];
  transactions: Txn[];
  obligations: Obligation[];
  projects: Project[];
  amendments: Amendment[];
  meetings: Meeting[];
  constitution: Constitution;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

function defaultDb(): DB {
  return {
    books: [
      {
        id: "personal",
        name: "Personal",
        kind: "personal",
        bufferTarget: 0,
        weeklyNumber: 0,
        createdAt: new Date().toISOString().slice(0, 10),
      },
    ],
    transactions: [],
    obligations: [],
    projects: [],
    amendments: [],
    meetings: [],
    constitution: {
      givingPct: 15,
      drawAmount: 0,
      drawCadence: "monthly",
      surplusSplit: { wealth: 50, growth: 30, onward: 20 },
      notes: "",
    },
  };
}

export function readDb(): DB {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(raw) as DB;
  } catch {
    const db = defaultDb();
    writeDb(db);
    return db;
  }
}

export function writeDb(db: DB) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_PATH);
}

// ---------- Money math ----------

export type Balances = { operating: number; buffer: number; wealth: number };

export function walletBalances(db: DB, bookId: string, asOf?: string): Balances {
  const b: Balances = { operating: 0, buffer: 0, wealth: 0 };
  for (const t of db.transactions) {
    if (t.bookId !== bookId) continue;
    if (asOf && t.date > asOf) continue;
    if (t.kind === "income") b[t.wallet] += t.amount;
    else if (t.kind === "expense") b[t.wallet] -= t.amount;
    else if (t.kind === "transfer" && t.toWallet) {
      b[t.wallet] -= t.amount;
      b[t.toWallet] += t.amount;
    }
  }
  return b;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing d. */
export function weekStart(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Discretionary operating spend for the week containing `date` (obligations & project draws excluded). */
export function weeklySpent(db: DB, bookId: string, date: Date): number {
  const start = isoDate(weekStart(date));
  const end = isoDate(new Date(weekStart(date).getTime() + 6 * 86400000));
  let sum = 0;
  for (const t of db.transactions) {
    if (t.bookId !== bookId || t.kind !== "expense" || t.wallet !== "operating") continue;
    if (t.projectId || t.obligationId) continue;
    if (t.date >= start && t.date <= end) sum += t.amount;
  }
  return sum;
}

export function quarterOf(d: Date): { year: number; q: number } {
  return { year: d.getFullYear(), q: Math.floor(d.getMonth() / 3) + 1 };
}

export function quarterRange(year: number, q: number): { start: string; end: string } {
  const start = new Date(year, (q - 1) * 3, 1);
  const end = new Date(year, q * 3, 0);
  return { start: isoDate(start), end: isoDate(end) };
}

export function quarterLabel(year: number, q: number): string {
  return `Q${q} ${year}`;
}

/** Runway in months: buffer / monthly burn. Infinity if burn is 0. */
export function runwayMonths(db: DB, book: Book): number {
  if (!book.monthlyBurn || book.monthlyBurn <= 0) return Infinity;
  return walletBalances(db, book.id).buffer / book.monthlyBurn;
}

export function projectBalance(db: DB, project: Project): { funded: number; spent: number } {
  let funded = 0;
  let spent = 0;
  for (const t of db.transactions) {
    if (t.projectId !== project.id) continue;
    if (t.kind === "expense") spent += t.amount;
    if (t.kind === "transfer" || t.kind === "income") funded += t.amount;
  }
  return { funded, spent };
}

export function bookIncome(db: DB, bookId: string, start: string, end: string): number {
  let sum = 0;
  for (const t of db.transactions) {
    if (t.bookId === bookId && t.kind === "income" && t.date >= start && t.date <= end)
      sum += t.amount;
  }
  return sum;
}
