"use client";

import { useState, useEffect, useCallback } from "react";
import { formatBDT, formatDate } from "@/lib/utils";

interface Goal {
  id: string; name: string; icon: string | null;
  targetAmount: string; currentAmount: string;
  targetDate: string | null; status: string;
}

export default function GoalsPage() {
  const [goals,   setGoals]   = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", targetAmount: "", currentAmount: "", targetDate: "", icon: "🎯" });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setGoals(await fetch("/api/goals").then(r => r.json()));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSaving(true);
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setShowForm(false); setForm({ name: "", targetAmount: "", currentAmount: "", targetDate: "", icon: "🎯" }); load(); }
    else { const d = await res.json(); setError(d.error ?? "Failed"); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete goal?")) return;
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#f1f5f9", margin: 0, fontSize: 22, fontWeight: 700 }}>Goals</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 13 }}>Track your savings targets</p>
        </div>
        <button onClick={() => { setError(""); setShowForm(true); }} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Goal</button>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 16, padding: "32px", width: "100%", maxWidth: 420 }}>
            <h2 style={{ color: "#f1f5f9", margin: "0 0 24px", fontSize: 18 }}>New Goal</h2>
            <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <input placeholder="Icon" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} style={{ width: 60, background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 18, textAlign: "center" }} />
                <input placeholder="Goal name *" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ flex: 1, background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <input type="number" placeholder="Target amount *" required min="1" step="0.01" value={form.targetAmount} onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))} style={{ flex: 1, background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
                <input type="number" placeholder="Saved so far" min="0" step="0.01" value={form.currentAmount} onChange={e => setForm(f => ({ ...f, currentAmount: e.target.value }))} style={{ flex: 1, background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              </div>
              <input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              {error && <p style={{ margin: 0, color: "#ef4444", fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: "9px 0", background: "transparent", border: "1px solid #1e1e38", borderRadius: 8, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: "9px 0", background: "#7c3aed", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Saving…" : "Add Goal"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>Loading…</div>
      ) : goals.length === 0 ? (
        <div style={{ color: "#64748b", padding: 40, textAlign: "center", background: "#0e0e1c", borderRadius: 12, border: "1px dashed #1e1e38" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🎯</div>
          <div style={{ marginBottom: 14 }}>No goals yet. Set your first savings target!</div>
          <button onClick={() => { setError(""); setShowForm(true); }} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Goal</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
          {goals.map(g => {
            const pct = Math.min(100, Math.round((parseFloat(g.currentAmount) / parseFloat(g.targetAmount)) * 100));
            const remaining = parseFloat(g.targetAmount) - parseFloat(g.currentAmount);
            const pctColor = pct >= 100 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#7c3aed";

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
                    <span style={{ fontSize: 24 }}>{g.icon ?? "🎯"}</span>
                    <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14 }}>{g.name}</div>
                  </div>
                  <button onClick={() => handleDelete(g.id)} title="Delete" style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer", fontSize: 16 }}>✕</button>
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
      )}
    </div>
  );
}
