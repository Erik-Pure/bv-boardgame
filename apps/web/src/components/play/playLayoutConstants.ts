/** Matchar `.page` max-width — smal skärm får vertikal gradient (spelarfärg → svart). */
export const PLAY_ROOT_MOBILE_GRADIENT_MQ = "(max-width: 740px)";

export function isMobilePlayLayout(): boolean {
  return typeof window !== "undefined" && window.matchMedia(PLAY_ROOT_MOBILE_GRADIENT_MQ).matches;
}
