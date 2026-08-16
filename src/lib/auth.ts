export const SESSION_COOKIE = "mm_session";

export function appPassword(): string {
  return process.env.MONEYMETER_PASSWORD || "moneymeter";
}

/** Session token = SHA-256 of the password + a fixed pepper, hex-encoded. */
export async function sessionToken(): Promise<string> {
  const data = new TextEncoder().encode("moneymeter::" + appPassword());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
