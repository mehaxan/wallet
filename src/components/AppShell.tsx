"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";

interface User {
  name: string;
  email: string;
  role: string;
}

export default function AppShell({ children, user }: { children: React.ReactNode; user: User }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#08080f" }}>
      {/* Mobile menu button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      <Sidebar user={user} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main
        className="app-main"
        style={{ marginLeft: 220, padding: "32px 28px 32px", minHeight: "100vh" }}
      >
        {children}
      </main>

      <MobileNav />
    </div>
  );
}
