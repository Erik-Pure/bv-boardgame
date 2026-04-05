import type { WsOverlayPhase } from "../lib/useWsGameClient";
import styles from "./WsReconnectOverlay.module.css";

export function WsReconnectOverlay(props: {
  show: boolean;
  phase: WsOverlayPhase;
  attempt: number;
  connectingLabel: string;
  waitingRetryLabel: string;
  attemptLabel: (n: number) => string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  if (!props.show) return null;
  const waiting = props.phase === "waiting_retry";
  return (
    <div className={styles.overlay} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.spinner} aria-hidden />
      <p className={styles.title}>{waiting ? props.waitingRetryLabel : props.connectingLabel}</p>
      {waiting && props.attempt > 0 ? (
        <p className={styles.sub}>{props.attemptLabel(props.attempt)}</p>
      ) : null}
      {props.onRetry && props.retryLabel ? (
        <button type="button" className={styles.retry} onClick={() => props.onRetry?.()}>
          {props.retryLabel}
        </button>
      ) : null}
    </div>
  );
}
