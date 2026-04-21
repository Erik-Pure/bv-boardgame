import { useEffect, useMemo, useState } from "react";
import styles from "./DiceCube3D.module.css";

const FACE_CLASS = [styles.f1, styles.f2, styles.f3, styles.f4, styles.f5, styles.f6] as const;

const FINAL_TRANSFORM: Record<number, string> = {
  1: "rotateX(0deg) rotateY(0deg)",
  2: "rotateX(-90deg) rotateY(0deg)",
  3: "rotateX(0deg) rotateY(-90deg)",
  4: "rotateX(0deg) rotateY(90deg)",
  5: "rotateX(90deg) rotateY(0deg)",
  6: "rotateX(0deg) rotateY(180deg)",
};

/** d6 för overlay/rotation; ogiltigt värde → 1 */
function toFaceValue(raw: unknown): number {
  if (raw == null) return 1;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.min(6, Math.max(1, Math.round(n)));
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

function BlankFaces() {
  return (
    <>
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <div key={n} className={[styles.face, FACE_CLASS[n - 1]!].join(" ")} />
      ))}
    </>
  );
}

export type DiceCube3DProps =
  | { idleSpin: true; spinning?: boolean; size?: number }
  /** `oneAsSkullIcon`: etta som röd dödskalle (monsterstrid). Lämna bort/false vid rörelse m.m. */
  | { idleSpin?: false; value?: number | null; size?: number; oneAsSkullIcon?: boolean };

export function DiceCube3D(props: DiceCube3DProps) {
  const size = props.size ?? 72;
  if ("idleSpin" in props && props.idleSpin) {
    const spinning = props.spinning !== false;
    return <DiceIdleSpin size={size} spinning={spinning} />;
  }
  const { value, oneAsSkullIcon } = props;
  return <DiceRollResult value={value} size={size} oneAsSkullIcon={!!oneAsSkullIcon} />;
}

function DiceIdleSpin({ size, spinning }: { size: number; spinning: boolean }) {
  const reducedMotion = usePrefersReducedMotion();
  const loop = spinning && !reducedMotion;
  return (
    <div
      className={[styles.scene, loop && styles.sceneSpinPulse].filter(Boolean).join(" ")}
      style={{ ["--dice-size" as string]: `${size}px` }}
    >
      <div className={[styles.cube, loop && styles.spinLoop].filter(Boolean).join(" ")}>
        <BlankFaces />
      </div>
    </div>
  );
}

function DiceRollResult({
  value,
  size,
  oneAsSkullIcon,
}: {
  value?: number | null;
  size: number;
  oneAsSkullIcon: boolean;
}) {
  const face = useMemo(() => toFaceValue(value), [value]);
  const finalT = FINAL_TRANSFORM[face] ?? FINAL_TRANSFORM[1]!;

  return (
    <div className={styles.scene} style={{ ["--dice-size" as string]: `${size}px` }}>
      <div className={styles.sceneStack}>
        <div className={styles.cube} style={{ transform: finalT }}>
          <BlankFaces />
        </div>
        <div className={styles.rollValueOverlay} aria-hidden>
          {face === 1 && oneAsSkullIcon ? (
            <img
              src="/icons/skull-icon.svg"
              alt=""
              className={styles.rollOverlaySkullOne}
              draggable={false}
            />
          ) : (
            face
          )}
        </div>
      </div>
    </div>
  );
}
