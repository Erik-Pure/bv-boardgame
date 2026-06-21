Playtest — Google Forms (feedback efter parti)

Använd detta dokument när du skapar formuläret i Google Forms och när du kopplar det till spelet via miljövariabler i Vercel.

Markeringen "KOPIERA" visar exakt text att klistra in. Google Forms stöder inte markdown — kopiera bara texten inuti blocken.


================================================================================
FORMULÄR — TITEL
================================================================================

KOPIERA (fältet "Untitled form" högst upp):

Feedback — Bryggmästarnas Mästare


================================================================================
FORMULÄR — BESKRIVNING / INGRESS
================================================================================

KOPIERA (Form description under titeln):

Tack för att ni spelade! Det här tar ca 1–2 minuter. Alla svar är anonyma om du inte skriver ditt namn i fritextfälten.

Första blocket fylls i automatiskt från spelet (antal spelare, tid m.m.) — du kan ändra om något ser fel ut.


================================================================================
SEktion 1 — OM MATCHEN (förifylls av spelet)
================================================================================

Skapa varje fråga som: Lägg till fråga → Kort svar
Placera frågorna 1–4 överst i formuläret (innan upplevelsefrågorna).

Valfritt: lägg till en sektionsrubrik "Om matchen" före fråga 1.

---

Fråga 1
Typ: Kort svar
Förifylls av spelet: Ja

KOPIERA (frågetext):

Antal spelare

---

Fråga 2
Typ: Kort svar
Förifylls av spelet: Ja

KOPIERA (frågetext):

Speltid (minuter)

---

Fråga 3
Typ: Kort svar
Förifylls av spelet: Ja

KOPIERA (frågetext):

Antal våningar i partiet

---

Fråga 4
Typ: Kort svar
Förifylls av spelet: Ja

KOPIERA (frågetext):

Svårighetsgrad

(Svårighet fylls i som: Lättöl, Folköl, Starköl eller Imperial)


================================================================================
SEktion 2 — DIN UPLEVELSE
================================================================================

Valfritt: lägg till sektionsrubrik "Din upplevelse" före fråga 5.

---

Fråga 5
Typ: Linjär skala
Skala: 1 till 5
Etikett vänster (1):

KOPIERA:

Inte alls nöjd

Etikett höger (5):

KOPIERA:

Mycket nöjd

KOPIERA (frågetext):

Hur nöjd var du med spelet totalt?

---

Fråga 6
Typ: Flervalsfråga (välj ett alternativ)

KOPIERA (frågetext):

Hur kändes spelets längd?

KOPIERA (alternativ, ett per rad i Google Forms):

För kort
Lagom
För långt

---

Fråga 7
Typ: Flervalsfråga (välj ett alternativ)

KOPIERA (frågetext):

Hur var balansen?

KOPIERA (alternativ):

För lätt
Lagom
För svårt

---

Fråga 8
Typ: Flervalsfråga (välj ett alternativ)

KOPIERA (frågetext):

Var det enkelt att förstå vad du skulle göra på mobilen?

KOPIERA (alternativ):

Ja, mestadels
Delvis
Nej, ofta förvirrande

---

Fråga 9
Typ: Stycke

KOPIERA (frågetext):

Vad fungerade bra?

---

Fråga 10
Typ: Stycke

KOPIERA (frågetext):

Vad kan bli bättre?

---

Fråga 11
Typ: Stycke
Valfritt att svara: Ja (markera i Google Forms om du vill)

KOPIERA (frågetext):

Något tekniskt strul? (anslutning, ljud, konstiga hängningar)

---

Fråga 12
Typ: Flervalsfråga (välj ett alternativ)

KOPIERA (frågetext):

Skulle du spela igen?

KOPIERA (alternativ):

Ja
Kanske
Nej


================================================================================
INSTÄLLNINGAR I GOOGLE FORMS (rekommenderat)
================================================================================

- Samla e-postadresser: AV (anonymt)
- Begränsa till ett svar: valfritt (på om ni vill undvika dubbelröstning)
- Visa progress bar: valfritt


================================================================================
KOPPLA FORMULÄRET TILL SPELET
================================================================================

Steg 1 — Skapa formuläret
  1. Gå till forms.google.com
  2. Tomt formulär
  3. Klistra in titel, beskrivning och frågor enligt blocken ovan

Steg 2 — Hämta URL och entry-id
  1. Skicka → länk-ikon → kopiera "Visa länk"
     URL ser ut ungefär så här:
     https://docs.google.com/forms/d/e/1FAIpQLS…/viewform
  2. Öppna formuläret i redigeringsläge
  3. Menyn (tre prickar) → Förifyll länk
  4. Fyll i exempelvärden för fråga 1–4 (t.ex. 4, 45, 3, Folköl)
  5. Hämta länk
  6. I URL:en: entry.1234567890=värde — siffrorna efter "entry." är id:t för det fältet

Steg 3 — Miljövariabler (Vercel och ev. lokal .env)

Kopiera blocket nedan till Vercel Dashboard → Settings → Environment Variables
(Production + ev. Preview). Redeploy webben efteråt.

VITE_FEEDBACK_FORM_BASE=https://docs.google.com/forms/d/e/1FAIpQLSd78GPKV2lkRucoULPv1Dmyr8cw9fqoQowE786Beh8O8JZyOw/viewform
VITE_FEEDBACK_ENTRY_PLAYERS=738094630
VITE_FEEDBACK_ENTRY_MINUTES=285181796
VITE_FEEDBACK_ENTRY_LEVELS=1084354622
VITE_FEEDBACK_ENTRY_DIFFICULTY=903916440

Mappning (från förifylld länk):

  entry.738094630   Antal spelare
  entry.285181796   Speltid (minuter)
  entry.1084354622  Antal våningar i partiet
  entry.903916440   Svårighetsgrad

Referens — variabelnamn:

VITE_FEEDBACK_FORM_BASE
  Bas-URL utan query (?usp=… och entry.* ska inte ingå)

VITE_FEEDBACK_ENTRY_PLAYERS
  entry-id för fråga "Antal spelare"

VITE_FEEDBACK_ENTRY_MINUTES
  entry-id för fråga "Speltid (minuter)"

VITE_FEEDBACK_ENTRY_LEVELS
  entry-id för fråga "Antal våningar i partiet"

VITE_FEEDBACK_ENTRY_DIFFICULTY
  entry-id för fråga "Svårighetsgrad"

Steg 4 — Var knappen syns
  - Mobil (/play) i slutmodalen, under "Avsluta spelet"
  - Inte på bordet (/table)
  - Om VITE_FEEDBACK_FORM_BASE saknas: ingen knapp


================================================================================
VAD SPELET SKICKAR MED (automatiskt)
================================================================================

Antal spelare     → antal i partiet
Speltid (minuter) → från spelstart till slut
Våningar          → levelCount från lobbyinställning
Svårighet         → Lättöl / Folköl / Starköl / Imperial

Spelaren fyller själv i betyg, balans och fritext (fråga 5–12).
