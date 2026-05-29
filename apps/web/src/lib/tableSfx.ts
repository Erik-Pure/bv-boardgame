/**
 * Bräd-SFX (/table only). Spelas från useTableSfxSync (via TableViewSfxSync) — aldrig från knappar/UI.
 * Klunk spelas på mobil vid Skål (PlayView).
 *
 * Spelfiler: optimerade MP3 i public/sfx/ (npm run optimize:sfx). Käll-WAV: apps/web/sfx-source/.
 * Uppspelning köas globalt så t.ex. gå → landning → kort inte krockar.
 */
export type TableSfxId =
  | "dieRoll"
  | "klunk"
  | "cardFlip"
  | "levelUp"
  | "event"
  | "eventTile"
  | "item"
  | "roll"
  | "badBatch"
  | "lose"
  | "cans";

/** Alla ids med färdiga filer under public/sfx/. */
export const TABLE_SFX_PLAYABLE_IDS = [
  "dieRoll",
  "klunk",
  "cardFlip",
  "levelUp",
  "event",
  "eventTile",
  "item",
  "roll",
  "badBatch",
  "lose",
  "cans",
] as const satisfies readonly TableSfxId[];

const TABLE_SFX_VOLUME = 0.62;

const TABLE_SFX_SRC: Record<TableSfxId, string | readonly string[]> = {
  /** Stridstärning (combatRoll mot monster): slump dieroll1–3 */
  dieRoll: ["/sfx/dieroll1.mp3", "/sfx/dieroll2.mp3", "/sfx/dieroll3.mp3"],
  /** Straffklunk: endast vid Skål i sip-modalen på mobil (/play) */
  klunk: ["/sfx/klunk1.mp3", "/sfx/klunk2.mp3"],
  /** Nytt skattkort på brädet (pending.kind === treasure) */
  cardFlip: "/sfx/cardflip.mp3",
  /** Bryggnivå upp (visad nivå ökar) och vinst mot dålig batch (`combat_win` på brädet) */
  levelUp: "/sfx/levelup.mp3",
  /** Händelsekort på brädet (modal) om landningsljud inte redan spelats */
  event: "/sfx/event.mp3",
  /** Landning på händelse- eller skattruta (efter chooseMove): slump event1–4 */
  eventTile: ["/sfx/event1.mp3", "/sfx/event2.mp3", "/sfx/event3.mp3", "/sfx/event4.mp3"],
  /** Föremål spelas (solfjäder / stridsreaktion): slump item1–3 */
  item: ["/sfx/item1.mp3", "/sfx/item2.mp3", "/sfx/item3.mp3"],
  /** Rörelsetärning (rollMove) och val av riktning (chooseMove): slump roll1–7 */
  roll: [
    "/sfx/roll1.mp3",
    "/sfx/roll2.mp3",
    "/sfx/roll3.mp3",
    "/sfx/roll4.mp3",
    "/sfx/roll5.mp3",
    "/sfx/roll6.mp3",
    "/sfx/roll7.mp3",
  ],
  /** Dålig batch / monster möts (ny strid enemyIntro på brädet): slump badbatch1–3 */
  badBatch: ["/sfx/badbatch1.mp3", "/sfx/badbatch2.mp3", "/sfx/badbatch3.mp3"],
  /** Förlust mot dålig batch / monster (`combat_lose` på brädet) */
  lose: "/sfx/lose.m4a",
  /** Panta burkar (`chooseMerchant` eller landning på affärsruta): slump cans1–4 */
  cans: ["/sfx/cans1.mp3", "/sfx/cans2.mp3", "/sfx/cans3.mp3", "/sfx/cans4.mp3"],
};

const preloadCache = new Map<string, HTMLAudioElement>();

const playQueue: TableSfxId[] = [];
let drainPromise: Promise<void> | null = null;

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function resolveSrc(id: TableSfxId): string {
  const entry = TABLE_SFX_SRC[id];
  if (typeof entry === "string") return entry;
  return pickRandom(entry);
}

function warmPreload(src: string): void {
  if (preloadCache.has(src)) return;
  const audio = new Audio(src);
  audio.preload = "auto";
  preloadCache.set(src, audio);
}

function playSrcAndWait(src: string): Promise<void> {
  warmPreload(src);
  return new Promise((resolve) => {
    const audio = new Audio(src);
    audio.volume = TABLE_SFX_VOLUME;
    const finish = () => {
      audio.removeEventListener("ended", finish);
      audio.removeEventListener("error", finish);
      resolve();
    };
    audio.addEventListener("ended", finish);
    audio.addEventListener("error", finish);
    void audio.play().catch(finish);
  });
}

async function drainPlayQueue(): Promise<void> {
  while (playQueue.length > 0) {
    const id = playQueue.shift()!;
    const src = resolveSrc(id);
    await playSrcAndWait(src);
  }
}

function scheduleDrain(): void {
  if (drainPromise) return;
  drainPromise = drainPlayQueue().finally(() => {
    drainPromise = null;
    if (playQueue.length > 0) scheduleDrain();
  });
}

/** Töm väntande ljud (t.ex. vid rum-/fas-byte). Pågående one-shot spelas klart. */
export function clearTableSfxQueue(): void {
  playQueue.length = 0;
}

export function playTableSfx(id: TableSfxId, options: { enabled: boolean }): void {
  if (!options.enabled) return;
  if (typeof window === "undefined") return;

  playQueue.push(id);
  scheduleDrain();
}
