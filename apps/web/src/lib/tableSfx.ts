import { isLitePerformanceActive } from "./boardPerformancePrefs";

/**
 * Spel-SFX på mobil (/play). Triggas från useGameSfxSync via usePlaySfxSync.
 * Klunk spelas vid Skål i sip-modalen.
 *
 * Spelfiler: optimerade MP3 i public/sfx/ (npm run optimize:sfx). Käll-WAV: apps/web/sfx-source/.
 * Uppspelning köas sekventiellt. `event` / `eventTile` (efter cardflip) avbryts av senare spelljud.
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
  | "gameover"
  | "cans"
  | "playerTurn";

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
  "gameover",
  "cans",
  "playerTurn",
] as const satisfies readonly TableSfxId[];

const TABLE_SFX_VOLUME = 0.62;

/** Långa landnings-/kortljud — ersätts när spelet går vidare (tärning, föremål, strid …). */
const EVENT_INTERRUPTABLE_IDS = new Set<TableSfxId>(["event", "eventTile"]);

const TABLE_SFX_SRC: Record<TableSfxId, string | readonly string[]> = {
  /** Stridstärning (combatRoll mot monster): slump dieroll1–3 */
  dieRoll: ["/sfx/dieroll1.mp3", "/sfx/dieroll2.mp3", "/sfx/dieroll3.mp3"],
  /** Straffklunk: endast vid Skål i sip-modalen på mobil (/play) */
  klunk: ["/sfx/klunk1.mp3", "/sfx/klunk2.mp3"],
  /** Vila / händelse / skatt / monster-intro: när kort-overlay fade:ar in (före eventTile, event, badBatch) */
  cardFlip: "/sfx/cardflip.mp3",
  /** Bryggnivå upp, vinst mot dålig batch (`combat_win`) och BvB-rondvinst: slump levelup1-2 */
  levelUp: ["/sfx/levelup.mp3", "/sfx/levelup2.mp3"],
  /** Händelsekort på brädet (modal) om landningsljud inte redan spelats */
  event: "/sfx/event.mp3",
  /** Landning på händelse- eller skattruta (efter cardflip): slump event1–4 */
  eventTile: ["/sfx/event1.mp3", "/sfx/event2.mp3", "/sfx/event3.mp3", "/sfx/event4.mp3"],
  /** Föremål på egen spelare (solfjäder / stridsreaktion): slump item1–3 */
  item: ["/sfx/item1.mp3", "/sfx/item2.mp3", "/sfx/item3.mp3"],
  /** Rörelsetärning (rollMove): slump roll1–7 */
  roll: [
    "/sfx/roll1.mp3",
    "/sfx/roll2.mp3",
    "/sfx/roll3.mp3",
    "/sfx/roll4.mp3",
    "/sfx/roll5.mp3",
    "/sfx/roll6.mp3",
    "/sfx/roll7.mp3",
  ],
  /** Dålig batch efter cardflip vid monster-intro (enemyIntro), som eventTile på händelse/skatt */
  badBatch: [
    "/sfx/badbatch1.mp3",
    "/sfx/badbatch2.mp3",
    "/sfx/badbatch3.mp3",
    "/sfx/badbatch4.mp3",
  ],
  /** Förlust mot dålig batch / monster (`combat_lose`) och BvB-rondförlust: slump lose1-3 */
  lose: ["/sfx/lose.m4a", "/sfx/lose2.mp3", "/sfx/lose3.mp3"],
  /** Egen död (`brewerDown`) när game over-modalen öppnas. */
  gameover: "/sfx/gameover.mp3",
  /** Panta burkar (`chooseMerchant` eller landning på affärsruta): slump cans1–4 */
  cans: ["/sfx/cans1.mp3", "/sfx/cans2.mp3", "/sfx/cans3.mp3", "/sfx/cans4.mp3"],
  /** Början av en spelares tur */
  playerTurn: "/sfx/playerturn.mp3",
};

/** En `Audio` per fil — köad uppspelning väntar på `ended` så samma element räcker. */
const audioBySrc = new Map<string, HTMLAudioElement>();

const playQueue: TableSfxId[] = [];
let drainPromise: Promise<void> | null = null;

let activeAudio: HTMLAudioElement | null = null;
let activeId: TableSfxId | null = null;
let activeDone: (() => void) | null = null;

let sfxPrimed = false;
let skipNextServerRollSfx = false;
let skipNextServerRollTimer: number | null = null;

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function resolveSrc(id: TableSfxId): string {
  const entry = TABLE_SFX_SRC[id];
  if (typeof entry === "string") return entry;
  return pickRandom(entry);
}

function allSfxSrcPaths(): string[] {
  const paths = new Set<string>();
  for (const entry of Object.values(TABLE_SFX_SRC)) {
    if (typeof entry === "string") paths.add(entry);
    else for (const src of entry) paths.add(src);
  }
  return [...paths];
}

function getOrCreateAudio(src: string): HTMLAudioElement {
  let audio = audioBySrc.get(src);
  if (!audio) {
    audio = new Audio(src);
    audio.preload = isLitePerformanceActive() ? "none" : "auto";
    audioBySrc.set(src, audio);
  }
  return audio;
}

/** Ladda/dekoda alla SFX (anropas vid första användartryck). */
export function primeTableSfx(): void {
  if (typeof window === "undefined" || sfxPrimed || isLitePerformanceActive()) return;
  sfxPrimed = true;
  for (const src of allSfxSrcPaths()) {
    const audio = getOrCreateAudio(src);
    try {
      audio.load();
    } catch {
      /* ignore */
    }
  }
}

function clearOptimisticRollSkip(): void {
  skipNextServerRollSfx = false;
  if (skipNextServerRollTimer != null) {
    window.clearTimeout(skipNextServerRollTimer);
    skipNextServerRollTimer = null;
  }
}

/** Spela rörelsetärning direkt vid knapptryck; undvik dubbeltrigg när server-state kommer. */
export function playOptimisticMoveRollSfx(enabled: boolean): void {
  if (!enabled || typeof window === "undefined") return;
  primeTableSfx();
  skipNextServerRollSfx = true;
  if (skipNextServerRollTimer != null) window.clearTimeout(skipNextServerRollTimer);
  skipNextServerRollTimer = window.setTimeout(() => {
    skipNextServerRollSfx = false;
    skipNextServerRollTimer = null;
  }, 4000);
  playTableSfx("roll", { enabled: true });
}

/** Sant om optimistiskt rörelsetärningsljud redan spelats för senaste action. */
export function consumeOptimisticMoveRollSfx(): boolean {
  if (!skipNextServerRollSfx) return false;
  clearOptimisticRollSkip();
  return true;
}

function cancelActivePlayback(): void {
  const done = activeDone;
  const audio = activeAudio;
  activeDone = null;
  activeAudio = null;
  activeId = null;
  if (audio) {
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
  done?.();
}

/** Stoppa pågående/köade händelseljud så nästa spelljud kan ta över. */
function replaceInterruptibleEventSfx(): void {
  if (activeId && EVENT_INTERRUPTABLE_IDS.has(activeId)) {
    cancelActivePlayback();
  }
  for (let i = playQueue.length - 1; i >= 0; i--) {
    if (EVENT_INTERRUPTABLE_IDS.has(playQueue[i]!)) {
      playQueue.splice(i, 1);
    }
  }
}

function playSrcAndWait(src: string, id: TableSfxId): Promise<void> {
  const audio = getOrCreateAudio(src);
  audio.volume = TABLE_SFX_VOLUME;
  return new Promise((resolve) => {
    activeAudio = audio;
    activeId = id;

    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      audio.removeEventListener("ended", done);
      audio.removeEventListener("error", done);
      if (activeAudio === audio) {
        activeAudio = null;
        activeId = null;
        activeDone = null;
      }
      resolve();
    };

    activeDone = done;
    audio.addEventListener("ended", done);
    audio.addEventListener("error", done);
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      /* ignore */
    }
    void audio.play().catch(done);
  });
}

async function drainPlayQueue(): Promise<void> {
  while (playQueue.length > 0) {
    const id = playQueue.shift()!;
    const src = resolveSrc(id);
    await playSrcAndWait(src, id);
  }
}

function scheduleDrain(): void {
  if (drainPromise) return;
  drainPromise = drainPlayQueue().finally(() => {
    drainPromise = null;
    if (playQueue.length > 0) scheduleDrain();
  });
}

/** Töm väntande ljud (t.ex. vid rum-/fas-byte). Avbryter även pågående uppspelning. */
export function clearTableSfxQueue(): void {
  playQueue.length = 0;
  cancelActivePlayback();
  clearOptimisticRollSkip();
}

/** Överlever React Strict Mode-remount; nollställs vid rum-/fas-byte. */
const playedCombatIntroAudioKeys = new Set<string>();

/** En cardflip + badBatch per strid och enhet (returnerar false om redan spelat). */
export function tryClaimCombatIntroAudio(sessionKey: string): boolean {
  if (playedCombatIntroAudioKeys.has(sessionKey)) return false;
  playedCombatIntroAudioKeys.add(sessionKey);
  return true;
}

export function clearCombatIntroSfxKeys(): void {
  playedCombatIntroAudioKeys.clear();
}

export function playTableSfx(
  id: TableSfxId,
  options: { enabled: boolean; /** Spela parallellt utan kö (ovanligt). */ overlap?: boolean },
): void {
  if (!options.enabled) return;
  if (typeof window === "undefined") return;
  primeTableSfx();

  if (options.overlap) {
    void playSrcAndWait(resolveSrc(id), id);
    return;
  }

  if (!EVENT_INTERRUPTABLE_IDS.has(id)) {
    replaceInterruptibleEventSfx();
  }

  playQueue.push(id);
  scheduleDrain();
}
