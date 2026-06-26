import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArcadeButton } from "../components/ArcadeButton";
import { BrandLogoImg } from "../components/BrandLogoImg";
import { lobbyFieldControlStyle, lobbyFieldLabelTextStyle } from "../lib/lobbyFormFieldStyle";
import { useUiStrings } from "../lib/locale/LocaleContext";
import styles from "./JoinGame.module.css";

export function JoinGame() {
  const ui = useUiStrings();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const initialRoom = useMemo(() => (sp.get("room") ?? "").trim().toUpperCase(), [sp]);
  const [roomCode, setRoomCode] = useState(initialRoom);
  const [name, setName] = useState("");

  return (
    <div style={{ position: "relative", minHeight: "100svh", isolation: "isolate" }}>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 480,
          margin: "0 auto",
          padding: "max(28px, env(safe-area-inset-top, 0px)) 20px 48px",
          minHeight: "100svh",
          boxSizing: "border-box",
          color: "#f8fafc",
          background: "transparent",
        }}
      >
        <div className={styles.logoHero}>
          <div className={styles.logoGlowSpin} aria-hidden>
            <img className={styles.logoGlow} src="/icons/circular-shine.svg" alt="" />
          </div>
          <BrandLogoImg
            variant="stacked"
            className={styles.logoImage}
            alt={ui.home.title}
          />
        </div>
        <h1 style={{ margin: "20px 0 8px", fontSize: "clamp(1.5rem, 5vw, 1.85rem)", fontWeight: 800 }}>
          {ui.joinPage.title}
        </h1>

        <div style={{ display: "grid", gap: 14, textAlign: "left" }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={lobbyFieldLabelTextStyle}>{ui.joinPage.roomLabel}</span>
            <input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              autoComplete="off"
              spellCheck={false}
              style={{
                ...lobbyFieldControlStyle,
                letterSpacing: "0.08em",
                fontWeight: 700,
              }}
            />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={lobbyFieldLabelTextStyle}>{ui.joinPage.nameLabel}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={ui.joinPage.namePlaceholder}
              autoComplete="nickname"
              style={lobbyFieldControlStyle}
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
            {ui.joinPage.connect}
          </ArcadeButton>
        </div>
      </div>
    </div>
  );
}
