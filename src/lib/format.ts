export function money(cents: number): string {
  const sign = cents < 0 ? "−" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const rem = abs % 100;
  const d = dollars.toLocaleString("en-US");
  return rem === 0 ? `${sign}$${d}` : `${sign}$${d}.${String(rem).padStart(2, "0")}`;
}

export function parseMoney(input: string | null | undefined): number {
  if (!input) return 0;
  const n = parseFloat(String(input).replace(/[$,\s]/g, ""));
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
