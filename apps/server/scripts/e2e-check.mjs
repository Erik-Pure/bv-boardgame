#!/usr/bin/env node
import { setTimeout as delay } from "node:timers/promises";
import { WebSocket } from "ws";

const PORT = Number(process.env.PORT ?? 3001);
const BASE_URL = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}`;
const WS_URL = process.env.WS_URL ?? `ws://127.0.0.1:${PORT}`;
const PROTOCOL_VERSION = Number(process.env.PROTOCOL_VERSION ?? 1);
const SERVER_AUTH_TOKEN = process.env.SERVER_AUTH_TOKEN ?? "";
const BAD_AUTH_TOKEN = process.env.BAD_AUTH_TOKEN ?? "__invalid__";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createClient() {
  const ws = new WebSocket(WS_URL);
  return ws;
}

async function waitForOpen(ws, timeoutMs = 4000) {
  if (ws.readyState === ws.OPEN) return;
  await new Promise((resolve, reject) => {
    const tid = setTimeout(() => reject(new Error("ws open timeout")), timeoutMs);
    ws.once("open", () => {
      clearTimeout(tid);
      resolve(true);
    });
    ws.once("error", (err) => {
      clearTimeout(tid);
      reject(err);
    });
  });
}

async function waitForMessage(inbox, predicate, timeoutMs = 5000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const idx = inbox.findIndex(predicate);
    if (idx >= 0) {
      const [msg] = inbox.splice(idx, 1);
      return msg;
    }
    await delay(20);
  }
  throw new Error("timeout waiting for expected message");
}

async function connectAndHello({ roomCode, playerName, as = "controller", authToken = SERVER_AUTH_TOKEN }) {
  const ws = createClient();
  const inbox = [];
  ws.on("message", (raw) => {
    try {
      inbox.push(JSON.parse(String(raw)));
    } catch {
      // ignore
    }
  });
  await waitForOpen(ws);
  ws.send(
    JSON.stringify({
      type: "hello",
      protocolVersion: PROTOCOL_VERSION,
      ...(authToken ? { authToken } : {}),
      roomCode,
      playerName,
      as,
    }),
  );
  const helloAck = await waitForMessage(inbox, (m) => m?.type === "helloAck");
  const state = await waitForMessage(inbox, (m) => m?.type === "state");
  return { ws, inbox, helloAck, state };
}

async function testHealthAndReady() {
  const [healthRes, readyRes] = await Promise.all([fetch(`${BASE_URL}/health`), fetch(`${BASE_URL}/ready`)]);
  assert(healthRes.ok, "health endpoint failed");
  assert(readyRes.ok, "ready endpoint failed");
  const health = await healthRes.json();
  const ready = await readyRes.json();
  assert(health.protocolVersion === PROTOCOL_VERSION, "health protocol mismatch");
  assert(ready.protocolVersion === PROTOCOL_VERSION, "ready protocol mismatch");
}

async function testControllerAndTableInterop() {
  const roomCode = "E2ECI1";
  const table = await connectAndHello({ roomCode, playerName: "Table", as: "table" });
  const controller = await connectAndHello({ roomCode, playerName: "Alice", as: "controller" });
  assert(typeof controller.helloAck.playerId === "string", "controller missing playerId");
  const pid = controller.helloAck.playerId;

  controller.ws.send(
    JSON.stringify({
      type: "action",
      actionId: "e2e-set-ready-1",
      action: { type: "setReady", playerId: pid, ready: true },
    }),
  );
  const deltaFromTable = await waitForMessage(
    table.inbox,
    (m) =>
      m?.type === "stateDelta" &&
      m.patch?.players?.some?.((p) => p.id === pid && p.ready === true),
  );
  assert(deltaFromTable, "table did not observe ready=true");

  const beforeCount = table.inbox.filter((m) => m?.type === "stateDelta").length;
  controller.ws.send(
    JSON.stringify({
      type: "action",
      actionId: "e2e-set-ready-1",
      action: { type: "setReady", playerId: pid, ready: false },
    }),
  );
  await delay(250);
  const afterCount = table.inbox.filter((m) => m?.type === "stateDelta").length;
  assert(afterCount === beforeCount, "duplicate actionId unexpectedly changed state");

  table.ws.close();
  controller.ws.close();
}

async function testSecurityNegativePaths() {
  const badTokenWs = createClient();
  const badTokenMsgs = [];
  badTokenWs.on("message", (raw) => badTokenMsgs.push(JSON.parse(String(raw))));
  await waitForOpen(badTokenWs);
  badTokenWs.send(
    JSON.stringify({
      type: "hello",
      protocolVersion: PROTOCOL_VERSION,
      authToken: BAD_AUTH_TOKEN,
      roomCode: "E2EBAD",
      playerName: "Bad",
      as: "controller",
    }),
  );
  await delay(200);
  assert(badTokenMsgs.some((m) => m.type === "error"), "missing error on bad token");
  badTokenWs.close();

  const badProtocolWs = createClient();
  const badProtocolMsgs = [];
  badProtocolWs.on("message", (raw) => badProtocolMsgs.push(JSON.parse(String(raw))));
  await waitForOpen(badProtocolWs);
  badProtocolWs.send(
    JSON.stringify({
      type: "hello",
      protocolVersion: PROTOCOL_VERSION + 100,
      ...(SERVER_AUTH_TOKEN ? { authToken: SERVER_AUTH_TOKEN } : {}),
      roomCode: "E2EBAD2",
      playerName: "BadProto",
      as: "controller",
    }),
  );
  await delay(200);
  assert(badProtocolMsgs.some((m) => m.type === "error"), "missing error on bad protocol");
  badProtocolWs.close();
}

async function testStartGameRequiresTable() {
  const roomCode = "E2ENST";
  const host = await connectAndHello({ roomCode, playerName: "Host", as: "controller" });
  const guest = await connectAndHello({ roomCode, playerName: "Guest", as: "controller" });
  const hostId = host.helloAck.playerId;
  const guestId = guest.helloAck.playerId;

  host.ws.send(
    JSON.stringify({
      type: "action",
      actionId: "e2e-host-ready",
      action: { type: "setReady", playerId: hostId, ready: true },
    }),
  );
  guest.ws.send(
    JSON.stringify({
      type: "action",
      actionId: "e2e-guest-ready",
      action: { type: "setReady", playerId: guestId, ready: true },
    }),
  );
  await delay(100);

  host.ws.send(
    JSON.stringify({
      type: "action",
      actionId: "e2e-start-no-table",
      action: { type: "startGame", playerId: hostId },
    }),
  );
  const err = await waitForMessage(host.inbox, (m) => m?.type === "error");
  assert(
    typeof err.message === "string" && err.message.includes("Storskärmen"),
    "startGame without table should fail",
  );

  host.ws.close();
  guest.ws.close();
}

async function main() {
  await testHealthAndReady();
  await testControllerAndTableInterop();
  await testStartGameRequiresTable();
  await testSecurityNegativePaths();
  console.log("e2e-check ok");
}

main().catch((err) => {
  console.error("e2e-check failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
