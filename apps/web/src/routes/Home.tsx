import { useMemo, useState } from "react";
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
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  const suggested = useMemo(() => randomCode(), []);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>{sv.home.title}</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>{sv.home.subtitle}</p>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ padding: 16, border: "1px solid #3333", borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>{sv.home.bigScreenTitle}</h2>
          <p style={{ opacity: 0.8 }}>{sv.home.bigScreenHint}</p>
          <ArcadeButton
            variant="blue"
            onClick={() => nav(`/table?room=${suggested}&name=Bord`)}
          >
            {sv.home.createLobby(suggested)}
          </ArcadeButton>
          <div style={{ marginTop: 12 }}>
            <Link to="/table">{sv.home.goToBoard}</Link>
          </div>
        </div>

        <div style={{ padding: 16, border: "1px solid #3333", borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>{sv.home.phoneTitle}</h2>
          <div style={{ display: "grid", gap: 8 }}>
            <label>
              {sv.home.code}
              <input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                style={{ width: "100%", padding: 8, borderRadius: 10 }}
              />
            </label>
            <label>
              {sv.home.name}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={sv.home.namePlaceholder}
                style={{ width: "100%", padding: 8, borderRadius: 10 }}
              />
            </label>
            <ArcadeButton
              variant="pink"
              fullWidth
              onClick={() =>
                nav(`/play?room=${encodeURIComponent(roomCode)}&name=${encodeURIComponent(name || "Bryggare")}`)
              }
              disabled={!roomCode.trim()}
            >
              {sv.home.join}
            </ArcadeButton>
          </div>
          <p style={{ opacity: 0.7, marginTop: 12 }}>{sv.home.tip}</p>
          <p style={{ opacity: 0.65, marginTop: 8, fontSize: 14, lineHeight: 1.45 }}>{sv.home.lanHint}</p>
        </div>
      </div>
    </div>
  );
}
