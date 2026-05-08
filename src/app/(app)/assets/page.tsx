"use client";

import { useState, useEffect, useCallback } from "react";
import { formatBDT, formatDate } from "@/lib/utils";

interface Asset {
  id: string; type: string; name: string;
  purchasePrice: string; currentValue: string;
  purchaseDate: string; depreciationMethod: string; note: string | null;
}

const TYPE_ICON: Record<string, string> = { real_estate: "🏠", vehicle: "🚗", gold: "🥇", electronics: "💻", other: "📦" };
const TYPE_LABEL: Record<string, string> = { real_estate: "Real Estate", vehicle: "Vehicle", gold: "Gold/Jewelry", electronics: "Electronics", other: "Other" };

export default function AssetsPage() {
  const [list, setList]         = useState<Asset[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "real_estate", name: "", purchasePrice: "", currentValue: "", purchaseDate: new Date().toISOString().slice(0, 10), depreciationMethod: "none", note: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setList(await (await fetch("/api/assets")).json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSaving(true);
    const res = await fetch("/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setShowForm(false); setForm({ type: "real_estate", name: "", purchasePrice: "", currentValue: "", purchaseDate: new Date().toISOString().slice(0, 10), depreciationMethod: "none", note: "" }); load(); }
    else { const d = await res.json(); setError(d.error ?? "Failed"); }
    setSaving(false);
  }

  const totalValue = list.reduce((s, a) => s + parseFloat(a.currentValue), 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#f1f5f9", margin: 0, fontSize: 22, fontWeight: 700 }}>Assets</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 13 }}>Total estimated value: {formatBDT(totalValue)}</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Asset</button>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 16, padding: "32px", width: "100%", maxWidth: 420 }}>
            <h2 style={{ color: "#f1f5f9", margin: "0 0 24px", fontSize: 18 }}>New Asset</h2>
            <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }}>
                {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{TYPE_ICON[v]} {l}</option>)}
              </select>
              <input placeholder="Asset name *" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              <div style={{ display: "flex", gap: 10 }}>
                <input type="number" placeholder="Purchase price *" required min="0" step="0.01" value={form.purchasePrice} onChange={e => setForm(f => ({ ...f, purchasePrice: e.target.value }))} style={{ flex: 1, background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
                <input type="number" placeholder="Current value *" required min="0" step="0.01" value={form.currentValue} onChange={e => setForm(f => ({ ...f, currentValue: e.target.value }))} style={{ flex: 1, background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              </div>
              <input type="date" required value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              <select value={form.depreciationMethod} onChange={e => setForm(f => ({ ...f, depreciationMethod: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }}>
                <option value="none">No depreciation</option>
                <option value="straight_line">Straight-line</option>
                <option value="declining_balance">Declining balance</option>
              </select>
              <input placeholder="Note (optional)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              {error && <p style={{ margin: 0, color: "#ef4444", fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: "9px 0", background: "transparent", border: "1px solid #1e1e38", borderRadius: 8, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: "9px 0", background: "#7c3aed", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Saving…" : "Add Asset"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>Loading…</div> : list.length === 0 ? (
        <div style={{ color: "#64748b", padding: 40, textAlign: "center", background: "#0e0e1c", borderRadius: 12, border: "1px solid #1e1e38" }}>No assets yet.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 16 }}>
          {list.map(a => {
            const gain = parseFloat(a.currentValue) - parseFloat(a.purchasePrice);
            return (
              <div key={a.id} style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, padding: "20px 22px" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{TYPE_ICON[a.type]}</div>
                <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{a.name}</div>
                <div style={{ color: "#475569", fontSize: 12, marginBottom: 14 }}>{TYPE_LABEL[a.type]} · {formatDate(a.purchaseDate)}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><div style={{ color: "#475569", fontSize: 11 }}>Purchased</div><div style={{ color: "#94a3b8", fontWeight: 600 }}>{formatBDT(a.purchasePrice)}</div></div>
                  <div><div style={{ color: "#475569", fontSize: 11 }}>Current value</div><div style={{ color: "#f1f5f9", fontWeight: 600 }}>{formatBDT(a.currentValue)}</div></div>
                </div>
                <div style={{ marginTop: 10, color: gain >= 0 ? "#10b981" : "#ef4444", fontSize: 13, fontWeight: 600 }}>
                  {gain >= 0 ? "▲" : "▼"} {formatBDT(Math.abs(gain))} ({gain >= 0 ? "+" : ""}{Math.round((gain / parseFloat(a.purchasePrice)) * 100)}%)
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
