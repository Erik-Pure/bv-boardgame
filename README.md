# Bryggmästarnas Mästare (MVP)

Webbaserat brädspel (bordvy + mobilkontroller) enligt `docs/DESIGN_SPEC.md` och `docs/TECH_SPEC.md`.

## Kom igång (lokalt)

Krav: Node.js (rekommenderat 20+).

Installera dependencies:

```bash
npm install
```

Starta server + webb:

```bash
npm run dev
```

Öppna:

- **Bordvy:** `http://localhost:5173/table?room=ABC123&name=Table`
- **Spelare (mobil):** `http://localhost:5173/play?room=ABC123&name=DittNamn`

Alternativt börja på startsidan:

- `http://localhost:5173/`

## Konfiguration

- **WebSocket URL:** sätt `VITE_WS_URL` (t.ex. `ws://localhost:3001`) om du kör servern på annan host/port än standard.
- **Serverport:** `PORT` (default `3001`)

## MVP-funktioner (i denna prototyp)

- Lobby med kod (första spelaren blir värd).
- Turordning och tärningsrörelse.
- Slumpade tiles per nivå (event/combat/merchant/rest/treasure/door/boss).
- PvE-strid och enkel PvP när två spelare hamnar på samma ruta.
- Affär (köp items/heal).
- Door/nivåbyte via bekräftelse när level-krav uppnåtts.
- Bordkamera: pan/zoom och auto-fokus på aktiv spelare (enkel grid-mappning i v1).

## Noteringar

Det här är en **MVP** med placeholders: brädet renderas som enkel SVG-grid och loggen är primär feedback. Nästa steg är att koppla dina Illustrator-SVG:er till tile-id:n och förbättra UI/UX.

