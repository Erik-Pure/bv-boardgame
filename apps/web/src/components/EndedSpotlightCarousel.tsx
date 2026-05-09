import {
  computeEndedSpotlights,
  type EndedSpotlight,
  type EndedSpotlightKind,
  type Player,
} from "@bv/game-core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { sv } from "../lib/uiStrings";
import { ArcadeButton } from "./ArcadeButton";
import styles from "./EndedSpotlightCarousel.module.css";

const ROTATE_MS = 4500;

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

function spotlightTexts(kind: EndedSpotlightKind, names: string, value: number): { title: string; body: string } {
  switch (kind) {
    case "mostOnesCombined":
      return { title: sv.play.spotlightMostOnesTitle, body: sv.play.spotlightMostOnesBody(names, value) };
    case "mostPantSpent":
      return { title: sv.play.spotlightMostPantSpentTitle, body: sv.play.spotlightMostPantSpentBody(names, value) };
    case "mostPvpWins":
      return { title: sv.play.spotlightMostPvpWinsTitle, body: sv.play.spotlightMostPvpWinsBody(names, value) };
    case "mostPvpMatches":
      return { title: sv.play.spotlightMostPvpMatchesTitle, body: sv.play.spotlightMostPvpMatchesBody(names, value) };
    case "mostCombinedLosses":
      return { title: sv.play.spotlightMostLossesTitle, body: sv.play.spotlightMostLossesBody(names, value) };
    case "mostSabotageItems":
      return { title: sv.play.spotlightMostSabotageTitle, body: sv.play.spotlightMostSabotageBody(names, value) };
    case "mostHelpedWins":
      return { title: sv.play.spotlightMostHelpedTitle, body: sv.play.spotlightMostHelpedBody(names, value) };
    case "maxDiceRollTotal":
      return { title: sv.play.spotlightMaxRollTitle, body: sv.play.spotlightMaxRollBody(names, value) };
    case "mostKnockdowns":
      return { title: sv.play.spotlightMostKnockdownsTitle, body: sv.play.spotlightMostKnockdownsBody(names, value) };
    case "mostMonsterWins":
      return { title: sv.play.spotlightMostMonsterWinsTitle, body: sv.play.spotlightMostMonsterWinsBody(names, value) };
  }
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
  fadeIn?: boolean;
}) {
  const names = props.spotlight.playerIds.map((id) => props.nameById.get(id) ?? id).join(", ");
  const { title, body } = spotlightTexts(props.spotlight.kind, names, props.spotlight.value);
  return (
    <div className={[styles.card, props.fadeIn ? styles.cardFadeIn : ""].filter(Boolean).join(" ")}>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.body}>{body}</p>
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

  const [idx, setIdx] = useState(0);
  const n = spotlights.length;
  const safeIdx = n > 0 ? idx % n : 0;

  const goPrev = useCallback(() => {
    setIdx((i) => (n <= 0 ? 0 : (i - 1 + n) % n));
  }, [n]);

  const goNext = useCallback(() => {
    setIdx((i) => (n <= 0 ? 0 : (i + 1) % n));
  }, [n]);

  useEffect(() => {
    if (reducedMotion || n <= 1) return;
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % n);
    }, ROTATE_MS);
    return () => window.clearInterval(t);
  }, [reducedMotion, n]);

  if (n === 0) return null;

  if (reducedMotion) {
    return (
      <section className={styles.wrap} aria-label={sv.play.spotlightRegionAria}>
        <p className={styles.regionLabel}>{sv.play.spotlightRegionAria}</p>
        <div className={styles.reducedGrid}>
          {spotlights.map((s) => (
            <SpotlightCard key={s.kind} spotlight={s} nameById={nameById} fadeIn={false} />
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
          fadeIn
        />
      </div>
      {n > 1 ? (
        <>
          <div className={styles.controls}>
            <ArcadeButton type="button" variant="gray" size="sm" onClick={goPrev} aria-label={sv.play.spotlightPrev}>
              ‹
            </ArcadeButton>
            <ArcadeButton type="button" variant="gray" size="sm" onClick={goNext} aria-label={sv.play.spotlightNext}>
              ›
            </ArcadeButton>
          </div>
          <div className={styles.dotRow}>
            {spotlights.map((s, i) => (
              <button
                key={s.kind}
                type="button"
                className={[styles.dot, i === safeIdx ? styles.dotActive : ""].filter(Boolean).join(" ")}
                aria-label={`${spotlightTexts(s.kind, s.playerIds.map((id) => nameById.get(id) ?? id).join(", "), s.value).title}`}
                aria-current={i === safeIdx ? "step" : undefined}
                onClick={() => setIdx(i)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
