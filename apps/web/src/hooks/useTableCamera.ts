import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, WheelEvent } from "react";
import type { GameState } from "@bv/game-core";
import { activePlayer, clamp, ringPos } from "../lib/tableBoard";

export type Cam = { x: number; y: number; scale: number };

export type UseTableCameraParams = {
  state: GameState | null;
  boardWidth: number;
  boardHeight: number;
  totalSvgWidth: number;
  ringStackGap: number;
  gridSize: number;
  tileSize: number;
  boardPad: number;
  targetRingOutset: number;
};

export function useTableCamera(params: UseTableCameraParams) {
  const {
    state,
    boardWidth,
    boardHeight,
    totalSvgWidth,
    ringStackGap,
    gridSize,
    tileSize,
    boardPad,
    targetRingOutset,
  } = params;

  // Smidig kamera: renderad cam lerpar mot targetCam.
  const targetCam = useRef<Cam>({
    x: -(boardWidth / 2),
    y: -(boardHeight / 2),
    scale: 1,
  });
  const [cam, setCam] = useState<Cam>(() => ({ ...targetCam.current }));
  const drag = useRef<{ startX: number; startY: number; camX: number; camY: number } | null>(null);
  const isDraggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const boardViewportRef = useRef<HTMLDivElement | null>(null);
  const [boardViewportPx, setBoardViewportPx] = useState({ w: 0, h: 0 });
  /** Kamera: ny tur → hel våning; rörelseval → inzoom mot målrutor; landning → följ ny ruta. */
  const prevTurnIndexForCamRef = useRef<number | null>(null);
  const turnStartTileKeyForCamRef = useRef<string | null>(null);

  useEffect(() => {
    // Under spel styr tur-byten kameran per våning — undvik att hoppa till alla våningars mitt.
    if (state?.phase === "playing") return;
    targetCam.current = {
      ...targetCam.current,
      x: -(totalSvgWidth / 2),
      y: -(boardHeight / 2),
    };
  }, [boardHeight, totalSvgWidth, state?.phase]);

  useEffect(() => {
    // Två lägen:
    // - drag-läge: snabb respons så kameran följer fingret/musen direkt
    // - auto-fokus: trögare, mer cinematic panorering
    const dragPanStiffness = 0.18;
    const dragZoomStiffness = 0.14;
    const autoPanStiffness = 0.028;
    const autoZoomStiffness = 0.025;
    const tick = () => {
      setCam((c) => {
        const t = targetCam.current;
        const panStiffness = isDraggingRef.current ? dragPanStiffness : autoPanStiffness;
        const zoomStiffness = isDraggingRef.current ? dragZoomStiffness : autoZoomStiffness;
        const nx = c.x + (t.x - c.x) * panStiffness;
        const ny = c.y + (t.y - c.y) * panStiffness;
        const ns = c.scale + (t.scale - c.scale) * zoomStiffness;
        // när vi är nära målet, snappa helt för att undvika micro-jitter
        if (Math.abs(nx - t.x) < 0.1 && Math.abs(ny - t.y) < 0.1 && Math.abs(ns - t.scale) < 0.001) {
          return t;
        }
        return { x: nx, y: ny, scale: ns };
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  // Faktisk spelyta (flex-viewport) — behövs för zoom som täcker rutor i bildfönstret.
  useEffect(() => {
    const el = boardViewportRef.current;
    if (!el) return;
    const applySize = (w: number, h: number) => {
      const ww = Math.max(1, w);
      const hh = Math.max(1, h);
      setBoardViewportPx((prev) => (prev.w === ww && prev.h === hh ? prev : { w: ww, h: hh }));
    };
    const measure = () => {
      const r = el.getBoundingClientRect();
      applySize(r.width, r.height);
    };
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver((entries) => {
        const cr = entries[0]?.contentRect;
        if (!cr) return;
        applySize(cr.width, cr.height);
      });
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!state || state.phase !== "playing") {
      prevTurnIndexForCamRef.current = null;
      turnStartTileKeyForCamRef.current = null;
      return;
    }
    const p = activePlayer(state);
    if (!p) return;
    const lvls = state.levels;
    if (!lvls?.length) return;

    const { w: viewW, h: viewH } = boardViewportPx;
    if (viewW < 48 || viewH < 48) return;

    const turnChanged = prevTurnIndexForCamRef.current !== state.currentTurnIndex;
    const pend = state.pending;

    const xForLevel = (levelIndex: number) => levelIndex * (boardWidth + ringStackGap);
    const ringMargin = targetRingOutset + 6;

    const applyTightCam = (mode: "player" | "moveChoice" | "card") => {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      const includeTile = (levelIndex: number, tileIndex: number) => {
        const level = lvls[levelIndex];
        if (!level || tileIndex < 0 || tileIndex >= level.tiles.length) return;
        const xOff = xForLevel(levelIndex);
        const { col, row } = ringPos(gridSize, tileIndex);
        const left = xOff + boardPad + col * tileSize - ringMargin;
        const top = boardPad + row * tileSize - ringMargin;
        const right = xOff + boardPad + (col + 1) * tileSize + ringMargin;
        const bottom = boardPad + (row + 1) * tileSize + ringMargin;
        minX = Math.min(minX, left);
        minY = Math.min(minY, top);
        maxX = Math.max(maxX, right);
        maxY = Math.max(maxY, bottom);
      };

      includeTile(p.levelIndex, p.tileIndex);
      if (mode === "moveChoice" && pend?.type === "moveChoice") {
        for (const o of pend.options) {
          includeTile(o.target.levelIndex, o.target.tileIndex);
        }
      }
      if (mode === "card" && pend?.type === "card") {
        const owner = state.players.find((x) => x.id === pend.playerId);
        if (owner) includeTile(owner.levelIndex, owner.tileIndex);
      }

      if (!Number.isFinite(minX)) return;

      const contentW = Math.max(1, maxX - minX);
      const contentH = Math.max(1, maxY - minY);
      const breathe = tileSize * 0.2;
      const boxW = contentW + breathe;
      const boxH = contentH + breathe;
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const fitMargin = 0.9;
      const desiredScale = clamp(Math.min((viewW * fitMargin) / boxW, (viewH * fitMargin) / boxH), 0.45, 1.85);
      targetCam.current = {
        ...targetCam.current,
        x: -desiredScale * centerX,
        y: -desiredScale * centerY,
        scale: desiredScale,
      };
    };

    if (pend?.type === "moveChoice") {
      applyTightCam("moveChoice");
      if (turnChanged) prevTurnIndexForCamRef.current = state.currentTurnIndex;
      return;
    }

    if (pend?.type === "card") {
      applyTightCam("card");
      if (turnChanged) prevTurnIndexForCamRef.current = state.currentTurnIndex;
      return;
    }

    if (turnChanged) {
      prevTurnIndexForCamRef.current = state.currentTurnIndex;
      turnStartTileKeyForCamRef.current = `${p.levelIndex}-${p.tileIndex}`;
      const xOff = p.levelIndex * (boardWidth + ringStackGap);
      const centerX = xOff + boardWidth / 2;
      const centerY = boardHeight / 2;
      const fitMargin = 0.92;
      const desiredScale = clamp(Math.min((viewW * fitMargin) / boardWidth, (viewH * fitMargin) / boardHeight), 0.45, 2);
      targetCam.current = {
        ...targetCam.current,
        x: -desiredScale * centerX,
        y: -desiredScale * centerY,
        scale: desiredScale,
      };
      return;
    }

    const tileKey = `${p.levelIndex}-${p.tileIndex}`;
    if (tileKey !== turnStartTileKeyForCamRef.current) {
      applyTightCam("player");
      turnStartTileKeyForCamRef.current = tileKey;
    }
  }, [
    state?.currentTurnIndex,
    state?.phase,
    state?.pending,
    state?.players,
    boardWidth,
    boardHeight,
    ringStackGap,
    boardViewportPx.w,
    boardViewportPx.h,
    gridSize,
    tileSize,
    boardPad,
    targetRingOutset,
  ]);

  const zoomIn = () => {
    targetCam.current = { ...targetCam.current, scale: clamp(targetCam.current.scale + 0.1, 0.5, 2) };
  };
  const zoomOut = () => {
    targetCam.current = { ...targetCam.current, scale: clamp(targetCam.current.scale - 0.1, 0.5, 2) };
  };

  const viewportHandlers = useMemo(() => {
    return {
      onWheel: (e: WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.08 : 0.08;
        targetCam.current = { ...targetCam.current, scale: clamp(targetCam.current.scale + delta, 0.5, 2) };
      },
      onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        isDraggingRef.current = true;
        drag.current = { startX: e.clientX, startY: e.clientY, camX: targetCam.current.x, camY: targetCam.current.y };
      },
      onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
        if (!drag.current) return;
        const dx = e.clientX - drag.current.startX;
        const dy = e.clientY - drag.current.startY;
        targetCam.current = { ...targetCam.current, x: drag.current.camX + dx, y: drag.current.camY + dy };
      },
      onPointerUp: () => {
        drag.current = null;
        isDraggingRef.current = false;
      },
      onPointerCancel: () => {
        drag.current = null;
        isDraggingRef.current = false;
      },
      onPointerLeave: () => {
        if (!drag.current) isDraggingRef.current = false;
      },
    };
  }, []);

  return { cam, targetCam, boardViewportRef, boardViewportPx, zoomIn, zoomOut, viewportHandlers };
}

