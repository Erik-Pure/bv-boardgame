import { useCallback, useEffect, useState } from "react";
import { ArcadeButton } from "./ArcadeButton";
import {
  AVATAR_PLAYER_COLORS,
  avatarPartSrc,
  randomAvatarParts,
  tintAvatarHeadSvg,
  type AvatarParts,
} from "../lib/randomAvatar";
import styles from "./RandomAvatarPreview.module.css";

type RandomAvatarPreviewProps = {
  initialColorIndex?: number;
};

export function RandomAvatarPreview({ initialColorIndex = 0 }: RandomAvatarPreviewProps) {
  const [parts, setParts] = useState<AvatarParts>(() => randomAvatarParts());
  const [colorIndex, setColorIndex] = useState(
    () => initialColorIndex % AVATAR_PLAYER_COLORS.length,
  );
  const [headMarkup, setHeadMarkup] = useState<string | null>(null);

  const playerColor = AVATAR_PLAYER_COLORS[colorIndex]!;

  const reroll = useCallback(() => {
    setParts(randomAvatarParts());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const src = avatarPartSrc("head", parts.head);
    void fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`head ${parts.head}`);
        return res.text();
      })
      .then((raw) => {
        if (!cancelled) setHeadMarkup(tintAvatarHeadSvg(raw, playerColor));
      })
      .catch(() => {
        if (!cancelled) setHeadMarkup(null);
      });
    return () => {
      cancelled = true;
    };
  }, [parts.head, playerColor]);

  return (
    <section className={styles.section} aria-labelledby="avatar-experiment-title">
      <h4 id="avatar-experiment-title" className={styles.title}>
        Avatar-experiment
      </h4>
      <p className={styles.hint}>
        Slumpade ansiktsdelar på gemensam 200×200-artboard — huvudet får spelarfärg. Testa
        kombinationer innan vi eventuellt byter ut pjäserna på spelbordet.
      </p>

      <div className={styles.stack} aria-hidden={headMarkup == null}>
        {headMarkup ? (
          <div
            className={`${styles.layer} ${styles.layerHead}`}
            dangerouslySetInnerHTML={{ __html: headMarkup }}
          />
        ) : null}
        <div className={`${styles.layer} ${styles.layerEyes}`}>
          <img className={styles.partImg} src={avatarPartSrc("eyes", parts.eyes)} alt="" />
        </div>
        <div className={`${styles.layer} ${styles.layerMouth}`}>
          <img className={styles.partImg} src={avatarPartSrc("mouth", parts.mouth)} alt="" />
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.colorRow} role="group" aria-label="Spelarfärg">
          {AVATAR_PLAYER_COLORS.map((color, i) => (
            <button
              key={color}
              type="button"
              className={`${styles.colorSwatch} ${i === colorIndex ? styles.colorSwatchSelected : ""}`}
              style={{ backgroundColor: color }}
              aria-label={`Färg ${i + 1}`}
              aria-pressed={i === colorIndex}
              onClick={() => setColorIndex(i)}
            />
          ))}
        </div>
        <ArcadeButton variant="gray" size="sm" fullWidth={false} onClick={reroll}>
          Slumpa om
        </ArcadeButton>
      </div>
    </section>
  );
}
