import { describe, it, expect } from "vitest";
import { formatBDT, formatDate, apiError } from "@/lib/utils";

describe("formatBDT", () => {
  it("formats integer amounts", () => {
    expect(formatBDT(45000)).toBe("৳45,000");
  });

  it("formats string amounts with decimals", () => {
    expect(formatBDT("1234.56")).toBe("৳1,234.56");
  });

  it("handles 0 and null gracefully", () => {
    expect(formatBDT(0)).toBe("৳0");
    expect(formatBDT(null)).toBe("৳0");
    expect(formatBDT(undefined)).toBe("৳0");
  });

  it("formats large amounts with BD-style grouping", () => {
    expect(formatBDT(1000000)).toBe("৳10,00,000");
  });
});

describe("formatDate", () => {
  it("formats an ISO date string", () => {
    const result = formatDate("2025-05-01");
    expect(result).toMatch(/2025/);
  });

  it("returns em-dash for null/undefined", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });
});

describe("apiError", () => {
  it("returns a Response with the correct status", async () => {
    const res = apiError("Not found", 404);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Not found");
  });

  it("defaults to 400 status", async () => {
    const res = apiError("Bad input");
    expect(res.status).toBe(400);
  });
});
