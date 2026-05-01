#!/usr/bin/env node

const PORT = Number(process.env.PORT ?? 3001);
const BASE_URL = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}`;
const AUTH_EMAIL = process.env.AUTH_SMOKE_EMAIL ?? "smoke@example.com";
const AUTH_CODE = process.env.AUTH_TEST_OTP_CODE ?? "123456";

function cookieFromSetCookie(setCookieHeader) {
  if (!setCookieHeader) return "";
  const first = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return String(first).split(";")[0] ?? "";
}

async function main() {
  const req = await fetch(`${BASE_URL}/auth/otp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: AUTH_EMAIL }),
  });
  if (!req.ok) throw new Error(`otp request failed: ${req.status}`);

  const verify = await fetch(`${BASE_URL}/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: AUTH_EMAIL, code: AUTH_CODE }),
  });
  if (!verify.ok) throw new Error(`otp verify failed: ${verify.status}`);
  const cookie = cookieFromSetCookie(verify.headers.get("set-cookie"));
  if (!cookie) throw new Error("missing session cookie on verify");

  const me = await fetch(`${BASE_URL}/auth/me`, { headers: { Cookie: cookie } });
  const meJson = await me.json();
  if (!me.ok || !meJson?.authenticated) throw new Error("auth me did not return authenticated session");

  const logout = await fetch(`${BASE_URL}/auth/logout`, { method: "POST", headers: { Cookie: cookie } });
  if (!logout.ok) throw new Error(`logout failed: ${logout.status}`);

  console.log("auth-smoke ok");
}

main().catch((err) => {
  console.error("auth-smoke failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
