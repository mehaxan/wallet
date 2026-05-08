"use client";

import { useState, useEffect, useCallback } from "react";
import { formatBDT, formatDate } from "@/lib/utils";

interface Transaction {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: string;
  date: string;
  note: string | null;
  category: { id: string; name: string; icon: string | null; color: string | null } | null;
  account: { id: string; name: string; type: string } | null;
}

interface Category { id: string; name: string; type: string; icon: string | null; }
interface Account  { id: string; name: string; type: string; }

const TYPE_COLOR = { income: "#10b981", expense: "#ef4444", transfer: "#3b82f6" };
const TYPE_SIGN  = { income: "+", expense: "-", transfer: "→" };

export default function TransactionsPage() {
  const [txns, setTxns]         = useState<Transaction[]>([]);
  const [total, setTotal]       = useState(0);
  const [cats, setCats]         = useState<Category[]>([]);
  const [accs, setAccs]         = useState<Account[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState("");

  // Form state
  const [form, setForm] = useState({ type: "expense", amount: "", date: new Date().toISOString().slice(0, 10), note: "", categoryId: "", accountId: "", taxable: true });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const qs = filterType ? `?type=${filterType}` : "";
    const res = await fetch(`/api/transactions${qs}`);
    const json = await res.json();
    setTxns(json.data ?? []);
    setTotal(json.total ?? 0);
    setLoading(false);
  }, [filterType]);

  useEffect(() => {
    load();
    fetch("/api/categories").then(r => r.json()).then(setCats);
    fetch("/api/accounts").then(r => r.json()).then(setAccs);
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    const res = await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setShowForm(false); setForm({ type: "expense", amount: "", date: new Date().toISOString().slice(0, 10), note: "", categoryId: "", accountId: "", taxable: true }); load(); }
    else { const d = await res.json(); setError(d.error ?? "Failed"); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this transaction?")) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    load();
  }

  const filteredCats = cats.filter(c => !form.type || c.type === form.type);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#f1f5f9", margin: 0, fontSize: 22, fontWeight: 700 }}>Transactions</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 13 }}>{total} records</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Add
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["", "income", "expense", "transfer"].map(t => (
          <button key={t} onClick={() => setFilterType(t)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", fontSize: 12, fontWeight: 500, cursor: "pointer",
            borderColor: filterType === t ? "#7c3aed" : "#1e1e38",
            background: filterType === t ? "#2e1065" : "transparent",
            color: filterType === t ? "#a78bfa" : "#64748b" }}>
            {t || "All"}
          </button>
        ))}
      </div>

      {/* Add form modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 16, padding: "32px", width: "100%", maxWidth: 460 }}>
            <h2 style={{ color: "#f1f5f9", margin: "0 0 24px", fontSize: 18 }}>New Transaction</h2>
            <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Type */}
              <div style={{ display: "flex", gap: 8 }}>
                {(["income","expense","transfer"] as const).map(t => (
                  <button type="button" key={t} onClick={() => setForm(f => ({ ...f, type: t, categoryId: "" }))}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      borderColor: form.type === t ? TYPE_COLOR[t] : "#1e1e38",
                      background: form.type === t ? `${TYPE_COLOR[t]}22` : "transparent",
                      color: form.type === t ? TYPE_COLOR[t] : "#64748b" }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <input type="number" placeholder="Amount (BDT)" min="0.01" step="0.01" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: form.categoryId ? "#f1f5f9" : "#64748b", fontSize: 14 }}>
                <option value="">Category (optional)</option>
                {filteredCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <select value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: form.accountId ? "#f1f5f9" : "#64748b", fontSize: 14 }}>
                <option value="">Account (optional)</option>
                {accs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <input placeholder="Note (optional)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              {error && <p style={{ margin: 0, color: "#ef4444", fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: "9px 0", background: "transparent", border: "1px solid #1e1e38", borderRadius: 8, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: "9px 0", background: "#7c3aed", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {saving ? "Saving…" : "Save Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>Loading…</div>
      ) : txns.length === 0 ? (
        <div style={{ color: "#64748b", padding: 40, textAlign: "center", background: "#0e0e1c", borderRadius: 12, border: "1px solid #1e1e38" }}>
          No transactions yet. Add your first one!
        </div>
      ) : (
        <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e1e38" }}>
                {["Date", "Category", "Account", "Note", "Amount", ""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", color: "#64748b", fontSize: 12, fontWeight: 500, textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txns.map(t => (
                <tr key={t.id} style={{ borderBottom: "1px solid #141428" }}>
                  <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: 13 }}>{formatDate(t.date)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13 }}>
                    {t.category ? (
                      <span style={{ color: "#f1f5f9" }}>{t.category.icon} {t.category.name}</span>
                    ) : <span style={{ color: "#334155" }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#94a3b8", fontSize: 13 }}>{t.account?.name ?? "—"}</td>
                  <td style={{ padding: "12px 16px", color: "#64748b", fontSize: 13, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.note ?? "—"}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 600, fontSize: 14, color: TYPE_COLOR[t.type] }}>
                    {TYPE_SIGN[t.type]}{formatBDT(t.amount)}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button onClick={() => handleDelete(t.id)} style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer", fontSize: 14, padding: "2px 6px" }} title="Delete">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
