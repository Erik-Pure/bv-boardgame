import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArcadeButton } from "../components/ArcadeButton";
import { useUiStrings } from "../lib/locale/LocaleContext";
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
  const ui = useUiStrings();
  const a = ui.app;
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
        setAuthError(a.loginErrorReadStatus);
      } else {
        setAuthState(json);
      }
    } catch {
      setAuthState(null);
      setAuthError(a.loginErrorReachServer);
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
      setAuthError(a.loginErrorInvalidEmail);
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
        setAuthError(a.loginErrorSendCode);
        return;
      }
      setOtpRequested(true);
    } catch {
      setAuthError(a.loginErrorSendCode);
    } finally {
      setOtpBusy(false);
    }
  };

  const verifyOtp = async () => {
    const email = otpEmail.trim().toLowerCase();
    const code = otpCode.trim();
    if (!email || !code) {
      setAuthError(a.loginErrorMissingFields);
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
        setAuthError(a.loginErrorBadCode);
        return;
      }
      setOtpRequested(false);
      await refreshAuth();
    } catch {
      setAuthError(a.loginErrorVerify);
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
      setAuthError(a.loginErrorLogout);
    } finally {
      setOtpBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{a.loginTitle}</h1>
        {authLoading ? (
          <p className={styles.subtle}>{a.loginReadingStatus}</p>
        ) : authState?.authenticated ? (
          <>
            <p className={styles.subtle}>
              {a.loginLoggedInPrefix} <b>{authState.user.displayName}</b> ({authState.user.email}) ·{" "}
              {a.loginLoggedInTier(authState.entitlement?.tier ?? "free")}
            </p>
            <div className={styles.actions}>
              <ArcadeButton variant="gray" size="sm" fullWidth={false} onClick={logout} disabled={otpBusy}>
                {a.loginLogout}
              </ArcadeButton>
            </div>
          </>
        ) : (
          <>
            <p className={styles.subtle}>{a.loginLead}</p>
            <div className={styles.fields}>
              <input
                className={styles.input}
                type="email"
                placeholder={a.loginEmailPlaceholder}
                value={otpEmail}
                onChange={(e) => setOtpEmail(e.target.value)}
              />
              <input
                className={styles.input}
                type="text"
                inputMode="numeric"
                placeholder={a.loginCodePlaceholder}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />
            </div>
            <div className={styles.actions}>
              <ArcadeButton variant="gray" size="sm" fullWidth={false} onClick={requestOtp} disabled={otpBusy}>
                {a.loginSendCode}
              </ArcadeButton>
              <ArcadeButton variant="pink" size="sm" fullWidth={false} onClick={verifyOtp} disabled={otpBusy}>
                {a.loginVerifyCode}
              </ArcadeButton>
              <a className={styles.googleLink} href="/auth/google/start">
                {a.loginGoogle}
              </a>
            </div>
            {otpRequested ? <p className={styles.subtle}>{a.loginCodeSent}</p> : null}
          </>
        )}
        {authError ? <p className={styles.error}>{authError}</p> : null}
        <p className={styles.backRow}>
          <Link to="/" className={styles.backLink}>
            {a.loginHomeLink}
          </Link>
        </p>
      </div>
    </div>
  );
}
