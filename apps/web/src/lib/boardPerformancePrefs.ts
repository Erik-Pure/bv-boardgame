const STORAGE_PAN = "bv.boardPanEnabled";
const STORAGE_ANIM = "bv.boardAnimationsEnabled";
const STORAGE_PREVENT_SLEEP = "bv.boardPreventSleepEnabled";

export const BOARD_PERF_PREFS_EVENT = "bv-board-performance-prefs";

export type BoardPerformancePrefs = {
  boardPanEnabled: boolean;
  boardAnimationsEnabled: boolean;
  /** Skärmlås / “inaktivera sömnläge” i bordsvyn — sparas mellan matcher. */
  preventSleepEnabled: boolean;
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
    preventSleepEnabled: readBool(STORAGE_PREVENT_SLEEP, false),
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

export function writeBoardPreventSleepEnabled(value: boolean): void {
  writeBool(STORAGE_PREVENT_SLEEP, value);
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
