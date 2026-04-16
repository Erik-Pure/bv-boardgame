import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

type Format = "webp" | "avif";

const ROOT = path.resolve(process.cwd());
const PUBLIC_DIR = path.join(ROOT, "apps/web/public");

const TARGET_DIRS = [
  "monsters",
  "event",
  "items",
  "equipment",
] as const;

const FORMATS: { format: Format; ext: string; options: any }[] = [
  { format: "webp", ext: "webp", options: { quality: 78 } },
  { format: "avif", ext: "avif", options: { quality: 55 } },
];

async function listPngFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listPngFiles(p)));
    else if (e.isFile() && e.name.toLowerCase().endsWith(".png")) out.push(p);
  }
  return out;
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function convertFile(srcAbs: string, format: Format, destAbs: string, options: any) {
  const img = sharp(srcAbs, { failOn: "none" });
  if (format === "webp") await img.webp(options).toFile(destAbs);
  else await img.avif(options).toFile(destAbs);
}

async function main() {
  const jobs: Promise<void>[] = [];
  for (const d of TARGET_DIRS) {
    const dirAbs = path.join(PUBLIC_DIR, d);
    const files = await listPngFiles(dirAbs);
    for (const srcAbs of files) {
      const baseNoExt = srcAbs.slice(0, -".png".length);
      for (const f of FORMATS) {
        const destAbs = `${baseNoExt}.${f.ext}`;
        if (await exists(destAbs)) continue;
        jobs.push(convertFile(srcAbs, f.format, destAbs, f.options));
      }
    }
  }
  await Promise.all(jobs);
  // eslint-disable-next-line no-console
  console.log(`Optimized ${jobs.length} outputs under ${path.relative(ROOT, PUBLIC_DIR)}/`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});

