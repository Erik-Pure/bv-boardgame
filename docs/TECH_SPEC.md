# Teknisk spec: stack, hosting och portabilitet

Komplement till [DESIGN_SPEC.md](./DESIGN_SPEC.md). Målet är **låg kostnad**, **få beroenden till en specifik leverantör** och **enkel test/deploy** utan att låsa in affärslogik i “magiska” plattforms-API:er.

| Fält | Värde |
|------|--------|
| Version | 0.6 |
| Senast uppdaterad | 2026-04-03 |

---

## 1. Mål och principer

1. **Auktoritativ server** — regler, slump och spelstate ska kunna köras i en process du kontrollerar (se designspec).
2. **Plattformsagnostisk kärna** — spelregler, state-typer och “vad som händer när en action kommer in” ska vara **ren TypeScript** utan t.ex. Vercel-, AWS- eller PartyKit-specifika imports i samma modulträd.
3. **Konfiguration via miljö** — WebSocket-URL, API-bas-URL och ev. secrets läses från `import.meta.env` / `process.env` så samma build kan peka mot lokal server, staging eller produktion.
4. **Tunna integrationslager** — nätverk (WS), persistens (Redis/DB) och deployment ska kunna bytas utan att skriva om spelet.
5. **Billigt för hobby/test** — prioritera gratisnivåer och “en liten process” framför managed everything.

---

## 2. Rekommenderad stack (v1)

| Del | Val | Varför |
|-----|-----|--------|
| **Monorepo** | npm workspaces + paket `packages/game-core` | Delad logik mellan server och klient; en källa till sanning för typer och regler. |
| **Språk** | TypeScript överallt | Snabb iteration, delade typer, bra för spelstate som JSON. |
| **Klient** | React + **Vite** | Snabb dev-server, enkel build, ingen inlåsning i en host. |
| **Rendering bräde** | **SVG** (Illustrator → exporterade filer, `<img>` mot `public/` eller inline) | Matchar grafik-pipeline, inget WebGL-beroende i v1; **SVGO** eller motsvarande för lättare assets. **PixiJS används inte initialt** — se §8. |
| **Routing / vyer** | React Router | Separation `/table` (stor skärm) vs `/play` (mobil). |
| **Game server** | **Node.js** + **Fastify** | Vanlig, billig att hosta; HTTP + WebSocket på samma process (`ws` kopplad till Fastify-servern). |
| **WebSocket** | **`ws`** med eget meddelandeformat (JSON + `type`-fält) | Minsta beroende; enkelt att byta till Socket.IO senare om du behöver automatisk reconnect/fallback. |
| **Validering** | **Zod** (server hello/actions) | Schemas för inkommande meddelanden. |

**Medvetet undviket i kärnan:** leverantörsspecifika “room”-SDK:er i `game-core`. De får bo i `apps/server` eller `packages/transport-*` om du testar dem.

---

## 3. Arkitektur (logiska lager)

```
apps/web          → UI (bord + mobil), ansluter med WS + ev. REST
apps/server       → WebSocket + session/lobby + kör game-core actions
packages/game-core → State, reducers/regler, ingen I/O
```

- **`game-core`:** pure functions: `applyAction(state, action) → { state, events }`.
- **`server`:** håller rum med `GameState`, broadcast av uppdaterad state.
- **`web`:** renderar state, skickar användarintentioner som **actions** (inte “jag har nu 999 pant”).

Det gör det möjligt att senare byta transport (t.ex. till WebTransport, Ably, PartyKit) genom att bara byta adapter i `server` / `web`.

### 3.1 SVG i webben (v1)

- **DOM-baserad** rendering (positionera tiles och pjäser med CSS/transform eller SVG `<g>`) är tillräckligt för MVP och bra för **tillgänglighet** och **enkla highlights** (CSS `filter`, klasser på noder).
- **ViewBox** i varje brädes-SVG gör skalning till olika skärmar enklare än fast pixel-grid.
- Om antalet DOM-noder eller filter senare blir **prestandaproblem**, flytta bara **renderingslagret**; **`game-core` förändras inte**.

### 3.2 Storskärmskamera (pan, zoom, fokus på aktiv spelare)

- Implementera som **ett omslutande lager** med CSS `transform: translate(...) scale(...)` med **`transform-origin: 0 0`**; inuti ligger SVG-brädet med **fasta pixelmått** (t.ex. rutnät + padding).
- **Pan:** dra med pekare; **zoom:** mushjul eller knappar; **min/max scale** i klienten.
- **Auto-fokus (implementerat):**
  - Mät **faktisk spelyta** med **`ResizeObserver`** på brädes-containern (flex-ytan — sidopanel påverkar aspect ratio).
  - Beräkna **bounding box** i SVG-koordinater för **aktiv spelares tile** och ev. **målrutor** vid `moveChoice`.
  - **Zoom:** `scale = min((viewW × margin) / boxW, (viewH × margin) / boxH)` (clampad), så hela relevanta området ryms i viewport.
  - **Pan:** med samma modell som CSS-transform ska **`cam.x = -scale × centerX`**, **`cam.y = -scale × centerY`** (inte `-centerX` utan scale — annars glider centrum vid zoom ≠ 1).
  - **Interpolering:** `requestAnimationFrame` med lerp mot `targetCam` (implementationsdetalj i `TableView`).
- **Brädes-padding:** extra **inre marginal** i SVG (`boardPad`) så **markeringsramar** och tjock **stroke** inte klipps vid SVG-kanten; **målram** kan vara **utflyttad** (`targetRingOutset`) från tile-rektangeln.
- **Koordinater:** tile-positioner i SVG inkluderar padding-offset så kamera-matte och highlights stämmer.

**Valfritt beroende:** bibliotek som `react-zoom-pan-pinch` kan minska buggar med touch — byt ut senare utan att röra `game-core`.

### 3.3 Mobilvy (`/play`): aktiv tur och lobby

- **Aktiv tur — regnbågsbakgrund:** CSS-modul `apps/web/src/styles/activeTurnRainbow.module.css` applicerar en **stor roterande `conic-gradient`** (via `transform` + keyframes) och **pulserande opacity** på ett `::before`-lager. **Endast `PlayView`** (`/play`) lägger på klassen när det är relevant (t.ex. din tur i `playing`, eller lobby när du ska bli redo); **`TableView`** (`/table`) använder **inte** samma effekt så storskärmen behåller neutral bakgrund. **`prefers-reduced-motion`:** rotation stängs av; mjuk opacity-puls kan behållas.
- **Lobby:** stats/equipment/föremål renderas bara när `GameState.phase !== "lobby"`; lobbyinstruktioner är **centrerade** (`textAlign: center` på lobby-sektionen).
- **Monsterintro:** `monsterCardStatsFromText()` (klient) parsar fiendetext; **mobil** (`CombatEnemyIntroInSheet` i `PlayView.tsx`) och **bords-overlay** (`TableCombatBoardPanel` i `TableView.tsx`) visar samma layout: **beskrivning + bild**, sedan **footer-rad** med ikoner ovanför siffror (styrka, förlust-skada/klunk, vinst pant/items).

---

## 4. Hosting, kostnad och Vercel

### 4.1 Kan man hosta på Vercel för test?

**Ja — delvis. Rekommenderad uppdelning:**

| Del | Vercel? | Kommentar |
|-----|---------|-----------|
| **Frontend (Vite-build)** | **Ja** | Statisk SPA. Repo-roten kan ha **`vercel.json`**: `installCommand: npm install`, `buildCommand: npm run -w @bv/game-core build && npm run -w web build`, `outputDirectory: apps/web/dist`, SPA-**rewrites** till `index.html`. |
| **WebSocket-spelserver (långlivad)** | **Nej, inte som klassisk serverless function** | Kör `apps/server` på Railway/Render/Fly/VPS m.m. |

**Praktiskt upplägg för billig test:**

1. Bygg enligt `vercel.json` ovan → deploy frontend på **Vercel**.
2. Sätt **`VITE_WS_URL`** (full `wss://…`-URL till spelservern). I kod: `apps/web/src/lib/ws.ts` läser `import.meta.env.VITE_WS_URL` och stödjer även query `?ws=…` för snabbtest.
3. Kör `apps/server` lokalt (`ws://127.0.0.1:3001`) eller på annan host; sätt **`HOST=0.0.0.0`** och **`PORT`** i produktion.

### 4.2 Var kan spelservern bo billigt?

Alla nedan är “portabla” i den meningen att det fortfarande är din Node-process; du byter bara deploy-mål.

| Alternativ | Ungefärlig kostnad | Kommentar |
|------------|-------------------|-----------|
| **Lokal utveckling** | 0 kr | `vite` + `node server` — bäst för iteration. |
| **Railway / Render / Fly.io** | Ofta gratis tier med begränsningar, annars några dollar/mån | En container/process med WS; enkel för hobbyprojekt. |
| **Liten VPS** (Hetzner, DigitalOcean, etc.) | Låg fast kostnad | Maximal kontroll; du administrerar OS. |
| **Cloudflare Workers + Durable Objects** | Generös gratis nivå men **annan programmeringsmodell** | Kraftfullt men mer inlåst i Cloudflare — passar bäst om du *medvetet* väljer det som primär realtidsplattform. |

**Rekommendation för att inte låsa in dig:** håll **spelservern som en vanlig Node-app** i början; deploy den dit som är billigast just nu.

### 4.3 Redis, databas

- **v1:** ofta **tillräckligt med in-memory state** i serverprocessen för lobby + aktiva partier (som i designspec).
- **Senare:** om du behöver krashtålighet eller skalning — inför **Redis** eller DB bakom ett litet interface (`RoomStore`) så `game-core` fortfarande är ren.

---

## 5. CI/CD (enkelt)

- **GitHub Actions** (gratis för publika repo): `npm install`, `npm test` (när finns), `npm run build`.
- **Vercel** kopplad till repo: auto-deploy av frontend enligt `vercel.json`.
- **Spelserver:** deploy via samma Actions till vald host, eller manuellt tills flödet stabiliserats.

---

## 6. Säkerhet (miniminivå)

- **CORS:** begränsa till din Vercel-domän + localhost i dev.
- **Lobby-kod** som hemlighet för rum — ingen “global lista över alla spel”.
- **Rate limiting** på skapande av lobby (enkel i Fastify-plugin) för att undvika missbruk på gratis hosting.
- **Ingen känslig data** i klienten; validera allt på servern.

---

## 7. Vad du kan byta ut senare utan omskrivning

| Byt ut | Om du behöver |
|--------|----------------|
| `ws` → Socket.IO | Enklare reconnect, äldre nätverk |
| SVG (DOM) → **PixiJS** / Canvas / WebGPU | Många animerade sprites, enormt bräde, eller mätbart flaskhals i äldre mobiler |
| Fastify → annan HTTP-server | Smak/prestanda |
| Vercel → Netlify/Cloudflare Pages | Bara frontend-host |
| Railway → VPS | Pris/kontroll |

**Kärnan som ska stanna:** `packages/game-core` + meddelandeformat (actions/events).

---

## 8. SVG vs spelmotor senare

Du **låser dig inte** genom att börja med SVG: spelstaten och nätverket är oförändrade. Om du senare inför PixiJS (eller annat) är det i praktiken en **ny vy** som läser samma `GameState` och samma tile-graph — planera därför att **koordinater** (tile-id, normaliserade positioner) lever i kärnan, inte bara i SVG-filen.

---

## 9. Bryggverket-boost: kamera, uppladdning och verifiering

Spelet kan (enligt [DESIGN_SPEC.md](./DESIGN_SPEC.md) §14) låta spelare **fota öl** för tillfälliga buffar. Tekniskt och juridiskt finns flera spår — välj **ett enkelt spår först** för att undvika kostnad och inlåsning.

### 9.1 Klient (mobil)

- **`getUserMedia`** (kamera) kräver **HTTPS** i produktion (och användarens tillstånd). Lokalt: `localhost` är undantaget i de flesta webbläsare.
- Alternativ: **`<input type="file" accept="image/*" capture>`** — enklare flöde på vissa enheter, fortfarande behov av tydlig integritetstext om bilden skickas någonstans.

### 9.2 Verifiering — alternativ (ökande komplexitet/kostnad)

| Metod | Fördelar | Nackdelar |
|-------|-----------|-----------|
| **A. Värd bekräftar** | Gratis, ingen ML, ingen bildlagring nödvändig; perfekt på Bryggverket med en “table host” | Kräver att värd är ärlig/uppmärksam |
| **B. Spelregel utan bild** | T.ex. “tryck för boost om du har en Bryggverket-produkt” — hedersbaserat | Ingen teknisk koppling till verklig öl |
| **C. QR/coaster-kod på plats** | Robust för “på bryggeriet”; ingen bild | Annan mekanik än foto — kräver trycksaker/process |
| **D. Moln-ML / etikettigenkänning** | Kan automatisera | Kostnad, latens, **leverantörsberoende**, träningsdata, false positives |

**Rekommendation för första implementation:** **A** eller **B**, med server-action typ `requestBeerBoost` som endast **tillåts** om värd trycker godkännande i bord-vyn, eller med hårda **tak** per spelare utan bildbevis (så spelet fortfarande är rättvist nog för vänskapsläge).

### 9.3 Integritet (GDPR-relevant)

- Om bild **skickas till server**: informera **varför**, **hur länge** den sparas (helst **inte alls** — räcker metadata/händelselog), och basera på **samtycke** där det krävs.
- Överväg **client-side resize** till låg upplösning innan ev. uppladdning om du minimerar personuppgifter i bakgrunden.

### 9.4 Spelkärna

- Modellera boost som en **server-auktoriserad effekt** (t.ex. `applyBeerBoostGranted` efter värd-bekräftelse), inte som “klienten säger att den har +5”.

---

## 10. Spelkärna: utvalda implementationer (referens)

Dokumentation av beteenden som redan finns i `packages/game-core` / klienten (för att slippa läsa all kod). Uppdatera vid refaktor.

| Område | Beskrivning |
|--------|-------------|
| **Korttext / stat** | `statDeltaText.ts`: rader som “Gold/Pant / HP / Sips” läggs bara till i korttext när värdet **faktiskt ändrats** (före → efter). |
| **Sip Snatcher** | Kort med **`choices`**: `sip_leave` (klunk + stäng) eller `fight` (sätt `pending` till vanlig combat). `handleCardOption` returnerar `completeCard` / `startCombat`; engine hanterar turbyte när kort stängs. |
| **Brewizard / Sourceress** | Vid förlust efter `combatRollAck`: `pending.phase = chooseHitMitigation` (behåll `preview*`). Klient skickar **`chooseCombatHitMitigation`** med `choice: "sip" \| "no_sip"`. Därefter `applyCombatLoss` med rätt skada och ev. +1 sip + `pushSipNotice`. |
| **PvP lika = omslag** | I `pending.type = "pvp"` används `pvpRound`; vid lika total nollställs rundans slag och båda måste skicka ny `pvpRoll` tills vinnare finns. |
| **Team battle (PvE)** | `pending.type = "combat"` kan gå via `phase = chooseTeammate` och action **`chooseCombatTeammate`** innan `enemyIntro`. Vald medkämpe (`assistId`) deltar i slag och påverkas av utfall. |
| **Loot-regler monster** | Belöning efter vinst styrs i `finalizeCombatAfterRollPreview`: de svagaste monstren droppar inget; nästan alla andra droppar items; team battle/farliga monster kan ge 2 items via sannolikhetsrullning. |
| **Nya item-typer** | Nya combat-items (Lättöl, Folköl, Krokben, Ölbomb, Baksmälla) lägger attackmods i `pending.attackMods`; `Skägget rakt bak` sätter `player.nextMoveDoubleDice` som gör att nästa `rollMove` räknar **2×** d6 innan utrustningsbonus läggs på. |
| **`confirmCard`** | Om `pending.choices?.length > 0` → fel **“Choose an option first”** (tvinga explicit val). |
| **Valuta i kod** | `Player` har fält **`gold`** i JSON/state; designspec kallar valutan **pant** i UI. Planerad refaktor: döp om till `pant` i typer + serialisering, eller mappa endast i presentation. |
| **Aktiv tur — regnbåge** | Se §3.3. **Endast** `PlayView`; `TableView` använder fortfarande färgad tur-rad under header för vems tur det är. |
| **Lobby — mobil UI** | Se §3.3: dölj inventory-stats tills `phase === "playing"`. |
| **Monsterkort — footer-stats** | Se §3.3: delad parsning + footer med `StatIcon` + värde; items-vinst kan använda textsymbol (t.ex. ◆) där `StatIcon` saknar typ. |

---

## 11. Rekommenderad nästa tekniska artefakt

När implementation startar: lägg till **`docs/NETWORK_PROTOCOL.md`** (eller motsvarande) med:

- Lista **action-typer** (t.ex. `joinLobby`, `startGame`, `rollMove`, `chooseCombatHitMitigation`, …).
- Lista **server → client events** (t.ex. `statePatch`, `turnTimer`, `error`).
- Versionering (`protocolVersion: 1`) så klient och server kan varna vid mismatch.

Det minskar friktion mellan webb- och mobilvyer.

---

## 12. Balansparametrar (teknisk referens)

Parametrar som bör hållas samlade och lätta att tweaka utan refaktor:

- **Team monster spawn chance per nivå** (ex. `0.04 / 0.09 / 0.14`).
- **Loot-tröskel för svagaste monster** (ex. `strength <= 2` ger 0 items).
- **2-item sannolikhet** för:
  - team battle (ex. `0.35`)
  - farliga monster (ex. `0.25`)
- **Definition av “farligt monster”** (ex. styrka `>= 7`).
- **Rörelse från item** (`nextMoveDoubleDice` för Skägget rakt bak; fältet `nextMoveBonus` finns kvar för kompatibilitet).

Rekommendation: flytta dessa till en dedikerad balanskonfig (t.ex. `packages/game-core/src/balance.ts`) och referera till den i både motor och dokumentation.

---

## Revisionshistorik

| Version | Datum | Notering |
|---------|--------|----------|
| 0.1 | 2025-03-24 | Första utkast: stack, portabilitet, Vercel vs WS, billiga hostingalternativ |
| 0.2 | 2025-03-24 | SVG-first utan PixiJS i v1 (§3.1, §8), §9 Bryggverket-boost (kamera/verifiering/GDPR) |
| 0.3 | 2025-03-24 | §3.2 storskärmskamera (pan/zoom, fokus aktiv spelare) |
| 0.4 | 2026-03-25 | npm workspaces; §3.2 viewport/ResizeObserver, pan=−scale×center, boardPad/ram; §4.1 `vercel.json` + `VITE_WS_URL`; §10 kärnreferens (stat-rader, Sip Snatcher, Brewizard/Sourceress, `gold`→pant i UI); omnumrering §11 |
| 0.5 | 2026-03-31 | Synk med aktuella regler: PvP omslag med rond, team battle med `chooseTeammate`, uppdaterade monster-lootregler (inkl. chans på 2 items), nya item-typer och rörelseitem (Skägget rakt bak) |
| 0.6 | 2026-04-03 | §3.3 mobil: `activeTurnRainbow` (endast PlayView), lobby döljer stats tills start, monster-footer med ikon/siffror; tabell i §10 utökad |
