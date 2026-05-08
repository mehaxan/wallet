"use client";

import { useState, useEffect, useCallback } from "react";
import { formatBDT } from "@/lib/utils";

interface Account { id: string; name: string; type: string; balance: string; currency: string; isDefault: boolean; }

const TYPE_ICON: Record<string, string> = { cash: "💵", bank: "🏦", mfs: "📱", card: "💳", other: "📂" };

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "bank", currency: "BDT", balance: "", isDefault: false });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/accounts");
    setAccounts(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    const res = await fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setShowForm(false); setForm({ name: "", type: "bank", currency: "BDT", balance: "", isDefault: false }); load(); }
    else { const d = await res.json(); setError(d.error ?? "Failed"); }
    setSaving(false);
  }

  const totalBalance = accounts.reduce((s, a) => s + parseFloat(a.balance || "0"), 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#f1f5f9", margin: 0, fontSize: 22, fontWeight: 700 }}>Accounts</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 13 }}>Total: {formatBDT(totalBalance)}</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Add Account
        </button>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 16, padding: "32px", width: "100%", maxWidth: 400 }}>
            <h2 style={{ color: "#f1f5f9", margin: "0 0 24px", fontSize: 18 }}>New Account</h2>
            <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input placeholder="Account name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }}>
                <option value="cash">💵 Cash</option>
                <option value="bank">🏦 Bank</option>
                <option value="mfs">📱 MFS (bKash / Nagad)</option>
                <option value="card">💳 Card</option>
                <option value="other">📂 Other</option>
              </select>
              <input type="number" placeholder="Opening balance (BDT)" min="0" step="0.01" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} />
                Set as default account
              </label>
              {error && <p style={{ margin: 0, color: "#ef4444", fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: "9px 0", background: "transparent", border: "1px solid #1e1e38", borderRadius: 8, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: "9px 0", background: "#7c3aed", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Saving…" : "Add Account"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>Loading…</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {accounts.length === 0 && (
            <div style={{ color: "#64748b", padding: 40, textAlign: "center", background: "#0e0e1c", borderRadius: 12, border: "1px solid #1e1e38", gridColumn: "1/-1" }}>
              No accounts yet. Add your first account!
            </div>
          )}
          {accounts.map(a => (
            <div key={a.id} style={{ background: "#0e0e1c", border: `1px solid ${a.isDefault ? "#7c3aed44" : "#1e1e38"}`, borderRadius: 12, padding: "20px 22px" }} className="card-hover">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>{TYPE_ICON[a.type]}</span>
                {a.isDefault && <span style={{ fontSize: 10, background: "#2e1065", color: "#a78bfa", borderRadius: 4, padding: "2px 7px" }}>default</span>}
              </div>
              <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{a.name}</div>
              <div style={{ color: "#64748b", fontSize: 12, marginBottom: 12, textTransform: "capitalize" }}>{a.type}</div>
              <div style={{ color: "#10b981", fontWeight: 700, fontSize: 20 }}>{formatBDT(a.balance)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
