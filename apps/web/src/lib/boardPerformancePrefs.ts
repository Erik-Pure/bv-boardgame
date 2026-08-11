const STORAGE_PAN = "bv.boardPanEnabled";
const STORAGE_ANIM = "bv.boardAnimationsEnabled";
const STORAGE_TOKEN_ANIM = "bv.tokenMoveAnimationsEnabled";
const STORAGE_TILE_BOB_ANIM = "bv.tileBobAnimationsEnabled";
const STORAGE_SCALE_ANIM = "bv.scaleAnimationsEnabled";
const STORAGE_PREVENT_SLEEP = "bv.boardPreventSleepEnabled";
const STORAGE_MOBILE_SFX = "bv.mobileSfxEnabled";
const STORAGE_TURN_BANNER_PLACEMENT = "bv.turnBannerPlacement";
const STORAGE_TABLE_SIDEBAR_OPEN = "bv.tableSidebarOpen";

export const BOARD_PERF_PREFS_EVENT = "bv-board-performance-prefs";

export type TurnBannerPlacement = "bottom" | "right";

export type BoardPerformancePrefs = {
  boardPanEnabled: boolean;
  boardAnimationsEnabled: boolean;
  tokenMoveAnimationsEnabled: boolean;
  /** Gupp-våg på tiles i bordsvyn (pre-roll / moveChoice). */
  tileBobAnimationsEnabled: boolean;
  /** Mjuk transition när överlägg skalas om (t.ex. när solfjädern öppnas). */
  scaleAnimationsEnabled: boolean;
  /** Skärmlås / “inaktivera sömnläge” i bordsvyn — sparas mellan matcher. */
  preventSleepEnabled: boolean;
  /** Ljudeffekter på mobil (/play). */
  mobileSfxEnabled: boolean;
  /** Turbanner / spelarlista: nertill horisontellt eller till höger vertikalt. */
  turnBannerPlacement: TurnBannerPlacement;
  /** Sidopanelens spelarlista öppen/stängd på `/table`. */
  tableSidebarOpen: boolean;
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

function readTurnBannerPlacement(): TurnBannerPlacement {
  if (typeof window === "undefined") return "bottom";
  try {
    const v = window.localStorage.getItem(STORAGE_TURN_BANNER_PLACEMENT);
    if (v === "right" || v === "bottom") return v;
  } catch {
    // ignore
  }
  return "bottom";
}

/** Testbar heuristik för “lite läge”-standardvärden (äldre telefoner / reduced motion). */
export function lowEndPerformanceProfile(input: {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  prefersReducedMotion?: boolean;
  userAgent?: string;
}): boolean {
  if (input.prefersReducedMotion) return true;
  const cores = input.hardwareConcurrency;
  if (typeof cores === "number" && cores > 0 && cores <= 4) return true;
  const ua = input.userAgent ?? "";
  if (/Android|iPhone|iPad|iPod/i.test(ua)) {
    const mem = input.deviceMemory;
    if (typeof mem === "number" && mem > 0 && mem <= 4) return true;
  }
  return false;
}

export function isMobileTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  return /Android|iPhone|iPad|iPod/i.test(ua) || navigator.maxTouchPoints > 1;
}

export function shouldUseLitePerformanceDefaults(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  return lowEndPerformanceProfile({
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: nav.deviceMemory,
    prefersReducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true,
    userAgent: nav.userAgent,
  });
}

export function readBoardPerformancePrefs(): BoardPerformancePrefs {
  const lite = shouldUseLitePerformanceDefaults();
  return {
    boardPanEnabled: readBool(STORAGE_PAN, true),
    boardAnimationsEnabled: readBool(STORAGE_ANIM, true),
    tokenMoveAnimationsEnabled: readBool(STORAGE_TOKEN_ANIM, !lite),
    tileBobAnimationsEnabled: readBool(STORAGE_TILE_BOB_ANIM, !lite),
    scaleAnimationsEnabled: readBool(STORAGE_SCALE_ANIM, !lite),
    preventSleepEnabled: readBool(STORAGE_PREVENT_SLEEP, isMobileTouchDevice()),
    mobileSfxEnabled: readBool(STORAGE_MOBILE_SFX, true),
    turnBannerPlacement: readTurnBannerPlacement(),
    tableSidebarOpen: readBool(STORAGE_TABLE_SIDEBAR_OPEN, false),
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

function writeString(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
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

export function writeTileBobAnimationsEnabled(value: boolean): void {
  writeBool(STORAGE_TILE_BOB_ANIM, value);
}

export function writeScaleAnimationsEnabled(value: boolean): void {
  writeBool(STORAGE_SCALE_ANIM, value);
}

export function writeBoardPreventSleepEnabled(value: boolean): void {
  writeBool(STORAGE_PREVENT_SLEEP, value);
}

export function writeMobileSfxEnabled(value: boolean): void {
  writeBool(STORAGE_MOBILE_SFX, value);
}

export function writeTurnBannerPlacement(value: TurnBannerPlacement): void {
  writeString(STORAGE_TURN_BANNER_PLACEMENT, value);
}

export function writeTableSidebarOpen(value: boolean): void {
  writeBool(STORAGE_TABLE_SIDEBAR_OPEN, value);
}

export function isLitePerformanceActive(): boolean {
  return !readBoardPerformancePrefs().boardAnimationsEnabled;
}

/** Sätter `html.bv-lite-performance` för globala CSS-optimeringar (t.ex. will-change av). */
export function syncLitePerformanceDocumentClass(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("bv-lite-performance", isLitePerformanceActive());
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
