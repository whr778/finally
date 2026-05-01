import { TradeBar } from "@/components/TradeBar";

export default function Page() {
  return (
    <main className="h-full flex flex-col">
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-surface)",
        }}
      >
        <span
          style={{
            color: "var(--accent)",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontSize: 13,
          }}
        >
          FinAlly
        </span>
        <span
          style={{ marginLeft: 10, color: "var(--text-muted)", fontSize: 12 }}
        >
          AI Trading Workstation
        </span>
      </header>
      <section
        style={{ flex: 1, padding: 16, color: "var(--text-muted)", fontSize: 12 }}
      >
        Scaffold ready.
      </section>
      <section style={{ padding: 12, borderTop: "1px solid var(--border)" }}>
        <TradeBar />
      </section>
    </main>
  );
}
