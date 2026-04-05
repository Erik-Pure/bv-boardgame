/**
 * Rörelse längs brädets yttre ring. Tile-index 0..n-1 följer samma ordning som
 * `generateLevels` och klientens `ringPos` med **samma grid-storlek** som
 * `ringGridSizeFromTileCount(level.tiles.length)` (annars ser stegen fel ut mot servern).
 *
 * Ett "steg" = exakt en kant till nästa ruta på ringen (standard brädspelsrörelse).
 */

export function clockwiseTileIndex(from: number, steps: number, n: number): number {
  if (n <= 0) return 0;
  return ((from + steps) % n + n) % n;
}

export function counterClockwiseTileIndex(from: number, steps: number, n: number): number {
  if (n <= 0) return 0;
  return (((from - steps) % n) + n) % n;
}
