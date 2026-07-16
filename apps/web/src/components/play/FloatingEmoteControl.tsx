import { useEffect, useRef, useState } from "react";
import {
  EMOTE_COOLDOWN_MS,
  EMOTE_ICON_SRC,
  EMOTE_IDS,
  type ClientAction,
  type EmoteId,
  type Player,
} from "@bv/game-core";
import { useUiStrings } from "../../lib/locale/LocaleContext";
import styles from "../../routes/PlayView.module.css";

export function FloatingEmoteControl(props: {
  me: Player;
  send: (action: ClientAction) => void;
  bottom: string | number;
  /** När true: hoppa bottom utan transition (första sheet-mätningen). */
  bottomInstant?: boolean;
}) {
  const ui = useUiStrings();
  const { me, send, bottom, bottomInstant = false } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [, setCooldownTick] = useState(0);

  const onCooldown = cooldownUntil > Date.now();

  useEffect(() => {
    if (!onCooldown) return;
    const id = window.setInterval(() => setCooldownTick((n) => n + 1), 200);
    return () => window.clearInterval(id);
  }, [onCooldown, cooldownUntil]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [pickerOpen]);

  const handleEmote = (emoteId: EmoteId) => {
    if (onCooldown) return;
    setPickerOpen(false);
    send({ type: "sendEmote", playerId: me.id, emoteId });
    setCooldownUntil(Date.now() + EMOTE_COOLDOWN_MS);
  };

  return (
    <div
      ref={rootRef}
      className={[
        styles.floatingEmoteBar,
        pickerOpen ? styles.floatingEmoteBarOpen : "",
        onCooldown ? styles.floatingEmoteBarCooldown : "",
        bottomInstant ? styles.floatingEmoteBarBottomInstant : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ bottom }}
      data-open={pickerOpen ? "true" : "false"}
    >
      <button
        type="button"
        className={styles.floatingEmoteTrigger}
        aria-label={pickerOpen ? ui.play.emoteClosePickerAria : ui.play.emoteOpenPickerAria}
        title={
          onCooldown
            ? ui.play.emoteCooldown
            : pickerOpen
              ? ui.play.emoteClosePickerAria
              : ui.play.emoteOpenPickerAria
        }
        disabled={onCooldown}
        aria-expanded={pickerOpen}
        onClick={() => setPickerOpen((v) => !v)}
      >
        <span className={styles.floatingEmoteTriggerGlyph} aria-hidden>
          <img
            src="/icons/emote-icon.svg"
            alt=""
            width={24}
            height={24}
            className={[
              styles.floatingEmoteTriggerIcon,
              pickerOpen ? styles.floatingEmoteTriggerIconHidden : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
          <svg
            className={[
              styles.floatingEmoteTriggerClose,
              pickerOpen ? styles.floatingEmoteTriggerCloseVisible : "",
            ]
              .filter(Boolean)
              .join(" ")}
            viewBox="0 0 24 24"
            width={24}
            height={24}
            fill="none"
          >
            <path
              d="M7 7l10 10M17 7L7 17"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>
      <div
        className={styles.floatingEmoteChoices}
        role="group"
        aria-label={ui.play.emotePickerAria}
        aria-hidden={!pickerOpen}
      >
        {EMOTE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={styles.floatingEmoteChoice}
            tabIndex={pickerOpen && !onCooldown ? 0 : -1}
            aria-label={ui.play.emoteSendAria(id)}
            disabled={!pickerOpen || onCooldown}
            onClick={() => handleEmote(id)}
          >
            <img src={EMOTE_ICON_SRC[id]} alt="" width={40} height={40} aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
