# Bryggmästarnas Mästare — Monetisering och implementation

Det här dokumentet samlar idéer för gratis- och betalvarianter samt ett praktiskt förslag på hur det kan byggas i nuvarande arkitektur.

---

## 1) Paketering

### Gratisvariant

- Max antal spelare: **4**
- Bara **1 slutboss** (fast boss-pool / ingen variation)
- **1 spel per vecka** (host-begränsning per konto/enhet)

### Betalvariant

Två betalnivåer:

- **24h-pass** (tidsbegränsad premium)
- **Lifetime** (permanent premium)

Premium-funktioner:

- Se kortkatalog och kunna inaktivera vissa kort
- Ställa in svårighetsgrad
- Hardcore-läge (ingen omstart vid död)
- Max antal spelare: **8**
- Välja antal nivåer
- Cosmetics:
  - Teman
  - Uppladdad profilbild som spelpjäs
  - Sparade lobbyinställningar
  - Snabb rematch
  - Custom cardcover (kort som flippar fram)

Lifetime-exklusivt:

- Speciell spelpjäs
- Markering vid spelarens namn (t.ex. badge + valbar regnbågsskimrande text)

---

## 2) Produktprinciper (för att gratis inte ska kännas tråkigt)

- Behåll hela kärnloopen i gratis (rörelse, strid, boss, socialt spel).
- Begränsa bredd och bekvämlighet, inte grundmekanik.
- Aldrig paywall mitt i en pågående match.
- Visa tydligt vad premium låser upp i host-inställningar.

---

## 3) Tekniskt förslag (MVP)

## 3.1 Konton och licens

Minimikrav för robust betalning:

- Lägg till ett stabilt **host-id**:
  - Primärt: inloggat konto
  - Fallback: signerad device-id-cookie
- Betalning (t.ex. Stripe Checkout) skriver licens i backend.

### Rekommenderad auth-strategi (låg friktion)

Mål: robust licenskoppling utan “tung” registrering.

- **Primär metod:** passwordless (e-postkod/magic link)
- **Alternativ:** Google/Apple-inloggning
- **Undvik som enda lösning:** ren device-id för betalande användare

Föreslaget flöde:

1. Host kan testa gratis utan konto (valfritt).
2. Vid premium-åtgärd (köp, låst reglage, veckolimit) visas “Lås upp premium”.
3. Innan checkout: snabb auth (magic link eller OAuth).
4. Entitlement knyts till `user_id` efter lyckad betalning.
5. Nästa gång känner servern igen hosten via session/JWT och aktiverar premium direkt.

Varför:

- Lägre friktion än lösenord.
- Stabil återställning vid ny enhet/bläddare.
- Bättre support (“jag tappade telefonen”) än device-only.

Minimal datalagring för passwordless:

- `users.id`
- `users.email` (normaliserad)
- `auth_sessions` (token/session expiry)
- ev. `oauth_provider` + `oauth_subject` om social login används

GDPR-praktik (kort):

- Spara minsta möjliga persondata.
- Tydlig privacy-text vid login/köp.
- Möjlighet till kontoborttagning/export på sikt.

Datamodell (förslag):

- `users`
  - `id`
  - `created_at`
  - `display_name`
- `entitlements`
  - `user_id`
  - `tier`: `free | pass_24h | lifetime`
  - `valid_until` (null för lifetime)
  - `source` (`stripe_checkout`, etc)
- `usage_counters`
  - `user_id`
  - `week_key` (ex `2026-W18`)
  - `hosted_games_started`
- `cosmetics`
  - `user_id`
  - `theme_id`
  - `piece_asset_url`
  - `card_cover_id`
  - `name_effect` (`none | rainbow`)

---

## 3.2 Enforcements i servern

Gate ska ligga i servern (inte bara UI), annars går det att kringgå.

### A) Starta spel (`startGame`)

1. Hämta hostens entitlement
2. Avgör aktiv tier:
   - `lifetime` alltid premium
   - `pass_24h` premium om `now < valid_until`
   - annars free
3. Validera regler:
   - Free: `playerCount <= 4`
   - Free: endast tillåten slutboss-pool
   - Free: `hosted_games_started` för aktuell vecka < 1
4. Vid godkänt: increment usage counter för veckan
5. Vid nekat: returnera tydligt felmeddelande till klient

### B) Lobbykonfiguration

När host ändrar regler i lobby:

- Free: dölj/lås premiumreglage i UI
- Server: avvisa ändå premiuminställningar om de skickas

---

## 3.3 Veckobegränsning (1 spel/vecka)

Alternativ:

- **Bästa**: konto-baserad veckokvot (svår att exploita)
- **Enklaste initialt**: device-id + IP heuristik (kan kringgås)

Rekommendation:

- Kör konto om möjligt.
- Om konto saknas i v1: börja med device-id och acceptera att det inte är vattentätt.

Pseudo:

1. Beräkna `week_key` i UTC.
2. `usage = hosted_games_started(user_id, week_key)`
3. Free + `usage >= 1` => blockera med upsell.

---

## 3.4 Premiumfunktioner mappade till implementation

- **Inaktivera kort**
  - Lägg `disabledCardIds` i lobby-config
  - Validera i server före draw/play
  - UI i host-inställningar

- **Svårighetsgrad**
  - Lägg `difficulty` i config (`easy|normal|hard`)
  - Skala monsterstyrka/skada/rewards i engine via multipliers

- **Hardcore**
  - Flagga `hardcore: true`
  - När HP <= 0: ingen “retry”-gren, endast elimination

- **Maxspelare 8**
  - Redan delvis stöd i core; lås till 4 för free i server-gate

- **Antal nivåer**
  - `levelCount` i config
  - `generateLevels(seed, players, levelCount)`
  - Balansjustering av loot/monster per nivå

- **Teman**
  - Theme-token i `TableView`/`PlayView` via CSS variables
  - Theme whitelist per entitlement

- **Profilbild som pjäs**
  - Filuppladdning (S3/R2)
  - Bildvalidering + resize + moderering
  - URL i player profile

- **Sparade lobbyinställningar**
  - `saved_lobby_presets` per user
  - “Spara preset” / “Ladda preset”

- **Snabb rematch**
  - Ny server-action: `startRematch(roomId)`
  - Återanvänder spelare + senaste config

- **Custom cardcover**
  - `cardCoverId` i profile/lobby
  - Konsumeras av flip-komponent

- **Lifetime-markering**
  - Badge (`Lifetime Founder`)
  - Valbar name-effect `rainbow` i UI-inställning

---

## 4) UI/UX-förslag för köpflöde

- Host klickar premium-låst reglage => modal:
  - “Lås upp i 24h (20 kr)”
  - “Lifetime (500 kr)”
  - “Fortsätt gratis”
- Vid free-limit träff:
  - Beskriv exakt vad som stoppar (t.ex. “Free tillåter 1 start/vecka”)
  - En knapp till checkout

---

## 5) Rollout-plan (låg risk)

### Fas 1 — Entitlement bas

- Datamodell
- Stripe checkout + webhook
- Server-gate för free/premium

### Fas 2 — Free-gränser

- 4 spelare max
- 1 start/vecka
- 1 slutboss i free

### Fas 3 — Premium regler

- Difficulty
- Hardcore
- LevelCount
- Disabled cards

### Fas 4 — Cosmetics + QoL

- Teman
- Profilbild/spelpjäs
- Cardcover
- Sparade presets
- Snabb rematch
- Lifetime-badge + namn-effekt

---

## 6) Risker och rekommendationer

- Undvik client-only gates (lätt att manipulera).
- Veckobegränsning utan konto är svagare mot missbruk.
- Profilbild kräver moderering/abuse-skydd.
- Börja med regler och entitlements (hög effekt, låg komplexitet), lägg cosmetics efter.

---

## 7) Beslut att ta innan implementation

- Ska konto vara krav för host?
- Ska 24h-pass starta direkt vid köp, eller vid första lobbystart?
- Ska 1 spel/vecka räknas vid `startGame` eller vid `createLobby`?
- Ska free verkligen ha exakt 1 slutboss, och vilken?
- Vill ni ha “founder”-status för alla lifetime-köp eller tidsbegränsat erbjudande?

