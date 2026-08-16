import Link from "next/link";
import { readDb } from "@/lib/db";
import { logout } from "@/lib/actions";

export default function Nav({ active }: { active: string }) {
  const db = readDb();
  const links: { href: string; label: string; key: string }[] = [
    { href: "/", label: "This Week", key: "week" },
    ...db.books.map((b) => ({ href: `/book/${b.id}`, label: b.name, key: `book:${b.id}` })),
    { href: "/constitution", label: "Constitution", key: "constitution" },
    { href: "/meeting", label: "Board Meeting", key: "meeting" },
  ];
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center gap-1 overflow-x-auto px-4 py-3">
        <Link href="/" className="mr-3 shrink-0 text-[15px] font-semibold tracking-tight">
          Moneymeter
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              className={
                "whitespace-nowrap rounded-full px-3 py-1.5 text-sm " +
                (active === l.key
                  ? "bg-ink text-white"
                  : "text-sub hover:bg-line/60 hover:text-ink")
              }
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="ml-auto shrink-0 pl-2">
          <button className="rounded-full px-3 py-1.5 text-sm text-faint hover:text-ink">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
