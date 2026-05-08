"use client";

import { useState, useEffect, useCallback } from "react";
import { formatBDT, formatDate, calcROI } from "@/lib/utils";

interface Investment {
  id: string; type: string; name: string;
  investedAmount: string; currentValue: string;
  units: string | null; purchaseDate: string;
  maturityDate: string | null; interestRate: string | null;
  brokerName: string | null; isTaxRebateEligible: boolean; note: string | null;
}

const TYPE_ICON: Record<string, string> = { stock: "📈", mutual_fund: "🏦", bond: "📋", sanchayapatra: "🏛️", gold: "🥇", crypto: "₿", fd: "🏧", other: "📂" };
const TYPE_LABEL: Record<string, string> = { stock: "Stock", mutual_fund: "Mutual Fund", bond: "Bond", sanchayapatra: "Sanchayapatra", gold: "Gold", crypto: "Crypto", fd: "Fixed Deposit", other: "Other" };

export default function InvestmentsPage() {
  const [list, setList]         = useState<Investment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "stock", name: "", investedAmount: "", currentValue: "", units: "", purchaseDate: new Date().toISOString().slice(0, 10), interestRate: "", brokerName: "", isTaxRebateEligible: false, note: "" });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setList(await (await fetch("/api/investments")).json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    setDeleting(true);
    await fetch(`/api/investments/${id}`, { method: "DELETE" });
    setConfirmDelete(null);
    setDeleting(false);
    load();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSaving(true);
    const res = await fetch("/api/investments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setShowForm(false); setForm({ type: "stock", name: "", investedAmount: "", currentValue: "", units: "", purchaseDate: new Date().toISOString().slice(0, 10), interestRate: "", brokerName: "", isTaxRebateEligible: false, note: "" }); load(); }
    else { const d = await res.json(); setError(d.error ?? "Failed"); }
    setSaving(false);
  }

  const totalInvested = list.reduce((s, i) => s + parseFloat(i.investedAmount), 0);
  const totalCurrent  = list.reduce((s, i) => s + parseFloat(i.currentValue), 0);
  const totalGain     = totalCurrent - totalInvested;
  const overallROI    = calcROI(totalInvested, totalCurrent);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#f1f5f9", margin: 0, fontSize: 22, fontWeight: 700 }}>Investment Portfolio</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 13 }}>
            Invested: {formatBDT(totalInvested)} · Current: {formatBDT(totalCurrent)} · Gain: <span style={{ color: totalGain >= 0 ? "#10b981" : "#ef4444" }}>{formatBDT(totalGain)} ({overallROI}%)</span>
          </p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Investment</button>
      </div>

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 16, padding: "28px 32px", width: "100%", maxWidth: 360, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ color: "#f1f5f9", margin: "0 0 8px", fontSize: 16 }}>Delete Investment?</h3>
            <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 24px" }}>This cannot be undone.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: "9px 0", background: "transparent", border: "1px solid #1e1e38", borderRadius: 8, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={deleting} style={{ flex: 1, padding: "9px 0", background: "#ef4444", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{deleting ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 16, padding: "32px", width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ color: "#f1f5f9", margin: "0 0 24px", fontSize: 18 }}>New Investment</h2>
            <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }}>
                {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{TYPE_ICON[v]} {l}</option>)}
              </select>
              <input placeholder="Name / ticker *" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              <div style={{ display: "flex", gap: 10 }}>
                <input type="number" placeholder="Invested (BDT) *" required min="0.01" step="0.01" value={form.investedAmount} onChange={e => setForm(f => ({ ...f, investedAmount: e.target.value }))} style={{ flex: 1, background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
                <input type="number" placeholder="Current value *" required min="0" step="0.01" value={form.currentValue} onChange={e => setForm(f => ({ ...f, currentValue: e.target.value }))} style={{ flex: 1, background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <input type="number" placeholder="Units (optional)" min="0" step="any" value={form.units} onChange={e => setForm(f => ({ ...f, units: e.target.value }))} style={{ flex: 1, background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
                <input type="number" placeholder="Rate % (optional)" min="0" max="100" step="0.1" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} style={{ flex: 1, background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <input placeholder="Broker / platform" value={form.brokerName} onChange={e => setForm(f => ({ ...f, brokerName: e.target.value }))} style={{ flex: 2, background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
                <input type="date" required value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} style={{ flex: 1, background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.isTaxRebateEligible} onChange={e => setForm(f => ({ ...f, isTaxRebateEligible: e.target.checked }))} />
                Tax rebate eligible
              </label>
              <input placeholder="Note (optional)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              {error && <p style={{ margin: 0, color: "#ef4444", fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: "9px 0", background: "transparent", border: "1px solid #1e1e38", borderRadius: 8, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: "9px 0", background: "#7c3aed", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Saving…" : "Add Investment"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>Loading…</div> : list.length === 0 ? (
        <div style={{ color: "#64748b", padding: 40, textAlign: "center", background: "#0e0e1c", borderRadius: 12, border: "1px solid #1e1e38" }}>No investments yet.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 16 }}>
          {list.map(inv => {
            const gain = parseFloat(inv.currentValue) - parseFloat(inv.investedAmount);
            const roi  = calcROI(parseFloat(inv.investedAmount), parseFloat(inv.currentValue));
            return (
              <div key={inv.id} style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 26 }}>{TYPE_ICON[inv.type]}</span>
                  <div>
                    <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14 }}>{inv.name}</div>
                    <div style={{ color: "#475569", fontSize: 12 }}>{TYPE_LABEL[inv.type]}{inv.brokerName ? ` · ${inv.brokerName}` : ""}</div>
                  </div>
                  {inv.isTaxRebateEligible && <span style={{ marginLeft: "auto", fontSize: 10, background: "#1e3a5f", color: "#60a5fa", borderRadius: 4, padding: "2px 6px" }}>Tax rebate</span>}
                  <button onClick={() => setConfirmDelete(inv.id)} title="Delete" style={{ marginLeft: inv.isTaxRebateEligible ? 6 : "auto", background: "transparent", border: "none", cursor: "pointer", color: "#475569", fontSize: 16, padding: "2px 4px", borderRadius: 4, lineHeight: 1 }}>🗑️</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><div style={{ color: "#475569", fontSize: 11 }}>Invested</div><div style={{ color: "#f1f5f9", fontWeight: 600 }}>{formatBDT(inv.investedAmount)}</div></div>
                  <div><div style={{ color: "#475569", fontSize: 11 }}>Current</div><div style={{ color: "#f1f5f9", fontWeight: 600 }}>{formatBDT(inv.currentValue)}</div></div>
                  <div><div style={{ color: "#475569", fontSize: 11 }}>Gain/Loss</div><div style={{ color: gain >= 0 ? "#10b981" : "#ef4444", fontWeight: 600 }}>{gain >= 0 ? "+" : ""}{formatBDT(gain)}</div></div>
                  <div><div style={{ color: "#475569", fontSize: 11 }}>ROI</div><div style={{ color: roi >= 0 ? "#10b981" : "#ef4444", fontWeight: 600 }}>{roi}%</div></div>
                </div>
                <div style={{ marginTop: 12, color: "#475569", fontSize: 11 }}>Bought: {formatDate(inv.purchaseDate)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
