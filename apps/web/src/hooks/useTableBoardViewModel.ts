import { useMemo } from "react";
import {
  BOARD_RING_GRID_SIZE,
  isPlayerOnBoard,
  ringGridSizeFromTileCount,
  ringTileCount,
  type GameState,
  type Player,
} from "@bv/game-core";
import { ringRectDimsFromGridSize } from "../lib/tableBoard";

type TableBoardViewModel = {
  stackLevels: NonNullable<GameState["levels"]>;
  playersById: Map<string, Player>;
  playersByTileKey: Map<string, Player[]>;
  tileSize: number;
  targetRingOutset: number;
  gridSize: number;
  ringCols: number;
  ringRows: number;
  boardPad: number;
  boardWidth: number;
  boardHeight: number;
  ringStackGap: number;
  stackCount: number;
  totalSvgWidth: number;
  totalSvgHeight: number;
  floorLitOnTable: (levelIndex: number) => boolean;
  ringOffsetX: (levelIndex: number) => number;
};

export function useTableBoardViewModel(state: GameState | null): TableBoardViewModel {
  const stackLevels = state?.levels?.length ? state.levels : [];

  const playersById = useMemo(() => {
    const ps = state?.players ?? [];
    return new Map(ps.map((p) => [p.id, p]));
  }, [state?.players]);

  const playersByTileKey = useMemo(() => {
    const ps = state?.players ?? [];
    const levels = state?.levels ?? [];
    const map = new Map<string, Player[]>();
    for (const p of ps) {
      if (!isPlayerOnBoard(p)) continue;
      const nTiles = levels[p.levelIndex]?.tiles?.length ?? 0;
      const ti = nTiles <= 0 ? 0 : Math.min(Math.max(0, p.tileIndex), nTiles - 1);
      const key = `${p.levelIndex}-${ti}`;
      const arr = map.get(key);
      if (arr) arr.push(p);
      else map.set(key, [p]);
    }
    return map;
  }, [state?.players, state?.levels]);

  const tileSize = 120;
  const targetRingOutset = 8;
  const ringNTiles = stackLevels[0]?.tiles.length ?? ringTileCount(BOARD_RING_GRID_SIZE);
  const gridSize = ringGridSizeFromTileCount(ringNTiles);
  const { cols: ringCols, rows: ringRows } = ringRectDimsFromGridSize(gridSize);
  const boardPad = targetRingOutset + 4;
  const gridPixelW = ringCols * tileSize;
  const gridPixelH = ringRows * tileSize;
  const boardWidth = gridPixelW + 2 * boardPad;
  const boardHeight = gridPixelH + 2 * boardPad;
  const ringStackGap = 44;
  const stackCount = stackLevels.length;
  const totalSvgWidth =
    stackCount === 0 ? boardWidth : stackCount * boardWidth + (stackCount - 1) * ringStackGap;
  const totalSvgHeight = boardHeight;

  const maxFloorReached = useMemo(() => {
    if (!state?.players?.length) return 0;
    return Math.max(0, ...state.players.map((p) => p.levelIndex));
  }, [state?.players]);

  const floorLitOnTable = (levelIndex: number) =>
    stackCount === 0 || levelIndex === 0 || maxFloorReached >= levelIndex;

  const ringOffsetX = (levelIndex: number) =>
    stackCount === 0 ? 0 : levelIndex * (boardWidth + ringStackGap);

  return {
    stackLevels,
    playersById,
    playersByTileKey,
    tileSize,
    targetRingOutset,
    gridSize,
    ringCols,
    ringRows,
    boardPad,
    boardWidth,
    boardHeight,
    ringStackGap,
    stackCount,
    totalSvgWidth,
    totalSvgHeight,
    floorLitOnTable,
    ringOffsetX,
  };
}
