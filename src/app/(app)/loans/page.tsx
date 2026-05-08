"use client";

import { useState, useEffect, useCallback } from "react";
import { formatBDT, formatDate } from "@/lib/utils";

interface Loan {
  id: string;
  direction: "taken" | "given";
  personName: string;
  amount: string;
  interestRate: string | null;
  startDate: string;
  dueDate: string | null;
  emi: string | null;
  paidAmount: string;
  status: "active" | "paid" | "overdue";
  note: string | null;
}

const STATUS_COLOR: Record<string, string> = { active: "#3b82f6", paid: "#10b981", overdue: "#ef4444" };

export default function LoansPage() {
  const [loanList, setLoanList] = useState<Loan[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ direction: "taken", personName: "", amount: "", interestRate: "", startDate: new Date().toISOString().slice(0, 10), dueDate: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/loans");
    setLoanList(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    const res = await fetch("/api/loans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setShowForm(false); setForm({ direction: "taken", personName: "", amount: "", interestRate: "", startDate: new Date().toISOString().slice(0, 10), dueDate: "", note: "" }); load(); }
    else { const d = await res.json(); setError(d.error ?? "Failed"); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this loan?")) return;
    await fetch(`/api/loans/${id}`, { method: "DELETE" });
    load();
  }

  const totalBorrowed = loanList.filter(l => l.direction === "taken" && l.status === "active").reduce((s, l) => s + parseFloat(l.amount) - parseFloat(l.paidAmount), 0);
  const totalLent     = loanList.filter(l => l.direction === "given" && l.status === "active").reduce((s, l) => s + parseFloat(l.amount) - parseFloat(l.paidAmount), 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#f1f5f9", margin: 0, fontSize: 22, fontWeight: 700 }}>Loans & Debts</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 13 }}>
            You owe: <span style={{ color: "#ef4444" }}>{formatBDT(totalBorrowed)}</span> · Owed to you: <span style={{ color: "#10b981" }}>{formatBDT(totalLent)}</span>
          </p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Add Loan
        </button>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 16, padding: "32px", width: "100%", maxWidth: 460 }}>
            <h2 style={{ color: "#f1f5f9", margin: "0 0 24px", fontSize: 18 }}>New Loan</h2>
            <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {(["taken", "given"] as const).map(d => (
                  <button type="button" key={d} onClick={() => setForm(f => ({ ...f, direction: d }))}
                    style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      borderColor: form.direction === d ? (d === "taken" ? "#ef4444" : "#10b981") : "#1e1e38",
                      background: form.direction === d ? (d === "taken" ? "#ef444422" : "#10b98122") : "transparent",
                      color: form.direction === d ? (d === "taken" ? "#ef4444" : "#10b981") : "#64748b" }}>
                    {d === "taken" ? "💸 Borrowed" : "🤝 Lent"}
                  </button>
                ))}
              </div>
              <input placeholder="Person / institution name *" required value={form.personName} onChange={e => setForm(f => ({ ...f, personName: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              <div style={{ display: "flex", gap: 10 }}>
                <input type="number" placeholder="Amount (BDT) *" required min="1" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ flex: 2, background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
                <input type="number" placeholder="Rate %" min="0" max="100" step="0.1" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} style={{ flex: 1, background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 4 }}>Start date *</label>
                  <input type="date" required value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 4 }}>Due date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
                </div>
              </div>
              <input placeholder="Note (optional)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14 }} />
              {error && <p style={{ margin: 0, color: "#ef4444", fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, padding: "9px 0", background: "transparent", border: "1px solid #1e1e38", borderRadius: 8, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: "9px 0", background: "#7c3aed", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Saving…" : "Add Loan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>Loading…</div> : loanList.length === 0 ? (
        <div style={{ color: "#64748b", padding: 40, textAlign: "center", background: "#0e0e1c", borderRadius: 12, border: "1px solid #1e1e38" }}>No loans yet. Add your first one!</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {loanList.map(loan => {
            const remaining = parseFloat(loan.amount) - parseFloat(loan.paidAmount);
            const pct = Math.round((parseFloat(loan.paidAmount) / parseFloat(loan.amount)) * 100);
            const isOverdue = loan.dueDate && new Date(loan.dueDate) < new Date() && loan.status === "active";
            return (
              <div key={loan.id} style={{ background: "#0e0e1c", border: `1px solid ${isOverdue ? "#ef444444" : "#1e1e38"}`, borderRadius: 12, padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{loan.direction === "taken" ? "💸" : "🤝"}</span>
                    <div>
                      <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 15 }}>{loan.personName}</div>
                      <div style={{ color: "#475569", fontSize: 12 }}>{loan.direction === "taken" ? "Borrowed from" : "Lent to"} · {formatDate(loan.startDate)}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: `${STATUS_COLOR[isOverdue ? "overdue" : loan.status]}22`, color: STATUS_COLOR[isOverdue ? "overdue" : loan.status] }}>
                      {isOverdue ? "overdue" : loan.status}
                    </span>
                    <button onClick={() => handleDelete(loan.id)} style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer" }}>✕</button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 12 }}>
                  <div><div style={{ color: "#475569", fontSize: 11 }}>Total</div><div style={{ color: "#f1f5f9", fontWeight: 600 }}>{formatBDT(loan.amount)}</div></div>
                  <div><div style={{ color: "#475569", fontSize: 11 }}>Remaining</div><div style={{ color: loan.direction === "taken" ? "#ef4444" : "#10b981", fontWeight: 600 }}>{formatBDT(remaining)}</div></div>
                  <div><div style={{ color: "#475569", fontSize: 11 }}>EMI / Due</div><div style={{ color: "#f1f5f9", fontWeight: 600 }}>{loan.emi ? formatBDT(loan.emi) : (loan.dueDate ? formatDate(loan.dueDate) : "—")}</div></div>
                </div>
                <div style={{ background: "#141428", borderRadius: 4, height: 4, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: loan.direction === "taken" ? "#ef4444" : "#10b981", borderRadius: 4 }} />
                </div>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>{pct}% repaid</div>
                {loan.note && <div style={{ color: "#64748b", fontSize: 12, fontStyle: "italic", marginTop: 8 }}>{loan.note}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
