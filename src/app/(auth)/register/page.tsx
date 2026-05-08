"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    background: "#141428",
    border: "1px solid #1e1e38",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#f1f5f9",
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.15s",
  } as React.CSSProperties;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#08080f" }}>
      <div style={{ background: "#0e0e1c", border: "1px solid #1e1e38", borderRadius: 16, padding: "40px 48px", width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ color: "#f1f5f9", margin: "0 0 8px", fontSize: 24, fontWeight: 700 }}>Wallet</h1>
          <p style={{ color: "#94a3b8", margin: 0, fontSize: 14 }}>Create your account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ color: "#94a3b8", fontSize: 13, fontWeight: 500 }}>Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              placeholder="Alex Johnson"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
              onBlur={(e) => (e.target.style.borderColor = "#1e1e38")}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ color: "#94a3b8", fontSize: 13, fontWeight: 500 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
              onBlur={(e) => (e.target.style.borderColor = "#1e1e38")}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ color: "#94a3b8", fontSize: 13, fontWeight: 500 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              minLength={8}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
              onBlur={(e) => (e.target.style.borderColor = "#1e1e38")}
            />
          </div>

          {error && (
            <p style={{ margin: 0, color: "#ef4444", fontSize: 13, background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "8px 12px" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? "#2e1065" : "#7c3aed",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "11px 0",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: 4,
              transition: "background 0.15s",
            }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "#64748b", fontSize: 13, marginTop: 24, marginBottom: 0 }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#7c3aed", textDecoration: "none", fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
