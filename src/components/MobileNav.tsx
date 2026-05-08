"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard",    icon: "⊞", label: "Home" },
  { href: "/transactions", icon: "↕", label: "Txns" },
  { href: "/budgets",      icon: "📊", label: "Budget" },
  { href: "/tax",          icon: "🧾", label: "Tax" },
  { href: "/accounts",     icon: "🏦", label: "Accounts" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        display: "none",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#0e0e1c",
        borderTop: "1px solid #1e1e38",
        zIndex: 50,
        padding: "6px 0 env(safe-area-inset-bottom)",
      }}
      className="mobile-bottom-nav"
    >
      {TABS.map(({ href, icon, label }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              flex: 1,
              padding: "4px 0",
              color: active ? "#7c3aed" : "#64748b",
              textDecoration: "none",
              fontSize: 18,
              transition: "color 0.15s",
            }}
          >
            <span>{icon}</span>
            <span style={{ fontSize: 10 }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
