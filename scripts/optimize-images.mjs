import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(process.cwd());
const PUBLIC_DIR = path.join(ROOT, "apps/web/public");

const TARGET_DIRS = ["monsters", "event", "items", "equipment"];

const FORMATS = [
  { format: "webp", ext: "webp", options: { quality: 78 } },
  { format: "avif", ext: "avif", options: { quality: 55 } },
];

async function listPngFiles(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listPngFiles(p)));
    else if (e.isFile() && e.name.toLowerCase().endsWith(".png")) out.push(p);
  }
  return out;
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function convertFile(srcAbs, format, destAbs, options) {
  const img = sharp(srcAbs, { failOn: "none" });
  if (format === "webp") await img.webp(options).toFile(destAbs);
  else await img.avif(options).toFile(destAbs);
}

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  const wantCheck = flags.has("--check");
  const wantWrite = flags.has("--write") || !wantCheck;
  return { wantCheck, wantWrite };
}

async function main() {
  const { wantCheck, wantWrite } = parseArgs(process.argv);
  const jobs = [];
  const missing = [];

  for (const d of TARGET_DIRS) {
    const dirAbs = path.join(PUBLIC_DIR, d);
    const files = await listPngFiles(dirAbs);
    for (const srcAbs of files) {
      const baseNoExt = srcAbs.slice(0, -".png".length);
      for (const f of FORMATS) {
        const destAbs = `${baseNoExt}.${f.ext}`;
        if (await exists(destAbs)) continue;
        const rel = path.relative(ROOT, destAbs);
        if (wantCheck) missing.push(rel);
        if (wantWrite) jobs.push(convertFile(srcAbs, f.format, destAbs, f.options));
      }
    }
  }

  if (wantCheck && missing.length > 0) {
    console.error(
      `Missing optimized images (${missing.length}). Run "npm run optimize:images" to generate them:\n` +
        missing.map((m) => `- ${m}`).join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  await Promise.all(jobs);
  console.log(`Optimized ${jobs.length} outputs under ${path.relative(ROOT, PUBLIC_DIR)}/`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

