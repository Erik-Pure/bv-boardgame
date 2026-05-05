import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArcadeButton } from "../components/ArcadeButton";
import styles from "./Login.module.css";

const OTP_DEFAULT_CODE = "123456";

type AuthMe =
  | { ok: true; authenticated: false }
  | {
      ok: true;
      authenticated: true;
      user: { id: string; email: string; displayName: string };
      entitlement?: { tier?: string };
    };

export function Login() {
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

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Logga in</h1>
        {authLoading ? (
          <p className={styles.subtle}>Läser inloggningsstatus…</p>
        ) : authState?.authenticated ? (
          <>
            <p className={styles.subtle}>
              Inloggad som <b>{authState.user.displayName}</b> ({authState.user.email}) · Tier:{" "}
              {authState.entitlement?.tier ?? "free"}
            </p>
            <div className={styles.actions}>
              <ArcadeButton variant="gray" size="sm" fullWidth={false} onClick={logout} disabled={otpBusy}>
                Logga ut
              </ArcadeButton>
            </div>
          </>
        ) : (
          <>
            <p className={styles.subtle}>Logga in som host med OTP eller Google.</p>
            <div className={styles.fields}>
              <input
                className={styles.input}
                type="email"
                placeholder="E-post"
                value={otpEmail}
                onChange={(e) => setOtpEmail(e.target.value)}
              />
              <input
                className={styles.input}
                type="text"
                inputMode="numeric"
                placeholder="Kod (dev: 123456)"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />
            </div>
            <div className={styles.actions}>
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
            {otpRequested ? <p className={styles.subtle}>Kod skickad. Kontrollera e-post/logg och verifiera.</p> : null}
          </>
        )}
        {authError ? <p className={styles.error}>{authError}</p> : null}
        <p className={styles.backRow}>
          <Link to="/" className={styles.backLink}>
            Till startsidan
          </Link>
        </p>
      </div>
    </div>
  );
}
