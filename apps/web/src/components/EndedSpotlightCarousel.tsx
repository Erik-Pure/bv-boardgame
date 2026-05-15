import {
  computeEndedSpotlights,
  type EndedSpotlight,
  type EndedSpotlightKind,
  type Player,
} from "@bv/game-core";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { sv } from "../lib/uiStrings";
import styles from "./EndedSpotlightCarousel.module.css";

/** Tid per höjdpuntskort innan ut-animation/triggning av nästa */
const ROTATE_MS = 7500;

/** Måste matcha `.cardFadeOut`-animationens varaktighet */
const FADE_MS = 200;

function shuffleStable<T>(items: T[], seed: string): T[] {
  const arr = [...items];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = arr.length - 1; i > 0; i--) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const j = Math.abs(h) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function spotlightTitle(kind: EndedSpotlightKind): string {
  switch (kind) {
    case "mostOnesCombined":
      return sv.play.spotlightMostOnesTitle;
    case "mostPantSpent":
      return sv.play.spotlightMostPantSpentTitle;
    case "mostPvpWins":
      return sv.play.spotlightMostPvpWinsTitle;
    case "mostPvpMatches":
      return sv.play.spotlightMostPvpMatchesTitle;
    case "mostCombinedLosses":
      return sv.play.spotlightMostLossesTitle;
    case "mostSabotageItems":
      return sv.play.spotlightMostSabotageTitle;
    case "mostHelpedWins":
      return sv.play.spotlightMostHelpedTitle;
    case "maxDiceRollTotal":
      return sv.play.spotlightMaxRollTitle;
    case "mostKnockdowns":
      return sv.play.spotlightMostKnockdownsTitle;
    case "mostMonsterWins":
      return sv.play.spotlightMostMonsterWinsTitle;
    case "mostHpLost":
      return sv.play.spotlightMostHpLostTitle;
  }
}

function spotlightAriaLabel(kind: EndedSpotlightKind, names: string, value: number): string {
  return `${spotlightTitle(kind)}. ${names}. ${value}.`;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function SpotlightCard(props: {
  spotlight: EndedSpotlight;
  nameById: Map<string, string>;
  colorById: Map<string, string>;
  /** Carousel: fade + lätt rörelse (in från höger, ut åt vänster); reduced eller ett kort: ingen animation */
  slideMotion?: "enter" | "exit" | "static";
}) {
  const title = spotlightTitle(props.spotlight.kind);
  const motion =
    props.slideMotion === "exit" ? styles.cardFadeOut : props.slideMotion === "static" ? "" : styles.cardFadeIn;
  return (
    <div className={[styles.card, motion].filter(Boolean).join(" ")}>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.names}>
        {props.spotlight.playerIds.map((id, i) => {
          const label = props.nameById.get(id) ?? id;
          const color = props.colorById.get(id);
          return (
            <Fragment key={id}>
              {i > 0 ? (
                <span className={styles.namesSep} aria-hidden>
                  ,{" "}
                </span>
              ) : null}
              <span
                className={[styles.nameColored, color ? "" : styles.nameFallback].filter(Boolean).join(" ")}
                style={color ? { color } : undefined}
              >
                {label}
              </span>
            </Fragment>
          );
        })}
      </p>
      <p className={styles.value}>{props.spotlight.value}</p>
    </div>
  );
}

export function EndedSpotlightCarousel(props: { players: Player[] }) {
  const reducedMotion = usePrefersReducedMotion();
  const seed = useMemo(
    () =>
      [...props.players]
        .map((p) => p.id)
        .sort()
        .join("|"),
    [props.players],
  );
  const spotlights = useMemo(() => shuffleStable(computeEndedSpotlights(props.players), seed), [props.players, seed]);
  const nameById = useMemo(() => new Map(props.players.map((p) => [p.id, p.name] as const)), [props.players]);
  const colorById = useMemo(() => new Map(props.players.map((p) => [p.id, p.color] as const)), [props.players]);

  const [idx, setIdx] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const pendingIdxRef = useRef<number | null>(null);
  const idxRef = useRef(0);
  const n = spotlights.length;
  const safeIdx = n > 0 ? idx % n : 0;

  idxRef.current = safeIdx;

  /** Efter ut-slide: byt kort och återgå till inläge */
  useEffect(() => {
    if (!isExiting || pendingIdxRef.current === null) return;
    const target = pendingIdxRef.current;
    const t = window.setTimeout(() => {
      pendingIdxRef.current = null;
      setIdx(target);
      setIsExiting(false);
    }, FADE_MS);
    return () => window.clearTimeout(t);
  }, [isExiting]);

  /** Vila ROTATE_MS på synligt kort innan nästa ut-slide */
  useEffect(() => {
    if (reducedMotion || n <= 1 || isExiting) return;
    const t = window.setTimeout(() => {
      pendingIdxRef.current = (idxRef.current + 1) % n;
      setIsExiting(true);
    }, ROTATE_MS);
    return () => window.clearTimeout(t);
  }, [reducedMotion, n, isExiting, safeIdx]);

  function requestGoTo(nextIdx: number) {
    if (n <= 1 || isExiting || nextIdx === safeIdx) return;
    pendingIdxRef.current = nextIdx;
    setIsExiting(true);
  }

  if (n === 0) return null;

  if (reducedMotion) {
    return (
      <section className={styles.wrap} aria-label={sv.play.spotlightRegionAria}>
        <p className={styles.regionLabel}>{sv.play.spotlightRegionAria}</p>
        <div className={styles.reducedGrid}>
          {spotlights.map((s) => (
            <SpotlightCard key={s.kind} spotlight={s} nameById={nameById} colorById={colorById} slideMotion="static" />
          ))}
        </div>
      </section>
    );
  }

  const current = spotlights[safeIdx]!;

  return (
    <section className={styles.wrap} aria-label={sv.play.spotlightRegionAria}>
      <p className={styles.regionLabel}>{sv.play.spotlightRegionAria}</p>
      <div className={styles.viewport}>
        <SpotlightCard
          key={`${current.kind}-${safeIdx}`}
          spotlight={current}
          nameById={nameById}
          colorById={colorById}
          slideMotion={n <= 1 ? "static" : isExiting ? "exit" : "enter"}
        />
      </div>
      {n > 1 ? (
        <div className={styles.dotRow}>
          {spotlights.map((s, i) => (
            <button
              key={s.kind}
              type="button"
              className={[styles.dot, i === safeIdx ? styles.dotActive : ""].filter(Boolean).join(" ")}
              aria-label={spotlightAriaLabel(
                s.kind,
                s.playerIds.map((id) => nameById.get(id) ?? id).join(", "),
                s.value,
              )}
              aria-current={i === safeIdx ? "step" : undefined}
              onClick={() => requestGoTo(i)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
