#!/usr/bin/env node
import { setTimeout as delay } from "node:timers/promises";
import { WebSocket } from "ws";

const PORT = Number(process.env.PORT ?? 3001);
const WS_URL = process.env.WS_URL ?? `ws://127.0.0.1:${PORT}`;
const PROTOCOL_VERSION = Number(process.env.PROTOCOL_VERSION ?? 1);
const SERVER_AUTH_TOKEN = process.env.SERVER_AUTH_TOKEN ?? "";

const CLIENTS = Number(process.env.LOAD_CLIENTS ?? 12);
const ACTIONS_PER_CLIENT = Number(process.env.LOAD_ACTIONS_PER_CLIENT ?? 12);
const ACTION_INTERVAL_MS = Number(process.env.LOAD_ACTION_INTERVAL_MS ?? 35);

const SLO_P95_MS = Number(process.env.SLO_P95_MS ?? 250);
const SLO_ERROR_RATE_MAX = Number(process.env.SLO_ERROR_RATE_MAX ?? 0.02);

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] ?? 0;
}

function toStats(values) {
  return {
    count: values.length,
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    p99: percentile(values, 99),
    max: values.length ? Math.max(...values) : 0,
  };
}

function waitForOpen(ws, timeoutMs = 5000) {
  if (ws.readyState === ws.OPEN) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const tid = setTimeout(() => reject(new Error("ws open timeout")), timeoutMs);
    ws.once("open", () => {
      clearTimeout(tid);
      resolve();
    });
    ws.once("error", (err) => {
      clearTimeout(tid);
      reject(err);
    });
  });
}

async function createClient(index) {
  const ws = new WebSocket(WS_URL);
  const stateTimes = [];
  const waiting = [];
  let playerId = null;
  let helloAcked = false;
  let errors = 0;

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (msg?.type === "helloAck") {
      helloAcked = true;
      playerId = msg.playerId;
      return;
    }
    if (msg?.type === "state" || msg?.type === "stateDelta") {
      if (waiting.length > 0) {
        const startedAt = waiting.shift();
        stateTimes.push(Date.now() - startedAt);
      }
      return;
    }
    if (msg?.type === "error") errors += 1;
  });

  await waitForOpen(ws);
  ws.send(
    JSON.stringify({
      type: "hello",
      protocolVersion: PROTOCOL_VERSION,
      ...(SERVER_AUTH_TOKEN ? { authToken: SERVER_AUTH_TOKEN } : {}),
      roomCode: "LOAD01",
      playerName: `Load${index}`,
      as: "controller",
    }),
  );

  const startWait = Date.now();
  while (!helloAcked || !playerId) {
    if (Date.now() - startWait > 5000) throw new Error("hello timeout in load-check");
    await delay(20);
  }

  return { ws, playerId, waiting, stateTimes, getErrors: () => errors };
}

async function runLoad() {
  const clients = await Promise.all([...Array(CLIENTS)].map((_, i) => createClient(i + 1)));
  let attempted = 0;
  for (let round = 0; round < ACTIONS_PER_CLIENT; round += 1) {
    for (const c of clients) {
      attempted += 1;
      c.waiting.push(Date.now());
      c.ws.send(
        JSON.stringify({
          type: "action",
          actionId: `load-${c.playerId}-${round}`,
          action: { type: "setReady", playerId: c.playerId, ready: round % 2 === 0 },
        }),
      );
      await delay(ACTION_INTERVAL_MS);
    }
  }

  await delay(900);
  const latencies = clients.flatMap((c) => c.stateTimes);
  const errors = clients.reduce((sum, c) => sum + c.getErrors(), 0);
  for (const c of clients) c.ws.close();

  const stats = toStats(latencies);
  const timeoutOrMisses = Math.max(0, attempted - latencies.length);
  const effectiveErrors = errors + timeoutOrMisses;
  const errorRate = attempted > 0 ? effectiveErrors / attempted : 1;

  return { attempted, observed: latencies.length, errors: effectiveErrors, errorRate, latency: stats };
}

async function main() {
  const result = await runLoad();
  console.log(JSON.stringify(result, null, 2));
  if (result.latency.p95 > SLO_P95_MS) {
    throw new Error(`p95 ${result.latency.p95}ms exceeds SLO ${SLO_P95_MS}ms`);
  }
  if (result.errorRate > SLO_ERROR_RATE_MAX) {
    throw new Error(`errorRate ${result.errorRate.toFixed(4)} exceeds SLO ${SLO_ERROR_RATE_MAX}`);
  }
}

main().catch((err) => {
  console.error("load-check failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
