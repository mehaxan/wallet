"use client";

import { useState, useEffect } from "react";
import { formatBDT, getBDFiscalYear } from "@/lib/utils";

interface SlabBreakdown { from: number; to: number | null; rate: number; taxable: number; tax: number; }
interface TaxSummary {
  fiscalYear: string; location: string;
  grossIncome: number; taxableIncome: number;
  grossTax: number; rebateAmount: number; netTax: number;
  minimumTax: number; finalTax: number;
  taxPaid: number; taxDue: number; effectiveRate: number;
  slabBreakdown: SlabBreakdown[]; sanchayapatraTds: number;
  investmentForRebate: number;
}

const LOCATION_LABELS: Record<string, string> = { dhaka: "Dhaka City Corp", city_corp: "Other City Corp", other: "Other Area" };

export default function TaxPage() {
  const [summary, setSummary]   = useState<TaxSummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [location, setLocation] = useState<"dhaka"|"city_corp"|"other">("dhaka");
  const [fy] = useState(getBDFiscalYear());

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tax/summary?location=${location}`)
      .then(r => r.json())
      .then(d => { setSummary(d); setLoading(false); });
  }, [location]);

  if (loading) return <div style={{ color: "#64748b", padding: 40, textAlign: "center" }}>Calculating tax…</div>;
  if (!summary || ("error" in (summary as object))) return <div style={{ color: "#ef4444", padding: 40 }}>Failed to load tax summary.</div>;

  const taxDueColor = summary.taxDue > 0 ? "#ef4444" : "#10b981";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ color: "#f1f5f9", margin: 0, fontSize: 22, fontWeight: 700 }}>Tax Dashboard</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 13 }}>FY {fy} · NBR BD Income Tax</p>
        </div>
        <select value={location} onChange={e => setLocation(e.target.value as typeof location)}
          style={{ background: "#141428", border: "1px solid #1e1e38", borderRadius: 8, padding: "8px 12px", color: "#f1f5f9", fontSize: 13 }}>
          {Object.entries(LOCATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Gross Income",    value: formatBDT(summary.grossIncome),       color: "#f1f5f9" },
          { label: "Gross Tax",       value: formatBDT(summary.grossTax),           color: "#f1f5f9" },
          { label: "Rebate",          value: `- ${formatBDT(summary.rebateAmount)}`, color: "#10b981" },
          { label: "Final Tax",       value: formatBDT(summary.finalTax),           color: "#f59e0b" },
          { label: "Tax Paid",        value: formatBDT(summary.taxPaid),            color: "#10b981" },
          { label: "Tax Due",         value: formatBDT(summary.taxDue),             color: taxDueColor },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ color: "#475569", fontSize: 12, marginBottom: 6 }}>{label}</div>
            <div style={{ color, fontWeight: 700, fontSize: 18 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Effective rate */}
      <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ color: "#a78bfa", fontWeight: 600 }}>Effective Tax Rate</span>
          <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 20 }}>{summary.effectiveRate}%</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><div style={{ color: "#475569", fontSize: 12 }}>Investment for rebate</div><div style={{ color: "#60a5fa", fontWeight: 600 }}>{formatBDT(summary.investmentForRebate)}</div></div>
          <div><div style={{ color: "#475569", fontSize: 12 }}>Minimum tax ({LOCATION_LABELS[location]})</div><div style={{ color: "#94a3b8", fontWeight: 600 }}>{formatBDT(summary.minimumTax)}</div></div>
          {summary.sanchayapatraTds > 0 && (
            <div style={{ gridColumn: "1/-1" }}><div style={{ color: "#475569", fontSize: 12 }}>Sanchayapatra TDS (10%)</div><div style={{ color: "#f59e0b", fontWeight: 600 }}>{formatBDT(summary.sanchayapatraTds)}</div></div>
          )}
        </div>
      </div>

      {/* Slab breakdown */}
      <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #141428" }}>
          <span style={{ color: "#a78bfa", fontWeight: 600, fontSize: 14 }}>Tax Slab Breakdown</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #141428" }}>
              {["Income Band", "Rate", "Taxable", "Tax"].map(h => (
                <th key={h} style={{ padding: "10px 16px", color: "#64748b", fontSize: 12, fontWeight: 500, textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.slabBreakdown.filter(s => s.taxable > 0 || s.tax > 0).map((s, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #0a0a14" }}>
                <td style={{ padding: "10px 16px", color: "#94a3b8", fontSize: 13 }}>
                  {formatBDT(s.from)} – {s.to !== null ? formatBDT(s.to) : "above"}
                </td>
                <td style={{ padding: "10px 16px", color: s.rate === 0 ? "#475569" : "#f1f5f9", fontSize: 13 }}>{s.rate}%</td>
                <td style={{ padding: "10px 16px", color: "#f1f5f9", fontSize: 13 }}>{formatBDT(s.taxable)}</td>
                <td style={{ padding: "10px 16px", color: s.tax > 0 ? "#f59e0b" : "#475569", fontSize: 13, fontWeight: s.tax > 0 ? 600 : 400 }}>{formatBDT(s.tax)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
