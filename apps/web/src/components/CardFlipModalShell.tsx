import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import styles from "./CardFlipModalShell.module.css";

const CARD_BACK_SRC = "/icons/card-bg.svg";

/** Designyta 400×560 px (5∶7); höjd styrs av `aspect-ratio` i CSS. */
const CARD_REF_W = 400;
const CARD_REF_H = 560;

/** Parallell fade + rörelse + rotation (matchar `cardBackEntrance`). */
const ENTRANCE_MS = 280;
/** Paus med rak baksida innan flip. */
const HOLD_BACK_MS = 20;
/** Själva rotateY-vändningen (matchar --card-flip-duration). */
const FLIP_MS = 700;

/** När framsidan är helt vänd — lämplig start för extra UI-animering (t.ex. tärning + kortlutning). */
export const CARD_FLIP_FRONT_ANIM_READY_MS = ENTRANCE_MS + HOLD_BACK_MS + FLIP_MS;

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
}) {
  const refW = Math.min(props.maxWidth ?? CARD_REF_W, CARD_REF_W);
  const blockPointer = props.blockPointerUntilFlipped !== false;
  const instant = props.instantFront === true;
  const [flipped, setFlipped] = useState(instant);
  const [interactOk, setInteractOk] = useState(instant);

  useEffect(() => {
    if (instant) return;
    const flipAt = ENTRANCE_MS + HOLD_BACK_MS;
    const tFlip = window.setTimeout(() => setFlipped(true), flipAt);
    const tInteract = window.setTimeout(() => setInteractOk(true), flipAt + FLIP_MS + 20);
    return () => {
      clearTimeout(tFlip);
      clearTimeout(tInteract);
    };
  }, [instant]);

  const cardClass = [styles.card, flipped && styles.cardFlipped, instant && styles.cardInstant]
    .filter(Boolean)
    .join(" ");
  const cardPointerEvents = blockPointer && !interactOk ? "none" : "auto";

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
            <div className={styles.faceBack} aria-hidden>
              <img src={CARD_BACK_SRC} alt="" className={styles.backImg} draggable={false} />
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
  /** Slutboss: röd pulserande gradient bakom möteskortet. */
  bossPulsingBackdrop?: boolean;
  /** Enkel modal-animation utan kort-baksida/flip (fade + slide-up). */
  simpleEntrance?: boolean;
}) {
  const stackAbove = props.aboveScene != null;

  return (
    <div
      className={[styles.overlay, props.bossPulsingBackdrop ? styles.overlayBoss : "", props.className]
        .filter(Boolean)
        .join(" ")}
      style={{
        zIndex: props.zIndex,
        ...props.style,
        ...(stackAbove
          ? {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              rowGap: 14,
            }
          : {}),
      }}
      onMouseDown={props.onBackdropMouseDown}
    >
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
            width: "100%",
            maxWidth: "min(var(--card-ref-w, 400px), 100%)",
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
          sceneStyle={stackAbove ? { flexShrink: 0 } : undefined}
        >
          {props.children}
        </CardFlipScene>
      )}
    </div>
  );
}
