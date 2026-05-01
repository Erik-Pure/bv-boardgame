import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { FileAuthStore } from "./store/fileStore.js";
import type { AuthStore, AuthUser, EntitlementTier } from "./store/types.js";

export interface AuthConfig {
  storeDriver: "file";
  storePath: string;
  sessionCookieName: string;
  sessionTtlMs: number;
  otpTtlMs: number;
  otpMaxAttempts: number;
  otpTestCode: string;
  otpDevLog: boolean;
  resendApiKey: string;
  resendFromEmail: string;
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
}

export interface AuthSessionView {
  userId: string;
  sessionId: string;
  email: string;
  displayName: string;
}

function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function randomCode6(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function displayNameFromEmail(email: string): string {
  const base = email.split("@")[0]?.trim() || "Spelare";
  return base.slice(0, 24);
}

export class AuthService {
  private readonly store: AuthStore;
  private readonly cfg: AuthConfig;

  constructor(cfg: AuthConfig) {
    this.cfg = cfg;
    this.store = new FileAuthStore(cfg.storePath);
  }

  cookieName(): string {
    return this.cfg.sessionCookieName;
  }

  async requestOtp(email: string): Promise<void> {
    const clean = normEmail(email);
    const code = this.cfg.otpTestCode || randomCode6();
    const challenge = {
      email: clean,
      codeHash: hashCode(code),
      expiresAt: Date.now() + this.cfg.otpTtlMs,
      attempts: 0,
      requestedAt: Date.now(),
    };
    await this.store.saveOtpChallenge(challenge);
    if (this.cfg.otpDevLog) {
      console.log("[auth] OTP code", { email: clean, code });
      return;
    }
    if (!this.cfg.resendApiKey || !this.cfg.resendFromEmail) {
      return;
    }
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.cfg.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.cfg.resendFromEmail,
        to: clean,
        subject: "Din inloggningskod",
        text: `Din kod är ${code}. Gäller i 10 minuter.`,
      }),
    });
  }

  async verifyOtp(email: string, code: string): Promise<{ sessionId: string; user: AuthUser } | null> {
    const clean = normEmail(email);
    const ch = await this.store.getOtpChallenge(clean);
    if (!ch || ch.expiresAt < Date.now()) return null;
    if (ch.attempts >= this.cfg.otpMaxAttempts) return null;

    const expected = Buffer.from(ch.codeHash, "hex");
    const got = Buffer.from(hashCode(code.trim()), "hex");
    if (expected.length !== got.length || !timingSafeEqual(expected, got)) {
      await this.store.saveOtpChallenge({ ...ch, attempts: ch.attempts + 1 });
      return null;
    }
    await this.store.consumeOtpChallenge(clean);

    let user = await this.store.findUserByEmail(clean);
    if (!user) {
      user = await this.store.createUser({ email: clean, displayName: displayNameFromEmail(clean) });
    }
    const session = await this.store.saveSession({ userId: user.id, expiresAt: Date.now() + this.cfg.sessionTtlMs });
    return { sessionId: session.id, user };
  }

  async getSession(sessionId: string): Promise<AuthSessionView | null> {
    if (!sessionId) return null;
    const session = await this.store.getSession(sessionId);
    if (!session) return null;
    const user = await this.findUserById(session.userId);
    if (!user) return null;
    return {
      userId: user.id,
      sessionId: session.id,
      email: user.email,
      displayName: user.displayName,
    };
  }

  async logout(sessionId: string): Promise<void> {
    if (!sessionId) return;
    await this.store.deleteSession(sessionId);
  }

  async createGoogleState(redirectTo?: string): Promise<string> {
    const state = randomBytes(18).toString("base64url");
    await this.store.saveOauthState({ state, redirectTo, expiresAt: Date.now() + 10 * 60_000 });
    return state;
  }

  googleAuthUrl(state: string): string {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", this.cfg.googleClientId);
    url.searchParams.set("redirect_uri", this.cfg.googleRedirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "select_account");
    return String(url);
  }

  async handleGoogleCallback(input: { code: string; state: string }): Promise<{ sessionId: string; user: AuthUser } | null> {
    const saved = await this.store.consumeOauthState(input.state);
    if (!saved || saved.expiresAt < Date.now()) return null;
    if (!this.cfg.googleClientId || !this.cfg.googleClientSecret || !this.cfg.googleRedirectUri) return null;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: input.code,
        client_id: this.cfg.googleClientId,
        client_secret: this.cfg.googleClientSecret,
        redirect_uri: this.cfg.googleRedirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return null;
    const tokenJson = (await tokenRes.json()) as { id_token?: string; access_token?: string };
    if (!tokenJson.id_token) return null;
    const payload = parseJwtPayload(tokenJson.id_token);
    const sub = String(payload.sub ?? "");
    const email = normEmail(String(payload.email ?? ""));
    if (!sub || !email) return null;

    let user = (await this.store.findUserByGoogleSub(sub)) ?? (await this.store.findUserByEmail(email));
    if (!user) {
      user = await this.store.createUser({
        email,
        displayName: String(payload.name ?? displayNameFromEmail(email)).slice(0, 24),
        googleSub: sub,
      });
    } else if (!user.googleSub) {
      user.googleSub = sub;
      await this.store.updateUser(user);
    }

    const session = await this.store.saveSession({ userId: user.id, expiresAt: Date.now() + this.cfg.sessionTtlMs });
    return { sessionId: session.id, user };
  }

  async resolveEntitlement(userId: string): Promise<{ tier: EntitlementTier; validUntil: number | null }> {
    const entry = await this.store.getEntitlement(userId);
    if (!entry) return { tier: "free", validUntil: null };
    return { tier: entry.tier, validUntil: entry.validUntil };
  }

  private async findUserById(userId: string): Promise<AuthUser | null> {
    return this.store.getUserById(userId);
  }
}

function parseJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length < 2) return {};
  try {
    const payload = Buffer.from(parts[1]!, "base64url").toString("utf8");
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function resolveAuthConfigFromEnv(): AuthConfig {
  const nodeEnv = (process.env.NODE_ENV ?? "").toLowerCase();
  const isProd = nodeEnv === "production";
  const explicitTestCode = process.env.AUTH_TEST_OTP_CODE?.trim() || "";
  return {
    storeDriver: "file",
    storePath: process.env.AUTH_STORE_PATH?.trim() || "./.data/auth-store.json",
    sessionCookieName: process.env.AUTH_SESSION_COOKIE?.trim() || "bv_session",
    sessionTtlMs: Number(process.env.AUTH_SESSION_TTL_MS ?? 30 * 24 * 60 * 60 * 1000),
    otpTtlMs: Number(process.env.AUTH_OTP_TTL_MS ?? 10 * 60 * 1000),
    otpMaxAttempts: Number(process.env.AUTH_OTP_MAX_ATTEMPTS ?? 5),
    otpTestCode: explicitTestCode || (isProd ? "" : "123456"),
    otpDevLog: (process.env.AUTH_DEV_OTP_LOG ?? "false").toLowerCase() === "true",
    resendApiKey: process.env.RESEND_API_KEY?.trim() || "",
    resendFromEmail: process.env.RESEND_FROM_EMAIL?.trim() || "",
    googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || "",
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || "",
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI?.trim() || "",
  };
}
