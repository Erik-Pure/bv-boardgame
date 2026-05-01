#!/usr/bin/env node
import { setTimeout as delay } from "node:timers/promises";
import { WebSocket } from "ws";

const PORT = Number(process.env.PORT ?? 3001);
const BASE_URL = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}`;
const WS_URL = process.env.WS_URL ?? `ws://127.0.0.1:${PORT}`;
const EXPECTED_PROTOCOL_VERSION = Number(process.env.PROTOCOL_VERSION ?? 1);
const ROOM_CODE = process.env.SMOKE_ROOM_CODE ?? "SMOKE1";
const AUTH_TOKEN = process.env.SERVER_AUTH_TOKEN ?? "";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "";

async function expectJsonOk(url, label) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`${label} failed: HTTP ${res.status}`);
  const json = await res.json();
  if (!json?.ok) throw new Error(`${label} failed: ok=false`);
  if (typeof json.protocolVersion !== "number") {
    throw new Error(`${label} failed: missing protocolVersion`);
  }
  if (json.protocolVersion !== EXPECTED_PROTOCOL_VERSION) {
    throw new Error(
      `${label} failed: protocol mismatch client=${EXPECTED_PROTOCOL_VERSION} server=${json.protocolVersion}`,
    );
  }
}

async function wsHelloCheck() {
  const ws = new WebSocket(WS_URL);
  const timeoutMs = 8000;
  let gotHelloAck = false;
  let gotState = false;

  const result = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("ws smoke timeout")), timeoutMs);
    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          type: "hello",
          protocolVersion: EXPECTED_PROTOCOL_VERSION,
          ...(AUTH_TOKEN ? { authToken: AUTH_TOKEN } : {}),
          roomCode: ROOM_CODE,
          playerName: "Smoke",
          as: "table",
        }),
      );
    });
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg?.type === "helloAck") {
        if (msg.protocolVersion !== EXPECTED_PROTOCOL_VERSION) {
          clearTimeout(timer);
          reject(
            new Error(
              `helloAck protocol mismatch client=${EXPECTED_PROTOCOL_VERSION} server=${String(msg.protocolVersion)}`,
            ),
          );
          return;
        }
        gotHelloAck = true;
      }
      if (msg?.type === "state") gotState = true;
      if (gotHelloAck && gotState) {
        clearTimeout(timer);
        resolve(true);
      }
    });
    ws.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  try {
    await result;
  } finally {
    try {
      ws.close();
    } catch {
      // ignore
    }
  }
}

async function main() {
  await expectJsonOk(`${BASE_URL}/health`, "health");
  await expectJsonOk(`${BASE_URL}/ready`, "ready");
  await wsHelloCheck();
  if (ADMIN_TOKEN) {
    const adminRes = await fetch(`${BASE_URL}/admin/rooms`, {
      method: "GET",
      headers: { "x-admin-token": ADMIN_TOKEN },
    });
    if (!adminRes.ok) throw new Error(`/admin/rooms failed: HTTP ${adminRes.status}`);
    const adminJson = await adminRes.json();
    if (!adminJson?.ok || !Array.isArray(adminJson.rooms)) {
      throw new Error("/admin/rooms failed: invalid payload");
    }
  }
  await delay(20);
  console.log("smoke-check ok");
}

main().catch((err) => {
  console.error("smoke-check failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
