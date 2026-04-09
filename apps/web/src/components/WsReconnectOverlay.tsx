import type { WsOverlayPhase } from "../lib/useWsGameClient";
import styles from "./WsReconnectOverlay.module.css";

/** Kompakt footertext (mobil) — ingen spinner, ingen stor knapp. */
export function WsReconnectFooterHint(props: {
  phase: WsOverlayPhase;
  attempt: number;
  connectingShort: string;
  waitingShort: (attemptN: number) => string;
  retryLabel: string;
  onRetry: () => void;
}) {
  const waiting = props.phase === "waiting_retry";
  const line = waiting ? props.waitingShort(props.attempt) : props.connectingShort;
  return (
    <div className={styles.footerHint} role="status" aria-live="polite" aria-busy="true">
      <span className={styles.footerHintText}>{line}</span>
      <button type="button" className={styles.textLinkBtn} onClick={() => props.onRetry()}>
        {props.retryLabel}
      </button>
    </div>
  );
}
