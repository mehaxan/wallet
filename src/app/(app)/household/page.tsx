"use client";

import { useState, useEffect } from "react";

interface Member { id: string; userId: string; role: string; joinedAt: string; email: string; name: string }
interface Household { id: string; name: string; ownerId: string; createdAt: string }
interface HouseholdData { household: Household; members: Member[] }

export default function HouseholdPage() {
  const [data, setData]         = useState<HouseholdData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [householdName, setHouseholdName] = useState("");
  const [inviteEmail, setInviteEmail]     = useState("");
  const [inviteRole, setInviteRole]       = useState<"member" | "viewer">("member");
  const [submitting, setSubmitting]       = useState(false);
  const [msg, setMsg]           = useState("");

  async function load() {
    setLoading(true); setError("");
    const res = await fetch("/api/households");
    if (res.status === 404) { setData(null); setLoading(false); return; }
    const d = await res.json();
    if (!res.ok) setError(d.error ?? "Failed");
    else setData(d);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createHousehold(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); setMsg("");
    const res = await fetch("/api/households", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: householdName }),
    });
    const d = await res.json();
    if (res.ok) { setMsg("Household created!"); setShowCreate(false); setHouseholdName(""); load(); }
    else setMsg(d.error ?? "Failed");
    setSubmitting(false);
  }

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); setMsg("");
    const res = await fetch("/api/households/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const d = await res.json();
    if (res.ok) { setMsg("Member added!"); setShowInvite(false); setInviteEmail(""); load(); }
    else setMsg(d.error ?? "Failed");
    setSubmitting(false);
  }

  const roleColor = (r: string) => r === "owner" ? "#7c3aed" : r === "member" ? "#10b981" : "#64748b";
  const inputStyle = { background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "9px 12px", color: "#f1f5f9", fontSize: 14, width: "100%", boxSizing: "border-box" as const };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700, margin: 0 }}>Family / Household</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 13 }}>Share finances with family members</p>
        </div>
        {!data && !loading && (
          <button onClick={() => setShowCreate(true)}
            style={{ padding: "8px 16px", background: "#7c3aed", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, cursor: "pointer" }}>
            + Create Household
          </button>
        )}
        {data && (
          <button onClick={() => setShowInvite(true)}
            style={{ padding: "8px 16px", background: "#7c3aed", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, cursor: "pointer" }}>
            + Add Member
          </button>
        )}
      </div>

      {msg && <div style={{ background: "#10b98122", border: "1px solid #10b981", borderRadius: 8, padding: "10px 14px", color: "#10b981", marginBottom: 16, fontSize: 13 }}>{msg}</div>}

      {loading && <div style={{ color: "#64748b", textAlign: "center", padding: 40 }}>Loading…</div>}
      {error   && <div style={{ color: "#ef4444", textAlign: "center", padding: 20 }}>{error}</div>}

      {!loading && !data && !showCreate && (
        <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏠</div>
          <div style={{ color: "#94a3b8", fontSize: 15, marginBottom: 16 }}>You don&apos;t have a household yet.</div>
          <button onClick={() => setShowCreate(true)}
            style={{ padding: "10px 24px", background: "#7c3aed", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, cursor: "pointer" }}>
            Create Household
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <div style={{ color: "#f1f5f9", fontWeight: 600, marginBottom: 16 }}>New Household</div>
          <form onSubmit={createHousehold} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input style={inputStyle} placeholder="Household name (e.g. Hasan Family)" required value={householdName} onChange={e => setHouseholdName(e.target.value)} />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={submitting} style={{ flex: 1, padding: "9px 0", background: "#7c3aed", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, cursor: "pointer" }}>
                {submitting ? "Creating…" : "Create"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} style={{ flex: 1, padding: "9px 0", background: "transparent", border: "1px solid #1e1e38", borderRadius: 8, color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Household details */}
      {data && (
        <>
          <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <span style={{ fontSize: 28 }}>🏠</span>
              <div>
                <div style={{ color: "#f1f5f9", fontSize: 18, fontWeight: 700 }}>{data.household.name}</div>
                <div style={{ color: "#64748b", fontSize: 12 }}>Created {new Date(data.household.createdAt).toLocaleDateString("en-BD")}</div>
              </div>
            </div>
          </div>

          <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, padding: 20 }}>
            <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Members ({data.members.length})</div>
            {data.members.map((m, i) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < data.members.length - 1 ? "1px solid #1e1e38" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1e1e38", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                    {m.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <div style={{ color: "#f1f5f9", fontSize: 14, fontWeight: 500 }}>{m.name}</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>{m.email}</div>
                  </div>
                </div>
                <span style={{ fontSize: 11, background: `${roleColor(m.role)}22`, color: roleColor(m.role), borderRadius: 6, padding: "3px 10px", fontWeight: 600 }}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Invite form */}
      {showInvite && (
        <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, padding: 24, marginTop: 16 }}>
          <div style={{ color: "#f1f5f9", fontWeight: 600, marginBottom: 16 }}>Add Member by Email</div>
          <form onSubmit={inviteMember} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input style={inputStyle} type="email" placeholder="Email address *" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value as "member" | "viewer")}
              style={{ ...inputStyle }}>
              <option value="member">Member (can view & add)</option>
              <option value="viewer">Viewer (read only)</option>
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={submitting} style={{ flex: 1, padding: "9px 0", background: "#7c3aed", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, cursor: "pointer" }}>
                {submitting ? "Adding…" : "Add Member"}
              </button>
              <button type="button" onClick={() => setShowInvite(false)} style={{ flex: 1, padding: "9px 0", background: "transparent", border: "1px solid #1e1e38", borderRadius: 8, color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
