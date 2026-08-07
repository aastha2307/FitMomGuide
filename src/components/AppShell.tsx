"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/plan", label: "Plan" },
  { href: "/stats", label: "Stats" },
  { href: "/profile", label: "Profile" },
];

export function AppShell({
  children,
  showNav = true,
}: {
  children: ReactNode;
  showNav?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <header className="top-bar">
        <Link href="/" className="brand-mark">
          FitMomGuide
        </Link>
      </header>
      <main className="page-main">{children}</main>
      {showNav ? (
        <nav className="bottom-nav" aria-label="Primary">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "nav-link active" : "nav-link"}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
