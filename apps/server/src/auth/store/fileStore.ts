import { promises as fs } from "node:fs";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import type {
  AuthSession,
  AuthStore,
  AuthUser,
  Entitlement,
  OauthState,
  OtpChallenge,
  UsageCounter,
} from "./types.js";

interface FileStoreData {
  version: number;
  users: AuthUser[];
  sessions: AuthSession[];
  otpChallenges: OtpChallenge[];
  oauthStates: OauthState[];
  entitlements: Entitlement[];
  usageCounters: UsageCounter[];
}

const FILE_STORE_VERSION = 1;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class FileAuthStore implements AuthStore {
  private readonly filePath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private async readData(): Promise<FileStoreData> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<FileStoreData>;
      return {
        version: FILE_STORE_VERSION,
        users: Array.isArray(parsed.users) ? parsed.users : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        otpChallenges: Array.isArray(parsed.otpChallenges) ? parsed.otpChallenges : [],
        oauthStates: Array.isArray(parsed.oauthStates) ? parsed.oauthStates : [],
        entitlements: Array.isArray(parsed.entitlements) ? parsed.entitlements : [],
        usageCounters: Array.isArray(parsed.usageCounters) ? parsed.usageCounters : [],
      };
    } catch {
      return {
        version: FILE_STORE_VERSION,
        users: [],
        sessions: [],
        otpChallenges: [],
        oauthStates: [],
        entitlements: [],
        usageCounters: [],
      };
    }
  }

  private async writeData(data: FileStoreData): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data), "utf8");
    await fs.rename(tmp, this.filePath);
  }

  private async mutate<T>(fn: (data: FileStoreData) => T | Promise<T>): Promise<T> {
    let result!: T;
    this.writeQueue = this.writeQueue.then(async () => {
      const data = await this.readData();
      const now = Date.now();
      data.sessions = data.sessions.filter((s) => s.expiresAt > now);
      data.otpChallenges = data.otpChallenges.filter((c) => c.expiresAt > now);
      data.oauthStates = data.oauthStates.filter((s) => s.expiresAt > now);
      result = await fn(data);
      await this.writeData(data);
    });
    await this.writeQueue;
    return result;
  }

  async findUserByEmail(email: string): Promise<AuthUser | null> {
    const want = normalizeEmail(email);
    const data = await this.readData();
    return data.users.find((u) => normalizeEmail(u.email) === want) ?? null;
  }

  async getUserById(userId: string): Promise<AuthUser | null> {
    const data = await this.readData();
    return data.users.find((u) => u.id === userId) ?? null;
  }

  async findUserByGoogleSub(googleSub: string): Promise<AuthUser | null> {
    const data = await this.readData();
    return data.users.find((u) => u.googleSub === googleSub) ?? null;
  }

  async createUser(input: { email: string; displayName: string; googleSub?: string }): Promise<AuthUser> {
    return this.mutate((data) => {
      const user: AuthUser = {
        id: uuidv4(),
        email: normalizeEmail(input.email),
        displayName: input.displayName.trim() || "Spelare",
        googleSub: input.googleSub,
        createdAt: Date.now(),
      };
      data.users.push(user);
      data.entitlements.push({ userId: user.id, tier: "free", validUntil: null, source: "default" });
      return user;
    });
  }

  async updateUser(user: AuthUser): Promise<void> {
    await this.mutate((data) => {
      const idx = data.users.findIndex((u) => u.id === user.id);
      if (idx >= 0) data.users[idx] = user;
    });
  }

  async saveSession(input: { userId: string; expiresAt: number }): Promise<AuthSession> {
    return this.mutate((data) => {
      const session: AuthSession = {
        id: uuidv4(),
        userId: input.userId,
        expiresAt: input.expiresAt,
        createdAt: Date.now(),
      };
      data.sessions.push(session);
      return session;
    });
  }

  async getSession(sessionId: string): Promise<AuthSession | null> {
    const data = await this.readData();
    const now = Date.now();
    const found = data.sessions.find((s) => s.id === sessionId) ?? null;
    if (!found || found.expiresAt <= now) return null;
    return found;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.mutate((data) => {
      data.sessions = data.sessions.filter((s) => s.id !== sessionId);
    });
  }

  async saveOtpChallenge(challenge: OtpChallenge): Promise<void> {
    await this.mutate((data) => {
      data.otpChallenges = data.otpChallenges.filter((c) => normalizeEmail(c.email) !== normalizeEmail(challenge.email));
      data.otpChallenges.push(challenge);
    });
  }

  async getOtpChallenge(email: string): Promise<OtpChallenge | null> {
    const want = normalizeEmail(email);
    const data = await this.readData();
    return data.otpChallenges.find((c) => normalizeEmail(c.email) === want) ?? null;
  }

  async consumeOtpChallenge(email: string): Promise<void> {
    const want = normalizeEmail(email);
    await this.mutate((data) => {
      data.otpChallenges = data.otpChallenges.filter((c) => normalizeEmail(c.email) !== want);
    });
  }

  async saveOauthState(input: OauthState): Promise<void> {
    await this.mutate((data) => {
      data.oauthStates = data.oauthStates.filter((x) => x.state !== input.state);
      data.oauthStates.push(input);
    });
  }

  async consumeOauthState(state: string): Promise<OauthState | null> {
    return this.mutate((data) => {
      const found = data.oauthStates.find((x) => x.state === state) ?? null;
      data.oauthStates = data.oauthStates.filter((x) => x.state !== state);
      return found;
    });
  }

  async getEntitlement(userId: string): Promise<Entitlement | null> {
    const data = await this.readData();
    const now = Date.now();
    const entry = data.entitlements.find((x) => x.userId === userId) ?? null;
    if (!entry) return null;
    if (entry.tier === "pass_24h" && entry.validUntil != null && entry.validUntil < now) {
      return { userId, tier: "free", validUntil: null, source: "expired_pass" };
    }
    return entry;
  }

  async setEntitlement(entry: Entitlement): Promise<void> {
    await this.mutate((data) => {
      data.entitlements = data.entitlements.filter((x) => x.userId !== entry.userId);
      data.entitlements.push(entry);
    });
  }

  async incrementWeeklyUsage(userId: string, weekKey: string): Promise<UsageCounter> {
    return this.mutate((data) => {
      const existing = data.usageCounters.find((x) => x.userId === userId && x.weekKey === weekKey);
      if (existing) {
        existing.hostedGamesStarted += 1;
        return existing;
      }
      const created: UsageCounter = { userId, weekKey, hostedGamesStarted: 1 };
      data.usageCounters.push(created);
      return created;
    });
  }
}
