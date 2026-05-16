import { useEffect, useState } from "react";
import {
  EMOTE_COOLDOWN_MS,
  EMOTE_ICON_SRC,
  EMOTE_IDS,
  type ClientAction,
  type EmoteId,
  type Player,
} from "@bv/game-core";
import { sv } from "../../lib/uiStrings";
import styles from "../../routes/PlayView.module.css";

export function WaitingTurnEmotePanel(props: {
  caption: string;
  me: Player;
  send: (action: ClientAction) => void;
}) {
  const { caption, me, send } = props;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [, setCooldownTick] = useState(0);

  const onCooldown = cooldownUntil > Date.now();

  useEffect(() => {
    if (!onCooldown) return;
    const id = window.setInterval(() => setCooldownTick((n) => n + 1), 200);
    return () => window.clearInterval(id);
  }, [onCooldown, cooldownUntil]);

  const handleEmote = (emoteId: EmoteId) => {
    if (onCooldown) return;
    setPickerOpen(false);
    send({ type: "sendEmote", playerId: me.id, emoteId });
    setCooldownUntil(Date.now() + EMOTE_COOLDOWN_MS);
  };

  return (
    <div className={styles.waitingTurnEmotePanel}>
      <div className={styles.waitingTurnEmoteRow}>
        <div className={styles.waitingTurnCaption}>{caption}</div>
        <button
          type="button"
          className={[
            styles.waitingTurnEmoteTrigger,
            onCooldown ? styles.waitingTurnEmoteTriggerCooldown : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label={sv.play.emoteOpenPickerAria}
          title={onCooldown ? sv.play.emoteCooldown : sv.play.emoteOpenPickerAria}
          disabled={onCooldown}
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((v) => !v)}
        >
          <img
            src="/icons/emote-icon.svg"
            alt=""
            width={28}
            height={28}
            aria-hidden
            className={styles.waitingTurnEmoteTriggerIcon}
          />
        </button>
      </div>
      {pickerOpen && !onCooldown ? (
        <div className={styles.waitingTurnEmotePicker} role="group" aria-label={sv.play.emotePickerAria}>
          {EMOTE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={styles.waitingTurnEmoteChoice}
              aria-label={sv.play.emoteSendAria(id)}
              onClick={() => handleEmote(id)}
            >
              <img src={EMOTE_ICON_SRC[id]} alt="" width={40} height={40} aria-hidden />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

