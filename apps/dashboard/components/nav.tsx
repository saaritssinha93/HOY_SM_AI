"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/settings/actions";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/approvals", label: "Approvals" },
  { href: "/employees", label: "Employees" },
  { href: "/leads", label: "Leads" },
  { href: "/orders", label: "Orders" },
  { href: "/settings", label: "Settings" },
  { href: "/audit", label: "Audit" },
];

export function Nav() {
  const pathname = usePathname();

  // Hide on auth pages
  if (pathname.startsWith("/login") || pathname.startsWith("/auth/")) return null;

  return (
    <header className="border-b border-ink/10 bg-cream/95 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
        <Link href="/" className="font-semibold text-lg whitespace-nowrap">
          HOY Ops
        </Link>
        <nav className="flex items-center gap-1 flex-wrap text-sm">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2 py-1 rounded ${
                  active ? "bg-ink/5 text-ink" : "text-ink/70 hover:bg-ink/5 hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={signOutAction} className="ml-auto">
          <button
            type="submit"
            className="text-xs px-2 py-1 rounded text-ink/50 hover:text-ink hover:bg-ink/5"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
