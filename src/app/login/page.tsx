import { login } from "@/lib/actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Moneymeter</h1>
          <p className="mt-1 text-sm text-sub">A constitution for money.</p>
        </div>
        <form action={login} className="card p-6">
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoFocus
            required
            className="field"
            placeholder="Enter password"
          />
          {searchParams.error && (
            <p className="mt-2 text-sm text-down">That password isn’t right.</p>
          )}
          <button className="btn-primary mt-4 w-full">Enter</button>
        </form>
        <p className="mt-6 text-center text-xs text-faint">
          Private instance — one seat at this table.
        </p>
      </div>
    </main>
  );
}
