#!/usr/bin/env node
import { appendFile, readFile } from "node:fs/promises";

const beforePath = process.env.METRICS_BEFORE_PATH ?? "metrics-before.json";
const afterPath = process.env.METRICS_AFTER_PATH ?? "metrics-after.json";
const summaryPath = process.env.GITHUB_STEP_SUMMARY;

function delta(after, before) {
  return Number(after ?? 0) - Number(before ?? 0);
}

async function main() {
  const [beforeRaw, afterRaw] = await Promise.all([readFile(beforePath, "utf8"), readFile(afterPath, "utf8")]);
  const before = JSON.parse(beforeRaw);
  const after = JSON.parse(afterRaw);

  const lines = [
    "## Runtime Metrics Dashboard",
    "",
    "| Metric | Before | After | Delta |",
    "|---|---:|---:|---:|",
    `| Actions handled | ${before.actionsHandled ?? 0} | ${after.actionsHandled ?? 0} | ${delta(after.actionsHandled, before.actionsHandled)} |`,
    `| Action errors | ${before.actionErrors ?? 0} | ${after.actionErrors ?? 0} | ${delta(after.actionErrors, before.actionErrors)} |`,
    `| Action latency p95 (ms) | ${before.actionLatencyMs?.p95 ?? 0} | ${after.actionLatencyMs?.p95 ?? 0} | ${delta(after.actionLatencyMs?.p95, before.actionLatencyMs?.p95)} |`,
    `| Backpressure drops | ${before.backpressureDrops ?? 0} | ${after.backpressureDrops ?? 0} | ${delta(after.backpressureDrops, before.backpressureDrops)} |`,
    `| WS protocol mismatch | ${before.security?.wsProtocolMismatch ?? 0} | ${after.security?.wsProtocolMismatch ?? 0} | ${delta(after.security?.wsProtocolMismatch, before.security?.wsProtocolMismatch)} |`,
    `| Snapshot save failures | ${before.persistence?.snapshotSaveFailures ?? 0} | ${after.persistence?.snapshotSaveFailures ?? 0} | ${delta(after.persistence?.snapshotSaveFailures, before.persistence?.snapshotSaveFailures)} |`,
    "",
  ];

  if (summaryPath) {
    await appendFile(summaryPath, `${lines.join("\n")}\n`, "utf8");
  } else {
    console.log(lines.join("\n"));
  }
}

main().catch((err) => {
  console.error("write-metrics-summary failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
