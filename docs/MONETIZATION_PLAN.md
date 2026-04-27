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

### 2.1) Startsidan (`/`) och premium

**Mål:** Få folk in i spelet direkt; låt pris/premium vara sekundärt men inte gömt.

- **Primär yta:** Behåll tydligt fokus på *Gå med* / *Skapa lobby* — samma jobb som idag (snabb session, ofta in via länk).
- **Undvik:** Stora pris-widgetar eller checkout ovanför huvudhandlingarna — risk att det känns som att man måste “förstå affären” innan man får spela.
- **Sekundär ingång:** En diskret länk i linje med övrig footer (t.ex. bredvid Kort / Regler): **«Priser & premium»** eller **«Premium»** → egen sida (`/premium`) eller ankarlänk längre ned på startsidan. Där kan jämförelse 24h vs lifetime, punktlista över vad som låses upp, kort privacy-stubb, utan att göra om hela Home.
- **Valfri ärlighetsrad:** En mening under logotyp eller host-block, t.ex. att gratis inkluderar upp till 4 spelare m.m., med länk *«Vad ingår i premium?»* — bygger förtroende och matchar att gratis inte ska kännas “lurat”, utan att startsidan blir en SaaS-landningssida.
- **Detaljerad upsell:** Spara för **host-inställningar** och **köp-modal** när användaren faktiskt rör vid låsta reglage eller träffar veckolimit (se §4) — i linje med *aldrig paywall mitt i match*.
- **Senare (inloggat läge):** Tunn statusrad på Home när ni vet tier, t.ex. kvarvarande gratisspel per vecka eller *«Premium aktiv till …»* — kan vänta till konto finns i produktion.

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

### Inloggning — hur vi bäst löser det

**Grundprincip:** *Utökad* identitet först när den behövs — spela/hosta gratis utan konto om ni vill, men **koppla köp och veckokvot till konto** (§3.3). Det minskar friktion och gör Stripe/webhooks enklare.

**Rekommenderad ordning för användaren**

1. **Först:** Spel/lobby som idag (ev. med device-cookie för anonym host tills ni kräver konto).
2. **Vid köp eller hård gräns:** Visa “Logga in för att fortsätta” / “Lås upp premium” → auth → sedan Stripe Checkout (eller inbäddat flöde om ni väljer det).
3. **Efter köp:** Server sätter `entitlements`; klienten får session som följer med till nästa lobby.

**Metoder (välj 1–2 till att börja med)**

| Metod | Fördel | Nackdel |
|--------|--------|---------|
| **E-post + engångskod (OTP)** | Funkar utmärkt på mobil utan att lämna webbläsaren; ingen “öppna mail i annan app” om koden klistras in | Kräver e-postleverans (Resend/Sendgrid m.fl.) |
| **Magic link** | Lite mindre kod på klientsidan | På mobil ofta “byt app till mejl” → högre drop |
| **Google-inloggning** | Låg friktion för många | Vissa vill inte koppla Google; policy/tonår |
| **Apple** | Bra på iOS / PWA-krav från Apple | Mer setup om ni bara har webb |

**Praktisk MVP-rekommendation:** **E-post-OTP** som primär + **Google** som alternativ. Magic link som backup om ni redan har infrastruktur. Lösenord som huvudväg undviks (återställning, svag lösenordskultur).

**Session mot er stack**

- **httpOnly, Secure, SameSite=Lax** (eller Strict om alla flöden är same-origin) cookie som bär session-id eller kortlivad JWT **server-validerad** vid varje WS `hello` / REST som behöver identitet.
- **Samma origin** för `apps/web` och API underlättar: en cookie räcker för både bord och mobil-spel om de delar domän.
- **Utloggning / utgång:** kort TTL + refresh i httpOnly cookie, eller rotationsbar session-tabell (ni nämnde redan `auth_sessions`).

**Bygga själv vs hyrd auth**

- **Hyrt (snabb MVP):** Clerk, Supabase Auth, Stytch, WorkOS User Management — får OTP/OAuth, rate limits och ofta webhook till er egen DB för `user_id`. Kostnad vs tid.
- **Själv (mer kontroll):** t.ex. egen tabell `users` + `auth_sessions` + e-postleverantör; OAuth via bibliotek. Mer arbete med säkerhet (CSRF, rate limit, e-postfiske).

**Spelare som bara join:ar** behöver inte konto för premium *hos värden* om endast host-begränsningar och host-köp gäller; lås då aldrig “join” bakom login om ni inte måste (GDPR/ålder kan vara separat, t.ex. befintlig åldersgrind).

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

Se även **§2.1** för startsidans roll; här: ögonblicket när något är låst eller limit träffas.

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

- Drift: se **Appendix B** (Vercel + CapRover, `DATABASE_URL`, CORS/cookies, Stripe-webhook).
- Vilken auth-leverantör eller egen implementation? (OTP-leverantör, OAuth-appar)
- Ska konto vara krav för host?
- Ska 24h-pass starta direkt vid köp, eller vid första lobbystart?
- Ska 1 spel/vecka räknas vid `startGame` eller vid `createLobby`?
- Ska free verkligen ha exakt 1 slutboss, och vilken?
- Vill ni ha “founder”-status för alla lifetime-köp eller tidsbegränsat erbjudande?

---

## Appendix A) Stripe: koppla köp till `user_id` (Checkout + webhook)

Det här är ett konkret mönster som fungerar oavsett om användaren loggat in med **Google**, **e-post-OTP** eller annat — ni har alltid ett internt `users.id` innan ni öppnar Checkout.

### A.1 Skapa Checkout Session (server → Stripe)

Anropa Stripe **Checkout Session** (`mode: payment` för engångsköp av 24h-pass eller lifetime) **endast** när användaren har en giltig session hos er.

**Sätt minst:**

| Fält | Syfte |
|------|--------|
| `client_reference_id` | Er `user_id` (UUID). Syns i Stripe Dashboard; enkel supportlookup. |
| `metadata.user_id` | Samma värde — webhook-payload innehåller metadata tillförlitligt för er logik. |
| `metadata.tier` | T.ex. `pass_24h` eller `lifetime` — så ni vet vilken produkt som köpts utan att gissa på `line_items`. |
| `metadata.price_id` | (Valfritt) Stripe `price_…` om ni vill spåra vilket pris som valdes. |
| `customer_email` | (Valfritt) Från användarprofil; underlättar kvitto. **Sanning för premium = er DB**, inte bara e-post. |
| `success_url` / `cancel_url` | Tillbaka till er webb; success kan vara generisk “Tack” som pollar entitlement. |

**Exempel (metadata):**

```json
{
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "tier": "pass_24h"
}
```

`client_reference_id` sätts till samma sträng som `user_id` (Stripe accepterar begränsad längd; UUID är OK).

### A.2 Webhook: var ni skriver `entitlements`

Lyssna på **`checkout.session.completed`** (lämpligt för Checkout). Verifiera alltid **`Stripe-Signature`** med er webhook secret — aldrig lita på klienten.

**I handlern:**

1. Parsa event; vid `checkout.session.completed` läs `session.metadata.user_id` (fallback: `session.client_reference_id`).
2. Läs `session.metadata.tier` (eller härled från `session.line_items` om ni föredrar det).
3. **Idempotens:** spara Stripe `event.id` (eller `session.payment_intent`) i en tabell `stripe_processed_events` innan ni ändrar `entitlements`. Om event redan finns → returnera 200 utan dubbel skrivning.
4. Uppdatera `entitlements` för det `user_id`:
   - **`lifetime`:** `tier = lifetime`, `valid_until = null`, ev. `source = stripe_checkout`.
   - **`pass_24h`:** `tier = pass_24h`, `valid_until = now + 24h` (UTC rekommenderas), samma `source`.
5. Returnera **200 snabbt**; tunga jobb köas om ni behöver.

**Vid `charge.refunded` / `payment_intent.canceled`:** policy — antingen sänk tier eller flagga konto för manuell granskning (lifetime-refund är känslig).

### A.3 Varför inte bara Stripe Dashboard?

Dashboard visar **betalningar**; er app måste fråga **er databas**. Webhook är källan som synkar Stripe → `entitlements`.

### A.4 Klient efter `success_url`

Användaren kan landa på `success_url` **innan** webhooken körts klart. UI kan:

- visa “Aktiverar premium …” och polla en lätt endpoint `GET /me/entitlements`, eller  
- vänta på WS “entitlement updated” om ni har det.

Undvik att sätta premium **endast** i `success_url`-queryparams (lätt att förfalska).

### A.5 Två priser i Stripe

Skapa **två Products** (eller en product med två **Prices**): ett price för 24h-pass, ett för lifetime. Samma webhook-logik; `metadata.tier` eller `price_id` skiljer åt.

### A.6 Kort checklista (säkerhet)

- [ ] Webhook endast på HTTPS; secret i env, rotera vid läcka.  
- [ ] Verifiera signatur på varje event.  
- [ ] Idempotens per `event.id`.  
- [ ] Checkout skapas bara server-side med autentiserad `user_id`.  
- [ ] Logga misslyckade webhook-försök + Stripe Dashboard → **Developers → Webhooks** för replay vid behov.

---

## Appendix B) Drift: Vercel (frontend) + CapRover (API) — Postgres, env och auth över domäner

Nuvarande upplägg: **statisk/SSR-frontend på Vercel**, **WebSocket + HTTP-API på CapRover** (t.ex. `https://alchices.apps.dipper.digital/`). Databas för användare, sessioner och `entitlements` ska ligga **nå API-servern kan nå** — vanligast **Postgres som egen app på samma CapRover**, eller extern hanterad Postgres (Neon m.fl.).

### B.1 Rekommenderad ordning (steg)

1. **Skapa Postgres i CapRover**  
   - Lägg till t.ex. **one-click Postgres** som separat app.  
   - Aktivera **persistent volume** för datakatalogen (så data överlever omstart/deploy).  
   - Notera intern **service hostname** (CapRover ger ofta `srv-captain--postgres...`) och port `5432`.

2. **Skapa databas och användare** (om mallen inte redan gör det)  
   - En DB för projektet, egen roll med begränsade rättigheter (inte `postgres` superuser i appkoden).

3. **Koppla game-server-appen till Postgres**  
   - Sätt miljövariabler på **samma CapRover-app** som kör Node-servern (se B.2).  
   - Kör migrationer (SQL, Prisma, Drizzle, Kysely — välj en och håll den).  
   - Tabeller minimum för monetisering + auth: `users`, `auth_sessions`, `entitlements`, `usage_counters`, `stripe_processed_events` (se §3.1).

4. **Exponera Stripe-webhook på API-hosten**  
   - `POST https://<er-caprover-api>/webhooks/stripe` (exakt path spelar ingen roll om URL:en är registrerad i Stripe).  
   - Sätt `STRIPE_WEBHOOK_SECRET` från Stripe Dashboard → Developers → Webhooks.

5. **Frontend på Vercel**  
   - Bygg med `VITE_*` / `NEXT_PUBLIC_*` (beroende på ramverk) som pekar ut **publik API-URL** (samma som WS om ni delar origin, eller separat om ni delar senare).  
   - Inga databashemligheter i Vercel för Postgres — bara **publik bas-URL** till API och ev. Stripe **publishable key** om checkout sker från klient (helst skapa Checkout Session **server-side** på CapRover).

6. **Testa end-to-end**  
   - Logga in (OTP/Google) → skapa Checkout → betala i testläge → webhook skriver `entitlements` → `GET /me` eller motsvarande visar tier.

### B.2 Miljövariabler (CapRover — game/API-servern)

| Variabel | Syfte |
|----------|--------|
| `DATABASE_URL` | Postgres-anslutningssträng, t.ex. `postgres://user:pass@srv-captain--…:5432/bv` (använd TLS om er klient stödjer `sslmode` mot intern host — CapRover internt är ofta utan TLS; **extern** managed DB kräver nästan alltid `?sslmode=require`). |
| `STRIPE_SECRET_KEY` | Server-side Stripe API. |
| `STRIPE_WEBHOOK_SECRET` | Signaturverifiering för webhook. |
| `SESSION_SECRET` / `JWT_SECRET` | Slumpmässig lång sträng för session-signering eller HMAC. |
| `AUTH_*` | Ev. leverantör (Clerk, Supabase …) eller egna OTP-hemligheter. |
| `CORS_ORIGIN` | En eller flera tillåtna webb-origins (se B.3), t.ex. `https://ert-spel.vercel.app`. |

**Postgres på samma CapRover:** använd **intern service-URL** i `DATABASE_URL` (snabbast, inget exponerat). **Extern managed DB:** använd leverantörens host + TLS i strängen.

### B.3 CORS och cookies (Vercel ↔ CapRover)

Webb: `https://something.vercel.app`. API: `https://alchices.apps.dipper.digital`. Det är **cross-site** → webbläsaren behandlar cookies strikt.

**Alternativ A — httpOnly-sessioncookie på API-domänen (rekommenderat mönster)**

- Server sätter `Set-Cookie` på **API-responsen** till inloggning: t.ex. `session=…; HttpOnly; Secure; Path=/; SameSite=None; Max-Age=…`  
  - **`SameSite=None`** krävs för att cookie ska skickas med **fetch/XHR från Vercel-origin till API-origin**.  
  - **`Secure`** är obligatoriskt med `SameSite=None` (HTTPS på båda sidor).  
- Frontend anropar API med `fetch(url, { credentials: 'include' })`.  
- På servern: **CORS** måste inkludera:
  - `Access-Control-Allow-Origin: <exakt Vercel-URL>` (inte `*` när credentials används),  
  - `Access-Control-Allow-Credentials: true`,  
  - ev. `Access-Control-Allow-Methods` / `Allow-Headers` för `Content-Type`, `Authorization` om ni använder det.

**Alternativ B — gemensamt “överordnat” domännamn (mindre strul med cookies)**

- T.ex. `app.erdomän.se` → Vercel, `api.erdomän.se` → CapRover.  
- Cookies kan då ibland använda `Domain=.erdomän.se` (planera med säkerhet — undvik delning bredare än nödvändigt). `SameSite=Lax` kan räcka för **navigering** till API på samma registrerbara domän, men **fetch mellan subdomäner** behandlas fortfarande som cross-site i praktiken för cookies i många fall — **testa** i målwebbläsare.

**WebSocket:** om WS använder cookie för auth måste klienten ansluta med **samma cookie-policy** (cookie skickas till `wss://api-host` om den satts för den hosten). Om WS **inte** skickar cookies, använd **kortlivad token i query** en gång vid connect (server validerar och ignorerar token efter handshake) — vanlig kompromiss.

### B.4 Checklista (CORS / cookies)

- [ ] Endast **https** i produktion för både Vercel och CapRover.  
- [ ] `Allow-Origin` är **exakt** er produktions-URL (lägg till preview-URL:er i dev om behövs).  
- [ ] `credentials: 'include'` i frontend där session behövs.  
- [ ] Cookie: `HttpOnly`, `Secure`, medvetet val av `SameSite` (`None` för cross-site fetch + credentials).  
- [ ] `OPTIONS` preflight hanteras för alla auth- och checkout-endpoints.  
- [ ] Inga `Set-Cookie` på svar som cachas av CDN på fel sätt (auth-svar bör **inte** cachas).

### B.5 Backup och drift

- [ ] Automatisk **dump eller volym-backup** av Postgres (CapRover backup-plugin eller cron `pg_dump` till objektlagring).  
- [ ] Testa **återställning** minst en gång.  
- [ ] Övervaka disk på CapRover-värden (Postgres växer med tid).

### B.6 Stripe-webhook och brandvägg

- Stripe måste nå er **publika** HTTPS-URL på CapRover.  
- Om ni har IP-filter: tillåt Stripe’s webhook-IP-lista eller använd signaturverifiering som primärt skydd (standard).

