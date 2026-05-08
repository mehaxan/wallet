"use client";

import { useState, useEffect, useCallback } from "react";
import { formatBDT } from "@/lib/utils";

interface Category { id: string; name: string; icon: string | null; }
interface Budget {
  budget: { id: string; amount: string; month: number; year: number; categoryId: string | null; };
  category: Category | null;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function BudgetsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const [budgets,    setBudgets]    = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ categoryId: "", amount: "" });
  const [saving, setSaving]     = useState(false);
  const [error,  setError]      = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [b, c] = await Promise.all([
      fetch(`/api/budgets?month=${month}&year=${year}`).then(r => r.json()),
      fetch("/api/categories").then(r => r.json()),
    ]);
    setBudgets(Array.isArray(b) ? b : []); setCategories(Array.isArray(c) ? c : []);
    setLoading(false);
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSaving(true);
    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, categoryId: form.categoryId || null, month, year }),
    });
    if (res.ok) { setShowForm(false); setForm({ categoryId: "", amount: "" }); load(); }
    else { const d = await res.json(); setError(d.error ?? "Failed"); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#f1f5f9", margin: 0, fontSize: 22, fontWeight: 700 }}>Budgets</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 13 }}>Monthly spending limits by category</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 6, padding: "6px 10px", color: "#f1f5f9", fontSize: 13 }}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 6, padding: "6px 10px", color: "#f1f5f9", fontSize: 13 }}>
            {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => { setError(""); setShowForm(true); }} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Budget</button>
        </div>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 16, padding: "32px", width: "100%", maxWidth: 400 }}>
            <h2 style={{ color: "#f1f5f9", margin: "0 0 6px", fontSize: 18 }}>Add Budget</h2>
            <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 24px" }}>{MONTHS[month-1]} {year}</p>
            <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }}>
                <option value="">— No category (General) —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon ?? "📋"} {c.name}</option>)}
              </select>
              <input type="number" placeholder="Budget amount (BDT) *" required min="1" step="0.01"
                value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              {error && <p style={{ margin: 0, color: "#ef4444", fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => { setShowForm(false); setError(""); }} style={{ flex: 1, padding: "9px 0", background: "transparent", border: "1px solid #1e1e38", borderRadius: 8, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: "9px 0", background: "#7c3aed", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Saving…" : "Add Budget"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>Loading…</div>
      ) : budgets.length === 0 ? (
        <div style={{ color: "#64748b", padding: 40, textAlign: "center", background: "#0e0e1c", borderRadius: 12, border: "1px dashed #1e1e38" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>💰</div>
          <div style={{ marginBottom: 14 }}>No budgets for {MONTHS[month-1]} {year} yet.</div>
          <button onClick={() => { setError(""); setShowForm(true); }} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Budget</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {budgets.map(({ budget, category }) => (
            <div key={budget.id} style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 20 }}>{category?.icon ?? "📋"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#f1f5f9", fontSize: 13, fontWeight: 500 }}>{category?.name ?? "General"}</div>
              </div>
              <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14 }}>{formatBDT(budget.amount)}</div>
              <button onClick={() => handleDelete(budget.id)} title="Delete" style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
