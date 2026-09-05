# Designspec: webbaserat öl-/bryggeri-brädspel

Referensdokument för projektet. Uppdatera version och datum vid större ändringar.

| Fält | Värde |
|------|--------|
| Version | 0.84 |
| Senast uppdaterad | 2026-07-31 |

---

## 1. Produktvision

Webbaserat brädspel i stil med Talisman med **öltema**: spelplan på stor skärm/webbläsare (**pan, zoom, fokus på aktiv spelare och möjliga målrutor**), **telefoner som handkontroller**, slumpad tile-bana med **olika ruttyper**, **flera våningsplan** med XP-styrd uppstigning, **pant och affärer**, utrustning, monsterdueller, **BvB-dueller** (**bryggare mot bryggare** — spelare mot spelare, se §9.2) och **straffklunkar** som räknas och kan modifiera kort/händelser.

**Varumärke och ton:** spelet är tänkt att vara **kopplat till Bryggverket**, ölbryggeri i **Umeå** (copy, visuell identitet och referenser till verkliga sorter). **Avtal och tydlighet kring varumärkesanvändning** behövs innan publik lansering.

**Språk:** **Svenska** är källspråk i speldata, spellogg och servergenererad copy. **Engelska** (`locale: en`) stöds i webbklienten för UI, kortöversättningar och visning av dynamisk text — se **§1.1**. Spelarnamn och fri text från lobby ändras inte. *(I spelkärnan kan fält fortfarande heta `gold` tills refaktor — se [TECH_SPEC.md](./TECH_SPEC.md).)*

### 1.1 Lokalisering (implementation)

- **Val i klienten:** `sv` (default) eller `en` via språkväxlare; copy i `apps/web` (`uiStrings` / `uiStringsEn`).
- **Källdata på svenska:** monster- och utrustningsnamn i `GameState`, många `pushPlayerNotice`-texter och rå spellogg från motorn förblir svenska; klienten **översätter vid visning** där det behövs.
- **`game-core`:** `cardText.en.json` (korttitlar/text), `equipmentLocale.ts`, `monsterLocale.ts`, `localizeSipNotice.ts` (mobilnotiser), `localizeTableToastLog.ts` + `LOG_MESSAGE_KEYS` / `formatLogEntry` (bordstoasts), `localizeEventCardText.ts` (dynamiska korttexter t.ex. `boss_round_win`), `localizeFinalBossDisplayName` / `localizeFinalBossRoundLabel` (slutboss-seger).
- **Webb (`apps/web`):** `localizePendingCard` (väntande kort inkl. `boss_final_win`), `formatLocalizedShopItemEffectSummary` (affär + katalog), `merchantShopItemDisplayName`, `localizedCombatMonster` / strids-UI-copy, `brandLogo` (EN-logotyper på startsida m.m.), **`formatPantAmount`** (affärens köp-/omrulla-knappar och pant-aria: sv **«N pant»**, en via `formatCanAmount` från `game-core`).
- **Princip:** statisk UI → `uiStrings`; kort → `cardText.en.json`; utrustning → `rulesText` i `equipmentLocale`; monster/boss → `monsterLocale`; serverlogg med nyckel → `logMessages`; hårdkodad svensk notis/brödtext → regex/mönster i `localizeSipNotice` / `localizeTableToastLog`.
- **Känd begränsning:** text **inbäddad i bilder** (t.ex. svenska tryck på boss- eller kortgrafik) översätts inte via kod; kräver separata assets om EN ska vara helt rent visuellt.

**Valuta (målbild):** **Pant** — tematiskt kopplat till flask- och burkretur, inte “guld”. Spelet ska upplevas som att man handlar och betalar med **pant** snarare än generiska mynt. *(I spelkärnan kan fältet fortfarande heta `gold` tills refaktor — se [TECH_SPEC.md](./TECH_SPEC.md).)*

**Ölnamn på kort:** där det är lämpligt (och i linje med varumärkesavtal) ska **händelsekort, items och smaktexter** gärna **anknyta till riktiga eller typiska Bryggverket-sorter och ölnamn** för stämning och igenkänning. Exakt lista växer med innehållsarbete; undvik att låsa in felaktiga produktpåståenden.

**Arbetstitel (tills vidare):** *Bryggmästarnas Mästare*.

---

## 2. Målplattformar och upplevelse

| Yta | Roll |
|-----|------|
| Webb (stor skärm / laptop / surfplatta) | Spelplan, gemensam logg, animationer |
| Webb (mobil) | Personlig kontroll: inventory, val, tärning/duell, bekräfta klunkar |

**Kortlivade felmeddelanden (mobil, `/play`):** server- eller klientmeddelanden som **inte** ska blockera spel (t.ex. WebSocket **`error`** med text som *«En Ölkompis hjälper redan»*, eller *inte ansluten*) visas som en **toast** nära **nedre kanten** (över interaktionspanelen, med **safe area**), mörk bakgrund, **kort fade/slide-in**, och försvinner **automatiskt efter några sekunder** — i stället för lång röd felrad ovanför innehållet. (`role="status"`, `aria-live="polite"`.)

**Föremål spelat på dig (mobil, `/play`):** när någon annan spelar ett föremål med dig som mål syns en **rik toast** (föremålsbild + namn + *«{aktör} spelade på dig»*) baserat på `tableItemPlayReveals` / `reactionItemPlays` — samma synk som brädet. Toasten är **grön** för positiva föremål och **röd** för negativa/hostile (samma polaritet som bräd-SFX mot annan spelare). Visas **inte** samtidigt som blocking `SipNoticeCardModal` (t.ex. Sömnmedel). Autoförsvinner efter några sekunder.

**Monsterutfall för allierade (mobil, `/play`):** medan angriparens **`combat_win` / `combat_lose`** ligger i global `pending` (ägare = angriparen) ska **stridshjälpare** (`helpMatePlayerId` / `helpMateImpact`) och **ölkompis i strid** (`assistPlayerId` / `assistPartnerImpact`) få **samma typ av vinst-/förlust-modal** som angriparen — med undertitel och belöningar/påföljder anpassade till deras roll (t.ex. antal skatter enligt kontrakt, egen HP/klunk vid förlust). **Fortsätt** stänger bara den **lokala** vyn (ingen `confirmCard`); angriparen bekräftar fortfarande kortet på servern. Straffklunk-notis för allierad under förlustmodalen ska **inte** tränga sig före modalen (samma princip som angriparens förlustkort).

**Toasts vid monsterutfall (mobil, `/play`):** efter **monsterseger**, när angriparen trycker **Fortsätt** på vinstmodalen, kan en toast lista **vilka skatter** (kortnamn/utrustning) som just tilldelats angriparen. **Ölkompis** och **stridshjälpare** som fick skatter kan få motsvarande toast **vid Fortsätt på sin egen modal** (skattnamn) eller **när angriparen stänger vinstkortet** om de inte redan bekräftat sin vy. Efter **monsterförlust** gäller samma för allierad: toast med **HP-förlust** och **straffklunk** **endast om** de inte redan stängt sin förlustmodal (undviker dubbel information).

**Anpassade sip-notiser (mobil):** `pushPlayerNotice` med egen rubrik/brödtext (t.ex. **Riggat spel**, duell-förlust, **Sömnmedel**, stöld efter BvB) visas i **`SipNoticeCardModal`**; titel och brödtext ska **lokaliseras** via `localizeSipNoticeTitle` / `localizeSipNoticeBody` när `locale: en`. Kortlivade **`toast`**-notiser (t.ex. **Peka argt**) ska också gå via samma lokalisering innan de visas.

**Aktiv tur (mobil):** när det är **din tur** (eller motsvarande uppmärksamhetsläge i lobby) kan UI visa regnbågssignal i interaktionspanelen längst ned. Effekten är **av/på i inställningar** i mobilvyn.

**Interaktionspanel (mobil, små skärmar):** panelen kan växla till **kompaktläge** via en liten toggle-knapp precis ovanför panelen. I kompaktläge döljs informationscopy i panelen, medan **interaktionsknapparna fortfarande visas och är klickbara**.

**Interaktionspanelens stabilitet:** korta överlagrade lägen som **straffklunk / Skål!** ska inte trigga om panelens slide-up-animation eller höjd-tween från föregående innehåll. När panelens primära innehållstyp byter (t.ex. strid/handling → straffklunk-ack) ska första layouten efter bytet vara **instant** så panelen inte “hackar”.

**Modal-prioritering i mobil (`/play`):** **bryggbonus** (`brewerPerkChoice`) trumfar alla andra modaler för den spelaren (vinst/förlust-kort, straffklunk, strid m.m.) eftersom valet påverkar strid och tur direkt; motorn pausar egna `pending` i `deferredPending` tills buffen är vald. Därefter **vånings-nivå upp** (`levelUpOffer`) före straffklunk-notis. Bryggbonus erbjuds direkt vid XP-bryggnivå-upp, även utanför tur. **Efter vinst/förlust-kort:** turen går vidare till nästa spelare **innan** straffklunk / bryggbonus / nivå-upp-modalen — den som ska välja tar sin tid **utanför tur** medan andra kan spela. Personliga val utanför tur lagras i `offTurnPersonalPending` (inte i global `pending`) så nästa spelares `rollMove` / handlare inte blockeras och inte skriver över motståndarens modal. **`stateDelta` från servern måste alltid inkludera** `offTurnPersonalPending` och `deferredPending` (sätt till `null` när tomt) så mobilen ser bryggbonus även off-turn; annars synkas bara vid full `state` vid anslutning.

**Föremålsmodal (mobil):** när ett föremål kräver målval (t.ex. **Sömnmedel**) används samma modal med den vanliga **Stäng**-knappen. Målvalssteget ska **inte** lägga till en extra **Tillbaka**-knapp; avbryt sker via Stäng.

**Vald rad på mörk knapp (mobil):** när spelaren väljer bland alternativ som visas som **mörka pill-knappar** (t.ex. **Välj mål** / spelarnamn innan **Använd**, eller val av tärningsyta för **Ett sjätte ölsinne**) ska alla alternativ i listan ha **samma mörka grundstil**; den **aktiva** raden ska ha **tydlig guldtonad ram** och **guldtonad text** så valet inte förväxlas med ljusa sekundärknappar (**Stäng** m.m.).

**Modaler i mobilens toppmeny:** när **Spelare**- eller **Inställningar**-modal öppnas i `/play` ska de visas direkt utan kort-flip/fly-in-animation. Bekräftelse vid **Lämna spelet** (från inställningar) ska följa valt språk (`settingsLeaveGameConfirm` / `settingsLeaveGameCancel` i `uiStrings`).

**Snabbguide (mobil, `/play`):** efter **ansvarsfullhets-rutan** (en gång per rum och flik, `sessionStorage`) visas en **kort steg-för-steg-guide** innan spelet tar fart. Guiden har **fem steg** med **Tillbaka / Nästa / Hoppa över / Kör igång** och sidräknare. **Steg 1** visar **logotypen** (`bmm-logo.png`, utan ram, större marginal) och en **kort målsammanfattning** (något större text än övriga steg): välkomst, **Rädda de dåliga batcherna** (fetstil + monster-ikon) för XP och nivå, samt sabotera/samarbeta mot slutbossen. Övriga steg följer befintliga tutorial-bilder (rörelse, rutor, strid, nivåer/boss). Snabbguiden kan **öppnas igen** från **Inställningar** i spelvyn. Utförligare regler finns på **`/rules`** (startsida/länk), separat från snabbguiden.

**Turväntan och emotes (mobil):** när det **inte är spelarens tur** och interaktionspanelen annars skulle vara **tom** (klassisk väntan på rörelsetärning — inte under strid, BvB eller annat panelinnehåll), visas **vems tur det är** i possessiv form (t.ex. *Veras tur*, samma namnregel som på bordet: *Anders tur* utan extra **s**). Brevid: en **emote-knapp** (`emote-icon.svg`, ljusgrå). Knappen expanderar val bland fem reaktioner: **förvånad, glad, ledsen, arg, kärlek** (`emote-*.svg`). **Cooldown** ca **5 s** (klient + server); spam ger toast (*Vänta lite innan nästa emote.*). Under strids-/BvB-väntan visas **inte** emote-väljaren — då gäller befintlig väntecopy.

### 2.1 Storskärmsvy: pan, zoom och fokus

- På **spelplansvyn** (stor skärm) ska kameran kunna **panorera** och **zooma** (t.ex. mushjul + dra, pinch på pekskärm, eller enkla +/--knappar).
- **Automatiskt fokus:** när turen byter spelare (och vid t.ex. val av rörelse) ska vyn **centrera och zooma** så att **den aktiva pjäsen och relevanta målrutor** ryms i **den faktiska spelytan** (rektangulär viewport — inte bara kvadratisk brädes-SVG). Pan ska vara **konsekvent med zoom** (centrering skalar med aktuell `scale`).
- **Turindikator:** under huvudmenyn visas en **fullbreddsremsa** med **svart bakgrund** (kompakt höjd) — **standard** (`turnBannerPlacement: bottom`).
- **Matchstart-intro (bord):** när fasen går **`lobby` → `playing`** (värden startar) visas en **svart fullscreen-overlay** över brädviewporten med **stor stacked-logotyp** (pulserar i takt med varje siffra) och nedräkning **5 → 4 → 3 → 2 → 1** (~1 s per siffra, Permanent Marker), därefter **fade ut** (~0,7 s) till brädet. Fast sifferhöjd så logotypen inte hoppar när siffran tas bort. Endast klientvisual på `/table` (ingen serverfördröjning; reconnect mid-match hoppar över introt). Turbyte-bannern väntar tills introt är klart. Vid `prefers-reduced-motion`: kortare tider, utan digit-bounce.
- **Turbyte-banner (bord):** vid varje ny aktiv spelare visas en **stor kortvarig text** över brädet (*«Namns tur»*, samma possessivform som mobil/hörn-HUD) i **Permanent Marker** med bokstavs-stagger — samma stil som mobilens **«Din tur»**-overlay. Synlig ca **3 s**, `pointer-events: none`. Därefter gäller den vanliga turbannern / hörn-HUD; den gula **20 s**-påminnelsen i mitten visas inte samtidigt som turbyte-bannern.
- **Turindikator (placering):** lokal pref **`turnBannerPlacement`** (`bottom` \| `right`, `boardPerformancePrefs` / localStorage) i **bordsinställningar** och värd-lobbyns **Tillgänglighet**. Vid **`right`**: vertikal kolumn **till höger om brädet** (in-flow efter sidopanel), spelarkort staplade; botten-reserv för banner bortfaller. Föremålssolfjädern förblir **bottenförankrad**. Emotes i högerläge flyter **vänsterut** från kortet.
- **Turindikator (detaljer):** i remsan/kolumnen visas **alla spelare** (namn + HP/pant/klunk). Aktiv spelare markeras med **spelarens färg**. Vid `bottom`: raden är centrerad när den får plats och kan annars scrolla **horisontellt**; vid `right`: **vertikal** scroll. **Långa namn** som inte ryms åker sakta **fram och tillbaka** (`PingPongOverflowText`); vid `prefers-reduced-motion` trunceras med ellipsis.
- **Turindikator (status):** sömnstatus ska också synas i spelarraden; spelare som står över tur p.g.a. normal sömn markeras med **`(Zzz)`** efter namnet.
- **Eliminerade / lämnat (bord):** spelare med **`eliminated`** eller **`leftVoluntarily`** har **ingen pjäs** på brädet. I turbannern **och sidopanelens spelarlista**: **nedtonad** rad, ingen aktiv-puls; **döskalle** vid `eliminated`, **dörr-ikon** vid `leftVoluntarily` (samma som resultattabellen). Sidopanelen visar status **ute** / **lämnat** efter namnet och **döljer** HP/pant/klunk/bryggnivå samt utrustning (turbannern döljer samma vitals). Spelare med **0 HP** men ej eliminerad (väntar på stupad-bryggare-val) behåller pjäs och normal banner tills de gett upp eller startar om.
- **Emotes (bord):** valda emotes synkas via `sendEmote` och visas i ett **overlay** över turbannern (på brädet — bannerhöjden ökas **inte**). Ca **76×76 px**, **sammanhängande** rörelse: fade in, **långsam glidning** (uppåt vid `bottom`, **vänsterut** vid `right`) med **lätt rotation** (±7° start, +3° under färden) och **gradvis växande skala**, sedan fade ut (~**3,4 s**). Position följer spelarens kort i spelarraden (uppdateras vid scroll). När **sidopanelens spelarlista är öppen** döljs turbannern; samma overlay ankras då till listans spelarkort och flyter **vänsterut** över brädet. Om spelarens kort är **utanför den synliga listan** (många spelare / scroll) **scrollas listan** till kortet (`scrollIntoView` med `nearest`) så emoten syns — samma princip för klunk-burst.
- **Header på bordet:** huvudraden visar tydligt **`Lobby: KOD`** samt **anslutningsstatus**; “senaste tillstånd” och separata zoomknappar är borttagna. På desktop finns även en toggle **“Inaktivera sömnläge”** till vänster om status (wake lock när webbläsaren stödjer det).
- **Målrutor (rörelseval):** markerade rutor har **ram** med marginal till tile-grafiken; ram kan ha **subtil pulserande animation**; SVG har **inre padding** så ramar inte klipps vid kanten.
- **Före rörelsetärning:** på storskärmsbrädet (`/table`) ska rutan där **den aktiva spelaren** står markeras med **samma ram/puls** som målrutorna efter slag, så länge det är dags att slå rörelsetärning (`pending` tomt, spelarens tur) — tydlig “du står här” innan val av riktning.
- **Manuell överstyring:** efter auto-fokus ska spelare vid bordet kunna **pana/zooma fritt** tills nästa auto-fokus.
- **Kort över brädet (bord):** föremålskort i reaktionssolfjädern animerar in **nerifrån bakom turbannern**; mörk overlay bakom kort/strid är nu **betydligt mörkare** för bättre fokus på modalinnehållet (inkl. bossvariant).
- **Bordskortmodal (skatt/händelse):** kortets **framsida** ska **fylla samma korthyta** som **baksidan** (samma proportioner som övriga bordskort, t.ex. 560px-kortet); innehållet ska inte krympa vertikalt jämfört med kortbak. **Monsterstrid** på bordet använder fortfarande inbäddat monsterkort i stridspanelen (§2.1 monsterresultat).
- **Monsterstridens resultat på bordet:** när spelaren trycker **Fortsätt** efter ett monster-slag ska bordet behålla **samma monsterkort/modal**. Tärningarna fadear bort, kortet rätas upp/flyttas direkt till resultatläge och kortets baksida flippar till vinst-/förlustresultatet. Använd inte en separat resultatmodal som kan blinka eller byta storlek. Resultatytan ska matcha mobilens mörka bakgrund, sakna extra hörntitel (t.ex. “Dålig batch”) och centrera texten.
- **Presentationsskala på bordet (`/table`, TV/projektor):** modalinnehåll (kort som väntar på mobilbekräftelse, brewer-down, strids- och PvB-paneler) kan **skalas upp** utifrån **visualViewport** / fönster så text och kort läses på avstånd. **Kortaste kant** ca **720 px → skala 1**, linjärt upp mot **max ca 1,48** vid ca **1120 px** (justeras i kod: `S_MAX`, ramp `SHORT_START`/`SHORT_END`). Ett **höjd-tak** sänker skalan om kort-ytan annars skulle spänna över nästan hela höjden (`HEIGHT_FRAC` × höjd / ungefärlig korthöjd). **Dimningen** (fullskärms-overlay) skalas **inte**; endast innehållet får `transform: scale(…)` med **`transform-origin: top center`** så förstoringen inte klipper titeln upptill. **Placering:** `place-items: start center` (överkant); vid skala > 1 används **extra `padding-top`** med `max(84px, safe-area + 56px)` mot skärmkant/notch.
- **Fit-to-viewport-skalning (bord, små skärmar/tablets):** bordsöverlägg (kort, stridspanel, tärning + modifierare) **mäts** och **skalas ned** (`useFitToViewportScale` / `TableFitScale`) så hela innehållet ryms i **visualViewport** utan scrollbar — även när **solfjädern** reserverar plats i botten (`fanReservePx`). På breda/ultrawide-skärmar tillåts skalning **uppåt** mot presentationsskalans tak så kortet inte blir onödigt litet.
- **Mjuk omskalning (inställning):** ändras fit-skalan (t.ex. när solfjädern öppnas under strid) animeras `transform: scale(…)` med **280 ms**-transition (`useFitScaleTransition`); en **mount-guard** (~300 ms) hindrar att den första mätningskorrektionen animeras synligt. Togglas via **“Mjuk omskalning av kort”** (`scaleAnimationsEnabled` i `boardPerformancePrefs`, av som default i lite-läge) i bordsinställningar och värd-lobbyn — för långsammare datorer.
- **Lobby och spelet slut på bordet:** pan/zoom på brädesviewport är **avstängda** i faserna `lobby` och `ended`, så att **`setPointerCapture`** på viewport inte stjäl pekaren — knapparna i resultatmodalen ska få **klick**.
- **Slutresultat — nytt parti (`/table`):** i fas `ended` visar resultatmodalen två knappar bredvid varandra (**Nytt spel** / **Avsluta spelet**). **Nytt spel** skickar `returnToLobby` (privileged, endast bord) och återställer rummet till **`lobby`** med **samma rumkod och `GameConfig`**. **Avsluta spelet** navigerar till startsidan som tidigare.
- **Avsluta spelet från bordsinställningar:** under **Inställningar** finns **Avsluta spelet** (med bekräftelse). Under **`playing`** skickas privileged **`endMatch`** → `phase: ended` utan vinnare (resultatlista för alla). I **`lobby`** / **`ended`** navigerar bordet till startsidan.
- **Videobakgrunder (bord, `public/video/`):** loopande **WebM + 1280p MP4** per bakgrund — **`beer_bg_*`** (lobby, slutresultat) och **`flames_bg_*`** (slutboss-strid, stupad bryggare på bord). Fullupplösta käll-`.mp4` ingår **inte** i repo (`.gitignore`). Över videon: **mörk scrim** (~45 % på öl, ~26 % under boss-flammor) så text/kort läses.
- **Lobby på bordet:** fullskärms-**ölvideo** bakom lobbykortet; kortet är **halvtransparent med blur** (glas) så QR och kod syns mot videon.
- **Slutboss (bord + mobil):** **flammor + röd pulserande gradient** ligger i en **persistent backdrop** (`FinalBossCombatBackdrop`) under **hela slutboss-striden** — intro, reaktioner, tärning, resultat på kort, samt kortet **`boss_round_win`** mellan rundor (samma videoinstans; `key` = strids-session eller `final-boss-<monsterId>`). Stridspanelen/kortmodalen ovanpå har **transparent** overlay utan ny fade per fas. Vid **`boss_round_win` på bordet** ska **inte** en andra eld-backdrop fadear in i kortmodalen när den persistenta redan är aktiv (undviker blink). Boss-intro på mobil kan fortfarande använda **röd puls** i intro-modal om persistent backdrop inte är aktiv ännu; under striden gäller samma eldvideo som på bordet. **`boss_round_win`**-copy (liv kvar, bekräfta nästa runda) och **`boss_final_win`**-overlay (vinnare + bossnamn + rundetikett) ska **lokaliseras** i klienten — servern lagrar svenska bossnamn (`Den store narcissus` m.m.).
- **Stupad bryggare på bordet:** samma **eldvideo utan röd puls** i modal-backdrop (`flamesBackdrop`); ikon **`gameover.svg`** (större på bord än tidigare dödskalle). Mobil behåller vanlig mörk backdrop.
- **Slutresultat på bordet:** **ölvideo** bakom modal; panel och höjdpunktskort använder **`var(--modal-panel-bg)`** (samma som övriga modaler). Resultatmodal **bredare** på bord (~**860px** max). **Poängtabellen** har variant **`table`** med **större** typsnitt och ikoner; rubrikerna *Spelet är slut* / *Vinnare:* är **måttligt** större (inte fullskärms-TV-storlek).
- **Toasts på bordet (`/table`):** kortlivade meddelanden (t.ex. från spellogg, straffklunk, belöningar, **Vaska** / **Riggat spel** / föremålsspelande) visas i en **toast-rad** nära botten (under turbannern när placering är `bottom`; utan extra bottenreserv när turbannern ligger till **höger**). Loggposter med **`LOG_MESSAGE_KEYS`** och mönster i **`localizeTableToastLog`** översätts vid `locale: en`. Vid **bryggnivå-upp** genereras toast med texten *«&lt;namn&gt; når bryggnivå N!»* där **N** är **samma visade bryggnivå** som i mobil-header och sidopanel (**intern `brewerLevel` + 1**, minst 1) — inte den råa XP-indexnivån. **Ingen dubbel klunk-toast:** straffklunk som redan toastats via händelsekortets `tableOutcomes` (t.ex. *Barkäbbel*, *Astronomisk fylla*) markeras med **`suppressTableToast`** när den köade sip-notisen flushas — brädet hoppar över dubbletten; mobilens sip-modal och klunk-ballong påverkas inte.
- **Ljudeffekter (`/table` + mobil, v1):** korta one-shots från `public/sfx/` (optimerade MP3; käll-WAV/OGG i `apps/web/sfx-source/`, genereras med `npm run optimize:sfx`). **Bräd-SFX köas** och spelas ett i taget (t.ex. gå → landningsljud → kort) så de inte överlappar. Ingen musik. **Brädet** (`/table`, avstängningsbart i bordsinställningar): **rörelsetärning / gå** (`roll1–7` vid `rollMove` och `chooseMove`), **stridstärning** (`dieroll1–3` vid monster-slag och när händelsekort med tärningsslag får `Tärning:` i korttexten), **händelse- och skattruta** (`event1–4` / `event.mp3` efter **cardflip**; avbryts av senare spelljud som tärning/föremål/strid), **lose** vid tom gömma), **cardflip** vid modal-fade för vila/händelse/skatt och före **badbatch** vid monster-intro), **föremål** (`item1–3` vid solfjäder / stridsreaktion och positiva kort mot andra; **dieroll1–3** vid sabotage/debuff mot annan spelare), **panta burkar** (`cans1–4` när affären öppnas), **dålig batch** (`badbatch1–4` vid monster-intro), **vinst mot monster** (`levelup.mp3` vid `combat_win`, `boss_round_win` och `boss_final_win`; uteblir vid parallell bryggnivå-upp från strids-XP på `combat_win`), **förlust mot monster** (`lose.m4a` vid `combat_lose`-kort), **skattkort** (`cardflip.mp3`), **händelsekort i modal** (`event.mp3` om landningsljud inte redan spelats), **bryggnivå upp** (`levelup.mp3` när visad bryggnivå ökar i övriga fall). **Straffklunk-ljud** (`klunk1–2`) endast på **mobilen** vid **Skål**; klunk-emoji på brädet vid `sipNoticeAck`. **Mobil:** **`playerturn.mp3`** (`playerTurn`) när det blir **din** tur (`useGameSfxSync`; första synken spelar inte). Strids-PvP, BvB och emotes utan dedikerade filer i v1.
- **BvB-duellpanel (bord):** den flytande duellpanelen ska ha en **tydligt synlig** horisontell färgton (angripare / försvarare) med **lätt** mörk scrim ovanpå så typografi (t.ex. *DUELL*, rondrad) inte drunknar.
- **BvB-tärningar på bordet:** visa **fast tärning direkt per spelare** så fort den spelarens kast finns. Endast sidan som ännu inte kastat ska fortsätta med idle-spin under `awaitingRolls`/reveal-delay. Undvik blink/flicker när en sida redan har resultat.
- **Team battle-overlay på bordet:** vid övergången från **välj medkämpe** till nästa stridsfas ska overlayn vara renderingsstabil (ingen helsvart vy). Stridspanelen måste hantera fasbytet utan att bryta Reacts hook-ordning eller unmounta hela board-vyn.
- **Sidopanel (`/table`):** när spelet pågår visar spelarlistan **mobil-lik spelarinformation**: stats (HP/pant/klunk + bryggnivå-ring), **bildrutor för utrustning** (samma slot-ikoner som mobilen), och **turmarkering** som turbannern (spelarfärg + pulse). **Eliminerade / lämnat** visas som i turbannern (nedtonat + ikon + ute/lämnat). Ingen värd-etikett eller redo-status i listan under spelet. **Öppen sidopanel döljer turbannern**; emotes/klunk ankras då i listan. I pre-game lobby används fortsatt **enklare rad** med namn/redo för snabb överblick.
- **Spelarlista mobil (`/play`):** modalen **Spelare** markerar samma ute-/lämnat-status (nedtonat kort, döskalle/dörr, text **ute** / **lämnat**) och döljer stats/utrustning för dem.
- Teknik: se [TECH_SPEC.md](./TECH_SPEC.md) §3.2.

### 2.2 Festöversikt (`/fest`)

- **Syfte:** hemlig sida för **releasefest / flera bord samtidigt** — en extra skärm (t.ex. projektor) som följer **alla pågående partier** utan att påverka spelet. Routen **`/fest`** finns **inte** länkad från startsidan (bokmärke/URL delas manuellt).
- **Lobbyspårning:** användaren lägger till **lobbykoder** (sparas i `localStorage`, nyckel `bv:festDashboardRooms`). Varje kod ansluter via WebSocket som **`table`**-roll med visningsnamn **Festöversikt** — ren **åskådare** (samma state-synk som bordet, inga actions).
- **Header:** rubrik **Festöversikt** och **lobbykod + knapp Spåra lobby** på **samma rad** (input och knapp **högerjusterade**, alltid på samma rad). Ingen introtext och ingen tillbaka-länk till startsidan.
- **Festhöjdpunkter (hjälte):** direkt under headern, **full bredd**, fyller ungefär **första skärmen**; detaljer scrollas ned. **Tio kategorier** aggregerade **globalt över alla anslutna lobbyer** (vid oavgjort: alla vinnare med animerad avatar):
  - Flest segrar (monster), mest pant, mest klunkar (sessions `totalKlunksGained`), flest förluster (monster + BvB), mest BvB (matcher spelade), mest sabotage, mest XP, minst HP (endast spelare med **HP > 0**), högsta slag (`maxDiceRollTotal`), flest ettor (`combatOnesRolled` + `pvpOnesRolled`).
- **Höjdpunkts-UI:** flex-rutnät med **centrerade ofullständiga rader** (undviker tomma hål vid t.ex. 5 kort i 3-kolumnsläge); **5 → 3 → 2** kolumner beroende på bredd; värden som **siffra** i **Permanent Marker**; titel med ikon ovanför avatar och namn.
- **Detaljer (under höjdpunkterna):** summeringsrad (live-bord, aktiva spelare, monstersegrar, BvB-segrar, klunkar totalt) samt **en panel per lobby** med anslutningsstatus, fas, spelartabell (avatar, HP, pant, klunk, bryggnivå, våning, monster V/F, BvB V/F, sabotage, bästa slag). Lokalisering via `festDashboard` i `uiStrings` / `uiStringsEn`.

**Sessionsflöde**

1. Värd öppnar sidan → väljer **Skapa lobby** → går till en **dedikerad pre-game-inställningsvy** (ingen kod/QR i detta steg).
2. Värd väljer lobbyinställningar (svårighet, hardcore, bräde, nivåer, utseende, extra inställningar) och fortsätter till bordsvyn.
3. Bordsvyn visar **genererad lobbykod + QR** för anslutning.
4. Övriga ansluter med kod → väljer namn och utseende (t.ex. huvud + färg på gemensam kropp).
5. Värd startar när spelare är redo.
6. **Spelregler och slump** ska vara **auktoritativa på servern** (förhindra fusk).

---

## 3. Teknik (rekommendation v1)

Fullständig teknisk spec med stack, hosting, kostnad, portabilitet och Vercel: **[TECH_SPEC.md](./TECH_SPEC.md)**.

**Kort:** TypeScript-monorepo, React + Vite, **SVG-baserad** spelplan **utan PixiJS i första läget**, Node (Fastify) + WebSocket på server, spelregler i delat paket `game-core` utan leverantörs-API:er.

### 3.1 Drift och deploy (nuvarande produktion)

- **Frontend (`apps/web`):** [Vercel](https://vercel.com) — projekt kopplat till **GitHub-repot** med **root directory = repo-rot** (inte `apps/server`). Bygge styrs av `vercel.json` i roten: `npm install`, därefter `npm run -w @bv/game-core build && npm run -w web build`, output **`apps/web/dist`**, SPA-rewrite till `index.html`. **Viktigt:** ändringar i **`packages/game-core`** måste också **byggas och deployas på spelservern** (`apps/server`); annars kan klient och server divergera eftersom **`applyAction`** körs på servern med samma paket.
- **WebSocket mot produktionsserver:** i Vercel **Settings → Environment Variables** sätts **`VITE_WS_URL`** till **`wss://<host för spelserver-appen>`** (samma som CapRover-servern exponerar över HTTPS). Värdet bakas in vid **`vite build`** — efter ändring krävs **ombyggnad** (Redeploy).
- **Spelserver (`apps/server`):** [CapRover](https://caprover.com) (eller motsvarande) med **Docker** från repo-roten: `Dockerfile` bygger `@bv/game-core` + `server`; **`captain-definition`** pekar på `./Dockerfile`. Servern lyssnar på **`process.env.PORT`** (CapRover sätter `PORT`); lokalt default **3001**. Hälsokontroll: **`GET /health`** → `{ "ok": true }`.
- **Serverobservabilitet (drift):** enkel runtime-metrics exponeras på **`GET /metrics`** (JSON) med bl.a. antal rum/anslutningar, actions, fel, broadcasts och ungefärlig bytesvolym för state-utskick.
- **Operativt lager (P1):** CI samlar metrics före/efter verifieringssvit, publicerar dashboard i `GITHUB_STEP_SUMMARY`, laddar upp metrics-artifacts och tillämpar tröskelkontroller som blockerar release vid avvikelser.
- **Idle-room städning:** rum utan aktiva anslutningar hålls kvar kort för reconnect men städas automatiskt efter TTL (nuvarande: ca 10 min inaktivitet).
- **Recoverability (nuvarande implementation):** servern tar periodiska snapshots av aktiva rum till disk och kan återställa dessa vid restart (`ROOM_SNAPSHOT_PATH`, `ROOM_SNAPSHOT_INTERVAL_MS`).
- **Autentisering av WS-klienter (baseline):** om `SERVER_AUTH_TOKEN` är satt måste klient skicka `authToken` i `hello`; annars nekas anslutningen.
- **Admin/drift API (utan UI):** servern kan exponera token-skyddade admin-endpoints med `ADMIN_TOKEN` i headern `x-admin-token` (ex. lista rum och stäng rum kontrollerat).
- **Lokalt:** `npm run dev` — Vite på **5173**, WebSocket i dev proxas via **`/bv-ws`** till servern (se `apps/web/vite.config.ts`).
- **Deploy:** webben sker via **Vercel** (kopplat till GitHub; push triggar bygge) eller manuellt med **Vercel CLI** (`npx vercel --prod` från repo-roten efter `npx vercel login` / ev. `npx vercel link`). Spelservern: **CapRover CLI** med `npm run deploy:caprover` / `npm run deploy:caprover:staging` (läser **`.env`** via `dotenv-cli`; se `.env.example`).

---

## 4. Lobby och begränsningar

- **Max antal spelare:** 8 (hard cap på `state.players.length` — **eliminerade** och **frivilligt lämnade** som behålls som ghost-slots **räknas** mot taket).
- **Spelarfärger:** åtta distinkta färger tilldelas i turordning (`PLAYER_COLORS` i `game-core`, `AVATAR_PLAYER_COLORS` i webben) — inkl. **orange** (`#ea580c`) och **cyan** (`#0891b2`) för spelare 7–8.
- **Min antal spelare:** definieras vid implementation (t.ex. 2 för test, 3 rekommenderat för spelkänsla).
- Lobbykod ska vara kort och unik per aktiv lobby.
- **Synk vid anslutning:** när en ny spelare ansluter i lobby ska **alla** redan anslutna klienter (bord + mobil) få uppdaterad spelarlista via state-broadcast, inte bara den som just joinade. Samma broadcast gäller **mid-game join** när `allowLateJoin` är på.
- **Late join (`allowLateJoin`):** lobby-config (default **av**). När spelet är i fas **`playing`** och flaggan är **på** kan en ny **controller** som inte återkänns som reconnect få en **ny plats** via `playingAddPlayer` (start-ruta, full HP, startpant/startföremål, in i `turnOrder`) — **ersätter inte** döda/ghost-slots. Vid full lobby (**8**) nekas join med *«Lobbyn är full»*. Utan flaggan (eller fas ≠ `playing`) nekas okända joins mid-match som tidigare. **Återanslutning** till befintlig slot fungerar fortfarande oberoende av flaggan.
- **Bord (pre-game lobby):** utöver att visa lobbykoden ska spelare kunna skanna en **QR-kod** som öppnar **`/join?room=<kod>`** (samma webbhotell som bordet). Sidan **`/join`** ska kunna **förifylla lobbykoden** från query-parametern `room`. Under pågående lobby på bordet: **ölvideo** i bakgrunden och **glas-panel** för kod/QR (§2.1).

### 4.2 Pre-game inställningsvy (värd)

När värden väljer **Skapa lobby** visas först en separat sida för förkonfiguration, innan man går in i bordets lobby med kod/QR.

- **Grundinställningar:** svårighetsgrad (`lattol`, `folkol`, `starkol`, `imperial`), **Hardcore mode**, **Tillåt late join** (`allowLateJoin`), **Rensa spelare vid nytt spel** (`clearPlayersOnRematch`, default **av**).
- **Bräde:** `boardSize` (default/large/xlarge) och antal nivåer (2–5, default 3).
- **Utseende (bl.a. kortbaksida):** väljs via bildgalleri med preview; fler kosmetiska val planeras.
- **Fler inställningar:** max HP, startpant och tillåtna kort (`item`/`event`) via expanderbara paneler.
- **Fler inställningar:** inkluderar även **reaktionstimer** i sekunder (0–30) för stridsreaktioner.
- Valen sparas i lobby-config och används av servern när lobbyn skapas/startas; bordets `hello` med config ska **appliceras även vid reconnect** i `lobby`/`ended` (inte bara första `created`), så att t.ex. `clearPlayersOnRematch` inte tappas.
- **`clearPlayersOnRematch`:** när **på** och bordet trycker **Nytt spel** (`returnToLobby`) töms **`players`** till `[]` och servern stänger alla **controller**-anslutningar med `sessionEnded` (`reason: lobbyCleared`) så mobilerna **inte auto-reconnectar** in i lobbyn. När **av** behålls kvarvarande spelare (utom `leftVoluntarily`-spöken) och nollställs till lobby-defaults.
- **Värd-UI (pre-game):** horisontell logotyp, **segmenterade knappar** för svårighetsgrad (ikoner per nivå, guld aktiv-stil), **Hardcore** centrerat under, **Avancerade inställningar** i expanderbara underpaneler (bräde, utseende, tillgänglighet, spelvärden, tillåtna kort). Under **Tillgänglighet**: samma lokala brädprefs som bordsinställningar (pan, animationer, **`turnBannerPlacement`**, m.m.). Ingen separat **Avbryt**-knapp i vyn.

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
- **Tur-timeout (lobby):** valfritt via **Tur-timeout**-toggle (default **av**). När på: tid per tur är konfigurerbar (**30–120 s**, default **60**).
- **Deadline** (`turnDeadlineAt`) sätts vid turbyte / matchstart. Nedräkning visas på **brädet** (turbannern, aktiv spelare).
- **Paus:** timeout tickar bara när aktiv spelare kan agera fritt (`pending` tom, `moveChoice` eller `encounterChoice`). Under **handel (Panta burkar)** fryses kvarvarande tid (visas stilla på brädet); under strid/BvB/kort pausas enforcement (deadline behålls men förfaller inte).
- **Vid utgång:** servern avslutar turen utan rörelse (stänger mötesval, kastar moveChoice) och går vidare till nästa spelare. Spellogg: *«{namn}s tur tog slut (timeout).»*

---

## 7. Spelplan och nivåflöde

### 7.1 Tiles och slump

- Banan byggs av **tiles** (kvadrat eller hex — **ett** system för hela projektet).
- **Slumpad uppbyggnad** per parti med **server-side seed** (reproducerbar för debug).
- **Yttre ring per våning:** rektangulär **ram** runt ett tomt hål; antal rutor på ringen är **`4·s−4`** där `s` är serverns ring-grid (t.ex. **`s = 5` → 16 rutor**, **`s = 6` → 20**, **`s = 7` → 24**). På bordet renderas ringen i en widescreen-vänlig rektangel med samma perimeter (nuvarande mapping: **`5 → 6×4`**, **`6 → 8×4`**, **`7 → 9×5`**). Varje ruta har ett **index** `0 … n−1` i den ordning som banan genereras — samma ordning ska **storskärmsklienten** använda när den placerar rutor (`ringPosRect` m.m.).
- **Synk mellan server och bord:** om ett partis `levels[i].tiles.length` skiljer sig från en hårdkodad layout (t.ex. äldre sparad state med färre rutor) måste klienten **härleda `s` från `tiles.length`** så att **visuella steg längs ringen** stämmer med **serverns rörelse** (modulo `n`). Annars kan målmarkeringar och spelarnas intuition för tärningsrörelse feltolkas trots att servern räknar rätt.
- **Bordsvy (`/table`):** våningsplanen visas **horisontellt i rad** (sida vid sida) med mellanrum; pan, zoom och auto-fokus tar **hela brädets bredd** i beaktande.
- **Flera pjäser på samma ruta:** spelarmarkörer (kapsyler med initial) placeras i en **liten kluster-layout** (t.ex. diagonal för två, triangel för tre, cirkel för fler) så att de **inte ligger på en horisontell rad** — tydligare överblick och mindre överlappning visuellt.
- **Bakgrund per våning (valfritt):** under tile-lagret kan en **bakgrundsbild** visas för vissa våningar; tillgångar levereras gärna som **komprimerad WebP** (t.ex. under `public/backgrounds/`) för rimlig filstorlek.

### 7.2 Nivåer (våningsplan)

- Spelet använder **konfigurerbart antal våningsplan** (nuvarande spann 2–5, default 3), med uppstigning enligt §7.3 och **boss endast på sista våningen**.
- **Nivå 1 (första brädet):** lättare möten och grundloot.
- **Nivå 2–3:** svårare fiender, bättre rewards, mer sabotage-potential; team-monster blir vanligare.
- **Sista våningen:** väg till **slutboss**; boss **slumpas en gång per parti** ur **3 fördefinierade** bossar — **Den store narcissus**, **Öldomaren**, **Onda bryggverket** (individuell strid, ingen team battle). Bossrutan placeras endast på **sista våningen**. Stridskravet är bossens **basstyrka** plus **+2 per brädesnivå** (`levelIndex`, samma skala som vanliga monster — se §7.3). Varje boss har eget partistraf vid förlust (t.ex. alla tappar pant, alla tar klunk, eller slumpat globalt item/utrustningsförstörelse). På monsterkortet: **förenklad regeltext** (unika förlusteffekter), **hjärtikonliv**, streck för pant/skatt vid seger (spelet vinns), samt tydlig **boss-overlay** på bord/mobil.
- **Team-monster-frekvens (nuvarande balans):** team battles förekommer mer sällan i början och oftare senare (ca **4%** på nivå 1, **9%** på nivå 2, **14%** på nivå 3 och högre bräden).
- **Slumpade föremål på sista planet:** **Taproom-nyckel** ingår inte i slump-poolen när mottagaren står på **sista brädnivån** (ingen nästa våning att stiga till); **Genväg** kan fortfarande slumpas (teleport till annan spelare). Se §10.1.

### 7.3 Uppstigning mellan våningsplan

- **Nivå-rutan är borttagen** från brädet. Uppstigning sker i stället via **level-up offer** kopplat till spelarens XP-baserade bryggnivå (§13.1).
- När kravet nås kan spelaren få ett val att **stiga nu** eller **stanna kvar en tur till**.
- Uppstigning kostar i nuvarande balans **ingen pant**.
- Mobilflöde: informationskort (modal) för nivåbytet + valknappar i nedersta interaktionspanelen.
- **Monster på våningen:** extra **styrkekrav** (`need`) är **+2 per brädesnivå** på planet (våning 1 → +0, våning 2 → +2, våning 3 → +4). Extra **HP-skada vid monsterförlust** skalar på samma sätt men **endast för standardmonster** (inte team battle och inte slutboss). Skalningen är lokal per plan, inte global efter “högsta spelaren”.
- **Nedåt:** beslutsfattande för v1 — antingen ingen nedåtgång, eller tillåtet med separat regel (lägg till när beslutat).

### 7.4 Rutyper (tiles)

Varje ruta har en **typ** som avgör vad som händer när en spelare **landar** på den (eller i vissa fall **passerar** — specificera per typ i data). Förslag:

| Typ | Beskrivning |
|-----|-------------|
| **Händelse (slump)** | Drar från en **händelsepool** (bra, dålig eller neutral): pant, skada, klunkar, flytta, stjäl kort, etc. |
| **Affär / köpman** | *(Utfasad som brädruta.)* **Panta burkar** nås i stället som **tredje val vid rörelse** (§10.2) — samma handel som tidigare, utan att flytta pjäsen. |
| **Strid** | **Slumpat monster**; samma grundmekanik som §9.1 (tärning + vapen mot fiende). |
| **Dörr / nivåbyte** | Utfasad i nuvarande build (historisk ruttyp). |
| **Boss** | Slutboss på **sista våningen** (tredje planet, `levelIndex` 2). |
| **Vila / bryggeri** | Lätt positiv effekt: t.ex. återhämtning, ta bort en debuff, eller billigare “ölstop” utan strid. |
| **Skatt / gömma** | Vid landning: **slumpat** innehåll från skattleken (pant och/eller `randomItem` — kan bli föremål eller, om ledig utrustningsslot finns, utrustning). **Tom gömma** kan inträffa **slumpmässigt**; samma skattruta kan **besökas flera gånger** av olika eller samma spelare (ingen permanent “tömd”-flagga per ruta). |
| **Ödes-/valruta** | Spelaren väljer mellan två tydliga risker (t.ex. “säker liten belöning” vs “slå tärning för större eller värre”). |
| **Tom / säker passage** | Ingen händelse vid landning; bra för andningspauser i ban-generering. |
| **BvB / utmaning** *(valfritt)* | Om spelaren landar här med **annan bryggare** på rutan, eller via kort — kan tvinga eller erbjuda **BvB-duell** (§9.2). På brädet kan rörelseval visa **BvB** som etikett när målrutan redan har en motspelare. |

Ytterligare idéer vid behov: **fälla** (dold strid tills någon landar), **vägskäl** (välj gren nästa gång du lämnar rutan), **kortruta** (dra direkt från leken utan combat).

---

## 8. Rörelse

- Spelaren **slår tärning** (eller server slår) och **rör sig exakt så många steg** som resultatet visar längs giltiga banor på den nivå spelaren befinner sig på.
- **Ring-läge per våning:** banan är en **sluten ring** av rutor. **Ett steg** = **en kant** till nästa ruta i **tile-indexordning** (samma ordning som generering och som bordets `ringPos`). Efter slag (t.ex. **d6**, plus **rörelsebonus** från accessoar; *Skägget rakt bak* **dubblar inte** rörelsetärningen — se §10.1) erbjuds **två mål**: **medurs** (`tileIndex + summa`, modulo `n`) respektive **moturs** (`tileIndex − summa`, modulo `n`), där `n = antal rutor på våningen`. Om `n` är **jämnt** och summan är exakt **`n/2`** kan båda riktningarna landa på **samma** ruta — då är det geometriskt förväntat, inte ett räknefel.
- **Mobil (`/play`, rörelseval):** vid valet **medurs / moturs** visas **små pilikoner** vid sidan av rörelsetärningen som motsvarar **första stegets kardinalriktning** på den rektangulära ring-layouten (samma indexering som spelet). På rutor längs ringens **överkant** speglas **kolumnordningen** för de två knapparna så **vänster/höger** i UI matchar pilarna **visuellt** (medurs/moturs byter plats jämfört med standardläge).
- **Modifiers** från kort, items, status eller klunk-regler kan **minska eller öka** antal steg (eller ändra riktning/giltiga rutor). Alla sådana effekter ska **resolveras på servern** och loggas i spelloggen.

---

## 9. Strid

### 9.1 Spelare mot monster (PvE)

- **Tärningsresultat + vapenstyrka** (± tillfälliga buffar/debuff) avgör utfall mot **fiendens värde** (eller fiendens eget slag om så designas).
- Resultat: skada, loot, flykt, straffklunkar, etc. enligt tabell per mötestyp och tile.
- **Fasta vinstvärden per monster:** varje monster har nu **fast pant** och **fast antal rewards** vid seger (inga intervall/chansrull i resultatet).
- **Nya slumpmonster (solo, i leken):** **Enhörningsryttare** (styrka 6; förlust 4 HP och 2 straffklunkar totalt med global flat; vinst 5 pant + 2 skatter), **Färgglada gubbar** (styrka 4; förlust 2 HP och 1 straffklunk totalt; vinst 3 pant + 1 skatt), **Transporter** (styrka 4; förlust 3 HP och 1 straffklunk totalt; vinst 4 pant + 1 skatt), **Demonkrigare** (styrka 5; förlust 3 HP och 1 klunk; vinst 6 pant + 2 skatter), **Busiga buskar** (styrka 2; förlust 1 HP och 1 klunk; vinst 4 pant + 1 skatt), **Solen** (styrka 2; förlust 2 HP och 1 klunk; vinst 2 pant + 2 skatter).
- **Nytt team battle-monster:** **Cowboys** (styrka 7; förlust 3 HP och 1 straffklunk totalt; vinst 5 pant + 1 skatt). **Special:** vid seger får båda stridande **+5 HP** (cap vid max HP).
- **Reward-mix:** reward kan vara **itemkort eller utrustning** (blandad pool). Om mottagaren redan har utrustning i den slumpade slotten ska spelet erbjuda **bytesval** (ta emot och kasta befintligt, eller avböj) — **inte** tyst byta eller falla tillbaka till item. Flera utrustningsbelöningar efter samma strid hanteras **i kö** tills alla val är klara (§11).
- **Tur efter stridsvinst:** när vinnaren bekräftat **dålig batch**-vinstkortet (`combat_win`) går **turen vidare** till nästa spelare. **Bytesval** från stridsloot (`fromCombatLoot`) och eventuellt **nivåupp** hanteras **parallellt** på vinnarens mobil (`offTurnPersonalPending` för nivå — samma princip som efter straffklunk). Andra spelare ska kunna agera utan att vänta på bytesval/nivåbeslut. I team battle gäller samma för varje spelare i loot-kön.
- **Presentation av monsterkort (UI):** siffror för styrka, förlust (skada/klunk), vinst (pant/items) ska **inte ligga i sidhuvudet** utan samlas i en **rad längst ner på kortet**, med **ikon ovanför respektive siffra** (kolumnlayout per värde), så beskrivning och bild får fokus. **Styrka** i sidhuvudet visas som **lila pill** (svärdikon + siffra, `CombatStrengthPill`) — samma komponent på kort och i mobilens stridsvy.
- **Våningsnummer på dålig batch (UI):** efter batchnamnet visas **(N)** där **N** är **1-baserad våning** (`levelIndex + 1`) — t.ex. *Kapten Interrobang (3)*. Siffran och parentes i **rött**, typsnitt **Saira** (`var(--sans)`); namnet behåller **Permanent Marker**. Gäller **mobil** (monsterintro, team battle, stridskort) och **bord** (`MonsterEncounterCard`), men **inte** slutboss.
- **Mobil stridsvy (efter intro, före/under slag):** ovanför tärning/knappar visas **batchnamn i Permanent Marker** + **`CombatStrengthPill`** (samma framing som på kortet). **Vinst-/förlust-rutor** visas **inte** i denna panel (bara på monsterkortet/intro).
- **Vinstchans (mobil, före slag):** till **höger om stridstärningen** visas ungefärlig **vinstprocent** (normal textvikt, ingen pill) via `monsterCombatWinChancePercent` — samma regler som motorn (t6 + utrustning/attackmods/`nextCombatModifier`/vald vapen-klunkbonus, kritisk miss på etta / båda ettor i lag, Fyrklöver, dubbel tärning). Till **vänster** står attackmodifieraren som tidigare. Procenten uppdateras när buffar/hjälp/sip-vapenval ändras och döljs när båda (eller enda) slag är klara.

**Särskilda monster (val som spelaren gör):**

- **Sip Snatcher:** spelaren ska kunna välja **ta en sip (monstret försvinner, ingen strid)** eller **slåss** som mot ett vanligt monster.
- **Demonkrigare (före strid):** om spelaren har **≥ 10 pant** visas ett valkort **betala 10 pant och undvik striden** / **Slåss**. Om spelaren har **< 10 pant** ska **inget** sådant valkort visas — mötet går **direkt till monsterintro/strid** (som vanliga slumpmonster utan förhandsmodal).
- **Brewizard / Sourceress:** vid **förlorat** slag ska spelaren efter tärningsresultatet välja **ta en sip för reducerad skada** (och då +1 sip) **eller** **ta full skada enligt monsterets basvärde utan sip**. *(Exakta tal i data: t.ex. −3 / −2 mot full bas-skada.)* **Straffklunk-notis:** sip-meddelandet efter förlust ska visa **samma total** som tilldelats (monsterförlustens klunkar **plus** den valfria mitigations-klunken i **en** notis, inte två i rad.)
- **Klunk på förlust:** fler monster än tidigare ger nu explicit klunk-straff vid förlust (utöver HP-skada), inte bara specialfall.
- **Begär hjälp i monsterstrid (efter reaktioner, före slag):** angriparen kan välja **Be om hjälp** om det finns andra **aktiva** spelare (kräver **inte** positiva hjälpkort). Gäller **vanliga batchstrider** — **inte** lagstrid, **slutboss**, eller om någon redan assisterar (`assistId`, t.ex. Ölkompis). Angriparen väljer hjälpare; hjälparen väljer kontrakt (**gratis**, **pant**, **skatt**, **allt** (pant + skatt), **dela lika**) eller nekar. Vid accept blir hjälparen **`assistId`** och **slår egen tärning** (samma dual-roll / `teamRolls` som lagstrid och Ölkompis). Kontrakt styr hjälparens loot vid **vinst**; Ölkompis-skattedelning (lika många skatter som angriparen) gäller **inte** när assist kommer från hjälpkontrakt. **Bräd-TV:** under hjälpflödet (välj hjälpare / vänta på svar / villkor) visas en stor centrerad statusbanner i samma familj som Panta burkar (t.ex. `{namn} ber om hjälp`), ovanför kortfan och tärning.
- **Nya monsterspecialer:**  
  - **Demonkrigare:** vid förlust läker en **annan** levande spelare +3 HP (slumpad mottagare, cap vid max HP).  
  - **Busiga buskar:** vid förlust ger angriparen upp till **5 pant** till spelaren med **minst pant** (vid lika väljs mottagare slumpmässigt).  
  - **Solen:** vid förlust får angriparen *sol i ögonen* och **står över nästa tur**.
- **Kontraktsutfall:** hjälparbelöning betalas endast ut om laget **vinner** striden; vid **förlust** sker ingen utbetalning **och den accepterade hjälparen tar samma monster-HP-skada och straffklunk som angriparen i princip får i lagstrid** (egna rustnings-/vapenregler; mitigationsval för t.ex. Kapten Interrobang eller Sura bär följer angriparens val). **Ölkompis** i strid utan separat hjälpkontrakt hade redan motsvarande risk; på mobil speglas båda i **vinst-/förlust-modal** (och ev. toast enligt §2 ovan).
- **Ingripande / reaktionskort:** spelare som får ingripa kan spela flera spelbara reaktionsföremål i samma fönster. **Bordet** visar inte **vilka** som kan ingripa (hemligt); mobil visar bara generisk väntan för icke-ingripare. Efter varje spelat kort ska servern kontrollera om spelaren har fler **faktiskt spelbara** ingripandekort kvar; om inte markeras spelaren automatiskt klar/pass (ingen extra “Gör inget” krävs). “Faktiskt spelbar” tar hänsyn till kostnad och läge, t.ex. **Manopositiv** kräver 4 pant och **Ölkompis** kan inte spelas om någon redan hjälper.
- **Stridande spelare under reaktionsfasen:** angripare/medkämpe ska kunna spela egna fighter-kort innan slaget, t.ex. **Get Lucky**, **Manopositiv**, **Skägget rakt bak** och andra positiva attackkort, men de väljs från spelarens **inventory/föremålslista** som vanligt — inte som extra knappar i själva stridspanelen.
- **Lagstrid på mobil:** bredvid tärningen visas **endast din egen** attackmodifier (utrustning, kortbuffar, `nextCombatModifier` m.m.) — inte summan av båda stridande. **Vinstchans** räknar däremot **båda** stridandes bidrag (och villkorlig odds om ena redan slagit). **Storskärmsbrädet** kan fortfarande visa lagets **samlade** modifier enligt befintlig presentation.
- **Stridstärning — resultatrad (mobil):** under tärningen efter slag visas attacktotal mot fiendens styrka (t.ex. *Attack totalt **6** mot **3*** med stridsikon) — copy ska följa `locale` (`uiStrings` / `uiStringsEn`).

### 9.1.1 Team battle-monster

- Vissa starkare monster är markerade som **team battle**.
- **Inaktiva spelare som mål:** spelare som är **ute ur matchen** (`eliminated`, `leftVoluntarily`, eller **0 HP** utan stupad-bryggare-läge) ska **inte** kunna väljas som mål för föremål, **medkämpe** i team battle eller **stridsingripande**; klienten filtrerar listor och servern avvisar fuskförsök (`isPlayerActiveInMatch` i `game-core`).
- När ett sådant monster dras måste angriparen välja **en annan spelare** som **måste strida tillsammans** med angriparen.
- Båda spelarnas tärnings-/attackvärden summeras i slaget.
- Vid **vinst** får båda pant och rewards enligt monsterets **fasta vinstvärden**.
- Reward i team battle följer samma mix som övrig PvE-loot: **itemkort och/eller utrustning**.
- Vid **förlust** tar båda **samma inkommande skada** (med sina egna rustnings-/reduceringsregler tillämpade individuellt) och båda får klunk-straff enligt monsterregeln.
- **Väntan på slag (mobil):** medan båda ska slå i lagstrid ska status visa vem som **redan slagit** respektive **inte slagit** (lokaliserad copy per spelarnamn).
- **Partiella slag på bordet (lagstrid/Ölkompis):** under `reactions` med vald medkämpe visar bordet **två** tärningsplatser (angripare, sedan medkämpe). Varje tärning **fryses** så fort `pending.teamRolls[id]` har resultatet; den andra fortsätter snurra tills båda slagit. «N totalt» visas först i `rollPreview`.
- **Efter båda slagit (`rollPreview`, mobil):** **alla** berörda (angripare, medhjälpare/ölkompis och övriga) ska se **resultattärningarna** (`previewDie` / `previewBroDie`) + totalsammanfattning tills angriparen trycker **Fortsätt** (`combatRollAck`). Icke-angripare får väntetext i stället för Fortsätt-knappen — **inte** en tom vänteskärm utan tärningar.
- **Stridsrubrik på bordet (lagstrid):** vid lagstrid med vald medkämpe visar bordet **en** rubrikrad — *«ERIK OCH VERA MÖTER»* (`combatMeetBannerTeam` / `namesAndJoin` i `uiStrings`) — och den tidigare underraden *«Lagstrid: Vera»* utgår.
- **Total efter slag (bord):** när stridstärningen är slagen (`rollPreview`, både singel och lagstrid) visas **«N totalt»** under tärning + modifierare (`previewTotal`, samma Permanent Marker-stil som siffran, mindre grad på ordet *totalt*); döljs vid döskalle (auto-förlust på etta/ettor).
- **Konsistent modifierare på bordet:** efter slaget härleds den visade modifieraren **exakt** ur `previewTotal` (total − tärningsbidrag − ev. vapen-klunkbonus), så tärningar + modifierare + klunk-chip alltid summerar till totalen — även för förbrukad `nextCombatModifier` (t.ex. Lengräddad). Under reaktionsfönstret visas en löpande uppskattning (attackmods + utrustning + `nextCombatModifier`). Vapen-klunkbonus i preview (`previewSipWeaponBonusValue`) aggregeras över **båda** slagen i lagstrid (`teamRolls.sipBoost`), inte bara den som slog sist.
- Spellogg/toast ska redovisa skadan för **båda** spelarna vid team-förlust (angripare och medkämpe), inklusive särskild Get Lucky-copy när dubbel HP-skada gäller — **på valt språk** i klienten (rå logg på svenska; bord/mobil via lokalisering).

### 9.2 Bryggare mot bryggare (BvB)

**Terminologi i spelet:** spelar-mot-spelar-dueller kallas **BvB** (*bryggare mot bryggare*) i UI, spellogg (svenska) och på brädet där det är lämpligt. *(I kod och nätverksactions kan interna namn som `pvp`/`choosePvpOpponent` kvarstå tills en ev. refaktor.)*

**Nuvarande implementation (MVP-spår):**

- **Utlösare:** när en spelare **landar** på en ruta där **minst en annan spelare** redan står (samma nivå och tile-index), skapas ett **mötesval** (`encounterChoice`) innan rutan löses.
- **Första valet (den som flyttade in):** **BvB** (båda slår tärning + vapen och jämför) **eller** **lös rutan** utan BvB (tile-effekter/kort/strid enligt ruttyp körs som vanligt).
- **Flera motståndare på rutan:** efter att spelaren valt BvB ska den **välja vilken bryggare** som utmanas (lista med namn); därefter startar duellen mot vald motståndare.
- **Duell:** båda slår **d6 + vapenstyrka + eventuell `pvpDieBonus`** (tärningsbonus **endast i BvB** — påverkar **inte** monsterstrid). Högst total vinner rundan.
- **Rondformat:** BvB spelas som **best-of N** där **N = `config.pvpBestOf`** (lobby: **1–5**, default **1**). Första till `floor(N/2)+1` rondvinster vinner duellen. Fasmaskinen (föremålsfönster, rondresultat, matchställning) stödjer multi-rond; UI visar rond/ställning när `bestOf > 1`.
- **Föremålsfönster före varje rond:** innan båda slår tärning finns en förberedelsefas där båda duellanterna kan spela tillåtna PvP-föremål (buff på sig själv eller sabotage på motståndaren) och markerar **Klar**. När båda är klara startar slaget för rundan.
- **Auto-klar vid tom hand:** om en duellant inte har några tillåtna PvP-föremål kvar i förberedelsefasen räknas den spelaren automatiskt som klar; copy ska vara kortfattad (t.ex. bara att inga BvB-föremål finns — **ingen** extra mening om att man “inte behöver trycka Klar”).
- **Tillåtna BvB-föremål:** klient och server ska hålla samma lista för förberedelsefasen. **Manopositiv** är tillåtet i BvB och måste därför både visas som spelbart och göra att **Klar**-knappen finns när spelaren har kortet (förutsatt 4 pant).
- **Lika i en rond:** vid lika total återgår duellen till nytt föremålsfönster och omslag i **samma rondnummer** (ingen rondvinst delas ut).
- **Rondresultat före nästa steg:** efter avslutat rondslag går duellen till en kort **rondresultatfas** där båda spelare bekräftar resultatet på mobilen innan matchen fortsätter till nästa rond eller byte.
- **Tärningsrond (mobil):** ingen extra ledtext före “Slå din tärning” i väntan på BvB-slag (undvik redundant “klarrunda”-copy).
- **Rondresultat (mobil, copy):** visa kort och spelarcentrerad info: **“Rond N”** samt **“Du vann ronden” / “Du förlorade ronden”**; visa inte separat rad för totaler, matchställning eller global “Vinnare: …” i just detta steg.
- **Vinnare** väljer **ett** byte mot förloraren (pant upp till **10**, straffklunk, skada, eller stjäla utrustning i en slot) enligt data/regler som redan finns i implementationen. **Stjäla utrustning:** om vinnaren redan har något i samma slot gäller samma **bytesval** som §11; vid **avböj** förstörs den stulna pjäsen (den returneras **inte** till förloraren).
- **Skydd mot stöld (t.ex. Solbrillor):** har förloraren `preventTheft` på tillbehör ska vinnaren **inte** erbjudas val att ta utrustning — bara **pant**, **straffklunk** och **HP-skada** (implementation + mobil-UI); pantbyte ska fortfarande gälla.
- **Förlorare — mobilnotis (byte efter duell):** notiser som beskriver att du **förlorade duellen** använder variant **`duel_loss`**: rubrik **“Du förlorade duellen”** (normal versalisering), **vit tum-ned-ikon i röd cirkel** mellan rubrik och brödtext, **lite mindre** brödtext än standard, ingen stor mottagarrad; bekräftelseknapp **“Fattar”** (andra anpassade notiser kan behålla **“Fattat”**). Samma kölogik som övriga straff-/sip-notiser där det är applicerbart.
- **Förlorare:** definiera slutgiltigt i design (t.ex. ligga kvar på rutan) — dokumentera här när beslutet är helt låst till en känsla ni vill ha.
- Allt ska **avgöras på servern** och synas tydligt i spelloggen.

**Framtida / valfritt:** samma duell kan även erbjudas via **händelsekort** eller dedikerad **utmanings-ruta**; dokumentera när sådana spår läggs till.

---

## 10. Ekonomi och affärer

- Spelare har **pant** (heltal ≥ 0) som huvudvaluta — **inte** “guld” i spelarens upplevelse.
- **Startpant:** sätts i lobbyinställningar (default 5) och appliceras när partiet startar. **Respawn/omstart** använder samma konfigurerade startpant om omstart är tillåten.
- **Affärer** nås via **rörelseval** (§10.2) och ibland via **händelsekort**. Sortiment: köp **items**, **hälsa**, **engångs-boosts**, eller **karta/information** beroende på balans.
- **Priser** kan skala med **nivå** eller **runda** så senare spel inte blir för lätta.
- Pant kan också **förloras eller vinnas** via händelser och **BvB** (§9.2).
- **Handlare (nuvarande flöde):** spelaren kan köpa **flera saker i samma besök** och lämnar handlaren explicit när den är klar. **Samma hyllpost kan inte köpas två gånger i samma besök**; köpt post tas bort direkt ur handlarens utbud.

### 10.2 Panta burkar (affär vid rörelseval)

- **Ingen affärsruta** på nya bräden — i början av sin tur väljer spelaren **antingen** att slå rörelsetärningen **eller** **Panta burkar** (`chooseMerchant`, kräver **minst 5 pant**). Pjäsen står kvar vid pant; tur avslutas när spelaren lämnar handeln.
- **Köp per besök:** flera köp tillåtna; spelaren **lämnar** explicit när klar.
- **Hyllan (4 platser):** innehåller alltid **Helande brygd** (**+3 HP**, **5 pant** i handeln), **två slumpade** utrustningar från hela **`EQUIPMENT_CATALOG`** (inkl. t.ex. **Mäskpaddel** och **Burkrustning**), och **ett slumpat stridsföremål** (+/− attack i strid — samma typer som **startföremål** vid spelstart, **7 pant** i handeln). Efter blandning visas **exakt fyra** erbjudanden. Föremål vars kort är inaktiverat i lobby (`disabledCardIds`) utesluts ur stridsföremål-poolen; om poolen då är tom ersätts fjärde platsen med en tredje utrustning.
- **Mobil (pris och info):** under varje vara ska **effektrad** visa **inline ikon + siffra** (`renderInlineEffectBadges` / `shopItemEffectBadges`, åtskilda med · — **inte** pills) för faktiska vapen-/rustnings-/hjälm-/tillbehörsegenskaper (kraft, BvB-bonus, sip-attack, skadanollställning, rörelse, **föremålsbonus**, m.m.). **Burksvärd:** attackvärde ska spegla **nuvarande kraft efter pant** (samma trösklar 10 / 20 / 30 som i strid), inte bara vapnets grundvärde.
- **Detaljvy (mobil):** tryck på en hyllrad öppnar **art + namn + utförlig effektbeskrivning** (mekaniska rader med **inline ikon+siffra** via `renderShopItemEffectDetail` / `renderProseWithStatIcons`, plus `rulesText` när den finns) + Köp/Tillbaka. Listans kompakt-rad behåller korta ikon+siffror (`renderInlineEffectBadges`). Namn lokaliseras (`merchantShopItemDisplayName`). **Köp-knapp** visar pris via **`formatPantAmount`**. **Utrustningsbyte** använder samma inline-ikonstil för jämförelse av nuvarande/ny.
- **Teknik:** vid köp ska servern kopiera **alla** relevanta fält till spelarens utrustning, inkl. **`pvpDieBonus`** på vapen och **`itemCardBonus`** på rustning/hjälm/tillbehör om det finns i butiksraden.
- **Slumpa om sortiment:** i handeln finns knappen **Slumpa om (5 pant)** bredvid **Lämna**. Kostar **5 pant**, ersätter **alla fyra** hyllplatser med nytt slump (`rollMerchantItems`); affären stängs inte. Action: **`merchantReroll`**.

### 10.1 Nya item-effekter (aktuellt läge)

**Genväg** (`shortcut`): på **egen tur**, betala **10 pant** och **teleportera till valfri annan aktiv spelare** (målval i föremålsmodal). Målvalslistan visar **spelarnamn + våning** (`ui.table.floorN`). Landning följer vanliga regler (`resolveLanding`: mötesval om spelare på rutan, annars rutaeffekt). Stiger spelaren till högre våning loggas monster-+ som vid annat våningsbyte.

**Genväg / Taproom-nyckel (spelbarhet):** dessa föremål ska kunna användas även när spelaren har ett aktivt **rörelseval**, är i **handel**, eller är **den som flyttat in** och ska lösa **mötesval** (BvB vs lösa ruta) — t.ex. teleportera med Genväg eller fly till boss med Taproom-nyckel utan att först tvingas genom BvB-flödet.

- **Druckit för mycket** (tidigare “Svag öl”): stridsreaktion, **−2 spelarattack**.
- **Lättöl**: stridsreaktion, **+1 spelarattack**.
- **Folköl**: stridsreaktion, **+2 spelarattack**.
- **Krokben**: stridsreaktion, **−1 spelarattack**.
- **Ölbomb**: stridsreaktion, **+3 spelarattack**.
- **Baksmälla**: stridsreaktion, **−3 spelarattack**.
- **Skägget rakt bak**: används när spelaren **ska slå i strid** (monster: reaktionsfas om angripare/ölkompis; BvB: i väntan på tärningsslag). **Dubblar värdet av tärningsslaget i attacktotalen** för det slaget (visad t6 oförändrad; vapen m.m. läggs till som vanligt). Copy: *“Dubbla ditt tärningsslag vid strid.”*
- **Lengräddad** (föremål, inte händelsekort): spelas på **annan spelare**; nästa strid för målet **−2 attack**; ska kunna spelas även när man **ingriper** under stridsreaktioner (samma fönster som övriga reaktionsföremål).
- **Pantpåse** (item, internt `coin_purse`): engångsbruk ger **+4 pant** (visningsnamn tidigare “Penningpung”).
- **Canman** (item): ligger kvar i förrådet och ger **+1 pant per rörelsetärning** tills **10** sådana slag har passerat (räknare på instansen; ingen spelarstatus, ingen använd-knapp); bild som **`public/items/canman.png`** med `artKey` `item/canman` i kortdata.
- **Get Lucky** (`get_lucky`): stridsreaktion som kan spelas på **den som slåss** (angripare eller medkämpe), även av en annan spelare som ingriper. Målet får **+4 attack** i striden; om målet sedan förlorar tar just den spelaren **dubbel HP-skada**.
- **Manopositiv** (`manopositiv`): stridsreaktion med **+4 attack** på valt mål i striden (stödjer PvE/BvB-fönster och ingripande); kostar **4 pant** direkt när kortet spelas (kan inte spelas om spelaren har <4 pant).
- **Händelse/skatt med `randomItem`**: kan ge **föremål från item-leken** (`decks.item` i `cards.json` — alla listade `item_*`-kort ska finnas där för att kunna slumpas) eller (slump, om ledig utrustningsslot) **utrustning** från **`EQUIPMENT_CATALOG`** — samma idé som blandad monsterloot och stridsbelöning. När spelaren är på **sista brädnivån** dras **Taproom-nyckel** ur slump-poolen (meningslös utan nästa våning); **Genväg** kan fortfarande slumpas. **Fast** korteffekt som anger ett visst föremål och **handeln** (`Panta burkar`) påverkas inte.
- **Vaska** (`early_night` m.m.): bild **`public/items/spill_intentional.png`** när tillgänglig.
- **Riggat spel** (`rigged_game`): spelas **utanför strid** mot **annan spelares** utrustning; kostar **5 pant**. Stjäl pjäsen i vald slot. Har tjuven redan utrustning där → **bytesval** (§11); vid avböj **förstörs** den stulna pjäsen. Offret tappar slotten när stölden triggas; pjäsen hålls i **escrow** tills tjuven bestämt sig. **Offret** får **sip-notis** på mobil (rubrik = korttitel, brödtext t.ex. *«X tog Y från dig med Riggat spel»*); ska lokaliseras via `localizeSipNotice` vid `locale: en`.
- **En enkel stöld** (`not_my_round`): **stridsreaktion** med samma stöld- och byteslogik som **Riggat spel** (mål: motståndare i striden).

---

## 11. Utrustning

**Valfri vapenbonus mot monster (`sipAttackBonus`):** utöver **Enkelpipa** / **Dubbelpipa** (fast pantkostnad i legacy-logik) kan vapen i datan ange **`sipWeaponBonusGoldCost`** (pant före monstertärning) eller **`sipWeaponBonusKlunks`** (positivt ⇒ **straffklunk(ar)** i stället för pant). Klient och server använder samma regel (`sipWeaponExtraAttackCosts`). Motmonster ger klunken **XP** som övriga straffklunkar; pant dras från saldot och räknas som spenderad där det gäller.

Hård cap per spelare:

| Plats | Max |
|--------|------|
| Rustning | 1 |
| Vapen | 1 |
| Hjälm | 1 |
| Accessory | 1 |

Ny utrustning i en **ledig** slot utrustas direkt. Om slotten redan är fylld ska spelaren normalt få ett **bytesval** (ta emot nytt och kasta befintligt, eller **avböj** och behålla det gamla). Automatiskt byte utan val gäller bara där reglerna uttryckligen säger det (t.ex. köp i handeln som byter på plats).

**Bytesval vid upptagen slot (implementation):**

- **Monsterstrid / team battle / ölkompis / stridshjälp:** slumpad utrustning i belöning ger **inte** item-fallback om slotten är full; mottagaren får **erbjudande om byte** (`equipmentReplaceOffer`). Vid **flera** väntande byten efter samma stridsvinst hanteras de **i kö** (`combatEquipReplaceQueue`) tills alla är avklarade.
- **Skatt/händelse med `randomItem`** och motsvarande korteffekter: samma princip — ledig slot utrustar direkt, annars bytesval efter kortbekräftelse.
- **BvB-byte (stjäla utrustning)** samt **Riggat spel** / **En enkel stöld** (§10.1): om mottagaren/tjuven redan har utrustning i samma slot.
- **Avböj:** spelaren behåller sin nuvarande utrustning; den **inkommande** pjäsen **förstörs** (lämnas **inte** automatiskt tillbaka till tidigare ägare vid stöld). Vid stöld hålls den stulna pjäsen i **escrow** (`stolenEquipmentEscrow`) tills valet är klart.
- **Under pågående bytesval:** spelaren ska inte kunna störa flödet med t.ex. **Vaska** eller **muta** förrän valet är avklarat.
- **Bytesval-UI (mobil + handel):** vid erbjudande om byte ska **effektsammanfattning** visas för **nuvarande** och **ny** utrustning (samma typ av rader som i affären/katalogen), inte bara namn.

**Detaljmodal (mobil / spelvy):** tryck på en utrustningsplats öppnar en modal med **unik art** där hela bilden ska synas (**centrerad**, `object-fit: contain` i ram). I rubrikraden visas **effektikoner** (samma som i översikten): t.ex. **`combat-icon.svg`** för attackmod, **`armor-icon.svg`** för försvar — **inte** slot-siluett som primär indikator. Under bilden visas en **kompakt effektlista** (samma princip som Panta burkar / kortkatalog) **och** valfri **`rulesText`** per katalogpost (smaktext / särregler, t.ex. **Solbrillor**, **Svart bälte**, burk-setet). Försvarstal i bricka/badge visas som **positiv siffra** (+N) så det inte misstas för extra skada. På **egen tur**: knappen **Ta bort** / **Remove** (`unequipEquipment`) kastar/förstör pjäsen i slotten; max HP justeras om rustning/hjälm gav `bonusHp`. **Stäng** sker via **nedre interaktionspanelen** (ingen extra stäng-knapp i föremålsmodalens huvud).

**Burk-rustning (implementation):** **Burkrustning**, **Burkhjälm** (första hjälmen) och **Burksköld** (tillbehör; tidigare namn *Pilsnersköld* i sparade partier) bildar ett **set** för skadereduktion: **−1** med en del utrustad, **−2** med två (rustning + hjälm räknas ihop max −2), **−3** med alla tre; **skölden bidrar alltid högst −1** till setets totala reduktion. **Legendarisk Burkhjälm** (tidigare *Burkhjälm II*): **+5 HP** och **−4 skada per träff** från **nivå 4**, annars ingen reduktion.

**Översikt (mobil):** utrustningsrutor kan visa **små badges** (ikon + tal) som speglar föremålsrutorna. **Under utrustningsfyran** visas en rad **piller** (samma stil: mörk bakgrund, vit siluett-ikon, tal) med **max HP**, **attack från utrustning** (separat från tillfällig modifierare), **sköld** (skadersläckning), **BvB** (`pvpDieBonus` från utrustning) och **föremålsbonus** (`cards-icon.svg`, ackumulerat värde). Om **`nextCombatModifier` ≠ 0** (t.ex. Lengräddad till nästa strid) visas den som **egen** markering bredvid attackpillen — inte ihopbakad med vapnets kraft. **Föremålsbonus** ska **inte** ligga i mobil-headern (där visas bara **aktuellt HP**, **pant**, **klunkar** och **bryggnivå-ring**). Piller med värde **0** dämpas visuellt (samma princip som attack/BvB).

**Status i header:** **(Zzz)** visas för vanlig sömnstatus; **(Öl i ögat)** visas separat för olje-status och ska inte få extra **(Zzz)**-tagg.

**Badge-läsbarhet (mobil):** på smalare telefoner ska badges i inventory/utrustningsöversikten (ikon + tal) skala ner (padding, ikon och text) för att undvika trängsel/klippning.

**Monsterförlust-klunk (badge):** reduktion av straffklunk vid monsterförlust visas som en **kompakt** etikett (**`−N`**) bredvid klunk-ikonen, i linje med övriga talbadges.

**Nya utrustningar (nuvarande implementation):** **Linne** (rustning: +1 attack, −1 skadereduktion), **Dunjacka** (rustning: +5 max HP, −1 attack), **Keykeghjälm** (hjälm: +2 skadereduktion, −1 attack), **Störtkruka** (hjälm: +4 max HP), **Beanie** (hjälm: **+2 max HP**, ingen sköld), **Fyrklöver** (tillbehör: etta på stridstärning ger inte automatisk förlust), **Tom flaska** (vapen: +5 kraft, går sönder efter vinst), **Ölsejdel** (vapen: grundkraft + valfri klunk före monstertärning för högre vapenattack enligt `rulesText` / katalog), **Plastmugg** (vapen: **−1 attack**, **−2 max HP**; medan den sitter utrustad kostar **alla föremål 0 pant att spela från förråd** — gäller poster i `ITEM_PLAY_GOLD_COST`, t.ex. Manopositiv, Get Lucky, Vaska; **affärspriser oförändrade**; inte Genväg/Taproom-rörelse), **Guldkedja** (tillbehör: **+2 pant per monsterstrid**), **VIB Member** (tillbehör: −2 pant i handeln), **Plastback** (tillbehör: förlänger **Tom flaska** till sex monstersegrar; **hållare** med **6 flaskor** (`plastbackPackRemaining`); **översikt:** pant-ikon-badge = **flaskor kvar i hållaren**; **Ta flaska** (egen tur) tar ut Tom flaska och minskar pack med 1 — vid upptagen vapenplats med annat vapen gäller **bytesval** (pack minskar först vid accept); Tom flaska redan utrustad **refreshar** till 6 vinster; **försäljning** ger pant = **endast pack**, inte utrustad flaskas vinster), **Livförsäkring** (tillbehör: vid stupad bryggare kan spelaren betala **10 pant** för fullt liv — se §12), **Hawaiiskjorta** (rustning: **+2 föremålskort**), **Pannband** (hjälm: **+1 föremålskort**), **Anteckningsblock** (tillbehör: **+1 föremålskort**). **Monster-special:** **Robotarm** (+2 BvB), **Robothjälm** (+2 sköld) från Rally Robot.

**Föremålsbonus (`itemCardBonus`):** permanent buff som **stärker platta siffror** på föremål — plus blir mer plus, minus mer minus (t.ex. −2 attack → −3, +3 HP → +4). Källor **adderas**: val vid **bryggnivå** (`brewerItemCardBonus`, se §13.1) plus utrustning med `itemCardBonus`. Påverkar **stridsföremål** med fast attackmod (alla poster i `COMBAT_ITEM_BASE_ATTACK_MODS`) samt engångsföremål **Helande brygd** (`healing_potion`), **Pretzel**, **Pantpåse** (`coin_purse`) och **Klunkkort** (`sip_card`). **Påverkar inte** kostnader (t.ex. Vaska 10 pant), multiplikatorer (×2), skip/Zzz, dynamiska effekter (charity), nivåberoende Genväg/Taproom eller Canman. Förråds-badges **och** föremålskortets **brödtext** i detaljvy (`itemMetaForView`) visar **faktiska** värden efter bonus **och** (för strid) brädnivå-skalning — samma motorhjälpare som badges; kostnader i texten (t.ex. Get Lucky 5 pant) lämnas orörda. Katalog utan spelarkontext visar basvärde. **Alla förvärvsvägar bevarar fältet:** även **slumpad utrustning** från händelsekort/skatt/stridsloot (`tryGrantRandomEquipmentOrOffer`) kopierar `itemCardBonus` till rustning/hjälm/tillbehör. **Handel/equip** (`equipShopLikeItemToPlayer`): när `item.id` finns i **`EQUIPMENT_CATALOG`** hydreras pjäsen från katalogfält (så korrupt hyllrad inte kan lämna kvar t.ex. Plastmugg-`power` / `freeInventoryItemPlay` efter byte till annat vapen).

**Kapsylbikini** (rustning): kan inte utmanas i **BvB** (`pvpCannotBeChallenged`); shop-badge använder etiketten **BvB** (inte PvB).

**Global modal-bakgrund:** paneler som ska matcha spelkort/modaler använder CSS-variabeln **`--modal-panel-bg`** (`radial-gradient` mörkgrå → svart) i `index.css`.

**Utrustningsbilder (webben):** när unik art finns som **WebP** med tillhörande **AVIF** används `<picture>` med **WebP som `img`-fallback** (inte längre en separat PNG-fallback med samma basnamn om den saknas).

**Föremålsbrickor (mobil, Safari / WebKit):** inventory-rutorna för **föremål** ska använda **lagerindelad layout** (t.ex. CSS grid med gemensam **“stack”**-cell): **bilden** i ett **eget** lager med `overflow: hidden` och avrundade hörn, **antal** (stack) och **effekt-badge** (ikon + siffra/text) i ett **overlay-lager** ovanpå med `z-index`. Syfte: undvika att **`object-fit: cover`** + **`height: 100%`** på `<img>` klipper bort **nederkant** på badge/siffror (känt iOS Safari när yttre knapp har `overflow: hidden`). Utrustningsfyran kan följa **samma mönster** så små märken längst ner inte klipps.

**Fynd-kort i modal (händelse/skatt):** när spelaren hittar item via kort (`event_find_item_*`, `treasure_item_*`) använder bildrutan i kortmodalen en **roterande radial/conic-regnbågsbakgrund** bakom item-arten. Bilden fyller rutan (`object-fit: cover`) och bakgrundseffekten är avgränsad till själva bildramen.

---

## 12. Död och respawn

- Spelaren kan **välja att starta om på nytt** efter att ha blivit besegrad/“död” (exakt trigger definieras i combat-regler).
- **Startföremål vid spelstart:** varje spelare får **ett positivt** och **ett negativt** stridsföremål (samma pooler som `grantStartingCombatItems` i `game-core`: buff t.ex. Lättöl/Folköl/Ölbomb m.m., debuff t.ex. Druckit för mycket/Baksmälla/Krokben m.m.).
- **Omstart (nuvarande implementation):** vid val **Starta om på nytt** i stupad-bryggare-läget (ej hardcore) återställs spelaren till **start-ruta** (nivå 0, tile 0), **lobbyns startpant**, **0 klunkar**, **ingen utrustning**, nollställda strids-/statusflaggor och **nya startföremål** (samma buff/debuff-pool som vid spelstart; egen deterministisk slump per omstart). **Alla permanenta bryggnivåbonusar nollställs** också (`resetBrewerPerkProgress`: styrka/sköld/BvB/HP/föremålskort, räknare för gjorda val samt ev. väntande nivåval). Sessionsstatistik (t.ex. antal stup, totala klunkar, spenderad pant) **behålls**.
- **HP vid omstart:** sätts till lobbykonfigurerat max HP (default 10).
- **Hardcore mode:** om aktivt tillåts ingen omstart; spelaren elimineras vid 0 HP.
- **Respawn-plats (nuvarande implementation):** **start-ruta** på nivå 1 (index 0).
- **Livförsäkring (tillbehör):** om spelaren dör och har **Livförsäkring** utrustad kan den i *stupad bryggare*-läget välja att betala **10 pant** för att fortsätta med **fullt liv** (om pant räcker), utan att nollställa position/utrustning/inventory. **Förbrukas** vid användning (tas bort från tillbehörsslottet).
- **Stupad bryggare (presentation):** mobil och bord använder **`/icons/gameover.svg`** som huvudillustration (inte vit inverterad dödskalle). På **bordet** kan **eldvideo** ligga i backdrop under panelen (§2.1); mobil utan eldvideo.

---

## 13. Öl / straffklunkar

- **Straffklunk-räknare** per spelare (heltal ≥ 0).
- **Notiser efter händelsekort:** klunk som ska följas upp med **sip-modal** kan ligga i en **kö** kopplad till det visade kortet (`queuedPenaltySipNotices`). Vid **Fortsätt** (`confirmCard`) töms kön **i ordning** — flera klunkkällor på samma kort-flöde (t.ex. kombinerade val/effekter, eller **Apocalypse** som ger alla spelare klunk) ska ge **en modal per post**, inte en ihopslagen eller felaktigt för tidig notis.
- Kort och händelser kan **öka** motspelares klunkar eller påverkas av antal klunkar (modifiers på slag, kort som låses upp, etc.).
- **Säkerhet och inkludering:** tydlig text att **alkohol är valfritt** (vatten räknas som klunk om gruppen vill). Spelet ska kunna spelas som **rent social räknare** utan krav på konsumtion.
- **Konsekvent wording på monsterkort:** klunkstraff uttrycks som **“Vid förlust: ta X klunk.”** Skaderelaterade effekter och val (t.ex. Bryggtrollkarl/Surhäxan) inleds med **“Vid skada:”** (inte “Vid träff”).

### 13.1 Bryggnivå (progression i UI)

- **Bryggnivå** beräknas från spelarens **XP** (implementation i `game-core`: `brewerLevel` / `brewerKlunkProgressRatio`). **Visad bryggnivå i UI** är **intern nivå + 1** (minst 1) — samma på mobil-header, bordets spelarrad/sidopanel, slutresultat, level-up-toasts på bordet och copy i snabbguide/mobil.
- **XP-trösklar (nuvarande balans):**
  - level 1 vid **120 XP**
  - level 2 vid **300 XP**
  - level 3 vid **620 XP**
  - level 4 vid **980 XP**
  - level 5 vid **1380 XP**
- Efter sista explicita tröskeln fortsätter skalan linjärt med samma differens som mellan de två sista nivåerna.
- Visas i **mobil-header** som progress mot nästa visad bryggnivå och som nivåsiffra i nivå-ringen.
- **Resultatlista** när partiet är **slut** visas som **tabell** på både `/table` och mobil (`/play`): **namn**, **bryggnivå** (samma ring och `lvl`-ram som i mobil-header), **antal stupad bryggare** (gånger spelaren triggat stupad bryggare vid 0 HP), **monster V/F** (vunna respektive förlorade monsterstrider), **förbrukade föremål**, samt **klunkar**, **pant** och **HP**. På **`/table`** (variant **`table`**) visas **spelaravatar till vänster om namnet** (~52px); mobil slutresultat har **inte** avatar i tabellen. Under tabellen visas **badge-rader** (“bäst i klassen”) per statistiktyp där värdet är större än noll; **delad förstaplats** listar alla berörda spelare. På **`/table`** använder tabellen variant **`table`** med **större** celltext och kolumnikoner (~28px) för läsbarhet på avstånd; modalen är **bredare** och bakgrund kan vara **ölvideo** med panel i **`--modal-panel-bg`** (§2.1).
- **Eliminerade spelare och resultatlista:** när en spelare väljer **ge upp** från stupad bryggare (`eliminated`) och mobilen skickar **`leaveGame`**, ska servern **inte ta bort** spelaren ur **`players`**-listan under pågående eller avslutat parti — slotten behålls som **spök-spelare** med stats så **alla** fortfarande syns i sluttabellen och spotlight/jämförelser. **Undantag:** om **bordet** uttryckligen **kickar** en spelare (`tableKickPlayer` med `purgeSlot`) tas spelaren bort helt ur roster-state som tidigare.
- **Kick / medveten bortkoppling:** vid `tableKickPlayer` (och vid `clearPlayersOnRematch` + **Nytt spel**) skickar servern **`sessionEnded`** (`reason: kicked` \| `lobbyCleared`) och stänger WS med close-kod **4001** / **4002** innan anslutningen bryts. Mobilklienten ska **sluta auto-reconnecta**, rensa sparat `playerId` och navigera till startsidan (toast). Enbart WS-stängning utan denna signal får **inte** användas — annars återansluter mobilen och skapar en ny lobbyplats.
- **Boss:** varje **vunnen runda** mot slutbossen (även när bossen har flera liv kvar) räknas som **+1 monsterseger** i sessionsstatistiken, så siffran följer spelupplevelsen av flera stridsrundor.
- **Persistens:** sessionsstatistik lever i **`GameState`** under partiet; långsiktig lagring per konto/aggressionsfil är **inte** krav i nuvarande implementation.
- **Slutmodal spotlight:** under rubrik/vinnare visas en **höjdpunktskarusell** som växlar mellan partidata (t.ex. flest ettor sammanlagt, mest spenderad pant, flest BvB-segrar och flest spelade BvB-matcher, sammanlagda förluster, mest sabotage, mest hjälpsegrar, samt utökande kategorier som största tärningsslag och flest stup). Karusellkorten använder **`--modal-panel-bg`** (inte blågrå slate-panel). Vid **`prefers-reduced-motion: reduce`** visas **alla** höjdpunktskort i en lista utan automatrotation (med manuell scroll).
- **Spenderad pant (`goldSpent` i state):** räknar pant som lämnar spelaren till **spelets sinkholes** (handel, avgifter för föremål/strider/korteffekter, livförsäkring, undvikande av möten där pant tas utan motpartssaldo m.m.). Pant som bara **överförs till annan spelares saldo** (BvB-byte, hjälpkontraktsbetalning, spelare-mot-spelare-stöldkort m.m.) räknas **inte** som spenderad i denna statistik.
- **Koppling till uppstigning:** level-up offer (§7.3) använder samma bryggnivåskala som UI.
- **Bryggnivåbonus:** vid varje ny **XP-baserad bryggnivå** (tröskel i §13.1) väljer spelaren **en** permanent bonus: **+1 styrka** (monsterstrid), **+1 sköld** (skademinskning), **+2 HP** (max + nuvarande), **+1 BvB** (tärningsbonus i duell) eller **+1 föremålskort** (platta föremålseffekter enligt §11). **Varje kategori max 3 gånger** totalt; mobilknappar visar **(n/3)** och **inaktiveras vid 3/3**. Befintliga höga bonusar i sparade partier **skalas inte ned** — nya val blockeras bara när kategorin redan nått taket. Om alla kategorier är maxade men oupplösta bryggnivåer finns kvar **konsumeras nivåerna utan bonus** (logg: inget val kvar). Valet sker i mobil (`brewerPerkChoice`) när inget annat pending blockerar; fem alternativ som **ArcadeButton**-rader med ikon + **lokaliserad etikett** (`uiStrings`).
- **Straffklunk och XP:** varje straffklunk ger XP (nuvarande balans: 10 XP per klunk), och modalcopy kan visa motsvarande `+XP`.
- **Monsterloot:** högre `rewardGold` / fler `rewardItems` på dåliga batcher samt något högre chans till utrustning i stridsbelöning (implementation i `monsters.ts` / `grantRandomCombatReward`).

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
- **Stora bakgrundsbilder** för brädet bör **komprimeras** (t.ex. WebP med rimlig upplösning) så laddning och minne hålls i schack på storskärm och surfplatta.

---

## 16. Nätverk och tillstånd

- **GameState** som kan serialiseras (JSON) och valideras på servern.
- **Händelser** från klienter modelleras som **actions**; server svarar med **uppdaterad state** och/eller **eventlista** för logg.
- **Belastningsskydd (server):** inkommande actions per klient begränsas (rate limit per sekund) för att minska spam/toppar.
- **Action-idempotency:** klient kan skicka `actionId`; server ignorerar dubletter inom ett tidsfönster för att tåla nätverks-retry/dubbelklick.
- **State-distribution:** nya anslutningar får full **snapshot** (`state`), och löpande uppdateringar kan skickas som **delta** (`stateDelta`) för lägre payload och mindre serialiseringskostnad. Broadcast till ett rum koalesceras i korta tidsfönster vid snabba actions.
- **Roster i `stateDelta`:** när spelarlistan **ändras** (join/leave/kick/`returnToLobby`) ska servern skicka **full** `players`-array (inte bara partial). Det gäller även när listan blir **tom** (`players: []`) — annars behåller klienterna gamla spelare tills refresh. Partial `players` + `playersPartial` får endast användas när roster-id:n är oförändrade och en delmängd uppdaterats.
- **Protokollsignalering:** servern skickar `protocolVersion` i `helloAck` (för kompatibilitetskontroller) och exponerar readiness på `GET /ready`.
- **Protokollpolicy (P1):** servern håller ett explicit supportfönster (`MIN_SUPPORTED_CLIENT_PROTOCOL`..`CURRENT_PROTOCOL_VERSION`), loggar/metric-inkrementerar mismatch och avvisar inkompatibla klienter konsekvent.
- **Snapshot-migrering (P1):** snapshots har versionsfält och lastas via migreringspipeline för bakåtkompatibilitet; okänd framtida version hanteras fail-safe (tom restore i stället för krasch).
- **Privilegierade actions:** känsliga åtgärder (`startGame`, `setConfig`, `tableKickPlayer`, `returnToLobby`, `endMatch`) kräver trusted anslutning (auth-token när servern kör i token-läge).
- **Admin-endpoints (P1 baseline):** `GET /admin/rooms` (översikt), `POST /admin/rooms/:code/close` (driftstängning). Avsett för drift/ops, inte spelar-UI.
- **Release-gate i CI (P1):** smoke + full E2E + snapshot-migration-check + load-check + metrics-threshold-check måste passera innan release-steg.
- **SLO baseline (P1):** action roundtrip **p95 <= 300 ms** i CI-loadprofil, error-rate **<= 5%**, snapshot-save-failures **= 0**.
- Hemsidor för **board** vs **controller** kan vara samma app med olika routes eller layouts (`/table`, `/play`, **`/fest`** för festöversikt).

**Lokal utveckling:** kör från monoreporoten **`npm run dev`** så startas **både** Vite (**webben**, port **5173**, `--host 0.0.0.0`) **och** spelservern (**WebSocket + HTTP health**, port **3001**). Öppna UI via **`http://127.0.0.1:5173`** eller **`http://<datorns-LAN-IP>:5173`**. I **dev** går WebSocket från webbläsaren till **`ws(s)://<samma host:5173>/bv-ws`** — Vite **proxar** till spelservern så mobiler oftast **inte** behöver nå port **3001** direkt (macOS-brandvägg brukar annars blockera 3001). **`?ws=…`** eller byggtidsvariabel **`VITE_WS_URL`** kan fortfarande överstyra (t.ex. produktion). **`npm run dev:server` endast** ger ingen webb — kör då `npm run dev` eller byggd statisk front med vald WS-URL.

### 16.2 Kortkatalog (referens)

- **`/cards`** i webbappen listar **kort** från **`cards.json`** grupperade efter **typ** (`event`, `item`, `combat`, `treasure`, `rest`, …), med **resolverad bild** (`artImageSrc`) och kortmetadata. Vissa poster **döljs i katalogen** men finns kvar i data för spelet: **`combat_monster`** / **`boss_round_win`** (system/boss-mellanrunda — spelet använder andra lägen), samt **alla kort med typ `treasure`** (skatt visas vid skattrutor i spel, inte som separat katalogsektion).
- **Utrustning** från **`equipmentDefs.ts`** (`EQUIPMENT_CATALOG`) visas **per slot** (vapen, rustning, hjälm, accessoar) med unik art om den finns, annars slot-siluett. Effektrad och **cards-ikon**-badge (föremålsbonus) följer samma principer som affär och mobilöversikt; **effekttext** ska använda samma lokalisering som affärsdetalj (§10.2) när `locale: en`.
- **Monster** från **`monsters.ts`** delas i tre sektioner: **vanliga (solo)**, **team battle** (badge) och **slutbossar** (badge + kort tagline-text). Avsett för design, QA och snabb överblick. Länk från **startsidan**.
- **Typografi i katalogen** ska spegla spelkort: brödtext **15px** / radavstånd **1.45**; rubrik på händelse/skatt/vila i **Permanent Marker 22px**; händelsebild **4:3**, övriga kort **16:10**. Korttext **vänsterjusterad** (motverkar global centrerad layout).

### 16.1 Kortmodal och tydlighet

- När ett kort visar **eftereffekter** (pant / HP / klunkar — i äldre byggen kan etiketten fortfarande säga “Gold”) ska **endast rader där värdet faktiskt ändrats** visas — undvik “Pant: 5 → 5” som ger intryck av förändring utan effekt.
- När ett kort ger **slumpat föremål/utrustning** (`event_find_item_*`, `treasure_item_*`) ska texten börja med **föremåls-/utrustningsnamn** följt av **vad den gör** (effekt/rulesText), i stället för generisk “du hittade något användbart”-copy.
- **Bordsvy (`/table`):** skatt- och händelsekort i modal ska ha samma **visuella korthyjd** som andra bordskort; framsidans innehåll fyller ramen utan extra vertikal klippning jämfört med baksidan (§2.1).
- **Kortbrödtext (fas 1 — händelsekort):** **`CardRichText`** (parser i `game-core`, rendering i webben) i mobil, bord och katalog. **Inline-ikoner** är visuellt stöd — **orden i texten behålls** (ikon + ord, inte ersättning). **Ikonplacering:** efter ordet för **pant**, **klunk** / **straffklunk**, **HP** och **skada**; före ordet för **stridsreaktion**; ledande **tärningsikon** på rader som börjar med *Slå tärning* eller *Tärning:*. **Ingen ikon** för *läker* — bara **HP** och **skada** markerar liv/skada. **Typografi:** brödtext **15px**; händelse/skatt/vila-rubrik **Permanent Marker 22px** (delad `cardTypography`). **Fetstil:** alla **siffror** samt **nyckelord med ikon** (och hela texten på tärningsrader med tärningsikon); tärningsutfallsintervall i listan (t.ex. `1–3`) är redan feta. Tärningshändelser med flera utfall använder **`rollOutcomes`** i `cards.json`: kort intro + **punktlista** med intervall före slag; efter slag visas resultatraden som tidigare (`Tärning: N`) utan utfallstabell.

---

## 17. MVP vs senare

**MVP**

- Lobby med kod, upp till 6 spelare, konfigurerbar turtid.
- Slumpad bana, **tre** våningsplan, uppstigning via **XP-baserat level-up offer** (§7.3) + **bryggnivå** (§13.1), **ruttyper** enligt §7.4 (minst händelse, affär, strid + tom/säker).
- **Storskärm:** pan, zoom, **auto-fokus anpassad till viewport** och **målrutor vid rörelseval** (§2.1); tur-rad under meny.
- **Strid:** PvE med **Sip Snatcher-** och **Brewizard/Sourceress-val** (§9.1); **BvB** (§9.2) med mötesval, val av motståndare vid flera på rutan, omslag vid lika, och vinnarval **föremål / pant / klunk / skada**; **ekonomi och affärer** (§10).
- **Strid:** inkluderar **team battle-monster** med val av medkämpe, delad belöning/förlust och item-drop på svårare monster (§9.1.1).
- Utrustningsplatser, liten händelse-/kortlek, klunk-räknare kopplad till några kort.
- **Språk:** svenska (default) och **engelska** i webbklienten (§1.1).
- Tre slutbossar (individuell strid); standard-vinst **döda boss först**; variant **gyllene öl + flykt till start/slutpunkt**.
- Respawn/omstart enligt §12 (full reset till startläge).

**Senare**

- **Bryggverket-boost** (foto-flöde + buffar enligt §14).
- Utökad **engelsk** copy där servern fortfarande skickar hårdkodad svenska (nya mönster i `localizeSipNotice` / `localizeTableToastLog` vid behov); fältnamn `gold` → `pant` i kod om det passar refaktorplanen.
- Utökad **Bryggverket-anknytning** på kort (sortnamn, smaklager) enligt §1.
- Stash, sparade partier, AI-spelare, ljud, avancerade animationer, balansläge, achievements.
- Eventuellt **PixiJS** eller annan motor om SVG/DOM-prestanda blir flaskhals på stora bräden.

---

## 18. Öppna punkter (att fylla i under utveckling)

- Finjustering av **XP-kurva** och mappning till visad bryggnivå vid behov (utan att bryta UI- och gating-synk mellan §7.3 och §13.1).
- **Vem bär** den gyllene ölen vid bossdöd i variantläget (dropp till sista slaget vs slump vs alla kan tävla om upplockning).
- **Vilken målruta** som räknas som “start/slut” när båda finns — per ban-seed eller lobby-val.
- **Hex vs kvadrat** för tiles.
- **Min spelare** och om spelet får startas med färre än max.
- **BvB:** ytterligare utlösare (kort, dedikerad tile) om de läggs till; **förlorarens** slutliga konsekvens efter duell; ev. begränsning av **vilka slots** vinnaren får stjäla från.
- **Ekonomi:** BvB-pant-tak, affärs-sortiment per nivå. *(Startpant vid spelstart: **5** — se §10.)*
- **Kamera:** max/min zoom, om auto-fokus alltid återställer manuell pan eller “låses” tills nästa tur.
- **Bryggverket-boost:** exakt verifieringsmetod, max antal användningar per parti, och juridisk copy tillsammans med bryggeriet.
- **Lista över godkända ölnamn** att använda på kort (med bryggeriet).

---

## 19. Balansparametrar (snabbjustering)

Följande värden ska ses som **tuning-variabler** (inte hårda designregler). Justera i data/kod och uppdatera siffror här vid behov.

- **Startpant vid spelstart och omstart:** lobbyns **startpant** (default 5) per spelare vid spelstart och vid **Starta om på nytt**; livförsäkring och övriga pantflöden följer §12.
- **Skatt-tiles per nivå:** **1** (ned från 2); gäller alla nivåer inklusive fallback-nivåer.
- **Team-monsterfrekvens per nivå:** ~4% / 9% / 14%.
- **Monster `need`:** +`2 × levelIndex` på styrkekrav på den våningen (lokalt per plan; konstant `MONSTER_NEED_BONUS_PER_LEVEL = 2`).
- **Monster förlust-skada (HP):** +`2 × levelIndex` på den våningen för **standardmonster**; team battle och slutboss använder sin baslogik utan denna extra skaleffekt.
- **Vinstrewards:** monster har **fasta** värden för pant + antal rewards (ingen chansrull på 1/2 items i nuvarande läge).
- **Rewardtyp:** reward kan vara **itemkort eller utrustning** (mixad drop-pool); slumpat item följer samma **sista-nivå-filter** som `randomItem` (§10.1).
- **Reaktionsfönster i PvE:** spelare kan spela **flera reaktionskort** innan de slutmarkerar med “gör inget”.

---

## Revisionshistorik

| Version | Datum | Notering |
|---------|--------|----------|
| 0.1 | — | Initial spec (konversation) |
| 0.2 | 2025-03-24 | Vinstlägen, tur/tid, 6 spelare, tärningsrörelse, respawn med en pryl kvar, dörrar med level-krav |
| 0.3 | 2025-03-24 | Bryggverket (Umeå), arbetstitel *Bryggmästarnas Mästare*, SVG-first utan PixiJS i v1, foto-boost (då §13) |
| 0.4 | 2025-03-24 | §2.1 kamera pan/zoom + fokus; §7.4 rutyper; §9 PvE/PvP + byte; §10 ekonomi/affärer; omnumrering §11–§18 |
| 0.5 | 2026-03-25 | Svenska + **pant** som målvaluta; Bryggverkets ölnamn på kort; §2.1 tur-rad, målram, viewport-kamera; §9.1 monsterval (Sip Snatcher, Brewizard/Sourceress); §16.1 kortstat-rader; §7.4/§9/§10 pant-terminologi; MVP/senare uppdaterad |
| 0.6 | 2026-03-31 | PvP omslag vid lika med rondvisning; fler monster med klunk-straff; nya team battle-monster (medkämpe krävs); nivåstyrd team-battle-frekvens; item-drop från svårare monster samt varsitt item till båda vid team-seger |
| 0.7 | 2026-03-31 | Loot uppdaterad: nästan alla monster droppar items utom de svagaste; chans på 2 items i team battle/farliga monster; nya items (Lättöl, Folköl, Krokben, Ölbomb, Skägget rakt bak, Baksmälla) samt omdöpning till Druckit för mycket |
| 0.8 | 2026-03-31 | Fasta monsterrewards (pant + antal rewards), mixad drop-pool med utrustning + items, flera reaktionskort möjliga innan “gör inget”, handlare tillåter flera köp per besök, samt konsekvent wording “Vid förlust” för klunkstraff |
| 0.9 | 2026-04-03 | Mobil: regnbågsbakgrund (rotation + puls) vid aktiv tur, endast `/play`; lobby döljer liv/pant/klunk/utrustning/föremål tills start; lobbytext centrerad; monsterkort visar stats längst ner med ikon över siffra (mobil + bord overlay) |
| 0.10 | 2026-04-02 | Bord: våningar i rad, ringstorlek `4s−4` och krav på att klient härleder grid från `tiles.length`; WebP-bakgrunder per våning; rörelse §8 förtydligad (ring, modulo, specialfall n/2); fyra våningsplan i §7.2; Pantpåse (namnbyte); grafiknot om komprimering av bakgrundsbilder |
| 0.11 | 2026-04-11 | **BvB** (*bryggare mot bryggare*) som spelar-etikett och i logg; §9.2 utökad med mötesval, val av motståndare vid flera på ruta, omslag; §7.1 flera pjäser = kluster-layout på brädet; §7.4/§10/§17/§18 terminologi; **Canman** + bild under §10.1; §16.1 utvecklingsnot `npm run dev` (Vite 5173 + WS 3001) |
| 0.12 | 2026-04-12 | §7.3 dörrar: pant + **klunkspår** (krav utan förbrukning) synkat med **bryggnivå**; §13.1 **bryggnivå** (trösklar, header, resultatlista); §11 utrustningsmodal (ikon, bild, stäng via panel); §16 dev **WebSocket via `/bv-ws`**; §17/§18 uppdaterade |
| 0.13 | 2026-04-12 | Monster styrkekrav **per våning** (+`levelIndex`, lokalt) — inte globalt; §7.3/§13.1/§19; nivåvals-modalcopy |
| 0.14 | 2026-04-13 | Skatt: slump **Tom gömma**, återbesök samma ruta; §10.1 Skägget/Lengräddad/Canman/`randomItem`+utrustning; slutbossar (3 st, UI); §11 utrustningsmodal + badges; header (Zzz); **`/cards`** kortkatalog (§16.2); rörelse §8: ingen skägg-dubbling av rörelse |
| 0.15 | 2026-04-14 | §9.2 BvB: `pvpDieBonus` i duelltotal; **duell-förlust-notis** på mobil (`duel_loss`, rubrik, ikon, “Fattar”); §7.4/§10.2 **Panta burkar** synkad med katalog (ankare + effekt-/prislinje); §11 föremål + utrustning **Safari-klipp** (stack-layout); utrustning: t.ex. **Fathammare** +1 BvB; finjusterade pantpriser (t.ex. Skumvisir) |
| 0.16 | 2026-04-15 | Aktiv-tur-regnbåge flyttad till **interaktionspanelen** (inte full bakgrund); fynd-kort (händelse/skatt) med roterande regnbågsbakgrund i bildram; respawn/“starta om på nytt” uppdaterad till full reset (start-ruta, 0 pant/klunkar, tom utrustning/förråd); monsternamn: **Fermenteringshydran** → **Surkartar** |
| 0.17 | 2026-04-16 | Föremålsmodal: neutral bakgrund (ingen regnbågsram i inventory-detalj); notiser/logg visar **korttitlar** (inte itemId); slutmodal: knapp **Avsluta spelet** → startsidan; Enkelpipa/Dubbelpipa: prompt före monstertärning (valfri straffklunk för extra attack); nytt vapen: **Humleklubba** (+1 strid, +2 BvB) |
| 0.18 | 2026-04-16 | §3.1 **Drift och deploy:** Vercel (web, repo-root + `vercel.json`), `VITE_WS_URL` / `wss://`; CapRover + Docker för server (`PORT`, `/health`); lokalt `npm run dev`; CapRover-deploy via `npm run deploy:caprover*` + `.env` |
| 0.19 | 2026-04-18 | §7.2 **tre våningar** (0–2) + slutboss styrka med våningsbonus; §7.3 monster **skada** skalar med våning; §2.1 markering före rörelsetärning; §9.1 en sip-notis vid mitigation; §10.2/§11 **Burksvärd**-badge + `rulesText` i modal; **burk-set** + **Legendarisk Burkhjälm**; §3.1 påminnelse om server-deploy vid `game-core`-ändringar; §19 balansrad skada |
| 0.20 | 2026-04-19 | §2 **toast** för kortlivade fel/info på mobil (`/play`); §10 **startpant 5** vid spelstart + §19 tuning; §18 öppen punkt om startpant avprickad |
| 0.21 | 2026-04-20 | §10.2 **Panta burkar**: fast hyllplats **Första hjälpen-lager** ersatt med **Helande brygd** (shop-copy synkad med implementation) |
| 0.22 | 2026-04-20 | §2.1 bord-UI: turbanner med ikonstats + färgad “Nästa”-pill, förenklad header, mörkare kort-overlay, animerad item-solfjäder in bakom banner, mobil-lik spelarinformation i sidopanel under pågående spel; §10.2 förtydligat **Helande brygd +3 HP**; §16.1 fyndkort-text börjar med itemnamn + effekt |
| 0.23 | 2026-04-20 | §9.1 utökad med **Begär hjälp** i PvE (välj hjälpare + kontrakt: gratis/pant/skatt/dela lika, krav på minst ett positivt hjälpkort); kontraktsbelöning för hjälpare endast vid vinst; hjälpkort i hjälpfas renderas/rensas som stridskort; §11 statuscopy förtydligad: **(Öl i ögat)** utan extra **(Zzz)** |
| 0.24 | 2026-04-20 | §9.2 BvB uppdaterad till **bäst av 3** med föremålsfönster före varje rond (båda markerar **Klar**), matchställning per rond och omslag i samma rond vid lika |
| 0.25 | 2026-04-20 | §9.2 BvB: auto-klar när spelare saknar PvP-föremål i förberedelsefasen, samt ny rondresultatfas där båda bekräftar innan nästa rond eller byte |
| 0.26 | 2026-04-20 | §4 lobby på bord: **QR + kopiera join-länk** till `/join?room=…`; §2.1 turbanner: **kompakt** layout med namn+ikoner under till vänster och **Nästa** högerställd |
| 0.27 | 2026-04-21 | §4 bord (pre-game lobby): **kopiera join-länk** borttagen från UI; **QR** till `/join?room=…` kvarstår |
| 0.28 | 2026-04-21 | §9.1 nya slumpmonster **Enhörningsryttare** och **Färgglada gubbar** (+ placeholder-art); §9.2 BvB-byte vid **Solbrillor** / `preventTheft`: bara pant, straffklunk, skada (ej utrustningsstöld); §9.2 auto-klar-copy och borttagen redundant tärnings-hint; §2.1 **BvB-panel** tydligare gradient |
| 0.29 | 2026-04-22 | §9.1 monsterlista utökad med **Transporter** (solo) och **Cowboys** (team battle, +5 HP vid seger); §10.1 nya item **Get Lucky** ( +4 attack, dubbel HP-skada vid förlust) och **Manopositiv** (+4 attack, kostar 4 pant vid spel); §9.2 rondresultat-copy på mobil förenklad till **Rond N** + **Du vann/förlorade ronden** |
| 0.30 | 2026-04-22 | Mobil `/play`: ny **Inställningar**-meny (regnbågseffekt av/på, lobby/turstatus, lämna spel med bekräftelse) och borttagen footerstatus; server: explicit `leaveGame` som tar bort spelaren ur state; `/table`: turbanner omgjord till svart spelarrad med alla spelare (namn + HP/pant/klunk), aktiv spelare highlightas i spelarens färg; nivåbonus på HP-skada gäller nu endast **standardmonster** |
| 0.31 | 2026-04-22 | Mobil `/play`: interaktionspanelen kan minimeras/maximeras via toggle-knapp ovanför panelen (för små skärmar); Spelare/Inställningar öppnas utan kortanimation; bottenglapp efter footer-flytt borttaget genom uppdaterad panel-/sheet-positionering |
| 0.32 | 2026-04-22 | Mobil `/play`: paneltoggle justerad till **kompaktläge** (dölj text, behåll knappar synliga); §10.2 handlare förtydligad så köpt hyllpost inte kan köpas igen under samma besök |
| 0.33 | 2026-04-22 | `/table`: desktop-toggle **Inaktivera sömnläge** i header; §10.2 handlare uppdaterad till **Helande brygd + tre slumpade** utrustningar (Mäskpaddel/Burkrustning inte längre fasta); §11 uppdaterad med ny utrustning (**Linne**, **Dunjacka**, **Keykeghjälm**, **Fyrklöver**, **Tom flaska**) och särregler (krit-miss-skydd / går sönder vid vinst) |
| 0.34 | 2026-04-22 | §2.1: **presentationsskala** på bord (viewport-baserad, max ca **1.48**, höjd-tak, dim oskalad, `transform-origin: top center`, överkant + safe-area-padding); **lobby/ended** stänger av pan på viewport så **Avsluta spelet** fungerar; §16.2 kortkatalog: **dolda** poster (`combat_monster`, `boss_round_win`, alla `treasure`) |
| 0.35 | 2026-04-24 | §2/§2.1/§9/§10.1: monsterresultat på samma bordskort, stabil mobil interaktionspanel, BvB-tärningar utan blink, svenska skade-toastar i team battle, uppdaterade ingripanderegler för **Get Lucky**/**Manopositiv**, auto-pass när inga spelbara reaktionskort finns samt borttagen extra **Tillbaka** i målval |
| 0.36 | 2026-04-25 | §2.1: BvB-tärning på bordet visas nu **per spelare** direkt när kast finns (ingen flicker under reveal-delay) samt team battle-overlays stabiliserade efter val av medkämpe (ingen svart board-vy) |
| 0.37 | 2026-04-27 | Ny värdstyrd pre-game-inställningsvy före bordet; max spelare 8; konfigurerbara lobbyregler (svårighet, hardcore, brädstorlek, nivåer 2–5, max HP, startpant, kortbaksida, tillåtna item/event-kort); boss garanteras endast på sista våningen |
| 0.38 | 2026-04-27 | §4.2 “Utseende”-formulering; tillfällig **§20** achievements/kosmetik-roadmap (sedan borttagen) |
| 0.39 | 2026-04-27 | Borttagen **§20** och `docs/ACHIEVEMENTS_AND_UNLOCKS_ROADMAP.md`; §4.2 utan roadmap-hänvisning |
| 0.40 | 2026-04-28 | §9.1 monsterlista utökad med **Demonkrigare**, **Busiga buskar** och **Solen** samt dokumenterade specialeffekter vid förlust |
| 0.41 | 2026-04-29 | §7.1 bordslayout uppdaterad till widescreen-rektangel per board-size (5→6×4, 6→8×4, 7→9×5) med bibehållen ringordning; §11 Legendarisk Burkhjälm synkad till +5 HP och −4 skada vid 15+ klunkar |
| 0.42 | 2026-04-30 | Spec uppdaterad med reaktionstimer i lobbyinställningar (0–30), serverns `/metrics`-endpoint samt belastningsåtgärder: rate limit per klient och koalescerade state-broadcasts |
| 0.43 | 2026-04-30 | Serverstabilitet: snapshot+delta för state-distribution, `actionId`-idempotency för retries/dubletter, samt automatisk städning av inaktiva tomma rum (TTL) |
| 0.44 | 2026-05-01 | Drift/recoverability: periodiska rumssnapshots till disk med restore vid restart; `protocolVersion` i `helloAck`; readiness-endpoint `/ready` dokumenterad |
| 0.45 | 2026-05-01 | Baseline-auth för WebSocket (`SERVER_AUTH_TOKEN`/`authToken`) samt trusted-krav för privilegierade actions (`startGame`, `setConfig`, `tableKickPlayer`) |
| 0.46 | 2026-05-01 | P1 driftstöd: token-skyddade admin-endpoints (`/admin/rooms`, `/admin/rooms/:code/close`) dokumenterade, utan separat admin-UI |
| 0.47 | 2026-05-01 | P1 komplett: operativt lager i CI (metrics artifacts, dashboard, threshold alerts), E2E release-gate, snapshot/protokoll-migreringsstrategi samt load/SLO-gating |
| 0.48 | 2026-05-07 | Synkad med aktuell implementation: nivå-ruta/dörrflöde utfasat, uppstigning via XP-baserat level-up offer utan pantkostnad, bryggnivå från XP med 4-stegs-mappning (L1↔intern L4), uppdaterad §7.3/§13.1 samt mobilcopy för nivåmodal/straffklunk-XP |
| 0.49 | 2026-05-07 | Uppdaterade XP-trösklar för bryggnivå (120/320/650/900/1200), progressionstext i §13.1 samt tydlig modal-prioritering i mobil där nivå-upp-flöde går före straffklunk-notis |
| 0.50 | 2026-05-07 | Bryggnivåtrösklar justerade till 120/300/620/980/1380 samt Legendarisk Burkhjälm ändrad från klunkkrav till nivåkrav (aktiv från nivå 4) i regler/copy |
| 0.51 | 2026-05-08 | Livförsäkring dokumenterad i dödsflödet (betala 20 pant för fullt liv), turindikatorn i `/table` visar `(Zzz)` i spelarraden, samt mobil-badges i inventory/utrustning nedskalade för små skärmar |
| 0.52 | 2026-05-08 | §7.2/§10.1/§19: på **sista brädnivån** ingår inte **Genväg** eller **Taproom-nyckel** i slump-pool för skatt/händelse/strids-item (`randomItem` / blandad monsterbelöning); handel och fasta korteffekter opåverkade |
| 0.53 | 2026-05-08 | §2: **vald rad** på mörka interaktionsknappar — **guldram + guldtext** vid målval i föremålsmodal och vid tärningsyte-val (**Ett sjätte ölsinne**); implementation: `ArcadeButton` med `selected` på mörk variant |
| 0.54 | 2026-05-08 | §7.2/§19: team-monster-slump **halverad** per brädnivå (**4% / 9% / 14%**, `pickMonsterForLevel` i `game-core`) |
| 0.55 | 2026-05-08 | §13.1: slutresultat som tabell med sessionsstatistik, nivå-ring, monster V/F, förbrukade föremål, stup-räknare och badge-rader; bossrundor räknas som monstersegrar (`game-core`); ingen extern persistens ännu |
| 0.56 | 2026-05-09 | Slutmodal: spotlight-karusell + `goldSpent`/spenderad-pant-definition (sinkholes vs spelaröverföring) i §13.1 |
| 0.57 | 2026-05-10 | Mobil rörelseval: pilhintar + speglade knappar på ringens överkant (§8); lagstrid: egen modifier vid tärning på mobil (§9.1); vapen med pant eller klunk för valfri `sipAttackBonus`, nytt vapen **Ölsejdel** (§11); Genväg/Taproom användbar vid rörelseval/handl/mötesval (§10.1); straffklunk-kö vid kort → modaler vid Fortsätt (§13); utrustningsbild WebP-fallback; kompakt klunk-reduktionsbadge |
| 0.58 | 2026-05-10 | §2: toasts för monsterskatter vid vinst och för ölkompis/stridshjälp vid vinst/förlust; §9.1: Demonkrigare utan pant-modal om spelaren saknar 10 pant; stridshjälp tar HP + straffklunk vid förlust (som lagrisk); §13.1: eliminerade behålls i roster efter `leaveGame` för full resultatlista (`purgeSlot` vid bordskick) |
| 0.59 | 2026-05-15 | §10.2 **Helande brygd** 5 pant i handeln; §10.1/`decks.item` förtydligat; §11 **Störtkruka**, **VIB Member**, **Plastback**; §12 omstart ger **startföremål** som vid spelstart + **startpant** (inte tom förråd); **Livförsäkring** 10 pant för fullt liv |
| 0.60 | 2026-05-16 | §2 **turväntan + emotes** på mobil (`Veras tur`, fem emotes, cooldown); §2.1 eliminerade/lämnat i turbanner och utan pjäs, **emote-overlay** ovanför banner; `playerParticipation` + servervalidering av inaktiva mål (föremål, medkämpe, ingripande) |
| 0.61 | 2026-05-15 | §9.1/§11: stridsloot och slump-utrustning med **bytesval** vid full slot (kö efter strid); §9.2/§10.1 **Riggat spel** och **En enkel stöld** med escrow och förstörd stulen utrustning vid avböj; §11 **Plastback**-badge (pant + kvarvarande flaskor), försäljning; §2/§16.1 bordskortmodal skatt/händelse matchar kortbaksans höjd |
| 0.62 | 2026-05-17 | §16.1/§16.2: **CardRichText** (ikoner efter pant/klunk/HP/skada, tärning ledande, fet siffror + ikonord); **`rollOutcomes`** på tärningshändelser; katalog vänsterjusterad text + speltypografi (15px / Permanent Marker 22px) |
| 0.63 | 2026-05-20 | **`--modal-panel-bg`** globalt; **videobakgrunder** `beer_bg` / `flames_bg` (lobby, slutresultat, persistent boss-backdrop på bord, stupad bryggare bord); lobby glas-panel; värd-lobby segmenterad svårighet + avancerade inställningar; slutresultat bred modal + tabellvariant `table`; **gameover.svg**; Plastback-badge (pant + flaskor); boss eld endast bord (mobil röd puls) |
| 0.64 | 2026-05-21 | §2 **Snabbguide** mobil: introsteg med logotyp + målsammanfattning (5 steg totalt); §2.1 slutboss-backdrop **bord + mobil** under hela striden inkl. `boss_round_win`, utan dubbel fade; §2.1 **bord-toasts** med korrekt visad bryggnivå; §13.1 tydlig **UI-nivå = intern + 1** |
| 0.65 | 2026-06-07 | §11 **föremålsbonus** (`itemCardBonus`): bryggnivå-val **+1 föremålskort** + utrustning **Hawaiiskjorta** (+2), **Pannband** (+1), **Anteckningsblock** (+1); platta föremålseffekter (+/− riktning); mobil visar ackumulerad bonus i **utrustningspiller-raden** (inte header); §13.1 femte bryggbonus; §10.2/§16.2 katalog + affär speglar bonus |
| 0.66 | 2026-06-02 | §11 **Plastback**: persistent **flasklager** (`plastbackPackRemaining`, default 6); mobil **Ta flaska** (`takePlastbackBottle`) med bytesval vid annat vapen; badge = pack; **sälj** = pant endast från pack |
| 0.67 | 2026-06-02 | §11 **Plastmugg** (vapen, 9 pant): **−2 attack**; `freeInventoryItemPlay` — föremål i `ITEM_PLAY_GOLD_COST` gratis att **spela från förråd** medan vapnet sitter utrustat (inte gratis köp i affären) |
| 0.68 | 2026-06-02 | §13.1 **Bryggnivåbonus**: max **3 val per kategori**; mobil **(n/3)** på knappar, inaktiverade vid 3/3; överskjutande nivåer auto-konsumeras utan bonus när alla kategorier maxade |
| 0.69 | 2026-06-07 | §11 **Plastmugg** balans **−2 attack** + bild `plasticcup`; **Tom flaska** en attack-badge; §13.1 bordsslutresultat med **avatar vänster om namn** (ej mobil) |
| 0.70 | 2026-06-07 | §2 **dålig batch**-SFX: ny `badbatch3` + **`badbatch4`** (käll-WAV → MP3); shuffle i `tableSfx` för monster-intro och Apocalypse-liknande händelsekort |
| 0.71 | 2026-06-10 | §7.3/§19 monster **+2 per brädnivå** (`MONSTER_NEED_BONUS_PER_LEVEL`); §9.1 våning **(N)** på monsterkort (röd Saira, mobil + bord); §10.2 **Slumpa om** (5 pant, `merchantReroll`); §11 mobil förråd visar brädskalade stridsföremål |
| 0.72 | 2026-06-26 | §1 **§1.1 lokalisering** (sv käll-data, `locale: en` i webben); §2.1 slutboss **`boss_round_win` / `boss_final_win`** + bordstoasts (loggnycklar); §9.1 stridstärningsresultat; §9.1.1 lagstrid slagstatus; §10.1 **Riggat spel**-notis; §10.2 affärsdetalj (`formatLocalizedShopItemEffectSummary`); §13.1 bryggbonus-knappar; §16.2 katalog EN-effekt |
| 0.73 | 2026-06-26 | §7.2/§10.1 **Genväg** omdesignad: **10 pant** → teleportera till valfri annan spelare (normal landning); **Taproom-nyckel** oförändrad (våningshopp/boss); slump-pool på sista våningen gäller endast Taproom |
| 0.74 | 2026-06-26 | §1.1/§2 EN-logotyper (`brandLogo`); §2 bekräftelse **Lämna spelet** lokaliseras; §10.1 Genväg målval visar våning; `itemShortcutTeleport` loggnyckel |
| 0.75 | 2026-07-06 | §2.2 **Festöversikt** (`/fest`): multi-lobby-åskådare, globala höjdpunkter, responsivt rutnät; §4 **åtta spelarfärger** (orange/cyan); §1.1/§10.2 **`formatPantAmount`** i affären (sv pant, en cans) |
| 0.76 | 2026-07-06 | §2.1 **fit-to-viewport-skalning** av bordsöverlägg (små skärmar/solfjäder, uppskalning på ultrawide) + **mjuk omskalning** med toggle (`scaleAnimationsEnabled`); §2.1 ingen **dubbel klunk-toast** (`suppressTableToast`); §9.1.1 lagstridsrubrik *«A OCH B MÖTER»*, **«N totalt»** under tärningen efter slag, exakt modifierare ur `previewTotal` + aggregerad vapen-klunkbonus (`teamRolls.sipBoost`); §11 `itemCardBonus` bevaras vid **slumpad utrustning**; §12 omstart nollställer **bryggnivåbonusar** (`resetBrewerPerkProgress`); EN-kortnamn **Gotta Go Fast** (`item_beard_back`) |
| 0.77 | 2026-07-16 | §2.1 turbanner: lokal pref **`turnBannerPlacement`** (`bottom`/`right`) i bordsinställningar + värd-lobby (tillgänglighet), **ping-pong** för långa namn, emotes vänsterut i högerläge; §4/§4.2 **`allowLateJoin`** + mid-game join (`playingAddPlayer`, ghost-slots räknas mot max 8); §9.1 mobil strid: **Permanent Marker** + **`CombatStrengthPill`** (samma framing som monsterkort); win/loss-rutor endast på kortet, inte i fight-panelen |
| 0.78 | 2026-07-21 | §2.1/§4.2 **Nytt spel** (`returnToLobby`) + **`clearPlayersOnRematch`**; §13.1/`sessionEnded` vid kick/rensad lobby (ingen auto-reconnect); §9.1.1 medhjälpare ser resultattärningar under `rollPreview`; §16 `stateDelta` skickar även tom `players: []` vid roster-clear |
| 0.79 | 2026-07-23 | §9.1.1 bord: lagstrid/Ölkompis fryser varje tärning så fort `teamRolls` har resultatet under `reactions` |
| 0.80 | 2026-07-24 | §9.1 **stridshjälp** = dual-roll (`assistId`) utan krav på positiva hjälpkort; kontrakt styr loot; §11 buffade **föremålstexter**, attackpiller vs `nextCombatModifier`, **Ta bort** utrustning, katalog-hydrering vid equip, Kapsylbikini-badge **BvB**; §2 mobil **playerTurn**-SFX |
| 0.81 | 2026-07-27 | §2/§2.1: matchstart-nedräkning 5→1, turbyte-banner, eliminerade/lämnat i lista (dölj vitals), emote-scroll, **`endMatch`** från bordsinställningar; §2 mobil toast när föremål spelas på dig; §10.2 handel/byte **inline ikon+siffra**; §11 balans **Plastmugg** (−1/−2 HP), **Beanie** (+2 HP), **Guldkedja** (+2 pant/strid), **Robotarm** (+2 BvB), **Robothjälm** (+2 sköld); Livförsäkring förbrukas |
| 0.82 | 2026-07-27 | §9.1 mobil strid: **vinstchans %** till höger om tärningen (`monsterCombatWinChancePercent`); attackmod vänster; uppdateras med buffar/hjälp |
| 0.83 | 2026-07-29 | §19 **skatt-tiles per nivå: 1** (ned från 2) — `tileCountsForLevel` i `game-core/board.ts` |
| 0.84 | 2026-07-31 | Lobby: **`pvpBestOf`** (1–5) + **tur-timeout**-toggle (`turnTimeoutEnabled` + `turnSeconds`); §6 timeout-beteende + brädnedräkning; §9.2 best-of från config |

