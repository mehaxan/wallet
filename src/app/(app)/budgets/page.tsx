"use client";

import { useState, useEffect, useCallback } from "react";
import { formatBDT, formatDate } from "@/lib/utils";

interface Goal {
  id: string; name: string; icon: string | null;
  targetAmount: string; currentAmount: string;
  targetDate: string | null; status: string;
}
interface Budget {
  budget: { id: string; amount: string; month: number; year: number; categoryId: string | null; };
  category: { id: string; name: string; icon: string | null; } | null;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function BudgetsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals,   setGoals]   = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Goal form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ name: "", targetAmount: "", currentAmount: "", targetDate: "", icon: "🎯" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [b, g] = await Promise.all([
      fetch(`/api/budgets?month=${month}&year=${year}`).then(r => r.json()),
      fetch("/api/goals").then(r => r.json()),
    ]);
    setBudgets(b); setGoals(g);
    setLoading(false);
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSaving(true);
    const res = await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(goalForm) });
    if (res.ok) { setShowGoalForm(false); setGoalForm({ name: "", targetAmount: "", currentAmount: "", targetDate: "", icon: "🎯" }); load(); }
    else { const d = await res.json(); setError(d.error ?? "Failed"); }
    setSaving(false);
  }

  async function handleDeleteGoal(id: string) {
    if (!confirm("Delete goal?")) return;
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 style={{ color: "#f1f5f9", margin: "0 0 24px", fontSize: 22, fontWeight: 700 }}>Budgets & Goals</h1>

      {/* Goals section */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ color: "#a78bfa", margin: 0, fontSize: 16, fontWeight: 600 }}>🎯 Goals</h2>
        <button onClick={() => setShowGoalForm(true)} style={{ background: "transparent", color: "#7c3aed", border: "1px solid #7c3aed", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Goal</button>
      </div>

      {showGoalForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 16, padding: "32px", width: "100%", maxWidth: 420 }}>
            <h2 style={{ color: "#f1f5f9", margin: "0 0 24px", fontSize: 18 }}>New Goal</h2>
            <form onSubmit={handleAddGoal} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <input placeholder="Icon" value={goalForm.icon} onChange={e => setGoalForm(f => ({ ...f, icon: e.target.value }))} style={{ width: 60, background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 18, textAlign: "center" }} />
                <input placeholder="Goal name *" required value={goalForm.name} onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))} style={{ flex: 1, background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <input type="number" placeholder="Target amount *" required min="1" step="0.01" value={goalForm.targetAmount} onChange={e => setGoalForm(f => ({ ...f, targetAmount: e.target.value }))} style={{ flex: 1, background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
                <input type="number" placeholder="Saved so far" min="0" step="0.01" value={goalForm.currentAmount} onChange={e => setGoalForm(f => ({ ...f, currentAmount: e.target.value }))} style={{ flex: 1, background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              </div>
              <input type="date" value={goalForm.targetDate} onChange={e => setGoalForm(f => ({ ...f, targetDate: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              {error && <p style={{ margin: 0, color: "#ef4444", fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setShowGoalForm(false)} style={{ flex: 1, padding: "9px 0", background: "transparent", border: "1px solid #1e1e38", borderRadius: 8, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: "9px 0", background: "#7c3aed", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Saving…" : "Add Goal"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>Loading…</div> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14, marginBottom: 32 }}>
            {goals.length === 0 && <div style={{ color: "#64748b", padding: 24, textAlign: "center", background: "#0e0e1c", borderRadius: 12, border: "1px solid #1e1e38", gridColumn: "1/-1" }}>No goals yet.</div>}
            {goals.map(g => {
              const pct = Math.min(100, Math.round((parseFloat(g.currentAmount) / parseFloat(g.targetAmount)) * 100));
              const remaining = parseFloat(g.targetAmount) - parseFloat(g.currentAmount);
              const pctColor = pct >= 100 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#7c3aed";

              // Projection: if target date given, compute required monthly savings
              let projection = "";
              if (g.targetDate && remaining > 0) {
                const months = Math.max(1, Math.round((new Date(g.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)));
                const monthly = Math.ceil(remaining / months);
                projection = `Save ${formatBDT(monthly)}/mo to reach by ${formatDate(g.targetDate)}`;
              }

              return (
                <div key={g.id} style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, padding: "20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{g.icon ?? "🎯"}</span>
                      <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14 }}>{g.name}</div>
                    </div>
                    <button onClick={() => handleDeleteGoal(g.id)} style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer" }}>✕</button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "#64748b", fontSize: 13 }}>{formatBDT(g.currentAmount)}</span>
                    <span style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 600 }}>{formatBDT(g.targetAmount)}</span>
                  </div>
                  <div style={{ background: "#141428", borderRadius: 6, height: 8, overflow: "hidden", marginBottom: 6 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: pctColor, borderRadius: 6 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: pctColor, fontSize: 12, fontWeight: 600 }}>{pct}%</span>
                    {remaining > 0 && <span style={{ color: "#475569", fontSize: 12 }}>{formatBDT(remaining)} left</span>}
                  </div>
                  {projection && <div style={{ marginTop: 8, color: "#64748b", fontSize: 11 }}>{projection}</div>}
                </div>
              );
            })}
          </div>

          {/* Budgets section */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <h2 style={{ color: "#a78bfa", margin: 0, fontSize: 16, fontWeight: 600 }}>💰 Monthly Budgets</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 6, padding: "4px 8px", color: "#f1f5f9", fontSize: 12 }}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 6, padding: "4px 8px", color: "#f1f5f9", fontSize: 12 }}>
                {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {budgets.length === 0 ? (
            <div style={{ color: "#64748b", padding: 24, textAlign: "center", background: "#0e0e1c", borderRadius: 12, border: "1px solid #1e1e38" }}>
              No budgets for {MONTHS[month-1]} {year}. Use POST /api/budgets to add.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {budgets.map(({ budget, category }) => (
                <div key={budget.id} style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 20 }}>{category?.icon ?? "📋"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{category?.name ?? "General"}</div>
                    <div style={{ background: "#141428", borderRadius: 4, height: 4 }}>
                      <div style={{ width: "0%", height: "100%", background: "#7c3aed", borderRadius: 4 }} />
                    </div>
                  </div>
                  <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14 }}>{formatBDT(budget.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
