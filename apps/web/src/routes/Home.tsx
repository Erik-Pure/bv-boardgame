import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArcadeButton } from "../components/ArcadeButton";
import { CardFlipModalShell } from "../components/CardFlipModalShell";
import { sv } from "../lib/uiStrings";
import styles from "./Home.module.css";

const HOME_AGE_GATE_KEY = "bv:homeAgeGateAck";
const OTP_DEFAULT_CODE = "123456";

type AuthMe =
  | { ok: true; authenticated: false }
  | {
      ok: true;
      authenticated: true;
      user: { id: string; email: string; displayName: string };
      entitlement?: { tier?: string };
    };

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

export function Home() {
  const nav = useNavigate();
  const [ageGateOpen, setAgeGateOpen] = useState(() => !readHomeAgeGateAck());
  const [ageGatePhase, setAgeGatePhase] = useState<"ask" | "declined">("ask");
  const [authLoading, setAuthLoading] = useState(true);
  const [authState, setAuthState] = useState<AuthMe | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState(OTP_DEFAULT_CODE);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);

  const refreshAuth = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/auth/me", { credentials: "include" });
      const json = (await res.json()) as AuthMe;
      if (!res.ok || !json?.ok) {
        setAuthState(null);
        setAuthError("Kunde inte läsa inloggningsstatus.");
      } else {
        setAuthState(json);
      }
    } catch {
      setAuthState(null);
      setAuthError("Kunde inte nå auth-servern.");
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    void refreshAuth();
  }, []);

  const requestOtp = async () => {
    const email = otpEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setAuthError("Ange en giltig e-postadress.");
      return;
    }
    setOtpBusy(true);
    setAuthError(null);
    try {
      const res = await fetch("/auth/otp/request", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        setAuthError("Kunde inte skicka engångskod.");
        return;
      }
      setOtpRequested(true);
    } catch {
      setAuthError("Kunde inte skicka engångskod.");
    } finally {
      setOtpBusy(false);
    }
  };

  const verifyOtp = async () => {
    const email = otpEmail.trim().toLowerCase();
    const code = otpCode.trim();
    if (!email || !code) {
      setAuthError("Ange både e-post och kod.");
      return;
    }
    setOtpBusy(true);
    setAuthError(null);
    try {
      const res = await fetch("/auth/otp/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      if (!res.ok) {
        setAuthError("Fel eller utgången kod.");
        return;
      }
      setOtpRequested(false);
      await refreshAuth();
    } catch {
      setAuthError("Kunde inte verifiera kod.");
    } finally {
      setOtpBusy(false);
    }
  };

  const logout = async () => {
    setOtpBusy(true);
    setAuthError(null);
    try {
      await fetch("/auth/logout", { method: "POST", credentials: "include" });
      await refreshAuth();
    } catch {
      setAuthError("Kunde inte logga ut.");
    } finally {
      setOtpBusy(false);
    }
  };

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
        background: "transparent",
      }}
    >
      <div className={styles.logoHero}>
        <div className={styles.logoGlowSpin} aria-hidden>
          <img className={styles.logoGlow} src="/icons/circular-shine.svg" alt="" />
        </div>
        <img className={styles.logoImage} src="/icons/bmm-logo.png" alt="Bryggmästarnas Mästare" />
      </div>
      <ArcadeButton variant="pink" size="lg" fullWidth={false} onClick={() => nav("/join")}>
        {sv.home.primaryJoin}
      </ArcadeButton>

      <div style={{ margin: "28px 0", borderTop: "1px solid rgba(148,163,184,0.25)", }}>
        <h4>Starta ett nytt spel</h4>
        <p style={{ marginBottom: 28 }}>Skapa upp en ny lobby och bjud in dina vänner att spela. Vi rekommenderar att du använder en stor skärm som alla deltagare kan se.</p>
        <ArcadeButton variant="gray" size="sm" fullWidth={false} onClick={() => nav("/host-lobby")}>
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
      <div className={styles.authCard}>
        <h4 className={styles.authTitle}>Host-inloggning (beta)</h4>
        {authLoading ? (
          <p className={styles.authSubtle}>Läser inloggningsstatus…</p>
        ) : authState?.authenticated ? (
          <>
            <p className={styles.authSubtle}>
              Inloggad som <b>{authState.user.displayName}</b> ({authState.user.email}) · Tier:{" "}
              {authState.entitlement?.tier ?? "free"}
            </p>
            <div className={styles.authActions}>
              <ArcadeButton variant="gray" size="sm" fullWidth={false} onClick={logout} disabled={otpBusy}>
                Logga ut
              </ArcadeButton>
            </div>
          </>
        ) : (
          <>
            <p className={styles.authSubtle}>Logga in som host med OTP eller Google.</p>
            <div className={styles.authFields}>
              <input
                className={styles.authInput}
                type="email"
                placeholder="E-post"
                value={otpEmail}
                onChange={(e) => setOtpEmail(e.target.value)}
              />
              <input
                className={styles.authInput}
                type="text"
                inputMode="numeric"
                placeholder="Kod (dev: 123456)"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />
            </div>
            <div className={styles.authActions}>
              <ArcadeButton variant="gray" size="sm" fullWidth={false} onClick={requestOtp} disabled={otpBusy}>
                Skicka kod
              </ArcadeButton>
              <ArcadeButton variant="pink" size="sm" fullWidth={false} onClick={verifyOtp} disabled={otpBusy}>
                Verifiera kod
              </ArcadeButton>
              <a className={styles.googleLink} href="/auth/google/start">
                Fortsätt med Google
              </a>
            </div>
            {otpRequested ? <p className={styles.authSubtle}>Kod skickad. Kontrollera e-post/logg och verifiera.</p> : null}
          </>
        )}
        {authError ? <p className={styles.authError}>{authError}</p> : null}
      </div>
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
