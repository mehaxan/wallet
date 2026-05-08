"use client";

import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { formatBDT } from "@/lib/utils";

type CreditCardStatus = "active" | "closed";

interface CreditCard {
  id: string;
  bankName: string;
  cardName: string;
  lastFour: string | null;
  creditLimit: string;
  currentBalance: string;
  statementDay: number | null;
  dueDay: number | null;
  interestRate: string | null;
  status: CreditCardStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreditCardForm {
  bankName: string;
  cardName: string;
  lastFour: string;
  creditLimit: string;
  currentBalance: string;
  statementDay: string;
  dueDay: string;
  interestRate: string;
  status: CreditCardStatus;
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

const statusColors: Record<CreditCardStatus, string> = {
  active: "#10b981",
  closed: "#64748b",
};

function emptyForm(): CreditCardForm {
  return {
    bankName: "",
    cardName: "",
    lastFour: "",
    creditLimit: "",
    currentBalance: "0",
    statementDay: "",
    dueDay: "",
    interestRate: "",
    status: "active",
    note: "",
  };
}

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function utilizationPercent(card: CreditCard): number {
  const limit = toNumber(card.creditLimit);
  if (limit <= 0) return 0;
  return Math.max(0, Math.min(100, (toNumber(card.currentBalance) / limit) * 100));
}

function utilizationColor(percent: number): string {
  if (percent < 30) return "#10b981";
  if (percent <= 70) return "#f59e0b";
  return "#ef4444";
}

function maskLastFour(lastFour: string | null): string {
  return lastFour ? `•••• ${lastFour}` : "•••• ----";
}

function StatCard({ label, value, tone = textPrimary }: { label: string; value: string; tone?: string }) {
  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: 14,
        padding: "18px 20px",
      }}
    >
      <div style={{ color: textMuted, fontSize: 12, marginBottom: 8 }}>{label}</div>
      <div style={{ color: tone, fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export default function CreditCardsPage() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [form, setForm] = useState<CreditCardForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  const loadCards = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const res = await fetch("/api/credit-cards");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to load credit cards");
      }
      const data = (await res.json()) as CreditCard[];
      setCards(data);
    } catch (fetchError) {
      setLoadError(fetchError instanceof Error ? fetchError.message : "Failed to load credit cards");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  function closeModal() {
    setShowModal(false);
    setEditingCard(null);
    setForm(emptyForm());
    setError("");
  }

  function openAddModal() {
    setEditingCard(null);
    setForm(emptyForm());
    setError("");
    setShowModal(true);
  }

  function openEditModal(card: CreditCard) {
    setEditingCard(card);
    setForm({
      bankName: card.bankName,
      cardName: card.cardName,
      lastFour: card.lastFour ?? "",
      creditLimit: card.creditLimit,
      currentBalance: card.currentBalance,
      statementDay: card.statementDay?.toString() ?? "",
      dueDay: card.dueDay?.toString() ?? "",
      interestRate: card.interestRate ?? "",
      status: card.status,
      note: card.note ?? "",
    });
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      lastFour: form.lastFour.replace(/\D/g, "").slice(-4),
    };

    try {
      const endpoint = editingCard ? `/api/credit-cards/${editingCard.id}` : "/api/credit-cards";
      const method = editingCard ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to save card");
      }

      closeModal();
      await loadCards();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save card");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this credit card?")) return;

    const res = await fetch(`/api/credit-cards/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setLoadError(body?.error ?? "Failed to delete credit card");
      return;
    }

    await loadCards();
  }

  const activeCards = cards.filter((card) => card.status === "active");
  const totalLimit = activeCards.reduce((sum, card) => sum + toNumber(card.creditLimit), 0);
  const totalOutstanding = activeCards.reduce((sum, card) => sum + toNumber(card.currentBalance), 0);
  const availableCredit = Math.max(totalLimit - totalOutstanding, 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ color: textPrimary, margin: 0, fontSize: 22, fontWeight: 700 }}>💳 Credit Cards</h1>
          <p style={{ color: textMuted, margin: "4px 0 0", fontSize: 13 }}>
            Track limits, utilization, and upcoming billing dates in BDT.
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
          + Add Card
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        <StatCard label="Total cards" value={String(cards.length)} />
        <StatCard label="Total limit" value={formatBDT(totalLimit)} tone="#60a5fa" />
        <StatCard label="Total outstanding" value={formatBDT(totalOutstanding)} tone="#f59e0b" />
        <StatCard label="Available credit" value={formatBDT(availableCredit)} tone="#10b981" />
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 28 }}>
            <h2 style={{ color: textPrimary, margin: "0 0 22px", fontSize: 18 }}>{editingCard ? "Edit Credit Card" : "Add Credit Card"}</h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                <input
                  placeholder="Bank name *"
                  required
                  value={form.bankName}
                  onChange={(event) => setForm((current) => ({ ...current, bankName: event.target.value }))}
                  style={inputStyle}
                />
                <input
                  placeholder="Card name *"
                  required
                  value={form.cardName}
                  onChange={(event) => setForm((current) => ({ ...current, cardName: event.target.value }))}
                  style={inputStyle}
                />
                <input
                  placeholder="Last four digits"
                  inputMode="numeric"
                  maxLength={4}
                  value={form.lastFour}
                  onChange={(event) => setForm((current) => ({ ...current, lastFour: event.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  style={inputStyle}
                />
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as CreditCardStatus }))}
                  style={inputStyle}
                >
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="Credit limit *"
                  value={form.creditLimit}
                  onChange={(event) => setForm((current) => ({ ...current, creditLimit: event.target.value }))}
                  style={inputStyle}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Current balance"
                  value={form.currentBalance}
                  onChange={(event) => setForm((current) => ({ ...current, currentBalance: event.target.value }))}
                  style={inputStyle}
                />
                <input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Statement day"
                  value={form.statementDay}
                  onChange={(event) => setForm((current) => ({ ...current, statementDay: event.target.value }))}
                  style={inputStyle}
                />
                <input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Due day"
                  value={form.dueDay}
                  onChange={(event) => setForm((current) => ({ ...current, dueDay: event.target.value }))}
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
                  style={{ ...inputStyle, gridColumn: "1 / -1" }}
                />
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
                  {saving ? "Saving…" : editingCard ? "Save Changes" : "Add Card"}
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
      ) : cards.length === 0 ? (
        <div style={{ color: textMuted, padding: 40, textAlign: "center", background: cardBg, borderRadius: 12, border: `1px solid ${borderColor}` }}>
          No credit cards yet. Add your first one!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {cards.map((card) => {
            const limit = toNumber(card.creditLimit);
            const balance = toNumber(card.currentBalance);
            const utilization = utilizationPercent(card);
            const utilizationTone = utilizationColor(utilization);
            const badgeColor = statusColors[card.status];

            return (
              <div key={card.id} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: "22px 24px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, marginBottom: 18, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: 26, lineHeight: 1 }}>💳</span>
                    <div>
                      <div style={{ color: textPrimary, fontWeight: 700, fontSize: 16 }}>{card.bankName}</div>
                      <div style={{ color: textSecondary, fontSize: 13, marginTop: 2 }}>
                        {card.cardName} · {maskLastFour(card.lastFour)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
                    <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 999, background: `${badgeColor}22`, color: badgeColor, fontWeight: 600 }}>
                      {card.status}
                    </span>
                    <button
                      onClick={() => openEditModal(card)}
                      style={{ background: "transparent", border: "none", color: textSecondary, fontSize: 13, cursor: "pointer" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void handleDelete(card.id)}
                      style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: 13, cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 16 }}>
                  <div>
                    <div style={{ color: textMuted, fontSize: 11, marginBottom: 3 }}>Credit limit</div>
                    <div style={{ color: textPrimary, fontWeight: 700, fontSize: 16 }}>{formatBDT(limit)}</div>
                  </div>
                  <div>
                    <div style={{ color: textMuted, fontSize: 11, marginBottom: 3 }}>Outstanding</div>
                    <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 16 }}>{formatBDT(balance)}</div>
                  </div>
                  <div>
                    <div style={{ color: textMuted, fontSize: 11, marginBottom: 3 }}>Available</div>
                    <div style={{ color: "#10b981", fontWeight: 700, fontSize: 16 }}>{formatBDT(Math.max(limit - balance, 0))}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 12, flexWrap: "wrap" }}>
                    <span style={{ color: textSecondary, fontSize: 12 }}>Utilization</span>
                    <span style={{ color: utilizationTone, fontSize: 12, fontWeight: 700 }}>{utilization.toFixed(1)}%</span>
                  </div>
                  <div style={{ background: "#141428", borderRadius: 999, height: 8, overflow: "hidden" }}>
                    <div style={{ width: `${utilization}%`, height: "100%", background: utilizationTone, borderRadius: 999 }} />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 18, flexWrap: "wrap", color: textSecondary, fontSize: 12 }}>
                  <span>Statement day: <span style={{ color: textPrimary }}>{card.statementDay ?? "—"}</span></span>
                  <span>Due day: <span style={{ color: textPrimary }}>{card.dueDay ?? "—"}</span></span>
                  <span>Interest rate: <span style={{ color: textPrimary }}>{card.interestRate ? `${card.interestRate}%` : "—"}</span></span>
                </div>

                {card.note && <div style={{ color: textMuted, fontSize: 12, marginTop: 12, fontStyle: "italic" }}>{card.note}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
