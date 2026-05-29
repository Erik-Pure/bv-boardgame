/**
 * Mobil «din tur»-haptics.
 *
 * - Android (Blink): navigator.vibrate med dubbelpuls
 * - iOS 17.4+ Safari: dold `<input type="checkbox" switch>` via label.click() (Taptic Engine)
 * - Turbyte via WebSocket saknar user gesture → köar haptic till nästa tryck (capture phase)
 */

const ANDROID_PATTERN: number | number[] = [120, 60, 120];
const IOS_CONFIRM_GAP_MS = 120;

let pendingTurnHaptic = false;
let listenerRefCount = 0;
let gestureListenerAttached = false;

let iosSwitchRig: { label: HTMLLabelElement; input: HTMLInputElement } | null = null;

function isClient(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function isLikelyIos(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function tryAndroidVibrate(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
  try {
    return navigator.vibrate(ANDROID_PATTERN);
  } catch {
    return false;
  }
}

function ensureIosSwitchRig(): { label: HTMLLabelElement; input: HTMLInputElement } | null {
  if (!isClient()) return null;
  if (iosSwitchRig?.label.isConnected) return iosSwitchRig;

  const label = document.createElement("label");
  label.setAttribute("aria-hidden", "true");
  label.tabIndex = -1;
  Object.assign(label.style, {
    position: "fixed",
    width: "1px",
    height: "1px",
    padding: "0",
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0,0,0,0)",
    whiteSpace: "nowrap",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
  });

  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  label.appendChild(input);

  document.documentElement.appendChild(label);
  iosSwitchRig = { label, input };
  return iosSwitchRig;
}

/** En Taptic-puls via Safari 17.4+ switch-kontrollen. */
function fireIosSwitchPulse(): boolean {
  const rig = ensureIosSwitchRig();
  if (!rig) return false;
  try {
    rig.input.checked = false;
    rig.label.click();
    return true;
  } catch {
    return false;
  }
}

/** Dubbel puls på iOS — andra pulsen schemaläggs inom samma user activation när möjligt. */
function fireIosSwitchConfirm(): void {
  if (!fireIosSwitchPulse()) return;
  window.setTimeout(() => {
    fireIosSwitchPulse();
  }, IOS_CONFIRM_GAP_MS);
}

function fireTurnHaptic(): void {
  if (tryAndroidVibrate()) return;
  if (isLikelyIos()) fireIosSwitchConfirm();
}

function onUserGesture(): void {
  if (!pendingTurnHaptic) return;
  pendingTurnHaptic = false;
  fireTurnHaptic();
}

function attachGestureListener(): void {
  if (!isClient() || gestureListenerAttached) return;
  gestureListenerAttached = true;
  document.addEventListener("pointerdown", onUserGesture, true);
  document.addEventListener("click", onUserGesture, true);
}

function detachGestureListener(): void {
  if (!isClient() || !gestureListenerAttached) return;
  gestureListenerAttached = false;
  document.removeEventListener("pointerdown", onUserGesture, true);
  document.removeEventListener("click", onUserGesture, true);
}

function destroyIosSwitchRig(): void {
  iosSwitchRig?.label.remove();
  iosSwitchRig = null;
}

/** Håll gesture-lyssnare aktiv medan PlayView är monterad (ref-räknad). */
export function subscribeTurnVibration(): () => void {
  listenerRefCount += 1;
  attachGestureListener();
  return () => {
    listenerRefCount = Math.max(0, listenerRefCount - 1);
    if (listenerRefCount === 0) {
      detachGestureListener();
      pendingTurnHaptic = false;
      destroyIosSwitchRig();
    }
  };
}

/** Triggas när det blir spelarens tur. Best-effort direkt + kö vid nästa tryck. */
export function vibrateMyTurn(): void {
  if (!isClient()) return;

  pendingTurnHaptic = true;
  attachGestureListener();

  // Android kan ibland vibrera direkt; iOS kräver i regel user gesture.
  if (!isLikelyIos() && tryAndroidVibrate()) {
    pendingTurnHaptic = false;
  }
}
