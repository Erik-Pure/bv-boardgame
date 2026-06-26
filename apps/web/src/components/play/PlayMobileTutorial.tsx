import type { CSSProperties, RefObject } from "react";
import { ArcadeButton } from "../ArcadeButton";
import { BrandLogoImg } from "../BrandLogoImg";
import { useUiStrings } from "../../lib/locale/LocaleContext";
import type { MobileTutorialStep } from "./mobileTutorialSteps";
import styles from "../../routes/PlayView.module.css";
import u from "../../styles/uiPrimitives.module.css";

export function PlayMobileTutorial(props: {
  open: boolean;
  step: MobileTutorialStep | undefined;
  stepIndex: number;
  stepCount: number;
  bodyNeedsScroll: boolean;
  bodyScrollRef: RefObject<HTMLDivElement | null>;
  onDismiss: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const ui = useUiStrings();
  const t = ui.tutorial;
  const { open, step, stepIndex, stepCount, bodyNeedsScroll, bodyScrollRef, onDismiss, onBack, onNext } = props;
  if (!open || !step) return null;

  return (
    <div onMouseDown={(e) => e.stopPropagation()} className={styles.tutorialOverlay}>
      <div className={styles.tutorialPanel}>
        <div className={styles.tutorialHeader}>{t.header}</div>
        <div
          ref={bodyScrollRef}
          className={[styles.tutorialBodyScrollArea, styles.tutorialBodyScroll].join(" ")}
          style={
            {
              ["--tutorial-body-overflow" as string]: bodyNeedsScroll ? "auto" : "hidden",
            } as CSSProperties
          }
        >
          <div
            className={[styles.tutorialBodyGrid, step.showLogo ? styles.tutorialBodyGridIntro : ""]
              .filter(Boolean)
              .join(" ")}
          >
            {step.showLogo ? (
              <div className={styles.tutorialLogoWrap}>
                <BrandLogoImg
                  variant="stacked"
                  alt={t.logoAlt}
                  draggable={false}
                  className={styles.tutorialLogo}
                />
              </div>
            ) : step.imageSrc ? (
              <div className={styles.tutorialImageCard}>
                <img src={step.imageSrc} alt="" draggable={false} className={styles.tutorialImage} />
              </div>
            ) : null}
            <div className={styles.tutorialStepTitle}>{step.title}</div>
            <div className={styles.tutorialStepBody}>{step.body}</div>
          </div>
        </div>
        <div
          className={styles.tutorialFooter}
          style={
            {
              ["--tutorial-footer-border" as string]: bodyNeedsScroll
                ? "1px solid rgba(255,255,255,0.1)"
                : "1px solid rgba(255,255,255,0.06)",
              ["--tutorial-footer-bg" as string]: bodyNeedsScroll
                ? "linear-gradient(180deg, rgba(12,18,40,0.12) 0%, rgba(12,18,40,0.22) 100%)"
                : "linear-gradient(180deg, rgba(12,18,40,0.08) 0%, rgba(12,18,40,0.16) 100%)",
            } as CSSProperties
          }
        >
          <div className={`${u.textCenter} ${u.o85} ${u.fs12} ${styles.tutorialFooterPage}`}>
            {stepIndex + 1} / {stepCount}
          </div>
          <div className={styles.tutorialFooterButtons}>
            {stepIndex > 0 ? (
              <ArcadeButton variant="gray" fullWidth onClick={onBack}>
                {t.back}
              </ArcadeButton>
            ) : (
              <ArcadeButton variant="gray" fullWidth onClick={onDismiss}>
                {t.skip}
              </ArcadeButton>
            )}
            {stepIndex < stepCount - 1 ? (
              <ArcadeButton variant="pink" fullWidth onClick={onNext}>
                {t.next}
              </ArcadeButton>
            ) : (
              <ArcadeButton variant="pink" fullWidth onClick={onDismiss}>
                {t.start}
              </ArcadeButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
