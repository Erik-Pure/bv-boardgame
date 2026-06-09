import type { ReactNode } from "react";
import { TutorialInlineIcon } from "./TutorialInlineIcon";
import styles from "../../routes/PlayView.module.css";

export type MobileTutorialStep = {
  title: string;
  body: ReactNode;
  imageSrc?: string;
  showLogo?: boolean;
};

export const MOBILE_TUTORIAL_STEPS: MobileTutorialStep[] = [
  {
    title: "Välkommen till Bryggmästarnas Mästare!",
    body: (
      <>
        <p className={styles.tutorialParaSpaced}>
          <b className={styles.tutorialEmphasis}>
            <TutorialInlineIcon src="/icons/monster-icon.svg" color="#ef4444" gap="0 5px 0 0" />
            Rädda de dåliga batcherna
          </b>{" "}
          för att samla XP och klättra i nivå – först att <b>besegra slutbossen på sista nivån vinner!</b>
        </p>
        <p className={styles.tutorialParaSpaced}>
          <TutorialInlineIcon src="/icons/bvb-icon.svg" color="#fff" gap="0 5px 0 0" />
          Sabotera eller samarbeta med dina motståndare på vägen
        </p>
      </>
    ),
    showLogo: true,
  },
  {
    title: "Slå och välj väg",
    body: (
      <>
        <p className={styles.tutorialPara}>
          I början av din tur väljer du antingen att slå rörelsetärningen och flytta så många rutor som
          tärningen visar åt vald riktning, eller att{" "}
          <TutorialInlineIcon src="/icons/panta-icon.svg" color="#fb923c" gap="0 4px 0 0" />
          <b>Panta burkar</b> (kräver minst 5 pant) — då står du kvar och handlar i stället för att gå.
        </p>
        <p className={styles.tutorialParaSpaced}>Du kan även spela föremål från din hand för att rusta upp dig.</p>
      </>
    ),
    imageSrc: "/tutorial/tut4.png",
  },
  {
    title: "Hantera rutan",
    body: (
      <>
        <ul className={styles.tutorialList}>
          <li>
            <TutorialInlineIcon src="/icons/event-icon.svg" color="#60a5fa" gap="0 5px 0 0" />
            Händelse: Slumpmässiga händelser som kan hjälpa eller förstöra för dig.
          </li>
          <li>
            <TutorialInlineIcon src="/icons/reward-icon.svg" color="#facc15" gap="0 5px 0 0" />
            Skatt: Hitta ny utrustning och föremål.
          </li>
          <li>
            <TutorialInlineIcon src="/icons/heart-icon.svg" color="#f472b6" gap="0 5px 0 0" />
            Vila: Återhämta dig och få tillbaka 3 HP.
          </li>
          <li>
            <TutorialInlineIcon src="/icons/monster-icon.svg" color="#ef4444" gap="0 5px 0 0" />
            Dålig batch: Gör dig redo för strid!
          </li>
          <li>
            <TutorialInlineIcon src="/icons/bvb-icon.svg" color="#f472b6" gap="0 5px 0 0" />
            BvB: Bryggare mot bryggare, en rond. Vinnaren väljer ett byte från förloraren.
          </li>
        </ul>
      </>
    ),
    imageSrc: "/tutorial/tut3.png",
  },
  {
    title: "Dåliga batchar, mutor och sabotage",
    body: (
      <>
        <ul className={`${styles.tutorialList} ${styles.tutorialListSpaced}`}>
          <li>
            <TutorialInlineIcon src="/icons/combat-icon.svg" color="#f87171" gap="0 5px 0 0" />
            Styrkekollen: Ditt tärningskast + utrustning & föremål måste vara lika med eller högre än fiendens
            styrka.
          </li>
          <li>
            <TutorialInlineIcon src="/icons/thumbup-icon.svg" color="#16a34a" gap="0 5px 0 0" />
            Vinst:
            <TutorialInlineIcon src="/icons/pant-icon.svg" color="#ccc" />
            Pant ,
            <TutorialInlineIcon src="/icons/reward-icon.svg" color="#facc15" />
            Skatter ,
            <TutorialInlineIcon src="/icons/lvlup.svg" color="#60a5fa" />
            XP
          </li>
          <li>
            <TutorialInlineIcon src="/icons/thumbdown-icon.svg" color="#b4232c" gap="0 5px 0 0" />
            Förlust:
            <TutorialInlineIcon src="/icons/heart-icon.svg" color="#f472b6" />
            HP ,
            <TutorialInlineIcon src="/icons/klunk-icon.svg" color="#facc15" />
            klunkar.
          </li>
          <li>
            <TutorialInlineIcon src="/icons/skull-icon.svg" color="#ef4444" gap="0 5px 0 0" />
            Kritisk miss: En 1:a på tärningen är alltid en förlust!
          </li>
          <li>
            <TutorialInlineIcon src="/icons/bvb-icon.svg" color="#cccccc" gap="0 5px 0 0" />
            Socialt spel: Medspelare kan hjälpa eller sabotera. Du kan be om hjälp mot betalning (
            <TutorialInlineIcon src="/icons/pant-icon.svg" color="#ccc" />
            Pant/
            <TutorialInlineIcon src="/icons/reward-icon.svg" color="#facc15" />
            Skatter) – de kan välja att acceptera eller avstå.
          </li>
        </ul>
      </>
    ),
    imageSrc: "/tutorial/tut2.png",
  },
  {
    title: "Nivåer, Bossen och Vinst",
    body: (
      <>
        <p className={styles.tutorialPara}>
          Du får
          <TutorialInlineIcon src="/icons/klunk-icon.svg" color="#fb7185" />
          XP av klunkar och
          <TutorialInlineIcon src="/icons/monster-icon.svg" color="#ef4444" />
          monstersegrar.
        </p>
        <ul className={`${styles.tutorialList} ${styles.tutorialListSpaced}`}>
          <li>Slutbossen: Besegra bossen på sista nivån för att vinna spelet. Bossen är tuff och har 3 liv.</li>
          <li>Sist kvar: Om alla andra åker ut vinner du spelet.</li>
          <li>
            Eliminering: Om dina
            <TutorialInlineIcon src="/icons/heart-icon.svg" color="#f472b6" />
            HP når noll är du ute ur spelet. Du kan välja att starta om från börjaneller ge upp.
          </li>
        </ul>
      </>
    ),
    imageSrc: "/tutorial/tut1.png",
  },
];
