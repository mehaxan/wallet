"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";

interface ItemLoan {
  id: string; itemName: string; personName: string;
  direction: "lent" | "borrowed"; date: string;
  expectedReturnDate: string | null; returnedAt: string | null; note: string | null;
}

const EMPTY_FORM = { itemName: "", personName: "", direction: "lent" as "lent" | "borrowed", date: new Date().toISOString().slice(0,10), expectedReturnDate: "", note: "" };

export default function ItemLoansPage() {
  const [items, setItems]       = useState<ItemLoan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ ...EMPTY_FORM });
  const [saving, setSaving]     = useState(false);
  const [filter, setFilter]     = useState<"all"|"active"|"returned">("active");

  const load = () =>
    fetch("/api/item-loans").then(r => r.json()).then(setItems);

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/item-loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, expectedReturnDate: form.expectedReturnDate || undefined }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ ...EMPTY_FORM });
    load();
  };

  const markReturned = async (id: string) => {
    await fetch(`/api/item-loans/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" });
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/item-loans/${id}`, { method: "DELETE" });
    load();
  };

  const filtered = items.filter(i => {
    if (filter === "active")   return !i.returnedAt;
    if (filter === "returned") return !!i.returnedAt;
    return true;
  });

  const isOverdue = (i: ItemLoan) => !i.returnedAt && i.expectedReturnDate && new Date(i.expectedReturnDate) < new Date();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#f1f5f9", margin: 0, fontSize: 22, fontWeight: 700 }}>Item Lending</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 13 }}>Track items you lent or borrowed</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontSize: 13 }}>
          + New Item
        </button>
      </div>

      {showForm && (
        <div style={{ background: "#0e0e1c", border: "1px solid #7c3aed", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ color: "#f1f5f9", margin: "0 0 16px", fontSize: 15 }}>Record Item</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { label: "Item Name", key: "itemName", type: "text", placeholder: "e.g. Canon Camera" },
              { label: "Person",    key: "personName", type: "text", placeholder: "Who has/gave it?" },
              { label: "Date",      key: "date", type: "date" },
              { label: "Expected Return", key: "expectedReturnDate", type: "date" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 4 }}>{label}</label>
                <input type={type} value={(form as Record<string,string>)[key]} placeholder={placeholder}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: "100%", background: "#141428", border: "1px solid #1e1e38", borderRadius: 6, padding: "8px 12px", color: "#f1f5f9", fontSize: 13, boxSizing: "border-box" }} />
              </div>
            ))}
            <div>
              <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 4 }}>Direction</label>
              <select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value as "lent"|"borrowed" }))}
                style={{ width: "100%", background: "#141428", border: "1px solid #1e1e38", borderRadius: 6, padding: "8px 12px", color: "#f1f5f9", fontSize: 13 }}>
                <option value="lent">Lent (I gave it)</option>
                <option value="borrowed">Borrowed (I have it)</option>
              </select>
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 4 }}>Note</label>
              <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                style={{ width: "100%", background: "#141428", border: "1px solid #1e1e38", borderRadius: 6, padding: "8px 12px", color: "#f1f5f9", fontSize: 13, boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={save} disabled={saving}
              style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", cursor: saving ? "not-allowed" : "pointer", fontSize: 13 }}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setShowForm(false)}
              style={{ background: "transparent", color: "#64748b", border: "1px solid #1e1e38", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["active","returned","all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ background: filter === f ? "#7c3aed" : "#0e0e1c", color: filter === f ? "#fff" : "#64748b",
              border: "1px solid #1e1e38", borderRadius: 8, padding: "6px 16px", cursor: "pointer", fontSize: 12, textTransform: "capitalize" }}>
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 && <div style={{ color: "#475569", textAlign: "center", padding: 40 }}>No items.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map(item => (
          <div key={item.id} style={{ background: "#0e0e1c", border: `1px solid ${isOverdue(item) ? "#7f1d1d" : "#1e1e38"}`, borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 15 }}>{item.itemName}</div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>
                  <span style={{ color: item.direction === "lent" ? "#60a5fa" : "#f59e0b" }}>
                    {item.direction === "lent" ? "📤 Lent to" : "📥 Borrowed from"}
                  </span>{" "}{item.personName} · {formatDate(item.date)}
                  {item.expectedReturnDate && <span> · Due {formatDate(item.expectedReturnDate)}</span>}
                  {isOverdue(item) && <span style={{ color: "#ef4444", marginLeft: 6 }}>⚠ Overdue</span>}
                </div>
                {item.note && <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>{item.note}</div>}
                {item.returnedAt && <div style={{ color: "#10b981", fontSize: 12, marginTop: 4 }}>✓ Returned {formatDate(item.returnedAt.slice(0,10))}</div>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {!item.returnedAt && (
                  <button onClick={() => markReturned(item.id)}
                    style={{ background: "#14532d", color: "#4ade80", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>
                    ✓ Returned
                  </button>
                )}
                <button onClick={() => remove(item.id)}
                  style={{ background: "transparent", color: "#64748b", border: "1px solid #1e1e38", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12 }}>
                  🗑
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
