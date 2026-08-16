import Nav from "@/components/Nav";
import ErrorBanner from "@/components/ErrorBanner";
import { readDb, weeklySpent, weekStart, isoDate } from "@/lib/db";
import { addTransaction } from "@/lib/actions";
import { money, prettyDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function ThisWeek({ searchParams }: { searchParams: { error?: string } }) {
  const db = readDb();
  const personal = db.books.find((b) => b.kind === "personal") ?? db.books[0];
  const now = new Date();
  const spent = weeklySpent(db, personal.id, now);
  const number = personal.weeklyNumber ?? 0;
  const left = number - spent;
  const over = left < 0;
  const pct = number > 0 ? Math.min(100, Math.round((spent / number) * 100)) : 0;
  const ws = weekStart(now);
  const weekLabel = `${prettyDate(isoDate(ws))} – ${prettyDate(
    isoDate(new Date(ws.getTime() + 6 * 86400000))
  )}`;

  const weekTxns = db.transactions
    .filter(
      (t) =>
        t.bookId === personal.id &&
        t.kind === "expense" &&
        t.wallet === "operating" &&
        !t.projectId &&
        !t.obligationId &&
        t.date >= isoDate(ws)
    )
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      <Nav active="week" />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <ErrorBanner message={searchParams.error} />

        <section className="mx-auto max-w-md text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-sub">
            The week of {weekLabel}
          </p>

          {number > 0 ? (
            <>
              <p
                className={
                  "tnum mt-4 text-6xl font-semibold tracking-tight " +
                  (over ? "text-down" : "text-ink")
                }
              >
                {money(Math.abs(left))}
              </p>
              <p className="mt-2 text-sm text-sub">
                {over ? (
                  <span className="font-medium text-down">over the weekly number</span>
                ) : (
                  <>
                    left of <span className="tnum font-medium text-ink">{money(number)}</span>
                  </>
                )}
              </p>
              <div className="mx-auto mt-5 h-1.5 w-56 overflow-hidden rounded-full bg-line">
                <div
                  className={"h-full rounded-full " + (over ? "bg-down" : pct >= 85 ? "bg-warn" : "bg-up")}
                  style={{ width: `${over ? 100 : pct}%` }}
                />
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-line bg-card/60 p-6 text-sm text-sub">
              No weekly number yet. This is the observation phase: log reality below without
              judgment for a few weeks, then set the number in your{" "}
              <a href="/constitution" className="font-medium text-act">
                constitution
              </a>
              .
            </div>
          )}

          <form
            action={addTransaction}
            className="card mx-auto mt-10 flex items-center gap-2 p-2 pl-4 text-left"
          >
            <input type="hidden" name="bookId" value={personal.id} />
            <input type="hidden" name="kind" value="expense" />
            <input type="hidden" name="wallet" value="operating" />
            <input type="hidden" name="back" value="/" />
            <span className="text-sm text-faint">$</span>
            <input
              name="amount"
              inputMode="decimal"
              required
              placeholder="0.00"
              className="tnum w-24 bg-transparent text-sm outline-none placeholder:text-faint"
            />
            <input
              name="note"
              placeholder="What was it?"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
            />
            <button className="btn-primary shrink-0">Log it</button>
          </form>

          {weekTxns.length > 0 && (
            <ul className="mt-8 space-y-1 text-left">
              {weekTxns.map((t) => (
                <li
                  key={t.id}
                  className="flex items-baseline justify-between rounded-xl px-3 py-2 text-sm hover:bg-card"
                >
                  <span className="text-ink">{t.note || "—"}</span>
                  <span className="flex items-baseline gap-3">
                    <span className="text-xs text-faint">{prettyDate(t.date)}</span>
                    <span className="tnum text-ink">{money(t.amount)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-12 text-xs leading-relaxed text-faint">
            Everything slower lives behind its own cadence — books hold the wallets, the
            constitution holds the answers, the board meeting holds the questions.
          </p>
        </section>
      </main>
    </>
  );
}
