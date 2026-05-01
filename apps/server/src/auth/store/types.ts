export type EntitlementTier = "free" | "pass_24h" | "lifetime";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  googleSub?: string;
  createdAt: number;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: number;
  createdAt: number;
}

export interface OtpChallenge {
  email: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  requestedAt: number;
}

export interface Entitlement {
  userId: string;
  tier: EntitlementTier;
  validUntil: number | null;
  source: string;
}

export interface UsageCounter {
  userId: string;
  weekKey: string;
  hostedGamesStarted: number;
}

export interface OauthState {
  state: string;
  redirectTo?: string;
  expiresAt: number;
}

export interface AuthStore {
  getUserById(userId: string): Promise<AuthUser | null>;
  findUserByEmail(email: string): Promise<AuthUser | null>;
  findUserByGoogleSub(googleSub: string): Promise<AuthUser | null>;
  createUser(input: { email: string; displayName: string; googleSub?: string }): Promise<AuthUser>;
  updateUser(user: AuthUser): Promise<void>;

  saveSession(input: { userId: string; expiresAt: number }): Promise<AuthSession>;
  getSession(sessionId: string): Promise<AuthSession | null>;
  deleteSession(sessionId: string): Promise<void>;

  saveOtpChallenge(challenge: OtpChallenge): Promise<void>;
  getOtpChallenge(email: string): Promise<OtpChallenge | null>;
  consumeOtpChallenge(email: string): Promise<void>;

  saveOauthState(input: OauthState): Promise<void>;
  consumeOauthState(state: string): Promise<OauthState | null>;

  getEntitlement(userId: string): Promise<Entitlement | null>;
  setEntitlement(entry: Entitlement): Promise<void>;
  incrementWeeklyUsage(userId: string, weekKey: string): Promise<UsageCounter>;
}
