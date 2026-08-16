import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import ErrorBanner from "@/components/ErrorBanner";
import {
  readDb,
  walletBalances,
  runwayMonths,
  projectBalance,
  weeklySpent,
} from "@/lib/db";
import {
  addTransaction,
  addObligation,
  deleteObligation,
  payObligation,
  addProject,
  fundProject,
  endProject,
  updateBook,
  deleteTransaction,
} from "@/lib/actions";
import { money, prettyDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const stageLabels: Record<string, string> = {
  seeded: "Seeded",
  probation: "On probation",
  "self-funding": "Self-funding",
  contributing: "Contributing",
  "wound-down": "Wound down",
};

export default function BookPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const db = readDb();
  const book = db.books.find((b) => b.id === params.id);
  if (!book) notFound();

  const bal = walletBalances(db, book.id);
  const here = `/book/${book.id}`;
  const isVenture = book.kind === "venture";
  const runway = isVenture ? runwayMonths(db, book) : null;
  const bufferPct =
    book.bufferTarget > 0 ? Math.min(100, Math.round((bal.buffer / book.bufferTarget) * 100)) : 0;

  const obligations = db.obligations.filter((o) => o.bookId === book.id);
  const projects = db.projects.filter((p) => p.bookId === book.id && p.status === "active");
  const endedProjects = db.projects.filter((p) => p.bookId === book.id && p.status === "ended");
  const ledger = db.transactions
    .filter((t) => t.bookId === book.id)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 20);

  return (
    <>
      <Nav active={`book:${book.id}`} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <ErrorBanner message={searchParams.error} />

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{book.name}</h1>
          {isVenture && book.stage && (
            <span
              className={
                "pill " +
                (book.stage === "contributing"
                  ? "bg-up/15 text-up"
                  : book.stage === "wound-down"
                    ? "bg-line text-sub"
                    : book.stage === "self-funding"
                      ? "bg-teal/15 text-teal"
                      : "bg-warn/15 text-warn")
              }
            >
              {stageLabels[book.stage]}
            </span>
          )}
          {isVenture && runway !== null && book.stage !== "wound-down" && (
            <span
              className={
                "pill tnum " +
                (runway === Infinity
                  ? "bg-line text-sub"
                  : runway < 2
                    ? "bg-down/15 text-down"
                    : runway < 3
                      ? "bg-warn/15 text-warn"
                      : "bg-up/15 text-up")
              }
            >
              {runway === Infinity ? "No burn set" : `${runway.toFixed(1)} mo runway`}
            </span>
          )}
        </div>

        {isVenture && book.seedCeiling ? (
          <p className="mb-6 -mt-3 text-sm text-sub">
            Seed ceiling <span className="tnum font-medium text-ink">{money(book.seedCeiling)}</span>
            {book.seedDeadline ? ` — to prove itself by ${book.seedDeadline}.` : "."}
          </p>
        ) : null}

        {/* Wallets */}
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="card p-5">
            <p className="label">Operating</p>
            <p className="tnum text-2xl font-semibold">{money(bal.operating)}</p>
            <p className="mt-1 text-xs text-faint">Where the {isVenture ? "business" : "week"} happens. Empties by design.</p>
          </div>
          <div className="card p-5">
            <p className="label">Buffer</p>
            <p className="tnum text-2xl font-semibold">{money(bal.buffer)}</p>
            {book.bufferTarget > 0 ? (
              <>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className={"h-full rounded-full " + (bufferPct >= 100 ? "bg-up" : "bg-teal")}
                    style={{ width: `${bufferPct}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-faint">
                  {bufferPct}% of {money(book.bufferTarget)} target
                </p>
              </>
            ) : (
              <p className="mt-1 text-xs text-faint">No target set yet.</p>
            )}
          </div>
          <div className="card p-5">
            <p className="label">Wealth</p>
            <p className="tnum text-2xl font-semibold">{money(bal.wealth)}</p>
            <p className="mt-1 text-xs text-faint">One-way valve. Only ever steps upward.</p>
          </div>
        </section>

        {/* Money in / out / across */}
        <section className="mt-8 grid gap-3 lg:grid-cols-3">
          <details className="card open:pb-4">
            <summary className="cursor-pointer select-none px-5 py-4 text-sm font-medium">
              Log income
            </summary>
            <form action={addTransaction} className="space-y-3 px-5">
              <input type="hidden" name="bookId" value={book.id} />
              <input type="hidden" name="kind" value="income" />
              <input type="hidden" name="back" value={here} />
              <div>
                <label className="label">Amount</label>
                <input name="amount" inputMode="decimal" required className="field tnum" placeholder="0.00" />
              </div>
              <div>
                <label className="label">Source</label>
                <input name="source" className="field" placeholder={isVenture ? "Client, product…" : "The draw, salary…"} />
              </div>
              <div>
                <label className="label">Into wallet</label>
                <select name="wallet" className="field" defaultValue="operating">
                  <option value="operating">Operating</option>
                  <option value="buffer">Buffer</option>
                  <option value="wealth">Wealth</option>
                </select>
              </div>
              <button className="btn-primary">Add income</button>
            </form>
          </details>

          <details className="card open:pb-4">
            <summary className="cursor-pointer select-none px-5 py-4 text-sm font-medium">
              Log expense
            </summary>
            <form action={addTransaction} className="space-y-3 px-5">
              <input type="hidden" name="bookId" value={book.id} />
              <input type="hidden" name="kind" value="expense" />
              <input type="hidden" name="wallet" value="operating" />
              <input type="hidden" name="back" value={here} />
              <div>
                <label className="label">Amount</label>
                <input name="amount" inputMode="decimal" required className="field tnum" placeholder="0.00" />
              </div>
              <div>
                <label className="label">Note</label>
                <input name="note" className="field" placeholder="What was it?" />
              </div>
              {isVenture && (
                <div>
                  <label className="label">Bucket</label>
                  <select name="bucket" className="field" defaultValue="burn">
                    <option value="burn">Burn — fixed</option>
                    <option value="fuel">Fuel — growth ceiling</option>
                    <option value="one-time">One-time — from surplus</option>
                  </select>
                </div>
              )}
              {projects.length > 0 && (
                <div>
                  <label className="label">Against a project (optional)</label>
                  <select name="projectId" className="field" defaultValue="">
                    <option value="">— none —</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button className="btn-primary">Add expense</button>
            </form>
          </details>

          <details className="card open:pb-4">
            <summary className="cursor-pointer select-none px-5 py-4 text-sm font-medium">
              Move between wallets
            </summary>
            <form action={addTransaction} className="space-y-3 px-5">
              <input type="hidden" name="bookId" value={book.id} />
              <input type="hidden" name="kind" value="transfer" />
              <input type="hidden" name="back" value={here} />
              <div>
                <label className="label">Amount</label>
                <input name="amount" inputMode="decimal" required className="field tnum" placeholder="0.00" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">From</label>
                  <select name="wallet" className="field" defaultValue="operating">
                    <option value="operating">Operating</option>
                    <option value="buffer">Buffer</option>
                  </select>
                </div>
                <div>
                  <label className="label">To</label>
                  <select name="toWallet" className="field" defaultValue="buffer">
                    <option value="operating">Operating</option>
                    <option value="buffer">Buffer</option>
                    <option value="wealth">Wealth</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-faint">Wealth only receives. The valve doesn’t open backward.</p>
              <button className="btn-primary">Move</button>
            </form>
          </details>
        </section>

        {/* Obligations */}
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Standing obligations</h2>
          <div className="card divide-y divide-line">
            {obligations.length === 0 && (
              <p className="px-5 py-4 text-sm text-faint">
                Nothing standing yet. Bills, subscriptions, allowances, fund feeding — decided once,
                then routine.
              </p>
            )}
            {obligations.map((o) => (
              <div key={o.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{o.name}</p>
                  <p className="text-xs text-faint">
                    {o.cadence}
                    {o.dueDay ? ` · day ${o.dueDay}` : ""}
                  </p>
                </div>
                <span className="tnum text-sm">{money(o.amount)}</span>
                <form action={payObligation}>
                  <input type="hidden" name="obligationId" value={o.id} />
                  <input type="hidden" name="back" value={here} />
                  <button className="btn-ghost !px-3 !py-1 text-xs">Mark paid</button>
                </form>
                <form action={deleteObligation}>
                  <input type="hidden" name="obligationId" value={o.id} />
                  <input type="hidden" name="back" value={here} />
                  <button className="text-xs text-faint hover:text-down">Remove</button>
                </form>
              </div>
            ))}
            <details>
              <summary className="cursor-pointer select-none px-5 py-3 text-sm font-medium text-act">
                + Add obligation
              </summary>
              <form action={addObligation} className="flex flex-wrap items-end gap-3 px-5 pb-4">
                <input type="hidden" name="bookId" value={book.id} />
                <div className="min-w-40 flex-1">
                  <label className="label">Name</label>
                  <input name="name" required className="field" placeholder="Rent, payroll, tithe…" />
                </div>
                <div>
                  <label className="label">Amount</label>
                  <input name="amount" inputMode="decimal" required className="field tnum w-28" placeholder="0.00" />
                </div>
                <div>
                  <label className="label">Cadence</label>
                  <select name="cadence" className="field" defaultValue="monthly">
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="label">Due day</label>
                  <input name="dueDay" type="number" min={1} max={31} className="field w-20" placeholder="1" />
                </div>
                <button className="btn-primary">Add</button>
              </form>
            </details>
          </div>
        </section>

        {/* Projects */}
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Projects</h2>
          <div className="space-y-3">
            {projects.map((p) => {
              const { funded, spent } = projectBalance(db, p);
              let ruleLine = "";
              let capacity = 0;
              if (p.rule.type === "save") {
                ruleLine = `Save-toward · target ${money(p.rule.target)}`;
                capacity = funded - spent;
              } else if (p.rule.type === "ceiling") {
                ruleLine = `Ceiling ${money(p.rule.cap)} for ${p.rule.months} months`;
                capacity = p.rule.cap - spent;
              } else {
                ruleLine = `At most ${p.rule.fraction}% of income since start`;
              }
              return (
                <div key={p.id} className="card px-5 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{p.name}</p>
                      <p className="text-xs text-faint">
                        {ruleLine}
                        {p.endNote ? ` · ends: ${p.endNote}` : ""}
                      </p>
                    </div>
                    <div className="tnum text-right text-sm">
                      <span className="text-sub">spent </span>
                      {money(spent)}
                      {p.rule.type !== "fraction" && (
                        <>
                          <span className="text-sub"> · left </span>
                          <span className={capacity <= 0 ? "text-down" : "text-up"}>
                            {money(Math.max(0, capacity))}
                          </span>
                        </>
                      )}
                    </div>
                    {p.rule.type === "save" && (
                      <form action={fundProject} className="flex items-center gap-2">
                        <input type="hidden" name="projectId" value={p.id} />
                        <input type="hidden" name="back" value={here} />
                        <input
                          name="amount"
                          inputMode="decimal"
                          placeholder="0.00"
                          className="field tnum !w-24 !py-1"
                        />
                        <button className="btn-ghost !px-3 !py-1 text-xs">Fund</button>
                      </form>
                    )}
                    <form action={endProject}>
                      <input type="hidden" name="projectId" value={p.id} />
                      <input type="hidden" name="back" value={here} />
                      <button className="text-xs text-faint hover:text-ink">End</button>
                    </form>
                  </div>
                  {p.rule.type === "save" && p.rule.target > 0 && (
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-act"
                        style={{ width: `${Math.min(100, Math.round((funded / p.rule.target) * 100))}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {endedProjects.length > 0 && (
              <p className="text-xs text-faint">
                Ended: {endedProjects.map((p) => p.name).join(", ")}
              </p>
            )}
            <details className="card">
              <summary className="cursor-pointer select-none px-5 py-3 text-sm font-medium text-act">
                + New project — four questions
              </summary>
              <form action={addProject} className="space-y-3 px-5 pb-5">
                <input type="hidden" name="bookId" value={book.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">1 · What’s it for?</label>
                    <input name="name" required className="field" placeholder="Furnishing, marketing push…" />
                  </div>
                  <div>
                    <label className="label">2 · Which book?</label>
                    <input className="field" value={book.name} disabled />
                  </div>
                </div>
                <div>
                  <label className="label">3 · Funding rule</label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="flex items-start gap-2 rounded-xl border border-line p-3 text-sm">
                      <input type="radio" name="ruleType" value="save" defaultChecked className="mt-0.5" />
                      <span>
                        <span className="font-medium">Save-toward</span>
                        <input name="target" inputMode="decimal" placeholder="Target $" className="field tnum mt-2" />
                      </span>
                    </label>
                    <label className="flex items-start gap-2 rounded-xl border border-line p-3 text-sm">
                      <input type="radio" name="ruleType" value="ceiling" className="mt-0.5" />
                      <span>
                        <span className="font-medium">Ceiling for N months</span>
                        <input name="cap" inputMode="decimal" placeholder="Cap $" className="field tnum mt-2" />
                        <input name="months" type="number" min={1} placeholder="Months" className="field mt-2" />
                      </span>
                    </label>
                    <label className="flex items-start gap-2 rounded-xl border border-line p-3 text-sm">
                      <input type="radio" name="ruleType" value="fraction" className="mt-0.5" />
                      <span>
                        <span className="font-medium">Fraction of income</span>
                        <input name="fraction" type="number" step="0.5" min={0} max={100} placeholder="%" className="field mt-2" />
                      </span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="label">4 · When / how does it end?</label>
                  <input name="endNote" className="field" placeholder="When funded · at board meeting N · when shipped" />
                </div>
                <button className="btn-primary">Create project</button>
              </form>
            </details>
          </div>
        </section>

        {/* Ledger */}
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Ledger</h2>
          <div className="card divide-y divide-line">
            {ledger.length === 0 && (
              <p className="px-5 py-4 text-sm text-faint">No entries yet.</p>
            )}
            {ledger.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className="w-14 shrink-0 text-xs text-faint">{prettyDate(t.date)}</span>
                <span className="min-w-0 flex-1 truncate">
                  {t.kind === "transfer"
                    ? `${t.note || "Transfer"} · ${t.wallet} → ${t.toWallet}`
                    : t.note || t.source || (t.kind === "income" ? "Income" : "Expense")}
                  {t.bucket ? <span className="ml-2 text-xs text-faint">{t.bucket}</span> : null}
                </span>
                <span
                  className={
                    "tnum shrink-0 " +
                    (t.kind === "income"
                      ? "text-up"
                      : t.kind === "expense"
                        ? "text-ink"
                        : "text-sub")
                  }
                >
                  {t.kind === "income" ? "+" : t.kind === "expense" ? "−" : ""}
                  {money(t.amount)}
                </span>
                <form action={deleteTransaction}>
                  <input type="hidden" name="txnId" value={t.id} />
                  <input type="hidden" name="back" value={here} />
                  <button className="text-xs text-faint hover:text-down">×</button>
                </form>
              </div>
            ))}
          </div>
        </section>

        {/* Book settings */}
        <section className="mt-10">
          <details className="card">
            <summary className="cursor-pointer select-none px-5 py-4 text-sm font-medium">
              Book settings
            </summary>
            <form action={updateBook} className="flex flex-wrap items-end gap-3 px-5 pb-5">
              <input type="hidden" name="bookId" value={book.id} />
              <input type="hidden" name="back" value={here} />
              <div>
                <label className="label">Name</label>
                <input name="name" defaultValue={book.name} className="field w-40" />
              </div>
              <div>
                <label className="label">Buffer target</label>
                <input
                  name="bufferTarget"
                  inputMode="decimal"
                  defaultValue={book.bufferTarget ? (book.bufferTarget / 100).toString() : ""}
                  className="field tnum w-32"
                  placeholder="0.00"
                />
              </div>
              {book.kind === "personal" ? (
                <div>
                  <label className="label">Weekly number</label>
                  <input
                    name="weeklyNumber"
                    inputMode="decimal"
                    defaultValue={book.weeklyNumber ? (book.weeklyNumber / 100).toString() : ""}
                    className="field tnum w-32"
                    placeholder="0.00"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="label">Monthly burn</label>
                    <input
                      name="monthlyBurn"
                      inputMode="decimal"
                      defaultValue={book.monthlyBurn ? (book.monthlyBurn / 100).toString() : ""}
                      className="field tnum w-32"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="label">Stage</label>
                    <select name="stage" className="field" defaultValue={book.stage}>
                      <option value="seeded">Seeded</option>
                      <option value="probation">On probation</option>
                      <option value="self-funding">Self-funding</option>
                      <option value="contributing">Contributing</option>
                      <option value="wound-down">Wound down</option>
                    </select>
                  </div>
                </>
              )}
              <button className="btn-primary">Save</button>
            </form>
          </details>
        </section>
      </main>
    </>
  );
}
