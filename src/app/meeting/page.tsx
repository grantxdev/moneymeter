import Nav from "@/components/Nav";
import QuarterlyChart from "@/components/QuarterlyChart";
import {
  readDb,
  walletBalances,
  weeklySpent,
  weekStart,
  isoDate,
  quarterOf,
  quarterRange,
  quarterLabel,
  runwayMonths,
  projectBalance,
} from "@/lib/db";
import { decideAmendment, closeMeeting, addVenture } from "@/lib/actions";
import { money, prettyDate } from "@/lib/format";

export const dynamic = "force-dynamic";

// Colors validated for CVD + normal-vision separation (Apple system orange/teal/indigo).
const SERIES_COLORS = { operating: "#FF9500", buffer: "#30B0C7", wealth: "#5856D6" };

export default function MeetingPage() {
  const db = readDb();
  const now = new Date();
  const { year, q } = quarterOf(now);
  const label = quarterLabel(year, q);
  const { start, end } = quarterRange(year, q);

  // Week sample points: each Monday from quarter start through today.
  const weeks: Date[] = [];
  let w = weekStart(new Date(start + "T00:00:00"));
  if (isoDate(w) < start) w = new Date(w.getTime() + 7 * 86400000);
  while (isoDate(w) <= isoDate(now) && isoDate(w) <= end) {
    weeks.push(new Date(w));
    w = new Date(w.getTime() + 7 * 86400000);
  }
  const labels = weeks.map((d) => prettyDate(isoDate(d)));

  const personal = db.books.find((b) => b.kind === "personal");
  const number = personal?.weeklyNumber ?? 0;
  const completedWeeks = weeks.filter((d) => d.getTime() + 7 * 86400000 <= now.getTime());
  const adherent = personal
    ? completedWeeks.filter((d) => weeklySpent(db, personal.id, d) <= number).length
    : 0;

  // Income by source, this quarter, across books
  const incomeBySource = new Map<string, number>();
  for (const t of db.transactions) {
    if (t.kind !== "income" || t.date < start || t.date > end) continue;
    const key = t.source || "Unlabeled";
    incomeBySource.set(key, (incomeBySource.get(key) ?? 0) + t.amount);
  }

  const pending = db.amendments.filter((a) => a.status === "pending");
  const meetings = [...db.meetings].sort((a, b) => (a.date < b.date ? 1 : -1));
  const activeBooks = db.books.filter((b) => b.stage !== "wound-down");

  return (
    <>
      <Nav active="meeting" />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">The Board Meeting</h1>
          <span className="pill bg-line text-sub">{label} · week {Math.max(1, weeks.length)} of 13</span>
        </div>
        <p className="mt-1 text-sm text-sub">
          The only place where the system itself may be questioned. Doubt has an appointment, so it
          doesn’t wander the halls.
        </p>

        {/* The quarter's brief */}
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="card p-5">
            <p className="label">Weekly adherence</p>
            <p className="tnum text-2xl font-semibold">
              {completedWeeks.length > 0 ? (
                <>
                  <span className={adherent === completedWeeks.length ? "text-up" : adherent < completedWeeks.length / 2 ? "text-down" : "text-ink"}>
                    {adherent}
                  </span>
                  <span className="text-sub"> / {completedWeeks.length}</span>
                </>
              ) : (
                "—"
              )}
            </p>
            <p className="mt-1 text-xs text-faint">completed weeks under the number</p>
          </div>
          <div className="card p-5">
            <p className="label">Income by source</p>
            {incomeBySource.size === 0 ? (
              <p className="text-sm text-faint">None recorded this quarter.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {[...incomeBySource.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([src, amt]) => (
                    <li key={src} className="flex justify-between">
                      <span className="truncate pr-2 text-sub">{src}</span>
                      <span className="tnum">{money(amt)}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
          <div className="card p-5">
            <p className="label">Runway</p>
            {db.books.filter((b) => b.kind === "venture" && b.stage !== "wound-down").length === 0 ? (
              <p className="text-sm text-faint">No ventures on the books.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {db.books
                  .filter((b) => b.kind === "venture" && b.stage !== "wound-down")
                  .map((b) => {
                    const r = runwayMonths(db, b);
                    return (
                      <li key={b.id} className="flex justify-between">
                        <span className="truncate pr-2 text-sub">{b.name}</span>
                        <span
                          className={
                            "tnum " +
                            (r === Infinity ? "text-faint" : r < 2 ? "text-down" : r < 3 ? "text-warn" : "text-up")
                          }
                        >
                          {r === Infinity ? "—" : `${r.toFixed(1)} mo`}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </section>

        {/* Quarterly chart per book */}
        {weeks.length > 0 &&
          activeBooks.map((book) => {
            const series = [
              { name: "Operating", color: SERIES_COLORS.operating, values: [] as number[] },
              { name: "Buffer", color: SERIES_COLORS.buffer, values: [] as number[] },
              { name: "Wealth", color: SERIES_COLORS.wealth, values: [] as number[] },
            ];
            for (const d of weeks) {
              const sampleEnd = isoDate(new Date(d.getTime() + 6 * 86400000));
              const bal = walletBalances(db, book.id, sampleEnd);
              series[0].values.push(bal.operating / 100);
              series[1].values.push(bal.buffer / 100);
              series[2].values.push(bal.wealth / 100);
            }
            return (
              <section key={book.id} className="card mt-6 p-5">
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 className="text-base font-semibold tracking-tight">{book.name}</h2>
                  <p className="text-xs text-faint">
                    Operating flat and boring · buffer holds · wealth only steps upward
                  </p>
                </div>
                <QuarterlyChart labels={labels} series={series} />
              </section>
            );
          })}

        {/* Project ledgers */}
        {db.projects.filter((p) => p.status === "active").length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold tracking-tight">Project & venture ledgers</h2>
            <div className="card divide-y divide-line">
              {db.projects
                .filter((p) => p.status === "active")
                .map((p) => {
                  const { funded, spent } = projectBalance(db, p);
                  const bookName = db.books.find((b) => b.id === p.bookId)?.name ?? "";
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-faint">
                          {bookName} · what did the money buy?
                        </p>
                      </div>
                      <p className="tnum text-sub">
                        funded {money(funded)} · spent <span className="text-ink">{money(spent)}</span>
                      </p>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* Amendments awaiting ratification */}
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Amendments awaiting ratification</h2>
          <div className="card divide-y divide-line">
            {pending.length === 0 && (
              <p className="px-5 py-4 text-sm text-faint">
                Nothing pending. Drift, if any, happened in daylight.
              </p>
            )}
            {pending.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-sub">
                    {a.date} — {a.reason}
                  </p>
                </div>
                <form action={decideAmendment}>
                  <input type="hidden" name="amendmentId" value={a.id} />
                  <input type="hidden" name="decision" value="ratified" />
                  <button className="btn bg-up/10 text-up hover:bg-up/20 !px-3 !py-1 text-xs">Ratify</button>
                </form>
                <form action={decideAmendment}>
                  <input type="hidden" name="amendmentId" value={a.id} />
                  <input type="hidden" name="decision" value="rejected" />
                  <button className="btn-danger !px-3 !py-1 text-xs">Reject</button>
                </form>
              </div>
            ))}
          </div>
        </section>

        {/* Found a venture */}
        <section className="mt-8">
          <details className="card">
            <summary className="cursor-pointer select-none px-5 py-4 text-sm font-medium">
              Found a new venture
            </summary>
            <div className="px-5 pb-5">
              <p className="mb-4 text-xs leading-relaxed text-faint">
                Constitutional law of creation: seed capital comes from surplus or a deliberate
                wealth allocation — never from buffers, never from another venture’s operating
                money. The seed is a ceiling with a date. Every venture is born on probation.
              </p>
              <form action={addVenture} className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Name</label>
                  <input name="name" required className="field" placeholder="The new book’s name" />
                </div>
                <div>
                  <label className="label">Seed amount (arrives in operating)</label>
                  <input name="seedAmount" inputMode="decimal" className="field tnum" placeholder="0.00" />
                </div>
                <div>
                  <label className="label">Seed ceiling</label>
                  <input name="seedCeiling" inputMode="decimal" className="field tnum" placeholder="0.00" />
                </div>
                <div>
                  <label className="label">To prove itself by</label>
                  <input name="seedDeadline" className="field" placeholder="Board meeting Q1 2027" />
                </div>
                <div>
                  <label className="label">Expected monthly burn</label>
                  <input name="monthlyBurn" inputMode="decimal" className="field tnum" placeholder="0.00" />
                </div>
                <div>
                  <label className="label">Buffer target (2–3 months of burn)</label>
                  <input name="bufferTarget" inputMode="decimal" className="field tnum" placeholder="0.00" />
                </div>
                <div className="sm:col-span-2">
                  <button className="btn-primary">Open the book</button>
                </div>
              </form>
            </div>
          </details>
        </section>

        {/* Close the meeting */}
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Resolutions</h2>
          <div className="card p-5">
            <form action={closeMeeting} className="space-y-3">
              <input type="hidden" name="label" value={label} />
              <div>
                <label className="label">Next quarter’s numbers, ratified changes, births & wind-downs — one per line</label>
                <textarea
                  name="resolutions"
                  rows={4}
                  required
                  className="field"
                  placeholder={"Weekly number holds at $200\nBuffer target raised to $12,000\n…"}
                />
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <input name="notes" className="field" />
              </div>
              <button className="btn-primary">Close the meeting — resolutions in force until next quarter</button>
            </form>
          </div>

          {meetings.length > 0 && (
            <div className="mt-4 space-y-3">
              {meetings.map((m) => (
                <div key={m.id} className="card px-5 py-4">
                  <p className="text-sm font-semibold">
                    {m.label} <span className="ml-2 text-xs font-normal text-faint">{m.date}</span>
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-sub">
                    {m.resolutions.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                  {m.notes && <p className="mt-2 text-xs text-faint">{m.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
