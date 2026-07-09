/**
 * Genererar webboptimerade MP3 från käll-ljud i apps/web/sfx-source/ (WAV, OGG, MP3).
 * Utdata: apps/web/public/sfx/*.mp3 (det spelet laddar).
 *
 * Kräver ffmpeg i PATH (t.ex. brew install ffmpeg).
 *
 * Användning:
 *   npm run optimize:sfx          — skapa saknade .mp3 (hoppar över befintliga)
 *   npm run optimize:sfx:force    — skriv om alla .mp3 från källor
 *   npm run optimize:sfx:check    — CI: fail om källfil saknar motsvarande .mp3 i public/sfx
 */
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ROOT = path.resolve(process.cwd());
const SOURCE_DIR = path.join(ROOT, "apps/web/sfx-source");
const OUT_DIR = path.join(ROOT, "apps/web/public/sfx");

/** Mono, lägre sample rate — räcker för korta bräd-one-shots. */
const FFMPEG_ENCODE = {
  ac: "1",
  ar: "22050",
  codec: "libmp3lame",
  ba: "80k",
};

const SOURCE_EXTS = [".wav", ".ogg", ".mp3"];

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function listSourceFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "ENOENT") return out;
    throw e;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules") continue;
      out.push(...(await listSourceFiles(p)));
    } else if (e.isFile()) {
      const lower = e.name.toLowerCase();
      if (SOURCE_EXTS.some((ext) => lower.endsWith(ext))) out.push(p);
    }
  }
  return out;
}

function mp3PathForSource(srcAbs) {
  const rel = path.relative(SOURCE_DIR, srcAbs);
  const base = rel.replace(/\.(wav|ogg|mp3)$/i, "");
  return path.join(OUT_DIR, `${base}.mp3`);
}

async function ensureFfmpeg() {
  try {
    await execFileAsync("ffmpeg", ["-version"], { stdio: "ignore" });
  } catch {
    throw new Error(
      'ffmpeg hittades inte. Installera ffmpeg (t.ex. "brew install ffmpeg") och kör om.',
    );
  }
}

async function encodeToMp3(srcAbs, destAbs) {
  await fs.mkdir(path.dirname(destAbs), { recursive: true });
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    srcAbs,
    "-ac",
    FFMPEG_ENCODE.ac,
    "-ar",
    FFMPEG_ENCODE.ar,
    "-c:a",
    FFMPEG_ENCODE.codec,
    "-b:a",
    FFMPEG_ENCODE.ba,
    destAbs,
  ];
  await execFileAsync("ffmpeg", args);
}

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  const wantCheck = flags.has("--check");
  const wantWrite = flags.has("--write") || !wantCheck;
  const forceOverwrite = flags.has("--force") || flags.has("--overwrite");
  return { wantCheck, wantWrite, forceOverwrite };
}

async function main() {
  const { wantCheck, wantWrite, forceOverwrite } = parseArgs(process.argv);
  const sourceFiles = await listSourceFiles(SOURCE_DIR);
  const missing = [];
  const jobs = [];

  for (const srcAbs of sourceFiles) {
    const destAbs = mp3PathForSource(srcAbs);
    const destExists = await exists(destAbs);
    if (destExists && !forceOverwrite) continue;
    const rel = path.relative(ROOT, destAbs);
    if (wantCheck && !destExists) missing.push(rel);
    if (wantWrite) jobs.push({ srcAbs, destAbs });
  }

  if (sourceFiles.length === 0) {
    console.error(
      `No source audio in ${path.relative(ROOT, SOURCE_DIR)} (.wav / .ogg).`,
    );
    process.exitCode = 1;
    return;
  }

  if (wantCheck && missing.length > 0) {
    console.error(
      `Missing optimized SFX (${missing.length}). Run "npm run optimize:sfx" to generate them:\n` +
        missing.map((m) => `- ${m}`).join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  if (jobs.length === 0) {
    console.log(
      wantCheck
        ? `All ${sourceFiles.length} source file(s) in ${path.relative(ROOT, SOURCE_DIR)} have matching .mp3 in public/sfx.`
        : `Nothing to do (${sourceFiles.length} source(s); outputs exist — use optimize:sfx:force to overwrite).`,
    );
    return;
  }

  if (wantWrite) await ensureFfmpeg();

  let totalBytes = 0;
  for (const { srcAbs, destAbs } of jobs) {
    await encodeToMp3(srcAbs, destAbs);
    const st = await fs.stat(destAbs);
    totalBytes += st.size;
  }

  console.log(
    `Encoded ${jobs.length} MP3 → ${path.relative(ROOT, OUT_DIR)}/` +
      (forceOverwrite ? " (force overwrite)" : "") +
      ` — ${(totalBytes / 1024).toFixed(1)} KiB total output`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
