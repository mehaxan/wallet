"use client";

import { useState, useEffect, useCallback } from "react";
import { formatBDT, formatDate } from "@/lib/utils";

interface DPS {
  id: string;
  bankName: string;
  accountNumber: string | null;
  monthlyAmount: string;
  interestRate: string;
  tenureMonths: number;
  startDate: string;
  maturityDate: string;
  maturityAmount: string | null;
  totalDeposited: string;
  status: "active" | "matured" | "closed";
  note: string | null;
}

function progressPct(dps: DPS): number {
  const start = new Date(dps.startDate).getTime();
  const end   = new Date(dps.maturityDate).getTime();
  const now   = Date.now();
  return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
}

function monthsLeft(maturityDate: string): number {
  const now = new Date();
  const mat = new Date(maturityDate);
  return Math.max(0, (mat.getFullYear() - now.getFullYear()) * 12 + mat.getMonth() - now.getMonth());
}

const STATUS_COLOR: Record<string, string> = { active: "#10b981", matured: "#7c3aed", closed: "#475569" };

export default function DPSPage() {
  const [dpsList, setDpsList]   = useState<DPS[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ bankName: "", accountNumber: "", monthlyAmount: "", interestRate: "12", tenureMonths: "60", startDate: new Date().toISOString().slice(0, 10), note: "" });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [payTarget, setPayTarget] = useState<DPS | null>(null);
  const [paying, setPaying]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/dps");
    setDpsList(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    const res = await fetch("/api/dps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      setShowForm(false);
      setForm({ bankName: "", accountNumber: "", monthlyAmount: "", interestRate: "12", tenureMonths: "60", startDate: new Date().toISOString().slice(0, 10), note: "" });
      load();
    } else {
      const d = await res.json(); setError(d.error ?? "Failed");
    }
    setSaving(false);
  }

  async function handlePayInstallment(dps: DPS) {
    setPaying(true);
    const newTotal = (parseFloat(dps.totalDeposited) + parseFloat(dps.monthlyAmount)).toFixed(2);
    await fetch(`/api/dps/${dps.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalDeposited: newTotal }),
    });
    setPayTarget(null);
    setPaying(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this DPS account?")) return;
    await fetch(`/api/dps/${id}`, { method: "DELETE" });
    load();
  }

  const totalMonthly = dpsList.filter(d => d.status === "active").reduce((s, d) => s + parseFloat(d.monthlyAmount), 0);
  const totalMaturity = dpsList.reduce((s, d) => s + parseFloat(d.maturityAmount ?? "0"), 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#f1f5f9", margin: 0, fontSize: 22, fontWeight: 700 }}>DPS & Sanchayapatra</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 13 }}>
            Monthly: {formatBDT(totalMonthly)} · Expected maturity: {formatBDT(totalMaturity)}
          </p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Add DPS
        </button>
      </div>

      {payTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 16, padding: "28px 32px", width: "100%", maxWidth: 360, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💳</div>
            <h3 style={{ color: "#f1f5f9", margin: "0 0 6px", fontSize: 16 }}>Pay Installment</h3>
            <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 4px" }}>{payTarget.bankName}</p>
            <p style={{ color: "#a78bfa", fontWeight: 700, fontSize: 22, margin: "8px 0 6px" }}>{formatBDT(payTarget.monthlyAmount)}</p>
            <p style={{ color: "#475569", fontSize: 12, margin: "0 0 24px" }}>
              Paid so far: {formatBDT(payTarget.totalDeposited)} → {formatBDT((parseFloat(payTarget.totalDeposited) + parseFloat(payTarget.monthlyAmount)).toFixed(2))}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setPayTarget(null)} style={{ flex: 1, padding: "9px 0", background: "transparent", border: "1px solid #1e1e38", borderRadius: 8, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => handlePayInstallment(payTarget)} disabled={paying} style={{ flex: 1, padding: "9px 0", background: "#7c3aed", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{paying ? "Paying…" : "Confirm Pay"}</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 16, padding: "32px", width: "100%", maxWidth: 460 }}>
            <h2 style={{ color: "#f1f5f9", margin: "0 0 24px", fontSize: 18 }}>New DPS Account</h2>
            <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input placeholder="Bank name *" required value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              <input placeholder="Account number (optional)" value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              <div style={{ display: "flex", gap: 10 }}>
                <input type="number" placeholder="Monthly amount *" required min="1" step="1" value={form.monthlyAmount} onChange={e => setForm(f => ({ ...f, monthlyAmount: e.target.value }))} style={{ flex: 2, background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
                <input type="number" placeholder="Rate %" required min="0.1" max="30" step="0.1" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} style={{ flex: 1, background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 4 }}>Tenure (months)</label>
                  <input type="number" required min="1" value={form.tenureMonths} onChange={e => setForm(f => ({ ...f, tenureMonths: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 4 }}>Start date</label>
                  <input type="date" required value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
                </div>
              </div>
              <input placeholder="Note (optional)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              {error && <p style={{ margin: 0, color: "#ef4444", fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: "9px 0", background: "transparent", border: "1px solid #1e1e38", borderRadius: 8, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: "9px 0", background: "#7c3aed", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Saving…" : "Add DPS"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>Loading…</div>
      ) : dpsList.length === 0 ? (
        <div style={{ color: "#64748b", padding: 40, textAlign: "center", background: "#0e0e1c", borderRadius: 12, border: "1px solid #1e1e38" }}>
          No DPS accounts yet. Add your first one!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {dpsList.map(dps => {
            const pct  = progressPct(dps);
            const left = monthsLeft(dps.maturityDate);
            return (
              <div key={dps.id} style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, padding: "22px 24px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 16 }}>🏦 {dps.bankName}</span>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 500, background: `${STATUS_COLOR[dps.status]}22`, color: STATUS_COLOR[dps.status] }}>{dps.status}</span>
                    </div>
                    {dps.accountNumber && <div style={{ color: "#475569", fontSize: 12 }}>Acc: {dps.accountNumber}</div>}
                  </div>
                  <button onClick={() => handleDelete(dps.id)} style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer", fontSize: 18 }} title="Delete">✕</button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 16 }}>
                  {([["Monthly", formatBDT(dps.monthlyAmount)], ["Rate", `${dps.interestRate}%`], ["Deposited", formatBDT(dps.totalDeposited)], ["At Maturity", formatBDT(dps.maturityAmount)]] as const).map(([label, value]) => (
                    <div key={label}>
                      <div style={{ color: "#475569", fontSize: 11, marginBottom: 2 }}>{label}</div>
                      <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14 }}>{value}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "#64748b", fontSize: 12 }}>{formatDate(dps.startDate)} → {formatDate(dps.maturityDate)}</span>
                    <span style={{ color: "#94a3b8", fontSize: 12 }}>{left > 0 ? `${left} months left` : "Matured"}</span>
                  </div>
                  <div style={{ background: "#141428", borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "#7c3aed", borderRadius: 4 }} />
                  </div>
                  <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>{pct}% complete · {dps.tenureMonths}m tenure</div>
                </div>

                {dps.status === "active" && (
                  <button onClick={() => setPayTarget(dps)} style={{ marginTop: 14, width: "100%", padding: "9px 0", background: "#1e1e38", border: "1px solid #7c3aed", borderRadius: 8, color: "#a78bfa", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    💳 Pay {formatBDT(dps.monthlyAmount)} Installment
                  </button>
                )}

                {dps.note && <div style={{ color: "#64748b", fontSize: 12, fontStyle: "italic", marginTop: 10 }}>{dps.note}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
