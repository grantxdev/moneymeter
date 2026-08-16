"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  readDb,
  writeDb,
  isoDate,
  projectBalance,
  bookIncome,
  walletBalances,
  type WalletId,
  type Project,
  type CostBucket,
} from "@/lib/db";
import { parseMoney } from "@/lib/format";
import { appPassword, sessionToken, SESSION_COOKIE } from "@/lib/auth";

function id(): string {
  return crypto.randomUUID().slice(0, 8);
}

function today(): string {
  return isoDate(new Date());
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

// ---------- auth ----------

export async function login(fd: FormData) {
  const pw = str(fd, "password");
  if (pw !== appPassword()) {
    redirect("/login?error=1");
  }
  cookies().set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  redirect("/");
}

export async function logout() {
  cookies().delete(SESSION_COOKIE);
  redirect("/login");
}

// ---------- transactions ----------

export async function addTransaction(fd: FormData) {
  const db = readDb();
  const bookId = str(fd, "bookId");
  const kind = str(fd, "kind") as "income" | "expense" | "transfer";
  const amount = parseMoney(str(fd, "amount"));
  const back = str(fd, "back") || `/book/${bookId}`;
  if (!amount || amount <= 0) redirect(back);

  const wallet = (str(fd, "wallet") || "operating") as WalletId;
  const toWallet = (str(fd, "toWallet") || undefined) as WalletId | undefined;
  const date = str(fd, "date") || today();
  const note = str(fd, "note") || undefined;
  const source = str(fd, "source") || undefined;
  const bucket = (str(fd, "bucket") || undefined) as CostBucket | undefined;
  const obligationId = str(fd, "obligationId") || undefined;
  const projectId = str(fd, "projectId") || undefined;

  if (kind === "transfer") {
    if (wallet === "wealth") redirect(back + "?error=" + encodeURIComponent("Wealth is a one-way valve — money does not come back out."));
    if (!toWallet || toWallet === wallet) redirect(back);
    const bal = walletBalances(db, bookId);
    if (amount > bal[wallet])
      redirect(back + "?error=" + encodeURIComponent("Not enough in " + wallet + " for that transfer."));
  }

  if (kind === "expense" && projectId) {
    const project = db.projects.find((p) => p.id === projectId);
    if (project) {
      const err = projectSpendError(db, project, amount);
      if (err) redirect(back + "?error=" + encodeURIComponent(err));
    }
  }

  db.transactions.push({
    id: id(),
    bookId,
    date,
    kind,
    wallet,
    toWallet: kind === "transfer" ? toWallet : undefined,
    amount,
    note,
    source: kind === "income" ? source : undefined,
    bucket,
    obligationId,
    projectId,
  });
  writeDb(db);
  revalidatePath("/");
  redirect(back);
}

function projectSpendError(db: ReturnType<typeof readDb>, project: Project, amount: number): string | null {
  const { funded, spent } = projectBalance(db, project);
  if (project.rule.type === "save") {
    if (spent + amount > funded)
      return `${project.name} is save-toward: it can only spend what it has accumulated (${((funded - spent) / 100).toFixed(2)} available).`;
  } else if (project.rule.type === "ceiling") {
    if (spent + amount > project.rule.cap)
      return `${project.name} would break its ceiling.`;
  } else if (project.rule.type === "fraction") {
    const income = bookIncome(db, project.bookId, project.start, today());
    const allowed = Math.floor((project.rule.fraction / 100) * income);
    if (spent + amount > allowed)
      return `${project.name} may consume at most ${project.rule.fraction}% of income since it began — that ration is spent.`;
  }
  return null;
}

export async function deleteTransaction(fd: FormData) {
  const db = readDb();
  const txnId = str(fd, "txnId");
  db.transactions = db.transactions.filter((t) => t.id !== txnId);
  writeDb(db);
  revalidatePath("/");
  redirect(str(fd, "back") || "/");
}

// ---------- obligations ----------

export async function addObligation(fd: FormData) {
  const db = readDb();
  const bookId = str(fd, "bookId");
  const name = str(fd, "name");
  const amount = parseMoney(str(fd, "amount"));
  if (name && amount > 0) {
    db.obligations.push({
      id: id(),
      bookId,
      name,
      amount,
      cadence: (str(fd, "cadence") || "monthly") as "weekly" | "monthly" | "quarterly" | "annual",
      dueDay: parseInt(str(fd, "dueDay")) || undefined,
    });
    writeDb(db);
  }
  revalidatePath("/");
  redirect(`/book/${bookId}`);
}

export async function deleteObligation(fd: FormData) {
  const db = readDb();
  db.obligations = db.obligations.filter((o) => o.id !== str(fd, "obligationId"));
  writeDb(db);
  revalidatePath("/");
  redirect(str(fd, "back") || "/");
}

export async function payObligation(fd: FormData) {
  const db = readDb();
  const o = db.obligations.find((x) => x.id === str(fd, "obligationId"));
  if (o) {
    db.transactions.push({
      id: id(),
      bookId: o.bookId,
      date: today(),
      kind: "expense",
      wallet: "operating",
      amount: o.amount,
      note: o.name,
      obligationId: o.id,
      bucket: db.books.find((b) => b.id === o.bookId)?.kind === "venture" ? "burn" : undefined,
    });
    writeDb(db);
  }
  revalidatePath("/");
  redirect(str(fd, "back") || "/");
}

// ---------- projects ----------

export async function addProject(fd: FormData) {
  const db = readDb();
  const bookId = str(fd, "bookId");
  const name = str(fd, "name");
  const ruleType = str(fd, "ruleType");
  if (!name) redirect(`/book/${bookId}`);
  let rule: Project["rule"];
  if (ruleType === "ceiling")
    rule = { type: "ceiling", cap: parseMoney(str(fd, "cap")), months: parseInt(str(fd, "months")) || 3 };
  else if (ruleType === "fraction")
    rule = { type: "fraction", fraction: parseFloat(str(fd, "fraction")) || 10 };
  else rule = { type: "save", target: parseMoney(str(fd, "target")) };
  db.projects.push({
    id: id(),
    bookId,
    name,
    purpose: str(fd, "purpose") || undefined,
    rule,
    start: today(),
    endNote: str(fd, "endNote") || undefined,
    status: "active",
  });
  writeDb(db);
  revalidatePath("/");
  redirect(`/book/${bookId}`);
}

export async function endProject(fd: FormData) {
  const db = readDb();
  const p = db.projects.find((x) => x.id === str(fd, "projectId"));
  if (p) {
    p.status = "ended";
    writeDb(db);
  }
  revalidatePath("/");
  redirect(str(fd, "back") || "/");
}

/** Fund a save-toward project out of operating money. */
export async function fundProject(fd: FormData) {
  const db = readDb();
  const p = db.projects.find((x) => x.id === str(fd, "projectId"));
  const amount = parseMoney(str(fd, "amount"));
  const back = str(fd, "back") || "/";
  if (p && amount > 0) {
    const bal = walletBalances(db, p.bookId);
    if (amount > bal.operating)
      redirect(back + "?error=" + encodeURIComponent("Not enough in operating to fund that."));
    db.transactions.push({
      id: id(),
      bookId: p.bookId,
      date: today(),
      kind: "transfer",
      wallet: "operating",
      toWallet: "operating",
      amount,
      note: `Fund ${p.name}`,
      projectId: p.id,
    });
    writeDb(db);
  }
  revalidatePath("/");
  redirect(back);
}

// ---------- books / ventures ----------

export async function addVenture(fd: FormData) {
  const db = readDb();
  const name = str(fd, "name");
  if (!name) redirect("/");
  const bookId = id();
  db.books.push({
    id: bookId,
    name,
    kind: "venture",
    stage: "seeded",
    bufferTarget: parseMoney(str(fd, "bufferTarget")),
    monthlyBurn: parseMoney(str(fd, "monthlyBurn")),
    seedCeiling: parseMoney(str(fd, "seedCeiling")) || undefined,
    seedDeadline: str(fd, "seedDeadline") || undefined,
    createdAt: today(),
  });
  const seed = parseMoney(str(fd, "seedAmount"));
  if (seed > 0) {
    db.transactions.push({
      id: id(),
      bookId,
      date: today(),
      kind: "income",
      wallet: "operating",
      amount: seed,
      source: "Seed capital",
      note: "Seeded from surplus / deliberate wealth allocation",
    });
  }
  writeDb(db);
  revalidatePath("/");
  redirect(`/book/${bookId}`);
}

export async function updateBook(fd: FormData) {
  const db = readDb();
  const b = db.books.find((x) => x.id === str(fd, "bookId"));
  if (b) {
    if (fd.has("name") && str(fd, "name")) b.name = str(fd, "name");
    if (fd.has("bufferTarget")) b.bufferTarget = parseMoney(str(fd, "bufferTarget"));
    if (fd.has("weeklyNumber")) b.weeklyNumber = parseMoney(str(fd, "weeklyNumber"));
    if (fd.has("monthlyBurn")) b.monthlyBurn = parseMoney(str(fd, "monthlyBurn"));
    if (fd.has("stage") && str(fd, "stage")) b.stage = str(fd, "stage") as Book["stage"];
    writeDb(db);
  }
  revalidatePath("/");
  redirect(str(fd, "back") || `/book/${str(fd, "bookId")}`);
}
type Book = import("@/lib/db").Book;

// ---------- amendments ----------

export async function addAmendment(fd: FormData) {
  const db = readDb();
  const title = str(fd, "title");
  const reason = str(fd, "reason");
  if (title) {
    db.amendments.push({ id: id(), date: today(), title, reason, status: "pending" });
    writeDb(db);
  }
  revalidatePath("/");
  redirect(str(fd, "back") || "/constitution");
}

export async function decideAmendment(fd: FormData) {
  const db = readDb();
  const a = db.amendments.find((x) => x.id === str(fd, "amendmentId"));
  const decision = str(fd, "decision");
  if (a && (decision === "ratified" || decision === "rejected")) {
    a.status = decision;
    a.decidedAt = today();
    writeDb(db);
  }
  revalidatePath("/");
  redirect(str(fd, "back") || "/meeting");
}

// ---------- meetings ----------

export async function closeMeeting(fd: FormData) {
  const db = readDb();
  const label = str(fd, "label");
  const resolutions = str(fd, "resolutions")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  db.meetings.push({
    id: id(),
    label,
    date: today(),
    resolutions,
    notes: str(fd, "notes") || undefined,
  });
  // Ratify-by-meeting: any still-pending amendments stay pending unless decided individually.
  writeDb(db);
  revalidatePath("/");
  redirect("/meeting");
}

// ---------- constitution ----------

export async function updateConstitution(fd: FormData) {
  const db = readDb();
  db.constitution = {
    givingPct: parseFloat(str(fd, "givingPct")) || 0,
    drawAmount: parseMoney(str(fd, "drawAmount")),
    drawCadence: (str(fd, "drawCadence") || "monthly") as "weekly" | "biweekly" | "monthly",
    surplusSplit: {
      wealth: parseFloat(str(fd, "splitWealth")) || 0,
      growth: parseFloat(str(fd, "splitGrowth")) || 0,
      onward: parseFloat(str(fd, "splitOnward")) || 0,
    },
    notes: str(fd, "notes") || "",
  };
  writeDb(db);
  revalidatePath("/");
  redirect("/constitution");
}
