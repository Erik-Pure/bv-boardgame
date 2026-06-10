import http from "node:http";

const url = process.env.BV_SERVER_HEALTH_URL ?? "http://127.0.0.1:3001/health";
const maxWaitMs = Number(process.env.BV_SERVER_WAIT_MS ?? 60_000);
const intervalMs = 200;
const start = Date.now();

function probe() {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

while (Date.now() - start < maxWaitMs) {
  if (await probe()) process.exit(0);
  await new Promise((r) => setTimeout(r, intervalMs));
}

console.error(`Timed out waiting for game server at ${url}`);
process.exit(1);
