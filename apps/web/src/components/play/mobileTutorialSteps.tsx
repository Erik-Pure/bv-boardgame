import type { ReactNode } from "react";
import type { UiStrings } from "../../lib/uiStrings";
import { TutorialInlineIcon } from "./TutorialInlineIcon";
import styles from "../../routes/PlayView.module.css";

export type MobileTutorialStep = {
  title: string;
  body: ReactNode;
  imageSrc?: string;
  showLogo?: boolean;
};

export function getMobileTutorialSteps(ui: UiStrings): MobileTutorialStep[] {
  const t = ui.tutorial;

  return [
    {
      title: t.step1Title,
      body: (
        <>
          <p className={styles.tutorialParaSpaced}>
            <b className={styles.tutorialEmphasis}>
              <TutorialInlineIcon src="/icons/monster-icon.svg" color="#ef4444" gap="0 5px 0 0" />
              {t.step1SaveBatches}
            </b>{" "}
            {t.step1SaveBatchesRest}
          </p>
          <p className={styles.tutorialParaSpaced}>
            <TutorialInlineIcon src="/icons/bvb-icon.svg" color="#fff" gap="0 5px 0 0" />
            {t.step1Sabotage}
          </p>
        </>
      ),
      showLogo: true,
    },
    {
      title: t.step2Title,
      body: (
        <>
          <p className={styles.tutorialPara}>
            {t.step2Move}{" "}
            <TutorialInlineIcon src="/icons/panta-icon.svg" color="#fb923c" gap="0 4px 0 0" />
            <b>{t.step2Recycle}</b> {t.step2RecycleRest}
          </p>
          <p className={styles.tutorialParaSpaced}>{t.step2Items}</p>
        </>
      ),
      imageSrc: "/tutorial/tut4.png",
    },
    {
      title: t.step3Title,
      body: (
        <>
          <ul className={styles.tutorialList}>
            <li>
              <TutorialInlineIcon src="/icons/event-icon.svg" color="#60a5fa" gap="0 5px 0 0" />
              {t.step3Event}
            </li>
            <li>
              <TutorialInlineIcon src="/icons/reward-icon.svg" color="#facc15" gap="0 5px 0 0" />
              {t.step3Treasure}
            </li>
            <li>
              <TutorialInlineIcon src="/icons/heart-icon.svg" color="#f472b6" gap="0 5px 0 0" />
              {t.step3Rest}
            </li>
            <li>
              <TutorialInlineIcon src="/icons/monster-icon.svg" color="#ef4444" gap="0 5px 0 0" />
              {t.step3Combat}
            </li>
            <li>
              <TutorialInlineIcon src="/icons/bvb-icon.svg" color="#f472b6" gap="0 5px 0 0" />
              {t.step3Bvb}
            </li>
          </ul>
        </>
      ),
      imageSrc: "/tutorial/tut3.png",
    },
    {
      title: t.step4Title,
      body: (
        <>
          <ul className={`${styles.tutorialList} ${styles.tutorialListSpaced}`}>
            <li>
              <TutorialInlineIcon src="/icons/combat-icon.svg" color="#f87171" gap="0 5px 0 0" />
              {t.step4Strength}
            </li>
            <li>
              <TutorialInlineIcon src="/icons/thumbup-icon.svg" color="#16a34a" gap="0 5px 0 0" />
              {t.step4Win}
              <TutorialInlineIcon src="/icons/pant-icon.svg" color="#ccc" />
              {t.step4WinPantWord} ,
              <TutorialInlineIcon src="/icons/reward-icon.svg" color="#facc15" />
              {t.step4WinTreasureWord} ,
              <TutorialInlineIcon src="/icons/lvlup.svg" color="#60a5fa" />
              {t.step4WinXpWord}
            </li>
            <li>
              <TutorialInlineIcon src="/icons/thumbdown-icon.svg" color="#b4232c" gap="0 5px 0 0" />
              {t.step4Loss}
              <TutorialInlineIcon src="/icons/heart-icon.svg" color="#f472b6" />
              {t.step4LossHpWord} ,
              <TutorialInlineIcon src="/icons/klunk-icon.svg" color="#facc15" />
              {t.step4LossSipsWord}
            </li>
            <li>
              <TutorialInlineIcon src="/icons/skull-icon.svg" color="#ef4444" gap="0 5px 0 0" />
              {t.step4Crit}
            </li>
            <li>
              <TutorialInlineIcon src="/icons/bvb-icon.svg" color="#cccccc" gap="0 5px 0 0" />
              {t.step4Social}
            </li>
          </ul>
        </>
      ),
      imageSrc: "/tutorial/tut2.png",
    },
    {
      title: t.step5Title,
      body: (
        <>
          <p className={styles.tutorialPara}>
            {t.step5XpYouGet}
            <TutorialInlineIcon src="/icons/klunk-icon.svg" color="#fb7185" />
            {t.step5XpFromSips}
            <TutorialInlineIcon src="/icons/monster-icon.svg" color="#ef4444" />
            {t.step5XpFromMonsters}
          </p>
          <ul className={`${styles.tutorialList} ${styles.tutorialListSpaced}`}>
            <li>{t.step5Boss}</li>
            <li>{t.step5LastStanding}</li>
            <li>
              {t.step5ElimBeforeHp}
              <TutorialInlineIcon src="/icons/heart-icon.svg" color="#f472b6" />
              {t.step5ElimAfterHp}
            </li>
          </ul>
        </>
      ),
      imageSrc: "/tutorial/tut1.png",
    },
  ];
}
