#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const beforePath = process.env.METRICS_BEFORE_PATH ?? "metrics-before.json";
const afterPath = process.env.METRICS_AFTER_PATH ?? "metrics-after.json";

const MAX_ACTION_P95_MS = Number(process.env.THRESHOLD_ACTION_P95_MS ?? 200);
const MAX_ACTION_ERROR_RATE = Number(process.env.THRESHOLD_ACTION_ERROR_RATE ?? 0.1);
const MAX_WS_PROTOCOL_MISMATCH = Number(process.env.THRESHOLD_WS_PROTOCOL_MISMATCH ?? 5);
const MAX_SNAPSHOT_SAVE_FAILURES = Number(process.env.THRESHOLD_SNAPSHOT_SAVE_FAILURES ?? 0);

function assertThreshold(condition, message) {
  if (!condition) throw new Error(message);
}

function ratio(numerator, denominator) {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

async function main() {
  const [beforeRaw, afterRaw] = await Promise.all([readFile(beforePath, "utf8"), readFile(afterPath, "utf8")]);
  const before = JSON.parse(beforeRaw);
  const after = JSON.parse(afterRaw);

  const actionDelta = Math.max(0, Number(after.actionsHandled ?? 0) - Number(before.actionsHandled ?? 0));
  const actionErrDelta = Math.max(0, Number(after.actionErrors ?? 0) - Number(before.actionErrors ?? 0));
  const actionErrRate = ratio(actionErrDelta, actionDelta);

  const actionP95 = Number(after.actionLatencyMs?.p95 ?? 0);
  assertThreshold(actionP95 <= MAX_ACTION_P95_MS, `action p95 too high: ${actionP95}ms > ${MAX_ACTION_P95_MS}ms`);
  assertThreshold(
    actionErrRate <= MAX_ACTION_ERROR_RATE,
    `action error rate too high: ${actionErrRate.toFixed(4)} > ${MAX_ACTION_ERROR_RATE}`,
  );

  const protocolMismatch = Number(after.security?.wsProtocolMismatch ?? 0);
  assertThreshold(
    protocolMismatch <= MAX_WS_PROTOCOL_MISMATCH,
    `protocol mismatches too high: ${protocolMismatch} > ${MAX_WS_PROTOCOL_MISMATCH}`,
  );

  const snapshotSaveFailures = Number(after.persistence?.snapshotSaveFailures ?? 0);
  assertThreshold(
    snapshotSaveFailures <= MAX_SNAPSHOT_SAVE_FAILURES,
    `snapshot save failures too high: ${snapshotSaveFailures} > ${MAX_SNAPSHOT_SAVE_FAILURES}`,
  );

  console.log("metrics-thresholds ok");
}

main().catch((err) => {
  console.error("metrics-thresholds failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
