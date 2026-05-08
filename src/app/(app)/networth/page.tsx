"use client";

import { useState, useEffect } from "react";
import { formatBDT } from "@/lib/utils";

interface Snapshot { id: string; month: number; year: number; totalAssets: string; totalLiabilities: string; netWorth: string; }
interface NWData { snapshots: Snapshot[]; current: { totalAssets: number; totalLiabilities: number; netWorth: number }; }

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function NetWorthPage() {
  const [data, setData]       = useState<NWData | null>(null);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/networth").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  };

  useEffect(load, []);

  const takeSnapshot = async () => {
    setSaving(true);
    await fetch("/api/networth/snapshot", { method: "POST" });
    setSaving(false);
    load();
  };

  if (loading) return <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>Loading…</div>;
  if (!data)   return <div style={{ color: "#ef4444", padding: 40 }}>Failed to load.</div>;

  const c = data.current;
  const snaps = data.snapshots;

  // Build a simple sparkline from snapshots
  const nwValues = snaps.map(s => parseFloat(s.netWorth));
  const maxNW = Math.max(...nwValues, c.netWorth, 1);
  const minNW = Math.min(...nwValues, c.netWorth, 0);
  const range = maxNW - minNW || 1;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#f1f5f9", margin: 0, fontSize: 22, fontWeight: 700 }}>Net Worth</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 13 }}>Monthly snapshots + trend</p>
        </div>
        <button onClick={takeSnapshot} disabled={saving}
          style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: saving ? "not-allowed" : "pointer", fontSize: 13 }}>
          {saving ? "Saving…" : "📸 Snapshot Now"}
        </button>
      </div>

      {/* Current summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Assets",      value: formatBDT(c.totalAssets),      color: "#10b981" },
          { label: "Total Liabilities", value: formatBDT(c.totalLiabilities), color: "#f87171" },
          { label: "Net Worth",         value: formatBDT(c.netWorth),         color: c.netWorth >= 0 ? "#60a5fa" : "#ef4444" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ color: "#475569", fontSize: 12, marginBottom: 6 }}>{label}</div>
            <div style={{ color, fontWeight: 700, fontSize: 22 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Trend chart (ASCII sparkline via CSS boxes) */}
      {snaps.length > 0 && (
        <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ color: "#a78bfa", fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Net Worth Trend</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
            {snaps.map(s => {
              const nw  = parseFloat(s.netWorth);
              const pct = ((nw - minNW) / range) * 100;
              return (
                <div key={s.id} title={`${MONTH_NAMES[s.month - 1]} ${s.year}: ${formatBDT(nw)}`}
                  style={{ flex: 1, background: nw >= 0 ? "#7c3aed" : "#ef4444", borderRadius: "4px 4px 0 0",
                    height: `${Math.max(pct, 4)}%`, minWidth: 8, cursor: "pointer" }} />
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ color: "#475569", fontSize: 11 }}>{snaps.length > 0 ? `${MONTH_NAMES[snaps[0].month - 1]} ${snaps[0].year}` : ""}</span>
            <span style={{ color: "#475569", fontSize: 11 }}>{snaps.length > 0 ? `${MONTH_NAMES[snaps[snaps.length - 1].month - 1]} ${snaps[snaps.length - 1].year}` : ""}</span>
          </div>
        </div>
      )}

      {/* History table */}
      <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #141428" }}>
          <span style={{ color: "#a78bfa", fontWeight: 600, fontSize: 14 }}>Snapshot History</span>
        </div>
        {snaps.length === 0 && <div style={{ padding: 32, color: "#475569", textAlign: "center" }}>No snapshots yet. Click "Snapshot Now" to save the current state.</div>}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #141428" }}>
              {["Month", "Assets", "Liabilities", "Net Worth"].map(h => (
                <th key={h} style={{ padding: "10px 16px", color: "#64748b", fontSize: 12, fontWeight: 500, textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...snaps].reverse().map(s => {
              const nw = parseFloat(s.netWorth);
              return (
                <tr key={s.id} style={{ borderBottom: "1px solid #0a0a14" }}>
                  <td style={{ padding: "10px 16px", color: "#94a3b8", fontSize: 13 }}>{MONTH_NAMES[s.month - 1]} {s.year}</td>
                  <td style={{ padding: "10px 16px", color: "#10b981", fontSize: 13 }}>{formatBDT(parseFloat(s.totalAssets))}</td>
                  <td style={{ padding: "10px 16px", color: "#f87171", fontSize: 13 }}>{formatBDT(parseFloat(s.totalLiabilities))}</td>
                  <td style={{ padding: "10px 16px", color: nw >= 0 ? "#60a5fa" : "#ef4444", fontSize: 13, fontWeight: 600 }}>{formatBDT(nw)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
