# Designspec: webbaserat öl-/bryggeri-brädspel

Referensdokument för projektet. Uppdatera version och datum vid större ändringar.

| Fält | Värde |
|------|--------|
| Version | 0.9 |
| Senast uppdaterad | 2026-04-03 |

---

## 1. Produktvision

Webbaserat brädspel i stil med Talisman med **öltema**: spelplan på stor skärm/webbläsare (**pan, zoom, fokus på aktiv spelare och möjliga målrutor**), **telefoner som handkontroller**, slumpad tile-bana med **olika ruttyper**, tre nivåer med dörrar däremellan, **pant och affärer**, utrustning, monsterdueller, **PvP-dueller** och **straffklunkar** som räknas och kan modifiera kort/händelser.

**Varumärke och ton:** spelet är tänkt att vara **kopplat till Bryggverket**, ölbryggeri i **Umeå** (copy, visuell identitet och referenser till verkliga sorter). **Avtal och tydlighet kring varumärkesanvändning** behövs innan publik lansering.

**Språk (målbild):** **Svenska** som primärspråk i UI, korttexter och spellogg. *(Implementation kan fortfarande innehålla engelska strängar i kod/data tills översättningen är genomförd.)*

**Valuta (målbild):** **Pant** — tematiskt kopplat till flask- och burkretur, inte “guld”. Spelet ska upplevas som att man handlar och betalar med **pant** snarare än generiska mynt. *(I spelkärnan kan fältet fortfarande heta `gold` tills refaktor — se [TECH_SPEC.md](./TECH_SPEC.md).)*

**Ölnamn på kort:** där det är lämpligt (och i linje med varumärkesavtal) ska **händelsekort, items och smaktexter** gärna **anknyta till riktiga eller typiska Bryggverket-sorter och ölnamn** för stämning och igenkänning. Exakt lista växer med innehållsarbete; undvik att låsa in felaktiga produktpåståenden.

**Arbetstitel (tills vidare):** *Bryggmästarens väg*.

---

## 2. Målplattformar och upplevelse

| Yta | Roll |
|-----|------|
| Webb (stor skärm / laptop / surfplatta) | Spelplan, gemensam logg, animationer |
| Webb (mobil) | Personlig kontroll: inventory, val, tärning/duell, bekräfta klunkar |

**Aktiv tur (mobil):** när det är **din tur** (eller motsvarande uppmärksamhetsläge i lobby) ska bakgrunden ge en **tydlig, livlig signal**: **regnbågsfärgad gradient** som **roterar** och **pulserar** i intensitet — **endast i mobilvy** (`/play`), inte på storskärmsbrädet (`/table`), så TV-vyn förblir neutral för hela gruppen.

### 2.1 Storskärmsvy: pan, zoom och fokus

- På **spelplansvyn** (stor skärm) ska kameran kunna **panorera** och **zooma** (t.ex. mushjul + dra, pinch på pekskärm, eller enkla +/--knappar).
- **Automatiskt fokus:** när turen byter spelare (och vid t.ex. val av rörelse) ska vyn **centrera och zooma** så att **den aktiva pjäsen och relevanta målrutor** ryms i **den faktiska spelytan** (rektangulär viewport — inte bara kvadratisk brädes-SVG). Pan ska vara **konsekvent med zoom** (centrering skalar med aktuell `scale`).
- **Turindikator:** under huvudmenyn visas en **fullbreddsremsa** med **aktiv spelares färg som bakgrund** och **spelarnamn centrerat** (tydligt för bordet vems tur det är).
- **Målrutor (rörelseval):** markerade rutor har **ram** med marginal till tile-grafiken; ram kan ha **subtil pulserande animation**; SVG har **inre padding** så ramar inte klipps vid kanten.
- **Manuell överstyring:** efter auto-fokus ska spelare vid bordet kunna **pana/zooma fritt** tills nästa auto-fokus.
- Teknik: se [TECH_SPEC.md](./TECH_SPEC.md) §3.2.

**Sessionsflöde**

1. Värd öppnar sidan → skapar **lobby** → får **genererad kod** (t.ex. 6 tecken).
2. Övriga ansluter med kod → väljer namn och utseende (t.ex. huvud + färg på gemensam kropp).
3. Värd startar när spelare är redo.
4. **Spelregler och slump** ska vara **auktoritativa på servern** (förhindra fusk).

---

## 3. Teknik (rekommendation v1)

Fullständig teknisk spec med stack, hosting, kostnad, portabilitet och Vercel: **[TECH_SPEC.md](./TECH_SPEC.md)**.

**Kort:** TypeScript-monorepo, React + Vite, **SVG-baserad** spelplan **utan PixiJS i första läget**, Node (Fastify) + WebSocket på server, spelregler i delat paket `game-core` utan leverantörs-API:er.

---

## 4. Lobby och begränsningar

- **Max antal spelare:** 6.
- **Min antal spelare:** definieras vid implementation (t.ex. 2 för test, 3 rekommenderat för spelkänsla).
- Lobbykod ska vara kort och unik per aktiv lobby.

### 4.1 Mobilvy i lobby (väntan på start)

Medan partiet fortfarande är i **lobby** och spelet inte startat ska **mobil-kontrollen** inte visa spelstatistik som ändå inte används: **liv, pant, klunkar, utrustningsrutor och föremål** döljs tills fasen blir **playing**. Då visas de åter som vanligt.

**Lobbyinformation** (rubrik “Lobby”, redo-rad, hint om att använda panelen längst ned) ska vara **centrerad** så vänteläget upplevs tydligt och lugnt.

---

## 5. Vinstvillkor

### 5.1 Standardläge (primärt)

**Första spelaren som dödar slutbossen vinner.**

### 5.2 Spelvariant: Den gyllene ölen

1. Slutbossen besegras → en utvald spelare (eller boss-droppen bestämmer bäraren — specificera i implementation) får **den gyllene ölen** som **bärbar “flagga”** i spelstaten.
2. Bäraren måste **ta sig till en definierad målruta** på spelplanen: **start- eller slutpunkt** för banan (välj en konsekvent regel per bana, eller låt setup säga vilken som gäller).
3. **Första spelaren som når målrutan med den gyllene ölen vinner** (även om någon annan dödade bossen först — om inte annat överenskommits).

**Designnotering:** Varianten ska kunna väljas i lobby innan start (`gameMode: bossKill | goldenBeerEscape`).

---

## 6. Turer och tid

- Spelet är **strikt turordnat**: en spelare i taget.
- **Max tid per tur:** 60 sekunder som standard.
- **Konfigurerbart** i lobby (värd ställer in, inom rimliga gränser, t.ex. 30–120 s) så att gruppen kan anpassa tempot.

Om tiden går ut: definiera **automatisk åtgärd** vid implementation (t.ex. avsluta turen utan extra rörelse, eller slumpa minimal handling) och dokumentera det här när beslutet är taget.

---

## 7. Spelplan, nivåer och dörrar

### 7.1 Tiles och slump

- Banan byggs av **tiles** (kvadrat eller hex — **ett** system för hela projektet).
- **Slumpad uppbyggnad** per parti med **server-side seed** (reproducerbar för debug).

### 7.2 Tre nivåer

- **Nivå 1:** lättare möten och grundloot.
- **Nivå 2:** svårare fiender, bättre rewards, mer sabotage-potential.
- **Nivå 3:** väg till **slutboss**; boss **slumpas** ur **4 fördefinierade** bossar (var och en med tydlig särskiljande mekanik i design).
- **Team-monster-frekvens (nuvarande balans):** team battles förekommer mer sällan i början och oftare senare (ca **8%** på nivå 1, **18%** på nivå 2, **28%** på nivå 3).

### 7.3 Dörrar mellan nivåer

- Mellan varje nivå finns en **dörr** (dedikerad tile eller portal) som tillåter spelaren att **gå upp till nästa nivå**.
- **Krav:** spelarens **karaktärslevel** (eller motsvarande progression) måste ha nått en **konfigurerad tröskel** för den dörren (t.ex. level ≥ 3 för dörr 1→2, level ≥ 6 för 2→3 — exakta siffror sätts i balansdokument eller datafiler).
- **Nedåt:** beslutsfattande för v1 — antingen ingen nedåtgång, eller tillåtet med separat regel (lägg till när beslutat).

### 7.4 Rutyper (tiles)

Varje ruta har en **typ** som avgör vad som händer när en spelare **landar** på den (eller i vissa fall **passerar** — specificera per typ i data). Förslag:

| Typ | Beskrivning |
|-----|-------------|
| **Händelse (slump)** | Drar från en **händelsepool** (bra, dålig eller neutral): pant, skada, klunkar, flytta, stjäl kort, etc. |
| **Affär / köpman** | Öppnar **handel**: spendera **pant** på items, hälsa, engångs-boosts eller sällsynt loot (sortiment kan vara slumpat per besök eller per nivå). |
| **Strid** | **Slumpat monster**; samma grundmekanik som §9.1 (tärning + vapen mot fiende). |
| **Dörr / nivåbyte** | Se §7.3. |
| **Boss** | Slutboss på nivå 3 (eller dedikerad boss-tile). |
| **Vila / bryggeri** | Lätt positiv effekt: t.ex. återhämtning, ta bort en debuff, eller billigare “ölstop” utan strid. |
| **Skatt / gömma** | Engångsbyte: fast eller slumpad belöning (pant eller item); rutan kan markeras som **tömd** efteråt. |
| **Ödes-/valruta** | Spelaren väljer mellan två tydliga risker (t.ex. “säker liten belöning” vs “slå tärning för större eller värre”). |
| **Tom / säker passage** | Ingen händelse vid landning; bra för andningspauser i ban-generering. |
| **PvP / utmaning** *(valfritt)* | Om spelaren landar här med annan spelare på rutan, eller via kort — kan tvinga eller erbjuda **PvP-duell** (§9.2). |

Ytterligare idéer vid behov: **fälla** (dold strid tills någon landar), **vägskäl** (välj gren nästa gång du lämnar rutan), **kortruta** (dra direkt från leken utan combat).

---

## 8. Rörelse

- Spelaren **slår tärning** (eller server slår) och **rör sig exakt så många steg** som resultatet visar längs giltiga banor på den nivå spelaren befinner sig på.
- **Modifiers** från kort, items, status eller klunk-regler kan **minska eller öka** antal steg (eller ändra riktning/giltiga rutor). Alla sådana effekter ska **resolveras på servern** och loggas i spelloggen.

---

## 9. Strid

### 9.1 Spelare mot monster (PvE)

- **Tärningsresultat + vapenstyrka** (± tillfälliga buffar/debuff) avgör utfall mot **fiendens värde** (eller fiendens eget slag om så designas).
- Resultat: skada, loot, flykt, straffklunkar, etc. enligt tabell per mötestyp och tile.
- **Fasta vinstvärden per monster:** varje monster har nu **fast pant** och **fast antal rewards** vid seger (inga intervall/chansrull i resultatet).
- **Reward-mix:** reward kan vara **itemkort eller utrustning** (blandad pool). Utrustning som droppar ska inte oavsiktligt skriva över redan fylld slot.
- **Presentation av monsterkort (UI):** siffror för styrka, förlust (skada/klunk), vinst (pant/items) ska **inte ligga i sidhuvudet** utan samlas i en **rad längst ner på kortet**, med **ikon ovanför respektive siffra** (kolumnlayout per värde), så beskrivning och bild får fokus.

**Särskilda monster (val som spelaren gör):**

- **Sip Snatcher:** spelaren ska kunna välja **ta en sip (monstret försvinner, ingen strid)** eller **slåss** som mot ett vanligt monster.
- **Brewizard / Sourceress:** vid **förlorat** slag ska spelaren efter tärningsresultatet välja **ta en sip för reducerad skada** (och då +1 sip) **eller** **ta full skada enligt monsterets basvärde utan sip**. *(Exakta tal i data: t.ex. −3 / −2 mot full bas-skada.)*
- **Klunk på förlust:** fler monster än tidigare ger nu explicit klunk-straff vid förlust (utöver HP-skada), inte bara specialfall.

### 9.1.1 Team battle-monster

- Vissa starkare monster är markerade som **team battle**.
- När ett sådant monster dras måste angriparen välja **en annan spelare** som **måste strida tillsammans** med angriparen.
- Båda spelarnas tärnings-/attackvärden summeras i slaget.
- Vid **vinst** får båda pant och rewards enligt monsterets **fasta vinstvärden**.
- Reward i team battle följer samma mix som övrig PvE-loot: **itemkort och/eller utrustning**.
- Vid **förlust** tar båda **samma inkommande skada** (med sina egna rustnings-/reduceringsregler tillämpade individuellt) och båda får klunk-straff enligt monsterregeln.

### 9.2 Spelare mot spelare (PvP)

- PvP utlöses när reglerna säger det (t.ex. **samma ruta** med minst två pjäser, **händelsekort**, eller dedikerad **utmanings-tile** — välj minst ett spår i implementation och dokumentera).
- Samma **duell-grund** som PvE där det är rimligt: **tärning + vapen** (± buffar); motståndaren använder sitt **vapen** och ev. tillfälliga modifiers. *(Alternativ: båda slår och jämför — om så väljs ska det stå i samma tabell som PvE för enhetlighet.)*
- Om båda spelare får **lika total** ska de **slå om** i ny rond tills en vinnare finns (UI visar tydligt **Rond 2, Rond 3, ...**).
- **Vinnare** väljer **ett** av följande mot **förloraren:**
  - **Ta ett föremål:** en konkret **utrustningsdel** som förloraren bär (välj slot eller låt vinnaren välja bland synliga/välbara prylar enligt regel du sätter), **eller**
  - **Ta pant:** ett **fast belopp** eller **andel** av förlorarens **pant** (tak så det inte ruinierar någon i första duellen).
- **Förlorare:** definiera konsekvens (t.ex. **ligga kvar** på rutan, **flytta bakåt N**, **tillfällig debuff**, ingen död om ni vill skilja PvP från monster-död) — dokumentera när beslutet är taget.
- Allt ovan ska **avgöras på servern** och synas tydligt i spelloggen.

---

## 10. Ekonomi och affärer

- Spelare har **pant** (heltal ≥ 0) som huvudvaluta — **inte** “guld” i spelarens upplevelse.
- **Affärer** nås via **affärsrutor** (§7.4) och ibland via **händelsekort**. Sortiment: köp **items**, **hälsa**, **engångs-boosts**, eller **karta/information** beroende på balans.
- **Priser** kan skala med **nivå** eller **runda** så senare spel inte blir för lätta.
- Pant kan också **förloras eller vinnas** via händelser och **PvP** (§9.2).
- **Handlare (nuvarande flöde):** spelaren kan köpa **flera saker i samma besök** och lämnar handlaren explicit när den är klar.

### 10.1 Nya item-effekter (aktuellt läge)

- **Druckit för mycket** (tidigare “Svag öl”): stridsreaktion, **−2 spelarattack**.
- **Lättöl**: stridsreaktion, **+1 spelarattack**.
- **Folköl**: stridsreaktion, **+2 spelarattack**.
- **Krokben**: stridsreaktion, **−1 spelarattack**.
- **Ölbomb**: stridsreaktion, **+3 spelarattack**.
- **Baksmälla**: stridsreaktion, **−3 spelarattack**.
- **Skägget rakt bak**: används innan rörelseslag, **+2 steg på nästa rörelseslag**.

---

## 11. Utrustning

Hård cap per spelare:

| Plats | Max |
|--------|------|
| Rustning | 1 |
| Vapen | 1 |
| Hjälm | 1 |
| Accessory | 1 |

Ny utrustning i samma slot **ersätter** befintlig (om inte senare “stash” införs).

---

## 12. Död och respawn

- Spelaren kan **välja att respawna** efter att ha blivit besegrad/“död” (exakt trigger definieras i combat-regler).
- **Kostnad:** vid respawn **tappar spelaren all utrustning** förutom **en (1) vald pryl** som får behållas (spelaren väljer vilken innan respawn genomförs).
- **Respawn-plats:** definiera i implementation (t.ex. starttile på aktuell nivå eller alltid nivå 1 — dokumentera här när fastställt).

---

## 13. Öl / straffklunkar

- **Straffklunk-räknare** per spelare (heltal ≥ 0).
- Kort och händelser kan **öka** motspelares klunkar eller påverkas av antal klunkar (modifiers på slag, kort som låses upp, etc.).
- **Säkerhet och inkludering:** tydlig text att **alkohol är valfritt** (vatten räknas som klunk om gruppen vill). Spelet ska kunna spelas som **rent social räknare** utan krav på konsumtion.
- **Konsekvent wording på monsterkort:** klunkstraff uttrycks som **“Vid förlust: ta X klunk.”** (inte “Vid träff”).

---

## 14. Bryggverket-boost (foto av öl)

**Syfte:** skapa en **på-plats-känsla** och koppling till bryggeriet: under partiet kan en spelare **fotografera** något som visar **Bryggverkets öl** (flaska, burk, glas på fat etc., enligt vad gruppen och varumärket är bekväma med) för att få en **tillfällig buff eller boost** i spelet.

**Exempel på effekter (välj få, tydliga):** +1 på **nästa** rörelsetärning; +1 vapen **t.o.m. nästa** duell; **en** gratis omkastning per parti; kortare “nedkylning” av en debuff. Exakta värden balanseras separat.

**Begränsningar så det inte bryter balansen:**

- **Tak per parti:** t.ex. max **1–2** aktiveringar per spelare, och/eller **cooldown** (en gång per nivå eller var N:e runda).
- **Syns i loggen:** övriga spelare ser att någon “aktiverade Bryggverket-boost” (utan att nödvändigtvis visa bilden på den stora skärmen om gruppen vill undvika det).

**Verifiering (design + teknik):** automatisk igenkänning av etikett är **svårt, kostsamt och ofta leverantörsbundet**; för pub- och vänskapsläge rekommenderas i första hand **värdens / gruppens bekräftelse** eller hederssystem. Se [TECH_SPEC.md](./TECH_SPEC.md) §9.

**Integritet:** om bild **laddas upp** eller lagras måste spelaren få **tydlig information** och där det krävs **samtycke**; minimera lagring (t.ex. endast hash/metadata) om möjligt.

**MVP-ordning:** denna mekanik läggs **efter** att kärnloopen (lobby, bräde, turer, strid, klunkar) är spelbar, så den inte blockerar första releasen.

---

## 15. Grafik (intent)

- Grafik ritas i **Adobe Illustrator** och levereras som **SVG** i v1; **PixiJS används inte initialt** (se tech spec — byt bara renderingslager om du senare behöver WebGL-prestanda).
- **Tiles** och UI-byggstenar som SVG; **viewBox** och **konsekvent grid** underlättar placering av pjäser och highlights i React.
- **Storskärmskamera** (pan/zoom, fokus på aktiv spelare) ska kunna implementeras som **transform på ett omslutande lager** kring brädet utan att ändra Illustrator-filernas interna koordinater i onödan (se [TECH_SPEC.md](./TECH_SPEC.md) §3.2).
- **Karaktärer:** gemensam **generisk kropp** + **separata huvuden** (ev. hjälm som separat lager ovanpå).
- Exporterade SVG:er bör **förenklas** (rimlig filstorlek, undvik onödiga filter om webbläsaren ska skala många instanser).

---

## 16. Nätverk och tillstånd

- **GameState** som kan serialiseras (JSON) och valideras på servern.
- **Händelser** från klienter modelleras som **actions**; server svarar med **uppdaterad state** och/eller **eventlista** för logg.
- Hemsidor för **board** vs **controller** kan vara samma app med olika routes eller layouts (`/table`, `/play`).

### 16.1 Kortmodal och tydlighet

- När ett kort visar **eftereffekter** (pant / HP / klunkar — i äldre byggen kan etiketten fortfarande säga “Gold”) ska **endast rader där värdet faktiskt ändrats** visas — undvik “Pant: 5 → 5” som ger intryck av förändring utan effekt.

---

## 17. MVP vs senare

**MVP**

- Lobby med kod, upp till 6 spelare, konfigurerbar turtid.
- Slumpad bana, tre nivåer, dörrar med level-krav, **ruttyper** enligt §7.4 (minst händelse, affär, strid + tom/säker).
- **Storskärm:** pan, zoom, **auto-fokus anpassad till viewport** och **målrutor vid rörelseval** (§2.1); tur-rad under meny.
- **Strid:** PvE med **Sip Snatcher-** och **Brewizard/Sourceress-val** (§9.1); **PvP** (§9.2) med vinnarval **föremål eller pant**; **ekonomi och affärer** (§10).
- **Strid:** inkluderar **team battle-monster** med val av medkämpe, delad belöning/förlust och item-drop på svårare monster (§9.1.1).
- Utrustningsplatser, liten händelse-/kortlek, klunk-räknare kopplad till några kort.
- Fyra slutbossar; standard-vinst **döda boss först**; variant **gyllene öl + flykt till start/slutpunkt**.
- Respawn med “behåll en pryl”.

**Senare**

- **Bryggverket-boost** (foto-flöde + buffar enligt §14).
- Full **svensk** copy överallt; fältnamn `gold` → `pant` i kod om det passar refaktorplanen.
- Utökad **Bryggverket-anknytning** på kort (sortnamn, smaklager) enligt §1.
- Stash, sparade partier, AI-spelare, ljud, avancerade animationer, balansläge, achievements.
- Eventuellt **PixiJS** eller annan motor om SVG/DOM-prestanda blir flaskhals på stora bräden.

---

## 18. Öppna punkter (att fylla i under utveckling)

- Exakt **level-trösklar** per dörr mellan nivå 1↔2 och 2↔3.
- **Vem bär** den gyllene ölen vid bossdöd i variantläget (dropp till sista slaget vs slump vs alla kan tävla om upplockning).
- **Vilken målruta** som räknas som “start/slut” när båda finns — per ban-seed eller lobby-val.
- **Timeout-tur:** exakt auto-beteende vid 60 s (eller inställt värde).
- **Hex vs kvadrat** för tiles.
- **Min spelare** och om spelet får startas med färre än max.
- **PvP:** exakt utlösare (samma ruta, kort, tile), **förlorarens** konsekvens, och hur vinnaren **väljer item** (alla slots vs begränsat).
- **Ekonomi:** startpant, PvP-pant-tak, affärs-sortiment per nivå.
- **Kamera:** max/min zoom, om auto-fokus alltid återställer manuell pan eller “låses” tills nästa tur.
- **Bryggverket-boost:** exakt verifieringsmetod, max antal användningar per parti, och juridisk copy tillsammans med bryggeriet.
- **Lista över godkända ölnamn** att använda på kort (med bryggeriet).

---

## 19. Balansparametrar (snabbjustering)

Följande värden ska ses som **tuning-variabler** (inte hårda designregler). Justera i data/kod och uppdatera siffror här vid behov.

- **Team-monsterfrekvens per nivå:** ~8% / 18% / 28%.
- **Vinstrewards:** monster har **fasta** värden för pant + antal rewards (ingen chansrull på 1/2 items i nuvarande läge).
- **Rewardtyp:** reward kan vara **itemkort eller utrustning** (mixad drop-pool).
- **Reaktionsfönster i PvE:** spelare kan spela **flera reaktionskort** innan de slutmarkerar med “gör inget”.

---

## Revisionshistorik

| Version | Datum | Notering |
|---------|--------|----------|
| 0.1 | — | Initial spec (konversation) |
| 0.2 | 2025-03-24 | Vinstlägen, tur/tid, 6 spelare, tärningsrörelse, respawn med en pryl kvar, dörrar med level-krav |
| 0.3 | 2025-03-24 | Bryggverket (Umeå), arbetstitel *Bryggmästarens väg*, SVG-first utan PixiJS i v1, foto-boost (då §13) |
| 0.4 | 2025-03-24 | §2.1 kamera pan/zoom + fokus; §7.4 rutyper; §9 PvE/PvP + byte; §10 ekonomi/affärer; omnumrering §11–§18 |
| 0.5 | 2026-03-25 | Svenska + **pant** som målvaluta; Bryggverkets ölnamn på kort; §2.1 tur-rad, målram, viewport-kamera; §9.1 monsterval (Sip Snatcher, Brewizard/Sourceress); §16.1 kortstat-rader; §7.4/§9/§10 pant-terminologi; MVP/senare uppdaterad |
| 0.6 | 2026-03-31 | PvP omslag vid lika med rondvisning; fler monster med klunk-straff; nya team battle-monster (medkämpe krävs); nivåstyrd team-battle-frekvens; item-drop från svårare monster samt varsitt item till båda vid team-seger |
| 0.7 | 2026-03-31 | Loot uppdaterad: nästan alla monster droppar items utom de svagaste; chans på 2 items i team battle/farliga monster; nya items (Lättöl, Folköl, Krokben, Ölbomb, Skägget rakt bak, Baksmälla) samt omdöpning till Druckit för mycket |
| 0.8 | 2026-03-31 | Fasta monsterrewards (pant + antal rewards), mixad drop-pool med utrustning + items, flera reaktionskort möjliga innan “gör inget”, handlare tillåter flera köp per besök, samt konsekvent wording “Vid förlust” för klunkstraff |
| 0.9 | 2026-04-03 | Mobil: regnbågsbakgrund (rotation + puls) vid aktiv tur, endast `/play`; lobby döljer liv/pant/klunk/utrustning/föremål tills start; lobbytext centrerad; monsterkort visar stats längst ner med ikon över siffra (mobil + bord overlay) |

