import Nav from "@/components/Nav";
import { readDb } from "@/lib/db";
import { updateConstitution, addAmendment } from "@/lib/actions";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function ConstitutionPage() {
  const db = readDb();
  const c = db.constitution;
  const personal = db.books.find((b) => b.kind === "personal");
  const amendments = [...db.amendments].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      <Nav active="constitution" />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">The Constitution</h1>
        <p className="mt-1 text-sm text-sub">
          One page of standing answers. When it and an impulse conflict, the constitution wins.
          When it and reality conflict, amend it at the meeting — never by drift.
        </p>

        {/* Standing answers */}
        <section className="card mt-6 p-6">
          <form action={updateConstitution} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Giving, off the top</label>
                <div className="flex items-center gap-2">
                  <input
                    name="givingPct"
                    type="number"
                    step="0.5"
                    min={0}
                    max={100}
                    defaultValue={c.givingPct}
                    className="field tnum"
                  />
                  <span className="text-sm text-sub">%</span>
                </div>
              </div>
              <div>
                <label className="label">The owner’s draw</label>
                <input
                  name="drawAmount"
                  inputMode="decimal"
                  defaultValue={c.drawAmount ? (c.drawAmount / 100).toString() : ""}
                  className="field tnum"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="label">Draw cadence</label>
                <select name="drawCadence" className="field" defaultValue={c.drawCadence}>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Surplus split (business, by written rule)</label>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <input name="splitWealth" type="number" min={0} max={100} defaultValue={c.surplusSplit.wealth} className="field tnum" />
                  <span className="text-xs text-sub">% wealth</span>
                </div>
                <div className="flex items-center gap-2">
                  <input name="splitGrowth" type="number" min={0} max={100} defaultValue={c.surplusSplit.growth} className="field tnum" />
                  <span className="text-xs text-sub">% growth</span>
                </div>
                <div className="flex items-center gap-2">
                  <input name="splitOnward" type="number" min={0} max={100} defaultValue={c.surplusSplit.onward} className="field tnum" />
                  <span className="text-xs text-sub">% onward</span>
                </div>
              </div>
            </div>

            <div>
              <label className="label">Articles & notes</label>
              <textarea
                name="notes"
                rows={5}
                defaultValue={c.notes}
                className="field font-normal"
                placeholder="Fill the tank every week, low or not. Annual rent accrues monthly. Every hire is a ceiling with a review date…"
              />
            </div>

            <button className="btn-primary">Save the constitution</button>
          </form>
        </section>

        {/* Numbers held elsewhere */}
        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="card p-5">
            <p className="label">Weekly number (personal)</p>
            <p className="tnum text-xl font-semibold">
              {personal?.weeklyNumber ? money(personal.weeklyNumber) : "—"}
            </p>
            <p className="mt-1 text-xs text-faint">
              Derived from observed reality, never declared by aspiration. Set it in the{" "}
              <a className="text-act" href={`/book/${personal?.id}`}>
                personal book
              </a>
              .
            </p>
          </div>
          <div className="card p-5">
            <p className="label">Buffer targets</p>
            <ul className="mt-1 space-y-1 text-sm">
              {db.books.map((b) => (
                <li key={b.id} className="flex justify-between">
                  <span className="text-sub">{b.name}</span>
                  <span className="tnum">{b.bufferTarget ? money(b.bufferTarget) : "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Amendment log */}
        <section className="mt-10">
          <h2 className="mb-1 text-lg font-semibold tracking-tight">Amendment log</h2>
          <p className="mb-3 text-sm text-sub">
            Mid-quarter changes are allowed — in daylight. Thirty seconds of written honesty,
            ratified at the next meeting.
          </p>
          <div className="card divide-y divide-line">
            {amendments.length === 0 && (
              <p className="px-5 py-4 text-sm text-faint">No amendments. The rules are holding.</p>
            )}
            {amendments.map((a) => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-sub">{a.reason}</p>
                </div>
                <span className="shrink-0 text-xs text-faint">{a.date}</span>
                <span
                  className={
                    "pill shrink-0 " +
                    (a.status === "ratified"
                      ? "bg-up/15 text-up"
                      : a.status === "rejected"
                        ? "bg-down/15 text-down"
                        : "bg-note/20 text-warn")
                  }
                >
                  {a.status}
                </span>
              </div>
            ))}
            <details>
              <summary className="cursor-pointer select-none px-5 py-3 text-sm font-medium text-act">
                + Log an amendment
              </summary>
              <form action={addAmendment} className="space-y-3 px-5 pb-4">
                <input type="hidden" name="back" value="/constitution" />
                <div>
                  <label className="label">What changed</label>
                  <input name="title" required className="field" placeholder="Raised the weekly number to $220" />
                </div>
                <div>
                  <label className="label">Why — the thirty seconds of honesty</label>
                  <textarea name="reason" rows={2} required className="field" placeholder="Because…" />
                </div>
                <button className="btn-primary">Log it</button>
              </form>
            </details>
          </div>
        </section>
      </main>
    </>
  );
}
