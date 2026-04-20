/** Vänta så kameran hinner panorera innan kortmodal på bordet visas. */
export const TABLE_CARD_MODAL_DELAY_MS = 950;

/** Kort delay innan PvP-slag visas på bordet — måste synkas med `pvpRevealReady` så idle-snurr hinner visas första rutan. */
export const PVP_TABLE_REVEAL_DELAY_MS = 280;

export const TABLE_BOARD_MODAL_OVERLAY_ANIMATION =
  "bvTableOverlayFadeIn 900ms cubic-bezier(0.22, 0.61, 0.36, 1) both";
export const TABLE_BOARD_MODAL_CARD_ANIMATION =
  "bvTableCardIn 1100ms cubic-bezier(0.22, 0.61, 0.36, 1) both";

/** Kraftig dimning över brädet (strid, kortmodal m.m.) för bättre fokus på kort. */
export const TABLE_BOARD_OVERLAY_BG = "rgba(1, 4, 16, 0.78)";

/** Slutboss intro: stark röd radial puls som växer/krymper. */
export const TABLE_BOSS_OVERLAY_BG =
  "radial-gradient(ellipse 120% 90% at 50% 16%, rgba(254, 121, 121, 0.62) 0%, rgba(239, 68, 68, 0.44) 26%, rgba(127, 29, 29, 0.38) 50%, rgba(18, 4, 8, 0) 72%), linear-gradient(180deg, rgba(22, 3, 7, 0.94) 0%, rgba(4, 1, 3, 0.97) 100%)";
export const TABLE_BOSS_OVERLAY_PULSE = "bvBossTableOverlayPulse 1.7s cubic-bezier(0.4, 0, 0.2, 1) infinite";

/** Tärningsstorlek i monster-raden: samma för idle-spin och resultat. */
export const TABLE_MONSTER_COMBAT_DICE_PX = 78;

export const PVP_MARKER = '"Permanent Marker", var(--heading), sans-serif' as const;

/** Måste finnas i DOM när strids- och kortöverlägg animeras (keyframes är inte globala i Vite). */
export const TABLE_BOARD_MODAL_KEYFRAMES_CSS = `@keyframes bvTableOverlayFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes bvTableCardIn {
  from { opacity: 0; transform: translateY(-36px) scale(0.96); filter: blur(3px); }
  to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
@keyframes bvBossTableOverlayPulse {
  0% {
    box-shadow: inset 0 0 85px rgba(248, 113, 113, 0.2);
  }
  50% {
    box-shadow: inset 0 0 210px rgba(239, 68, 68, 0.62);
  }
  100% {
    box-shadow: inset 0 0 85px rgba(248, 113, 113, 0.2);
  }
}`;

