import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArcadeButton } from "../components/ArcadeButton";
import { sv } from "../lib/uiStrings";

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const n = 6;
  let s = "";
  for (let i = 0; i < n; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export function Home() {
  const nav = useNavigate();
  const suggestedRoom = useMemo(() => randomCode(), []);

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "0 auto",
        padding: "40px 20px 56px",
        minHeight: "100vh",
        boxSizing: "border-box",
        color: "#f8fafc",
        background: "linear-gradient(180deg, #0f172a 0%, #020617 100%)",
      }}
    >
      <h1 style={{ margin: "0 0 10px", fontSize: "clamp(1.65rem, 5vw, 2rem)", fontWeight: 800, letterSpacing: "0.02em" }}>
        {sv.home.title}
      </h1>
      <p style={{ margin: "0 0 32px", opacity: 0.88, lineHeight: 1.5, fontSize: 16 }}>{sv.home.subtitle}</p>

      <ArcadeButton variant="pink" fullWidth onClick={() => nav("/join")}>
        {sv.home.primaryJoin}
      </ArcadeButton>

      <div style={{ marginTop: 14 }}>
        <ArcadeButton variant="blue" fullWidth onClick={() => nav(`/table?room=${suggestedRoom}&name=Bord`)}>
          {sv.home.createLobby}
        </ArcadeButton>
      </div>

      <nav
        style={{
          marginTop: 40,
          paddingTop: 28,
          borderTop: "1px solid rgba(148,163,184,0.25)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}
      >
        <Link
          to="/cards"
          style={{
            color: "#94a3b8",
            fontSize: 15,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {sv.home.footerCards}
        </Link>
        <Link
          to="/rules"
          style={{
            color: "#94a3b8",
            fontSize: 15,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {sv.home.footerRules}
        </Link>
      </nav>
    </div>
  );
}
