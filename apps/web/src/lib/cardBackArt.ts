/** Tillåtna id:n för filer under `public/cardbg/` (samma som lobby / server `cardCover`). */
const SAFE_CARD_COVER_ID = /^[a-zA-Z0-9_-]{1,64}$/;

export function cardCoverToBackUrls(cardCover: string | undefined | null): { webp: string; png: string } {
  const raw = String(cardCover ?? "card1").trim() || "card1";
  const id = SAFE_CARD_COVER_ID.test(raw) ? raw : "card1";
  return { webp: `/cardbg/${id}.webp`, png: `/cardbg/${id}.png` };
}
