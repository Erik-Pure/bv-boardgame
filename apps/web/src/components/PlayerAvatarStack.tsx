import { useEffect, useState } from "react";
import type { PlayerAvatar } from "@bv/game-core";
import { avatarPartSrc, tintAvatarHeadSvg } from "../lib/randomAvatar";
import styles from "./PlayerAvatarStack.module.css";

export type PlayerAvatarStackSize = "lobby" | "bvb" | "board" | "scoreboard";

type PlayerAvatarStackProps = {
  avatar: PlayerAvatar;
  color: string;
  size?: PlayerAvatarStackSize;
  animate?: boolean;
  className?: string;
};

const sizeClass: Record<PlayerAvatarStackSize, string> = {
  lobby: styles.sizeLobby,
  bvb: styles.sizeBvb,
  board: styles.sizeBoard,
  scoreboard: styles.sizeScoreboard,
};

export function PlayerAvatarStack({
  avatar,
  color,
  size = "lobby",
  animate = true,
  className,
}: PlayerAvatarStackProps) {
  const [headMarkup, setHeadMarkup] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const src = avatarPartSrc("head", avatar.head);
    void fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`head ${avatar.head}`);
        return res.text();
      })
      .then((raw) => {
        if (!cancelled) setHeadMarkup(tintAvatarHeadSvg(raw, color));
      })
      .catch(() => {
        if (!cancelled) setHeadMarkup(null);
      });
    return () => {
      cancelled = true;
    };
  }, [avatar.head, color]);

  return (
    <div
      className={[
        styles.stack,
        sizeClass[size],
        animate ? "" : styles.stackStatic,
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={headMarkup == null}
    >
      {headMarkup ? (
        <div
          className={`${styles.layer} ${styles.layerHead}`}
          dangerouslySetInnerHTML={{ __html: headMarkup }}
        />
      ) : null}
      <div className={`${styles.layer} ${styles.layerEyes}`}>
        <img className={styles.partImg} src={avatarPartSrc("eyes", avatar.eyes)} alt="" />
      </div>
      <div className={`${styles.layer} ${styles.layerMouth}`}>
        <img className={styles.partImg} src={avatarPartSrc("mouth", avatar.mouth)} alt="" />
      </div>
    </div>
  );
}
