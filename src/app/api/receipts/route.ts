import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/db";
import { receiptJobs } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface OcrResult { date?: string; amount?: number; vendor?: string; currency?: string }

/**
 * POST /api/receipts
 * Accepts multipart/form-data with `file` field.
 * Uploads to Cloudflare R2 (SigV4 via @aws-sdk/client-s3) then runs OCR via Gemini Vision.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();

    const formData = await req.formData();
    const file     = formData.get("file") as File | null;

    if (!file) return apiError("file is required");

    const R2_ACCOUNT_ID   = process.env.R2_ACCOUNT_ID;
    const R2_ACCESS_KEY   = process.env.R2_ACCESS_KEY_ID;
    const R2_SECRET_KEY   = process.env.R2_SECRET_ACCESS_KEY;
    const R2_BUCKET       = process.env.R2_BUCKET_NAME ?? "wallet-receipts";
    const GEMINI_API_KEY  = process.env.GEMINI_API_KEY;

    const arrayBuffer = await file.arrayBuffer();
    let fileUrl = `mock://${file.name}`;

    // Upload to R2 using proper SigV4 via AWS SDK (compatible with Cloudflare R2)
    if (R2_ACCOUNT_ID && R2_ACCESS_KEY && R2_SECRET_KEY) {
      const objectKey = `${session.sub}/${Date.now()}-${file.name}`;

      const s3 = new S3Client({
        region: "auto",
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
      });

      await s3.send(new PutObjectCommand({
        Bucket:      R2_BUCKET,
        Key:         objectKey,
        Body:        Buffer.from(arrayBuffer),
        ContentType: file.type || "application/octet-stream",
      }));

      const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
      fileUrl = R2_PUBLIC_URL
        ? `${R2_PUBLIC_URL.replace(/\/$/, "")}/${objectKey}`
        : `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${objectKey}`;
    }

    // Create job record
    const [job] = await db.insert(receiptJobs).values({
      userId: session.sub,
      fileUrl,
      status: "pending",
    }).returning();

    // Run OCR if Gemini is configured
    if (GEMINI_API_KEY) {
      const base64   = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = file.type || "image/jpeg";

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "Extract the transaction data from this receipt. Return JSON only: {date, amount, vendor, currency}. No markdown, no explanation." },
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
          const cleaned = rawText.replace(/```json\n?/g, "").replace(/```/g, "").trim();
          const result: OcrResult = JSON.parse(cleaned);
          await db.update(receiptJobs).set({ status: "done", result, updatedAt: new Date() }).where(eq(receiptJobs.id, job.id));
          return NextResponse.json({ ...job, status: "done", result }, { status: 201 });
        } catch {
          await db.update(receiptJobs).set({ status: "failed", error: "JSON parse error", updatedAt: new Date() }).where(eq(receiptJobs.id, job.id));
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
