"use client";

import { useState, useEffect } from "react";
import { formatBDT, formatDate } from "@/lib/utils";

interface Account { id: string; name: string; balance: string; currency: string; }
interface Txn { id: string; description: string; amount: string; type: string; date: string; }
interface DashData {
  totalIncome: number; totalExpense: number; netSavings: number; savingsRate: number;
  netWorth: number; totalBalance: number; investValue: number; assetValue: number;
  totalLoans: number; dpsMonthlySaving: number;
  accounts: Account[]; recentTransactions: Txn[];
  goalsProgress: { current: number; target: number; pct: number }[];
}

const METRIC_CARDS = (d: DashData) => [
  { label: "Net Worth",      value: formatBDT(d.netWorth),      color: d.netWorth >= 0 ? "#10b981" : "#ef4444", sub: "Assets − Liabilities" },
  { label: "Total Income",   value: formatBDT(d.totalIncome),   color: "#60a5fa",  sub: "All time" },
  { label: "Total Expenses", value: formatBDT(d.totalExpense),  color: "#f59e0b",  sub: "All time" },
  { label: "Net Savings",    value: formatBDT(d.netSavings),    color: d.netSavings >= 0 ? "#10b981" : "#ef4444", sub: `${d.savingsRate}% savings rate` },
  { label: "Investments",    value: formatBDT(d.investValue),   color: "#a78bfa",  sub: "Portfolio value" },
  { label: "Loans",          value: formatBDT(d.totalLoans),    color: "#f87171",  sub: "Outstanding balance" },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>Loading dashboard…</div>;
  if (!data) return <div style={{ color: "#ef4444", padding: 40 }}>Failed to load.</div>;

  return (
    <div>
      <h1 style={{ color: "#f1f5f9", margin: "0 0 24px", fontSize: 22, fontWeight: 700 }}>Dashboard</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14, marginBottom: 28 }}>
        {METRIC_CARDS(data).map(({ label, value, color, sub }) => (
          <div key={label} style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ color: "#475569", fontSize: 12, marginBottom: 6 }}>{label}</div>
            <div style={{ color, fontWeight: 700, fontSize: 20 }}>{value}</div>
            <div style={{ color: "#334155", fontSize: 11, marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #141428" }}>
            <span style={{ color: "#a78bfa", fontWeight: 600, fontSize: 14 }}>Accounts</span>
          </div>
          <div style={{ padding: "12px 20px" }}>
            {data.accounts.length === 0 && <div style={{ color: "#475569", fontSize: 13 }}>No accounts yet.</div>}
            {data.accounts.map(a => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #0a0a14" }}>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>{a.name}</span>
                <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 13 }}>{formatBDT(parseFloat(a.balance))}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0" }}>
              <span style={{ color: "#64748b", fontSize: 12 }}>Total Balance</span>
              <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: 14 }}>{formatBDT(data.totalBalance)}</span>
            </div>
          </div>
        </div>

        <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #141428" }}>
            <span style={{ color: "#a78bfa", fontWeight: 600, fontSize: 14 }}>Goal Progress</span>
          </div>
          <div style={{ padding: "12px 20px" }}>
            {data.goalsProgress.length === 0 && <div style={{ color: "#475569", fontSize: 13 }}>No active goals.</div>}
            {data.goalsProgress.map((g, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>{formatBDT(g.current)} / {formatBDT(g.target)}</span>
                  <span style={{ color: "#f1f5f9", fontSize: 12, fontWeight: 600 }}>{g.pct}%</span>
                </div>
                <div style={{ background: "#141428", borderRadius: 4, height: 6, overflow: "hidden" }}>
                  <div style={{ background: "#10b981", width: `${Math.min(g.pct, 100)}%`, height: "100%", borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #141428" }}>
          <span style={{ color: "#a78bfa", fontWeight: 600, fontSize: 14 }}>Recent Transactions</span>
        </div>
        {data.recentTransactions.length === 0 && (
          <div style={{ padding: 24, color: "#475569", textAlign: "center" }}>No transactions yet.</div>
        )}
        {data.recentTransactions.map(t => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #0a0a14" }}>
            <div>
              <div style={{ color: "#f1f5f9", fontSize: 14 }}>{t.description ?? "—"}</div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>{formatDate(t.date)}</div>
            </div>
            <div style={{ color: t.type === "income" ? "#10b981" : "#f87171", fontWeight: 600, fontSize: 14 }}>
              {t.type === "income" ? "+" : "−"}{formatBDT(parseFloat(t.amount))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
