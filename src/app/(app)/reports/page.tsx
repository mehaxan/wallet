"use client";

import { useState, useEffect } from "react";

function formatBDT(v: number | string) {
  return "৳" + parseFloat(String(v)).toLocaleString("en-BD", { maximumFractionDigits: 0 });
}

interface CategoryRow { categoryName: string; type: string; total: string }
interface Txn { date: string; type: string; amount: string; categoryName?: string; accountName?: string; note?: string }
interface Report {
  month: number; year: number;
  totalIncome: number; totalExpense: number; netSavings: number; savingsRate: number;
  categoryBreakdown: CategoryRow[];
  transactions: Txn[];
}

const MONTHS = ["","January","February","March","April","May","June","July","August","September","October","November","December"];

export default function ReportsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  async function load() {
    setLoading(true); setError("");
    const res = await fetch(`/api/reports/monthly?month=${month}&year=${year}`);
    const d = await res.json();
    if (!res.ok) setError(d.error ?? "Failed");
    else setReport(d);
    setLoading(false);
  }

  useEffect(() => { load(); }, [month, year]);

  async function downloadCSV() {
    const res = await fetch(`/api/reports/monthly?month=${month}&year=${year}&format=csv`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `report-${year}-${String(month).padStart(2,"0")}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const card = (label: string, value: string, color = "#f1f5f9") => (
    <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, padding: "18px 22px", minWidth: 160 }}>
      <div style={{ color: "#64748b", fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ color, fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700, margin: 0 }}>Monthly Reports</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 13 }}>Income, expenses & category breakdown</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={month} onChange={e => setMonth(+e.target.value)}
            style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "7px 10px", color: "#f1f5f9", fontSize: 13 }}>
            {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(+e.target.value)}
            style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "7px 10px", color: "#f1f5f9", fontSize: 13 }}>
            {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={downloadCSV}
            style={{ padding: "7px 14px", background: "#7c3aed", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, cursor: "pointer" }}>
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {loading && <div style={{ color: "#64748b", textAlign: "center", padding: 40 }}>Loading…</div>}
      {error  && <div style={{ color: "#ef4444", textAlign: "center", padding: 20 }}>{error}</div>}

      {report && !loading && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            {card("Total Income", formatBDT(report.totalIncome), "#10b981")}
            {card("Total Expense", formatBDT(report.totalExpense), "#ef4444")}
            {card("Net Savings", formatBDT(report.netSavings), report.netSavings >= 0 ? "#10b981" : "#ef4444")}
            {card("Savings Rate", `${report.savingsRate}%`, report.savingsRate >= 20 ? "#10b981" : "#f59e0b")}
          </div>

          {report.categoryBreakdown.length > 0 && (
            <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Category Breakdown</div>
              {report.categoryBreakdown.map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1e1e38" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.type === "income" ? "#10b981" : "#ef4444", display: "inline-block" }} />
                    <span style={{ color: "#f1f5f9", fontSize: 14 }}>{c.categoryName}</span>
                    <span style={{ fontSize: 11, color: "#64748b", background: "#1e1e38", borderRadius: 4, padding: "1px 6px" }}>{c.type}</span>
                  </div>
                  <span style={{ color: c.type === "income" ? "#10b981" : "#ef4444", fontWeight: 600, fontSize: 14 }}>{formatBDT(c.total)}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, padding: 20 }}>
            <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
              Transactions — {MONTHS[report.month]} {report.year}
            </div>
            {report.transactions.length === 0
              ? <div style={{ color: "#475569", textAlign: "center", padding: 24 }}>No transactions this month.</div>
              : report.transactions.map((t, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < report.transactions.length - 1 ? "1px solid #1e1e38" : "none" }}>
                  <div>
                    <div style={{ color: "#f1f5f9", fontSize: 14 }}>{t.note ?? "—"}</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>{t.date} · {t.categoryName ?? "Uncategorised"} · {t.accountName ?? ""}</div>
                  </div>
                  <span style={{ color: t.type === "income" ? "#10b981" : "#ef4444", fontWeight: 600, fontSize: 14 }}>
                    {t.type === "income" ? "+" : "−"}{formatBDT(t.amount)}
                  </span>
                </div>
              ))
            }
          </div>
        </>
      )}
    </div>
  );
}
