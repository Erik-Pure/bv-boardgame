import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArcadeButton } from "../components/ArcadeButton";
import { CardFlipModalShell } from "../components/CardFlipModalShell";
import { sv } from "../lib/uiStrings";

const HOME_AGE_GATE_KEY = "bv:homeAgeGateAck";

function readHomeAgeGateAck(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(HOME_AGE_GATE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeHomeAgeGateAck(): void {
  try {
    window.localStorage.setItem(HOME_AGE_GATE_KEY, "1");
  } catch {
    // ignore
  }
}

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
  const [ageGateOpen, setAgeGateOpen] = useState(() => !readHomeAgeGateAck());
  const [ageGatePhase, setAgeGatePhase] = useState<"ask" | "declined">("ask");

  const confirmAgeGate = () => {
    writeHomeAgeGateAck();
    setAgeGateOpen(false);
  };

  return (
    <>
    <div
      style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "40px 20px 56px",
        minHeight: "100vh",
        boxSizing: "border-box",
        color: "#f8fafc",
        background: "linear-gradient(180deg, #0f172a 0%, #020617 100%)",
      }}
    >
      <img
        src="/icons/bmm-logo.png"
        alt="Bryggmästarnas Mästare"
        style={{
          display: "block",
          width: "min(100%, 560px)",
          height: "auto",
          margin: "0 auto 28px",
        }}
      />

      <ArcadeButton variant="pink" fullWidth onClick={() => nav("/join")}>
        {sv.home.primaryJoin}
      </ArcadeButton>

      <div style={{ marginTop: 14 }}>
        <ArcadeButton variant="gray" fullWidth onClick={() => nav(`/table?room=${suggestedRoom}&name=Bord`)}>
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

    {ageGateOpen ? (
      <CardFlipModalShell zIndex={200} maxWidth={480} instantFront>
        <div
          style={{
            width: "100%",
            borderRadius: 16,
            border: "1px solid #ffffff22",
            background: "#0b1226",
            padding: "22px 18px 24px",
            textAlign: "center",
            color: "#ffffff",
            boxSizing: "border-box",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {ageGatePhase === "ask" ? (
            <>
              <h2
                style={{
                  margin: "0 0 14px",
                  fontFamily: '"Permanent Marker", var(--heading), sans-serif',
                  fontWeight: 400,
                  fontSize: "clamp(1.35rem, 4.5vw, 1.75rem)",
                  letterSpacing: "0.03em",
                  lineHeight: 1.2,
                  color: "#fef9c3",
                  textShadow: "0 2px 14px rgba(0,0,0,0.75), 0 0 20px rgba(250, 204, 21, 0.22)",
                }}
              >
                {sv.home.ageGateTitle}
              </h2>
              <p
                style={{
                  margin: "0 0 22px",
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: "rgba(248, 250, 252, 0.95)",
                }}
              >
                {sv.home.ageGateBody}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <ArcadeButton variant="pink" fullWidth onClick={confirmAgeGate}>
                  {sv.home.ageGateConfirm}
                </ArcadeButton>
                <ArcadeButton variant="gray" fullWidth onClick={() => setAgeGatePhase("declined")}>
                  {sv.home.ageGateDecline}
                </ArcadeButton>
              </div>
            </>
          ) : (
            <>
              <p
                style={{
                  margin: "0 0 22px",
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: "rgba(248, 250, 252, 0.95)",
                }}
              >
                {sv.home.ageGateDeclineBody}
              </p>
              <ArcadeButton variant="gray" fullWidth onClick={() => setAgeGatePhase("ask")}>
                {sv.home.ageGateBack}
              </ArcadeButton>
            </>
          )}
        </div>
      </CardFlipModalShell>
    ) : null}
    </>
  );
}
