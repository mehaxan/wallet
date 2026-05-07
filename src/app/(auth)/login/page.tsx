export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#08080f",
      }}
    >
      <div
        style={{
          background: "#0e0e1c",
          border: "1px solid #1e1e38",
          borderRadius: 16,
          padding: "40px 48px",
          width: "100%",
          maxWidth: 400,
          textAlign: "center",
        }}
      >
        <h1 style={{ color: "#f1f5f9", marginBottom: 8, fontSize: 24 }}>Wallet</h1>
        <p style={{ color: "#94a3b8", marginBottom: 32, fontSize: 14 }}>
          Personal Finance Tracker
        </p>
        <p style={{ color: "#7c3aed" }}>Login page — coming in issue #2</p>
      </div>
    </div>
  );
}
