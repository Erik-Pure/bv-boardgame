const STORAGE_PAN = "bv.boardPanEnabled";
const STORAGE_ANIM = "bv.boardAnimationsEnabled";
const STORAGE_TOKEN_ANIM = "bv.tokenMoveAnimationsEnabled";
const STORAGE_PREVENT_SLEEP = "bv.boardPreventSleepEnabled";
const STORAGE_SFX = "bv.boardSfxEnabled";
const STORAGE_MOBILE_SFX = "bv.mobileSfxEnabled";

export const BOARD_PERF_PREFS_EVENT = "bv-board-performance-prefs";

export type BoardPerformancePrefs = {
  boardPanEnabled: boolean;
  boardAnimationsEnabled: boolean;
  tokenMoveAnimationsEnabled: boolean;
  /** Skärmlås / “inaktivera sömnläge” i bordsvyn — sparas mellan matcher. */
  preventSleepEnabled: boolean;
  /** Ljudeffekter på brädet (tärning, klunk, kort m.m.). */
  boardSfxEnabled: boolean;
  /** Ljudeffekter på mobil (/play) — lägre latens vid spel mot bräd. */
  mobileSfxEnabled: boolean;
};

function readBool(key: string, defaultValue: boolean): boolean {
  if (typeof window === "undefined") return defaultValue;
  try {
    const v = window.localStorage.getItem(key);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
    // ignore
  }
  return defaultValue;
}

export function readBoardPerformancePrefs(): BoardPerformancePrefs {
  return {
    boardPanEnabled: readBool(STORAGE_PAN, true),
    boardAnimationsEnabled: readBool(STORAGE_ANIM, true),
    tokenMoveAnimationsEnabled: readBool(STORAGE_TOKEN_ANIM, true),
    preventSleepEnabled: readBool(STORAGE_PREVENT_SLEEP, false),
    boardSfxEnabled: readBool(STORAGE_SFX, false),
    mobileSfxEnabled: readBool(STORAGE_MOBILE_SFX, true),
  };
}

function writeBool(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(BOARD_PERF_PREFS_EVENT));
}

export function writeBoardPanEnabled(value: boolean): void {
  writeBool(STORAGE_PAN, value);
}

export function writeBoardAnimationsEnabled(value: boolean): void {
  writeBool(STORAGE_ANIM, value);
}

export function writeTokenMoveAnimationsEnabled(value: boolean): void {
  writeBool(STORAGE_TOKEN_ANIM, value);
}

export function writeBoardPreventSleepEnabled(value: boolean): void {
  writeBool(STORAGE_PREVENT_SLEEP, value);
}

export function writeBoardSfxEnabled(value: boolean): void {
  writeBool(STORAGE_SFX, value);
}

export function writeMobileSfxEnabled(value: boolean): void {
  writeBool(STORAGE_MOBILE_SFX, value);
}

export function subscribeBoardPerformancePrefs(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => onChange();
  window.addEventListener(BOARD_PERF_PREFS_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(BOARD_PERF_PREFS_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
