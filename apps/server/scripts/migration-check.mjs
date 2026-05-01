#!/usr/bin/env node
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { loadRoomSnapshot, saveRoomSnapshot } from "../dist/roomPersistence.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  const fixturePath = path.join(__dirname, "fixtures", "snapshot-v1.json");
  const fixtureRaw = await readFile(fixturePath, "utf8");
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "bv-snapshot-migration-"));
  const snapshotPath = path.join(tempDir, "rooms.json");
  try {
    await writeFile(snapshotPath, fixtureRaw, "utf8");
    const loaded = await loadRoomSnapshot(snapshotPath);
    assert(Array.isArray(loaded) && loaded.length === 1, "expected one migrated room from v1 fixture");

    await saveRoomSnapshot(snapshotPath, loaded);
    const reloaded = await loadRoomSnapshot(snapshotPath);
    assert(reloaded.length === 1, "expected one room after save->reload");
    assert(reloaded[0]?.code === loaded[0]?.code, "room code mismatch after migration roundtrip");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
  console.log("migration-check ok");
}

run().catch((err) => {
  console.error("migration-check failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
