import { promises as fs } from "node:fs";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import type {
  AnalyticsEvent,
  GameEndedEvent,
  GameEndedOutcome,
  GameStartedEvent,
} from "./types.js";

interface AnalyticsFileData {
  version: number;
  events: AnalyticsEvent[];
}

const FILE_VERSION = 1;
/** Keep roughly 90 days of events to bound file size. */
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export class FileAnalyticsStore {
  private readonly filePath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private async readData(): Promise<AnalyticsFileData> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<AnalyticsFileData>;
      return {
        version: FILE_VERSION,
        events: Array.isArray(parsed.events) ? (parsed.events as AnalyticsEvent[]) : [],
      };
    } catch {
      return { version: FILE_VERSION, events: [] };
    }
  }

  private async writeData(data: AnalyticsFileData): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data), "utf8");
    await fs.rename(tmp, this.filePath);
  }

  private async mutate<T>(fn: (data: AnalyticsFileData) => T | Promise<T>): Promise<T> {
    let result!: T;
    this.writeQueue = this.writeQueue.then(async () => {
      const data = await this.readData();
      const cutoff = Date.now() - RETENTION_MS;
      data.events = data.events.filter((e) => typeof e?.at === "number" && e.at >= cutoff);
      result = await fn(data);
      await this.writeData(data);
    });
    await this.writeQueue;
    return result;
  }

  async listEvents(): Promise<AnalyticsEvent[]> {
    const data = await this.readData();
    const cutoff = Date.now() - RETENTION_MS;
    return data.events.filter((e) => typeof e?.at === "number" && e.at >= cutoff);
  }

  async recordGameStarted(input: {
    roomCode: string;
    matchId: string;
    playerNames: string[];
    hostUserId?: string;
    at?: number;
  }): Promise<GameStartedEvent> {
    return this.mutate((data) => {
      const event: GameStartedEvent = {
        id: uuidv4(),
        type: "game_started",
        at: input.at ?? Date.now(),
        roomCode: input.roomCode,
        matchId: input.matchId,
        playerCount: input.playerNames.length,
        playerNames: input.playerNames,
        ...(input.hostUserId ? { hostUserId: input.hostUserId } : {}),
      };
      data.events.push(event);
      return event;
    });
  }

  async recordGameEnded(input: {
    roomCode: string;
    matchId: string;
    playerNames: string[];
    outcome: GameEndedOutcome;
    durationMs?: number;
    at?: number;
  }): Promise<GameEndedEvent> {
    return this.mutate((data) => {
      const already = data.events.some(
        (e) => e.type === "game_ended" && e.matchId === input.matchId,
      );
      if (already) {
        return data.events.find(
          (e) => e.type === "game_ended" && e.matchId === input.matchId,
        ) as GameEndedEvent;
      }
      const event: GameEndedEvent = {
        id: uuidv4(),
        type: "game_ended",
        at: input.at ?? Date.now(),
        roomCode: input.roomCode,
        matchId: input.matchId,
        playerCount: input.playerNames.length,
        playerNames: input.playerNames,
        outcome: input.outcome,
        ...(typeof input.durationMs === "number" ? { durationMs: input.durationMs } : {}),
      };
      data.events.push(event);
      return event;
    });
  }
}

let sharedStore: FileAnalyticsStore | null = null;

export function getAnalyticsStore(): FileAnalyticsStore {
  if (!sharedStore) {
    const filePath = process.env.ANALYTICS_PATH?.trim() || "./.data/analytics.json";
    sharedStore = new FileAnalyticsStore(filePath);
  }
  return sharedStore;
}

/** Test helper — reset singleton between unit-style checks if needed. */
export function setAnalyticsStoreForTests(store: FileAnalyticsStore | null): void {
  sharedStore = store;
}
