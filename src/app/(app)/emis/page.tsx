"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { formatBDT, formatDate } from "@/lib/utils";

type EmiStatus = "active" | "completed" | "cancelled";

type CreditCardStatus = "active" | "closed";

interface Emi {
  id: string;
  userId: string;
  name: string;
  lenderName: string | null;
  principalAmount: string;
  emiAmount: string;
  totalInstallments: number;
  paidInstallments: number;
  startDate: string;
  interestRate: string | null;
  creditCardId: string | null;
  creditCardName: string | null;
  creditCardBankName: string | null;
  status: EmiStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreditCardOption {
  id: string;
  bankName: string;
  cardName: string;
  status: CreditCardStatus;
}

interface EmiForm {
  name: string;
  lenderName: string;
  principalAmount: string;
  emiAmount: string;
  totalInstallments: string;
  paidInstallments: string;
  startDate: string;
  interestRate: string;
  creditCardId: string;
  status: EmiStatus;
  note: string;
}

const cardBg = "#0e0e1c";
const borderColor = "#1e1e38";
const textPrimary = "#f1f5f9";
const textSecondary = "#94a3b8";
const textMuted = "#64748b";
const accent = "#7c3aed";

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "#0e0e1c",
  border: "1px solid #1e1e38",
  borderRadius: 8,
  color: "#f1f5f9",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const statusColors: Record<EmiStatus, string> = {
  active: "#10b981",
  completed: "#60a5fa",
  cancelled: "#64748b",
};

function emptyForm(): EmiForm {
  return {
    name: "",
    lenderName: "",
    principalAmount: "",
    emiAmount: "",
    totalInstallments: "",
    paidInstallments: "0",
    startDate: new Date().toISOString().slice(0, 10),
    interestRate: "",
    creditCardId: "",
    status: "active",
    note: "",
  };
}

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function addMonths(dateValue: string, months: number): Date {
  const next = new Date(dateValue);
  next.setHours(0, 0, 0, 0);
  next.setMonth(next.getMonth() + months);
  return next;
}

function remainingInstallments(emi: Emi): number {
  return Math.max(emi.totalInstallments - emi.paidInstallments, 0);
}

function progressPercent(emi: Emi): number {
  if (!emi.totalInstallments) return 0;
  return Math.max(0, Math.min(100, (emi.paidInstallments / emi.totalInstallments) * 100));
}

function StatCard({ label, value, tone = textPrimary }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ color: textMuted, fontSize: 12, marginBottom: 8 }}>{label}</div>
      <div style={{ color: tone, fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export default function EmisPage() {
  const [emiList, setEmiList] = useState<Emi[]>([]);
  const [cards, setCards] = useState<CreditCardOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmi, setEditingEmi] = useState<Emi | null>(null);
  const [form, setForm] = useState<EmiForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [emiRes, cardRes] = await Promise.all([fetch("/api/emis"), fetch("/api/credit-cards")]);

      if (!emiRes.ok) {
        const body = (await emiRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to load EMIs");
      }

      if (!cardRes.ok) {
        const body = (await cardRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to load credit cards");
      }

      const [emiData, cardData] = (await Promise.all([emiRes.json(), cardRes.json()])) as [Emi[], CreditCardOption[]];
      setEmiList(emiData);
      setCards(cardData);
    } catch (fetchError) {
      setLoadError(fetchError instanceof Error ? fetchError.message : "Failed to load EMI data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectableCards = useMemo(() => {
    const activeCards = cards.filter((card) => card.status === "active");
    if (!form.creditCardId) return activeCards;

    const linkedCard = cards.find((card) => card.id === form.creditCardId);
    if (!linkedCard || activeCards.some((card) => card.id === linkedCard.id)) return activeCards;
    return [...activeCards, linkedCard];
  }, [cards, form.creditCardId]);

  function closeModal() {
    setShowModal(false);
    setEditingEmi(null);
    setForm(emptyForm());
    setError("");
  }

  function openAddModal() {
    setEditingEmi(null);
    setForm(emptyForm());
    setError("");
    setShowModal(true);
  }

  function openEditModal(emi: Emi) {
    setEditingEmi(emi);
    setForm({
      name: emi.name,
      lenderName: emi.lenderName ?? "",
      principalAmount: emi.principalAmount,
      emiAmount: emi.emiAmount,
      totalInstallments: emi.totalInstallments.toString(),
      paidInstallments: emi.paidInstallments.toString(),
      startDate: emi.startDate,
      interestRate: emi.interestRate ?? "",
      creditCardId: emi.creditCardId ?? "",
      status: emi.status,
      note: emi.note ?? "",
    });
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const endpoint = editingEmi ? `/api/emis/${editingEmi.id}` : "/api/emis";
      const method = editingEmi ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to save EMI");
      }

      closeModal();
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save EMI");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this EMI?")) return;

    const res = await fetch(`/api/emis/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setLoadError(body?.error ?? "Failed to delete EMI");
      return;
    }

    await loadData();
  }

  async function handlePay(emi: Emi) {
    if (emi.status !== "active") return;

    const nextPaidInstallments = Math.min(emi.paidInstallments + 1, emi.totalInstallments);
    const nextStatus: EmiStatus = nextPaidInstallments >= emi.totalInstallments ? "completed" : "active";

    setUpdatingId(emi.id);
    try {
      const res = await fetch(`/api/emis/${emi.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidInstallments: nextPaidInstallments, status: nextStatus }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to update EMI");
      }

      await loadData();
    } catch (payError) {
      setLoadError(payError instanceof Error ? payError.message : "Failed to update EMI");
    } finally {
      setUpdatingId(null);
    }
  }

  const activeEmis = emiList.filter((emi) => emi.status === "active");
  const totalMonthlyOutflow = activeEmis.reduce((sum, emi) => sum + toNumber(emi.emiAmount), 0);
  const totalPaidAmount = emiList.reduce((sum, emi) => sum + Math.min(emi.paidInstallments, emi.totalInstallments) * toNumber(emi.emiAmount), 0);
  const totalRemaining = emiList.reduce((sum, emi) => {
    if (emi.status === "cancelled") return sum;
    return sum + remainingInstallments(emi) * toNumber(emi.emiAmount);
  }, 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ color: textPrimary, margin: 0, fontSize: 22, fontWeight: 700 }}>📅 EMI Tracker</h1>
          <p style={{ color: textMuted, margin: "4px 0 0", fontSize: 13 }}>
            Stay on top of monthly instalments, due dates, and remaining commitments.
          </p>
        </div>
        <button
          onClick={openAddModal}
          style={{
            background: accent,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "9px 18px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Add EMI
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        <StatCard label="Active EMIs" value={String(activeEmis.length)} />
        <StatCard label="Total monthly outflow" value={formatBDT(totalMonthlyOutflow)} tone="#60a5fa" />
        <StatCard label="Total paid amount" value={formatBDT(totalPaidAmount)} tone="#10b981" />
        <StatCard label="Total remaining" value={formatBDT(totalRemaining)} tone="#f59e0b" />
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 660, maxHeight: "90vh", overflowY: "auto", background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 28 }}>
            <h2 style={{ color: textPrimary, margin: "0 0 22px", fontSize: 18 }}>{editingEmi ? "Edit EMI" : "Add EMI"}</h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                <input
                  placeholder="EMI name *"
                  required
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  style={inputStyle}
                />
                <input
                  placeholder="Lender name"
                  value={form.lenderName}
                  onChange={(event) => setForm((current) => ({ ...current, lenderName: event.target.value }))}
                  style={inputStyle}
                />
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="Principal amount *"
                  value={form.principalAmount}
                  onChange={(event) => setForm((current) => ({ ...current, principalAmount: event.target.value }))}
                  style={inputStyle}
                />
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="EMI amount *"
                  value={form.emiAmount}
                  onChange={(event) => setForm((current) => ({ ...current, emiAmount: event.target.value }))}
                  style={inputStyle}
                />
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="Total installments *"
                  value={form.totalInstallments}
                  onChange={(event) => setForm((current) => ({ ...current, totalInstallments: event.target.value }))}
                  style={inputStyle}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Paid installments"
                  value={form.paidInstallments}
                  onChange={(event) => setForm((current) => ({ ...current, paidInstallments: event.target.value }))}
                  style={inputStyle}
                />
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                  style={inputStyle}
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="Interest rate %"
                  value={form.interestRate}
                  onChange={(event) => setForm((current) => ({ ...current, interestRate: event.target.value }))}
                  style={inputStyle}
                />
                <select
                  value={form.creditCardId}
                  onChange={(event) => setForm((current) => ({ ...current, creditCardId: event.target.value }))}
                  style={inputStyle}
                >
                  <option value="">Linked credit card (optional)</option>
                  {selectableCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.bankName} · {card.cardName}{card.status === "closed" ? " (closed)" : ""}
                    </option>
                  ))}
                </select>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as EmiStatus }))}
                  style={inputStyle}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <textarea
                placeholder="Note"
                value={form.note}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                style={{ ...inputStyle, minHeight: 96, resize: "vertical" }}
              />

              {error && <p style={{ margin: 0, color: "#ef4444", fontSize: 13 }}>{error}</p>}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    flex: 1,
                    padding: "9px 0",
                    background: "transparent",
                    border: `1px solid ${borderColor}`,
                    borderRadius: 8,
                    color: textSecondary,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1.5,
                    padding: "9px 0",
                    background: accent,
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? "Saving…" : editingEmi ? "Save Changes" : "Add EMI"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: textMuted, padding: 40, textAlign: "center" }}>Loading…</div>
      ) : loadError ? (
        <div style={{ color: "#ef4444", padding: 24, textAlign: "center", background: cardBg, borderRadius: 12, border: `1px solid ${borderColor}` }}>{loadError}</div>
      ) : emiList.length === 0 ? (
        <div style={{ color: textMuted, padding: 40, textAlign: "center", background: cardBg, borderRadius: 12, border: `1px solid ${borderColor}` }}>
          No EMIs yet. Add your first one!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {emiList.map((emi) => {
            const progress = progressPercent(emi);
            const remaining = remainingInstallments(emi);
            const totalAmount = toNumber(emi.emiAmount) * emi.totalInstallments;
            const nextDueDate = remaining === 0 || emi.status === "completed" ? "Completed" : emi.status === "cancelled" ? "Cancelled" : formatDate(addMonths(emi.startDate, emi.paidInstallments));
            const badgeColor = statusColors[emi.status];

            return (
              <div key={emi.id} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: "22px 24px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ color: textPrimary, fontWeight: 700, fontSize: 16 }}>{emi.name}</div>
                      <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 999, background: `${badgeColor}22`, color: badgeColor, fontWeight: 600 }}>
                        {emi.status}
                      </span>
                    </div>
                    <div style={{ color: textSecondary, fontSize: 13, marginTop: 4 }}>
                      {emi.lenderName || "Unknown lender"}
                      {emi.creditCardName ? ` · ${emi.creditCardBankName} ${emi.creditCardName}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
                    <button
                      onClick={() => void handlePay(emi)}
                      disabled={emi.status !== "active" || updatingId === emi.id}
                      style={{
                        background: emi.status === "active" ? `${accent}22` : "transparent",
                        border: `1px solid ${emi.status === "active" ? accent : borderColor}`,
                        color: emi.status === "active" ? "#c4b5fd" : textMuted,
                        borderRadius: 8,
                        padding: "7px 12px",
                        fontSize: 12,
                        cursor: emi.status === "active" ? "pointer" : "not-allowed",
                      }}
                    >
                      {updatingId === emi.id ? "Paying…" : "+ Pay"}
                    </button>
                    <button
                      onClick={() => openEditModal(emi)}
                      style={{ background: "transparent", border: "none", color: textSecondary, fontSize: 13, cursor: "pointer" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void handleDelete(emi.id)}
                      style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: 13, cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 12, flexWrap: "wrap" }}>
                    <span style={{ color: textSecondary, fontSize: 12 }}>
                      {emi.paidInstallments} / {emi.totalInstallments} installments paid
                    </span>
                    <span style={{ color: textPrimary, fontSize: 12, fontWeight: 700 }}>{progress.toFixed(0)}%</span>
                  </div>
                  <div style={{ background: "#141428", borderRadius: 999, height: 8, overflow: "hidden" }}>
                    <div style={{ width: `${progress}%`, height: "100%", background: accent, borderRadius: 999 }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>
                  <div>
                    <div style={{ color: textMuted, fontSize: 11, marginBottom: 3 }}>EMI amount / month</div>
                    <div style={{ color: textPrimary, fontWeight: 700, fontSize: 16 }}>{formatBDT(emi.emiAmount)}</div>
                  </div>
                  <div>
                    <div style={{ color: textMuted, fontSize: 11, marginBottom: 3 }}>Remaining installments</div>
                    <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 16 }}>{remaining}</div>
                  </div>
                  <div>
                    <div style={{ color: textMuted, fontSize: 11, marginBottom: 3 }}>Total amount</div>
                    <div style={{ color: textPrimary, fontWeight: 700, fontSize: 16 }}>{formatBDT(totalAmount)}</div>
                  </div>
                  <div>
                    <div style={{ color: textMuted, fontSize: 11, marginBottom: 3 }}>Next due date</div>
                    <div style={{ color: textPrimary, fontWeight: 700, fontSize: 16 }}>{nextDueDate}</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 18, flexWrap: "wrap", color: textSecondary, fontSize: 12, marginTop: 14 }}>
                  <span>Principal: <span style={{ color: textPrimary }}>{formatBDT(emi.principalAmount)}</span></span>
                  <span>Interest rate: <span style={{ color: textPrimary }}>{emi.interestRate ? `${emi.interestRate}%` : "—"}</span></span>
                  <span>Started: <span style={{ color: textPrimary }}>{formatDate(emi.startDate)}</span></span>
                </div>

                {emi.note && <div style={{ color: textMuted, fontSize: 12, marginTop: 12, fontStyle: "italic" }}>{emi.note}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
