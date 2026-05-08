import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { taxConfigs } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface GeminiCandidate { content: { parts: { text: string }[] } }
interface GeminiResponse  { candidates: GeminiCandidate[] }

/**
 * POST /api/tax/update
 * Uses Gemini AI to read the latest NBR circular and update tax slabs.
 * Requires GEMINI_API_KEY env var. If not set, returns a dry-run preview.
 */
export async function POST(req: NextRequest) {
  try {
    await requireSession(); // admin-level could be enforced here if needed

    const body = await req.json() as { fiscalYear?: string; dryRun?: boolean };
    const fiscalYear = body.fiscalYear ?? new Date().getFullYear() + "-" + (new Date().getFullYear() + 1 - 2000).toString().padStart(2, "0");
    const dryRun     = body.dryRun ?? !process.env.GEMINI_API_KEY;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      // Return the current stored config as preview
      const [config] = await db.select().from(taxConfigs).where(eq(taxConfigs.fiscalYear, fiscalYear));
      return NextResponse.json({
        dryRun: true,
        message: "GEMINI_API_KEY not set — returning current config",
        fiscalYear,
        currentConfig: config ?? null,
      });
    }

    // Prompt Gemini to extract NBR tax slab data
    const prompt = `You are a Bangladesh tax expert. For fiscal year ${fiscalYear} (July–June), 
    provide the NBR personal income tax slabs in JSON format:
    {
      "slabs": [{"limit": number_or_null, "rate": number_pct}],
      "taxFreeThreshold": "number",
      "rebateRate": "15",
      "rebateInvestmentCap": "1000000",
      "rebateIncomePercent": "25",
      "minTaxDhaka": "5000",
      "minTaxCityCorpOther": "4000",
      "minTaxOther": "3000",
      "sanchayapatraThreshold": "500000",
      "sanchayapatraTdsRate": "10"
    }
    Reply with ONLY valid JSON, no markdown.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    if (!geminiRes.ok) {
      return apiError(`Gemini API error: ${geminiRes.status}`, 502);
    }

    const geminiData: GeminiResponse = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawText.trim()) as Record<string, unknown>;
    } catch {
      return apiError("Failed to parse Gemini response as JSON", 502);
    }

    if (dryRun) {
      return NextResponse.json({ dryRun: true, fiscalYear, proposed: parsed });
    }

    // Upsert tax config
    const [updated] = await db.insert(taxConfigs).values({
      fiscalYear,
      slabs: (parsed.slabs ?? []) as { limit: number | null; rate: number }[],
      taxFreeThreshold: String(parsed.taxFreeThreshold ?? "350000"),
      rebateRate: String(parsed.rebateRate ?? "15"),
      rebateInvestmentCap: String(parsed.rebateInvestmentCap ?? "1000000"),
      rebateIncomePercent: String(parsed.rebateIncomePercent ?? "25"),
      minTaxDhaka: String(parsed.minTaxDhaka ?? "5000"),
      minTaxCityCorpOther: String(parsed.minTaxCityCorpOther ?? "4000"),
      minTaxOther: String(parsed.minTaxOther ?? "3000"),
      sanchayapatraThreshold: String(parsed.sanchayapatraThreshold ?? "500000"),
      sanchayapatraTdsRate: String(parsed.sanchayapatraTdsRate ?? "10"),
      rebateInstruments: (parsed.rebateInstruments as string[] | undefined) ?? [],
    })
      .onConflictDoUpdate({
        target: taxConfigs.fiscalYear,
        set: {
          slabs: (parsed.slabs ?? []) as { limit: number | null; rate: number }[],
          taxFreeThreshold: String(parsed.taxFreeThreshold ?? "350000"),
          rebateRate: String(parsed.rebateRate ?? "15"),
        },
      })
      .returning();

    return NextResponse.json({ dryRun: false, fiscalYear, updated });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error(e);
    return apiError("Internal server error", 500);
  }
}
