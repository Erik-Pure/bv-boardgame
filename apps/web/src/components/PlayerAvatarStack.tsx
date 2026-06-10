import { memo, useEffect, useState } from "react";
import type { PlayerAvatar } from "@bv/game-core";
import { loadTintedAvatarHeadMarkup } from "../lib/avatarHeadMarkupCache";
import { avatarPartSrc } from "../lib/randomAvatar";
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

function playerAvatarStackPropsEqual(
  prev: PlayerAvatarStackProps,
  next: PlayerAvatarStackProps,
): boolean {
  return (
    prev.color === next.color &&
    prev.size === next.size &&
    prev.animate === next.animate &&
    prev.className === next.className &&
    prev.avatar.head === next.avatar.head &&
    prev.avatar.eyes === next.avatar.eyes &&
    prev.avatar.mouth === next.avatar.mouth
  );
}

function PlayerAvatarStackInner({
  avatar,
  color,
  size = "lobby",
  animate = true,
  className,
}: PlayerAvatarStackProps) {
  const [headMarkup, setHeadMarkup] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadTintedAvatarHeadMarkup(avatar.head, color).then((markup) => {
      if (!cancelled) setHeadMarkup(markup);
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

export const PlayerAvatarStack = memo(PlayerAvatarStackInner, playerAvatarStackPropsEqual);
