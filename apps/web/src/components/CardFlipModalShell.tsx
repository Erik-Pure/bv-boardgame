import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { BossCombatBackdropLayers } from "./BossCombatBackdropLayers";
import styles from "./CardFlipModalShell.module.css";
import { cardCoverToBackUrls } from "../lib/cardBackArt";
import { useFitScaleTransition } from "../hooks/useFitScaleTransition";
import { useFitToViewportScale } from "../hooks/useFitToViewportScale";

/** Bord/TV: skal-till-passa-spec för modalinnehållet (mät + krymp/väx så det ryms). */
export type CardFlipFitToViewport = {
  /** Reserverad yta ovanför innehållet (overlayens padding-top), px. */
  reservedTop?: number;
  /** Reserverad yta under innehållet (t.ex. solfjäder + turbanner), px. */
  reservedBottom?: number;
  /** Total horisontell marginal (vänster + höger), px. */
  sidePadPx?: number;
  /** "top" för toppförankrade overlays (default), "center" för centrerade. */
  anchor?: "top" | "center";
};

/** Egen komponent så mät-hooken bara körs när fit är aktiverat (opt-in, rör inte mobilflöden). */
function FitViewportScaledBlock(props: {
  children: ReactNode;
  fit: CardFlipFitToViewport;
  desiredScale: number;
  stackAbove: boolean;
  /** Kortets kända designbredd — mät-elementet är fullbredd och kan inte mätas för bredd. */
  contentWidthPx: number;
}) {
  const measureRef = useRef<HTMLDivElement | null>(null);
  const scale = useFitToViewportScale(measureRef, {
    reservedTop: props.fit.reservedTop ?? 16,
    reservedBottom: (props.fit.reservedBottom ?? 0) + 16,
    sidePadPx: props.fit.sidePadPx ?? 32,
    desiredScale: props.desiredScale,
    contentWidthPx: props.contentWidthPx,
  });
  const scaleTransition = useFitScaleTransition();
  return (
    <div
      style={{
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transition: scaleTransition,
        /** Toppförankrat: origin top så nedskalning inte klipps mot viewport-toppen. */
        transformOrigin: (props.fit.anchor ?? "top") === "top" ? "top center" : "center center",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        minHeight: 0,
      }}
    >
      {/* Otransformerat mät-element (offsetWidth/Height påverkas inte av förälderns scale). */}
      <div
        ref={measureRef}
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          rowGap: props.stackAbove ? 14 : 0,
          minHeight: 0,
        }}
      >
        {props.children}
      </div>
    </div>
  );
}

/** Designyta 400×560 px (5∶7); höjd styrs av `aspect-ratio` i CSS. */
const CARD_REF_W = 400;
const CARD_REF_H = 560;

/** Parallell fade + rörelse + rotation (matchar `cardBackEntrance`). */
const ENTRANCE_MS = 280;
/** Paus med rak baksida innan flip. */
const HOLD_BACK_MS = 20;
/** Själva rotateY-vändningen (matchar --card-flip-duration). */
const FLIP_MS = 700;

/** När rotateY-vändningen till framsidan startar (efter entrance + hold). */
export const CARD_FLIP_ANIM_START_MS = ENTRANCE_MS + HOLD_BACK_MS;
/** När framsidan är helt vänd — lämplig start för extra UI-animering (t.ex. tärning + kortlutning). */
export const CARD_FLIP_FRONT_ANIM_READY_MS = CARD_FLIP_ANIM_START_MS + FLIP_MS;

/** Själva 3D-flipen utan helskärms-overlay — använd när samma kort ska leva kvar mellan layouter (t.ex. bordsmonster). */
export function CardFlipScene(props: {
  children: ReactNode;
  /** Max kortbredd i px (default 400; aldrig större än designbredden). */
  maxWidth?: number;
  /** When true, ignore taps until flip finishes (mobile play). */
  blockPointerUntilFlipped?: boolean;
  /** Visa framsida direkt utan fly-in + flip (t.ex. klick på föremål i inventory). */
  instantFront?: boolean;
  className?: string;
  /** Extra klass på framsidans scroll-yta (t.ex. `faceInnerNoVerticalOverflow`). */
  faceInnerClassName?: string;
  sceneClassName?: string;
  sceneStyle?: CSSProperties;
  /** Lobby `GameConfig.cardCover` (t.ex. `card1` …) — styr standard-baksida om `backFace` utelämnas. */
  cardCoverId?: string | null;
  /** Innehåll på kortbaksidan (annars kortbaksida från `cardCoverId`). */
  backFace?: ReactNode;
  /** Efter att spelfronten syns (180°): rotera till baksida med `backFace` / resultat. */
  flipToResultBack?: boolean;
  /** ms innan andra vändningen startar (t.ex. tärnfade). */
  resultFlipDelayMs?: number;
  /** När andra vändningen (rotateY 360°) är klar. */
  onResultFlipComplete?: () => void;
  /** När rotateY-vändningen till framsidan startar (efter entrance + hold). */
  onFlipStart?: () => void;
}) {
  const refW = Math.min(props.maxWidth ?? CARD_REF_W, CARD_REF_W);
  const blockPointer = props.blockPointerUntilFlipped !== false;
  const instant = props.instantFront === true;
  const [flipped, setFlipped] = useState(instant);
  const [interactOk, setInteractOk] = useState(instant);
  /** Efter första paint med `instantFront` — tar bort `cardInstant` så andra vändningen kan animeras. */
  const [postInstantLayout, setPostInstantLayout] = useState(() => !instant);
  const [revealSecondBack, setRevealSecondBack] = useState(false);

  useEffect(() => {
    if (!instant) {
      setPostInstantLayout(true);
      return;
    }
    const id = requestAnimationFrame(() => setPostInstantLayout(true));
    return () => cancelAnimationFrame(id);
  }, [instant]);

  useEffect(() => {
    if (instant) return;
    const flipAt = CARD_FLIP_ANIM_START_MS;
    const tFlip = window.setTimeout(() => {
      setFlipped(true);
      props.onFlipStart?.();
    }, flipAt);
    const tInteract = window.setTimeout(() => setInteractOk(true), flipAt + FLIP_MS + 20);
    return () => {
      clearTimeout(tFlip);
      clearTimeout(tInteract);
    };
  }, [instant, props.onFlipStart]);

  useEffect(() => {
    if (!props.flipToResultBack) {
      setRevealSecondBack(false);
      return;
    }
    const delay = Math.max(0, props.resultFlipDelayMs ?? 0);
    const t = window.setTimeout(() => setRevealSecondBack(true), delay);
    return () => clearTimeout(t);
  }, [props.flipToResultBack, props.resultFlipDelayMs]);

  useEffect(() => {
    if (!revealSecondBack || !props.onResultFlipComplete) return;
    const t = window.setTimeout(props.onResultFlipComplete, FLIP_MS + 40);
    return () => clearTimeout(t);
  }, [revealSecondBack, props.onResultFlipComplete]);

  const cardInstant = instant && !postInstantLayout;
  const cardClass = [
    styles.card,
    flipped && styles.cardFlipped,
    revealSecondBack && flipped && styles.cardRevealSecond,
    cardInstant && styles.cardInstant,
  ]
    .filter(Boolean)
    .join(" ");
  const cardPointerEvents = blockPointer && !interactOk ? "none" : "auto";
  const backUrls = cardCoverToBackUrls(props.cardCoverId);

  return (
    <div
      className={props.className}
      style={{
        width: "100%",
        maxWidth: "min(var(--card-ref-w, 400px), 100%)",
        marginInline: "auto",
        boxSizing: "border-box",
        ["--card-ref-w" as string]: `${refW}px`,
        ["--card-aspect-w" as string]: String(CARD_REF_W),
        ["--card-aspect-h" as string]: String(CARD_REF_H),
        ["--card-entrance-duration" as string]: `${ENTRANCE_MS}ms`,
        ["--card-flip-duration" as string]: `${FLIP_MS}ms`,
      }}
    >
      <div
        className={[styles.scene, props.sceneClassName].filter(Boolean).join(" ")}
        style={props.sceneStyle}
      >
        <div className={[styles.lift, instant && styles.liftStatic].filter(Boolean).join(" ")}>
          <div className={cardClass} style={{ pointerEvents: cardPointerEvents }}>
            <div
              className={[styles.faceBack, props.backFace != null && styles.faceBackRich].filter(Boolean).join(" ")}
              aria-hidden
            >
              {props.backFace ?? (
                <picture className={styles.backPicture}>
                  <source srcSet={backUrls.webp} type="image/webp" />
                  <img src={backUrls.png} alt="" className={styles.backImg} draggable={false} />
                </picture>
              )}
            </div>
            <div className={styles.faceFront}>
              <div className={[styles.faceInner, props.faceInnerClassName].filter(Boolean).join(" ")}>{props.children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardFlipModalShell(props: {
  zIndex: number;
  children: ReactNode;
  /** Innehåll ovanför själva flip-kortet — ingår inte i kortets framsida/baksida. */
  aboveScene?: ReactNode;
  /** Max kortbredd i px (default 400; aldrig större än designbredden). */
  maxWidth?: number;
  onBackdropMouseDown?: (e: MouseEvent<HTMLDivElement>) => void;
  /** When true, ignore taps until flip finishes (mobile play). */
  blockPointerUntilFlipped?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Extra klass på framsidans scroll-yta (t.ex. `faceInnerNoVerticalOverflow`). */
  faceInnerClassName?: string;
  /** @see CardFlipScene `instantFront` */
  instantFront?: boolean;
  /** @see CardFlipScene `cardCoverId` */
  cardCoverId?: string | null;
  /** Slutboss: röd pulserande gradient bakom möteskortet (mobil m.m.). */
  bossPulsingBackdrop?: boolean;
  /** Slutboss på bordet: flammor + röd puls (använd inte på mobil). */
  bossFlamesBackdrop?: boolean;
  /** Bord: flammor utan röd puls (t.ex. stupad bryggare). */
  flamesBackdrop?: boolean;
  /** Enkel modal-animation utan kort-baksida/flip (fade + slide-up). */
  simpleEntrance?: boolean;
  /** Bord/TV: skala innehåll (inte hela dimningen) för läsbarhet på avstånd. */
  contentScale?: number;
  /**
   * Bord/TV: mät innehållet och skala så det alltid ryms i viewporten (kan gå under 1).
   * `contentScale` blir "önskad uppskalning". Opt-in — mobilflöden påverkas inte.
   */
  fitToViewport?: CardFlipFitToViewport;
  /** Backdrop kan ligga på annan z-index än innehållet (t.ex. under bottom sheet). */
  backdropZIndex?: number;
  /** Innehållets z-index (default = `zIndex`). */
  contentZIndex?: number;
  /** Extra klass på backdroppen. */
  backdropClassName?: string;
  /** Extra stilar på backdroppen. */
  backdropStyle?: CSSProperties;
  /** @see CardFlipScene `onFlipStart` */
  onFlipStart?: () => void;
}) {
  const stackAbove = props.aboveScene != null;
  const cs = props.contentScale;
  const fit = props.fitToViewport;
  const useScaleWrapper = fit == null && cs != null && cs !== 1;
  const hasFlamesBackdrop = props.bossFlamesBackdrop || props.flamesBackdrop;
  /** Kortets faktiska bredd (scene är capped mot designbredden); aboveScene är max 480. */
  const fitContentWidthPx = Math.max(
    Math.min(props.maxWidth ?? CARD_REF_W, CARD_REF_W),
    stackAbove ? 480 : 0,
  );

  const flexStackStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    rowGap: 14,
  };

  /** Måste ge fast bredd-kontext: annars `width:100%` på CardFlipScene + shrink-wrap → 0px bred cell (modal “försvinner”). */
  const scaledBlockStyle: CSSProperties = useScaleWrapper
    ? {
        transform: `scale(${cs})`,
        /** `center` här skulle skala hälften uppåt → toppen klipps mot viewport när overlay ligger högt. */
        transformOrigin: "top center",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        rowGap: stackAbove ? 14 : 0,
        minHeight: 0,
      }
    : {};

  const inner = (
    <>
      {stackAbove ? (
        <div
          style={{
            flexShrink: 0,
            width: "100%",
            maxWidth: "min(480px, 100vw - 32px)",
            boxSizing: "border-box",
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          {props.aboveScene}
        </div>
      ) : null}
      {props.simpleEntrance ? (
        <div
          className={styles.simpleEntrance}
          style={{
            ["--card-ref-w" as string]: `${Math.min(props.maxWidth ?? CARD_REF_W, CARD_REF_W)}px`,
          }}
        >
          {props.children}
        </div>
      ) : (
        <CardFlipScene
          maxWidth={props.maxWidth}
          faceInnerClassName={props.faceInnerClassName}
          blockPointerUntilFlipped={props.blockPointerUntilFlipped}
          instantFront={props.instantFront}
          cardCoverId={props.cardCoverId}
          onFlipStart={props.onFlipStart}
          sceneStyle={stackAbove ? { flexShrink: 0 } : undefined}
        >
          {props.children}
        </CardFlipScene>
      )}
    </>
  );

  return (
    <>
      <div
        className={[
          styles.overlayBackdrop,
          hasFlamesBackdrop ? styles.overlayBossHost : "",
          props.bossPulsingBackdrop && !hasFlamesBackdrop ? styles.overlayBoss : "",
          props.backdropClassName ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          zIndex: props.backdropZIndex ?? props.zIndex,
          ...props.backdropStyle,
        }}
        onMouseDown={props.onBackdropMouseDown}
      >
        {hasFlamesBackdrop ? (
          <BossCombatBackdropLayers showPulse={props.bossFlamesBackdrop === true} />
        ) : null}
      </div>
      <div
        className={[styles.overlayContent, props.className].filter(Boolean).join(" ")}
        style={{
          zIndex: props.contentZIndex ?? props.zIndex,
          ...props.style,
          ...(stackAbove && !useScaleWrapper && fit == null ? flexStackStyle : {}),
        }}
      >
        {fit != null ? (
          <FitViewportScaledBlock
            fit={fit}
            desiredScale={cs ?? 1}
            stackAbove={stackAbove}
            contentWidthPx={fitContentWidthPx}
          >
            {inner}
          </FitViewportScaledBlock>
        ) : useScaleWrapper ? (
          <div style={scaledBlockStyle}>{inner}</div>
        ) : (
          inner
        )}
      </div>
    </>
  );
}
