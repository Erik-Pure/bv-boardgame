import { promises as fs } from "node:fs";
import path from "node:path";
import type { PersistedRoom } from "./rooms.js";

interface SnapshotFile {
  version: number;
  savedAt: number;
  rooms: PersistedRoom[];
}

const SNAPSHOT_VERSION = 1;

export async function loadRoomSnapshot(snapshotPath: string): Promise<PersistedRoom[]> {
  try {
    const raw = await fs.readFile(snapshotPath, "utf8");
    const parsed = JSON.parse(raw) as SnapshotFile;
    if (!parsed || !Array.isArray(parsed.rooms)) return [];
    return parsed.rooms;
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
