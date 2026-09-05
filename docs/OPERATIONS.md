# Operations Runbook

## Scope

Detta dokument beskriver P1-operativ drift för servern: metrics-tolkning, release-gates och första åtgärder vid degradering.

## Release Gates (CI)

PR/main blockeras om något av följande fallerar:

- `smoke:server` (health/ready/ws hello/admin basic).
- `e2e:server` (table/controller-flöde, idempotency, security negative paths).
- `migrate:check:server` (snapshot-migrering + roundtrip).
- `load:check:server` (SLO för p95 och error-rate).
- `check-metrics-thresholds.mjs` (operativa trösklar mot `/metrics` before/after).

## Nyckelmetrics

- `actionLatencyMs.p95`: serverns processlatens för actions.
- `actionErrors` delta: felande actions under testfönstret.
- `security.wsProtocolMismatch`: antal avvisade clients p.g.a. versionsmismatch.
- `security.wsHelloRateLimited`: anslutningar strypta av hello-rate-limit.
- `security.wsMessagesRejectedTooLarge`: WS payloads över maxstorlek.
- `persistence.snapshotSaveFailures`: snapshots som inte kunde sparas.
- `backpressureDrops` / `backpressureDisconnects`: tecken på trög klient/backpressure.

## SLO (P1 baseline)

- Action roundtrip p95: <= `300ms` i CI-loadprofil.
- Error-rate under load: <= `5%`.
- Snapshot save failures: `0` i verifieringsfönstret.

## Snabb triage

1. Öppna CI-jobbet och jämför `metrics-before.json` vs `metrics-after.json`.
2. Läs `Runtime Metrics Dashboard` i `GITHUB_STEP_SUMMARY`.
3. Vid SLO-fel:
   - kontrollera `server.log`,
   - verifiera om `actionLatencyMs.p95` steg utan motsvarande error-ökning (prestandatapp),
   - verifiera om error-rate domineras av `wsProtocolMismatch`/auth/rate-limit (klientpolicy).
4. Vid snapshot-fel:
   - verifiera filrättigheter/katalog för `ROOM_SNAPSHOT_PATH`,
   - kontrollera diskutrymme,
   - kör `npm run migrate:check:server` lokalt.

## Vanliga åtgärder

- **Hög p95 + få errors:** minska burst (client throttling), skala upp serverresurser, reducera samtidiga rooms.
- **Hög protocol mismatch:** samordna client deploy med server deploy, rensa stale clients.
- **Många hello rate-limits:** höj `HELLO_RATE_LIMIT_PER_MIN` tillfälligt vid känd trafikspik, annars undersök missbruk.
- **Backpressure disconnects:** undersök nätverk/latenta klienter, minska broadcast-volym vid behov.

## Statistik / analytics

- **UI:** olänkad sida `/stats`, lösenordsskyddad. Användaren anger lösenord i UI (sparas i `sessionStorage`); det skickas som header `x-admin-token`.
- **Lösenord:** samma värde som miljövariabeln `ADMIN_TOKEN` på servern (sätts i CapRover/hosting — lagra **inte** i git).
- **API:** `GET /admin/analytics?range=7d|30d|week|month` (samma token-krav som övriga admin-routes). Returnerar aggregerade periodmått + live-snapshot + senaste events.
- **Lagring:** append-only JSON (`ANALYTICS_PATH`, default `./.data/analytics.json`), retention ca 90 dagar. Events skrivs vid matchstart, matchslut (`playing`→`ended`) och abandon (admin-stäng / idle-prune under pågående match).
- **Tolkning:** `uniquePlayerNames` är normaliserad namnuppskattning (inte auth-konton). Historik finns först efter att instrumentation körts i produktion (ingen backfill).
- **Smoke:** när `ADMIN_TOKEN` är satt verifierar `smoke-check` även `/admin/analytics`.

