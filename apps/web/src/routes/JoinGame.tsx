import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArcadeButton } from "../components/ArcadeButton";
import { sv } from "../lib/uiStrings";

export function JoinGame() {
  const nav = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");

  return (
    <div
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: "28px 20px 48px",
        minHeight: "100vh",
        boxSizing: "border-box",
        color: "#f8fafc",
        background: "linear-gradient(180deg, #0f172a 0%, #020617 100%)",
      }}
    >
      <Link to="/" style={{ color: "#93c5fd", fontSize: 15, textDecoration: "none" }}>
        ← {sv.joinPage.back}
      </Link>
      <h1 style={{ margin: "20px 0 8px", fontSize: "clamp(1.5rem, 5vw, 1.85rem)", fontWeight: 800 }}>
        {sv.joinPage.title}
      </h1>
      <p style={{ margin: "0 0 28px", opacity: 0.88, lineHeight: 1.5 }}>{sv.joinPage.subtitle}</p>

      <div style={{ display: "grid", gap: 14 }}>
        <label style={{ display: "grid", gap: 6, fontWeight: 600, fontSize: 14 }}>
          {sv.joinPage.roomLabel}
          <input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            autoComplete="off"
            spellCheck={false}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(15,23,42,0.85)",
              color: "#fff",
              fontSize: 18,
              letterSpacing: "0.08em",
              fontWeight: 700,
              boxSizing: "border-box",
            }}
          />
        </label>
        <label style={{ display: "grid", gap: 6, fontWeight: 600, fontSize: 14 }}>
          {sv.joinPage.nameLabel}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={sv.joinPage.namePlaceholder}
            autoComplete="nickname"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(15,23,42,0.85)",
              color: "#fff",
              fontSize: 16,
              boxSizing: "border-box",
            }}
          />
        </label>
        <ArcadeButton
          variant="pink"
          fullWidth
          disabled={!roomCode.trim()}
          onClick={() =>
            nav(`/play?room=${encodeURIComponent(roomCode.trim())}&name=${encodeURIComponent(name.trim() || "Bryggare")}`)
          }
        >
          {sv.joinPage.connect}
        </ArcadeButton>
      </div>
    </div>
  );
}
