import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { receiptJobs } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface OcrResult { date?: string; amount?: number; vendor?: string; currency?: string }

/**
 * POST /api/receipts
 * Accepts a multipart/form-data with `file` field.
 * Uploads to Cloudflare R2 (if configured) then enqueues OCR via Gemini Vision.
 * Without credentials, saves a mock job record for testing.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();

    const formData = await req.formData();
    const file     = formData.get("file") as File | null;

    if (!file) return apiError("file is required");

    const R2_ACCOUNT_ID   = process.env.R2_ACCOUNT_ID;
    const R2_ACCESS_KEY   = process.env.R2_ACCESS_KEY;
    const R2_SECRET_KEY   = process.env.R2_SECRET_KEY;
    const R2_BUCKET       = process.env.R2_BUCKET ?? "wallet-receipts";
    const GEMINI_API_KEY  = process.env.GEMINI_API_KEY;

    let fileUrl = `mock://${file.name}`;

    // Upload to R2 if configured
    if (R2_ACCOUNT_ID && R2_ACCESS_KEY && R2_SECRET_KEY) {
      const objectKey  = `${session.sub}/${Date.now()}-${file.name}`;
      const r2Endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${objectKey}`;

      const arrayBuffer = await file.arrayBuffer();
      const putRes = await fetch(r2Endpoint, {
        method:  "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "X-Custom-Auth-Key": R2_ACCESS_KEY, // simplified — use aws4 signing in production
        },
        body: arrayBuffer,
      });

      if (!putRes.ok) return apiError("R2 upload failed", 502);
      fileUrl = r2Endpoint;
    }

    // Create job record
    const [job] = await db.insert(receiptJobs).values({
      userId: session.sub,
      fileUrl,
      status: "pending",
    }).returning();

    // Run OCR if Gemini is configured
    if (GEMINI_API_KEY) {
      const bytes   = await file.arrayBuffer();
      const base64  = Buffer.from(bytes).toString("base64");
      const mimeType = file.type || "image/jpeg";

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "Extract the transaction data from this receipt. Return JSON: {date, amount, vendor, currency}. No markdown." },
                { inlineData: { mimeType, data: base64 } },
              ],
            }],
          }),
        }
      );

      if (geminiRes.ok) {
        const gd = await geminiRes.json() as { candidates: { content: { parts: { text: string }[] } }[] };
        const rawText = gd.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        try {
          const result: OcrResult = JSON.parse(rawText.trim());
          await db.update(receiptJobs).set({ status: "done", result, updatedAt: new Date() }).where(eq(receiptJobs.id, job.id));
          return NextResponse.json({ ...job, status: "done", result }, { status: 201 });
        } catch {
          await db.update(receiptJobs).set({ status: "failed", error: "JSON parse error" }).where(eq(receiptJobs.id, job.id));
        }
      }
    }

    return NextResponse.json({ ...job, note: GEMINI_API_KEY ? "OCR in progress" : "GEMINI_API_KEY not set — mock job created" }, { status: 201 });
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    console.error(e);
    return apiError("Internal server error", 500);
  }
}

/** GET /api/receipts — list receipt jobs */
export async function GET(_req: NextRequest) {
  try {
    const session = await requireSession();
    const jobs = await db.select().from(receiptJobs).where(eq(receiptJobs.userId, session.sub));
    return NextResponse.json(jobs);
  } catch (e: unknown) {
    if ((e as Error).message === "Unauthorized") return apiError("Unauthorized", 401);
    return apiError("Internal server error", 500);
  }
}
