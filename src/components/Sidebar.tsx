"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard",    icon: "⊞",  label: "Dashboard" },
  { href: "/transactions", icon: "↕",  label: "Transactions" },
  { href: "/accounts",     icon: "🏦", label: "Accounts" },
  { href: "/budgets",      icon: "📊", label: "Budgets & Goals" },
  { href: "/investments",  icon: "📈", label: "Investments" },
  { href: "/dps",          icon: "💰", label: "DPS & Savings" },
  { href: "/loans",        icon: "📋", label: "Loans" },
  { href: "/assets",       icon: "🏠", label: "Assets" },
  { href: "/tax",          icon: "🧾", label: "Tax" },
  { href: "/item-loans",   icon: "📦", label: "Item Loans" },
  { href: "/reports",      icon: "📄", label: "Reports" },
];

export function Sidebar({ user, open, onClose }: { user: { name: string; email: string; role: string }; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 39 }}
        />
      )}

      <aside
        className={`app-sidebar${open ? " sidebar-open" : ""}`}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 220,
          background: "#0e0e1c",
          borderRight: "1px solid #1e1e38",
          display: "flex",
          flexDirection: "column",
          zIndex: 40,
          overflowY: "auto",
        }}
      >
        {/* Logo */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #1e1e38" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#7c3aed" }}>Wallet</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Personal Finance</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 8,
                  marginBottom: 2,
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? "#f1f5f9" : "#94a3b8",
                  background: active ? "#1a1a35" : "transparent",
                  textDecoration: "none",
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "#141428"; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span style={{ width: 18, textAlign: "center", fontSize: 14 }}>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e1e38" }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
            <div style={{ fontSize: 11, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
            {user.role === "admin" && (
              <span style={{ fontSize: 10, background: "#2e1065", color: "#a78bfa", borderRadius: 4, padding: "1px 6px", marginTop: 4, display: "inline-block" }}>admin</span>
            )}
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "7px 0",
              background: "transparent",
              border: "1px solid #1e1e38",
              borderRadius: 7,
              color: "#94a3b8",
              fontSize: 12,
              cursor: "pointer",
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#ef4444"; (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#1e1e38"; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
