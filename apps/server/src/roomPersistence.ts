import { promises as fs } from "node:fs";
import path from "node:path";
import type { PersistedRoom } from "./rooms.js";

interface SnapshotFile {
  version: number;
  savedAt: number;
  rooms: PersistedRoom[];
}

interface UnknownSnapshotFile {
  version?: unknown;
  savedAt?: unknown;
  rooms?: unknown;
}

const SNAPSHOT_VERSION = 2;

function normalizeRooms(value: unknown): PersistedRoom[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const row = entry as Record<string, unknown>;
    return typeof row.code === "string" && typeof row.state === "object" && row.state != null;
  }) as PersistedRoom[];
}

export function migrateSnapshot(fromVersion: number, raw: UnknownSnapshotFile): SnapshotFile | null {
  const safeSavedAt = typeof raw.savedAt === "number" && Number.isFinite(raw.savedAt) ? raw.savedAt : Date.now();
  if (fromVersion <= 1) {
    return {
      version: SNAPSHOT_VERSION,
      savedAt: safeSavedAt,
      rooms: normalizeRooms(raw.rooms),
    };
  }
  return null;
}

export async function loadRoomSnapshot(snapshotPath: string): Promise<PersistedRoom[]> {
  try {
    const raw = await fs.readFile(snapshotPath, "utf8");
    const parsed = JSON.parse(raw) as UnknownSnapshotFile;
    if (!parsed || typeof parsed !== "object") return [];
    const versionRaw = parsed.version;
    const version = typeof versionRaw === "number" && Number.isInteger(versionRaw) ? versionRaw : 1;
    if (version === SNAPSHOT_VERSION) {
      return normalizeRooms(parsed.rooms);
    }
    const migrated = migrateSnapshot(version, parsed);
    if (!migrated) return [];
    return migrated.rooms;
  } catch {
    return [];
  }
}

export async function saveRoomSnapshot(snapshotPath: string, rooms: PersistedRoom[]): Promise<void> {
  const dir = path.dirname(snapshotPath);
  await fs.mkdir(dir, { recursive: true });
  const payload: SnapshotFile = {
    version: SNAPSHOT_VERSION,
    savedAt: Date.now(),
    rooms,
  };
  const tmpPath = `${snapshotPath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(payload), "utf8");
  await fs.rename(tmpPath, snapshotPath);
}
