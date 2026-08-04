import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArcadeButton } from "../components/ArcadeButton";
import { BrandLogoImg } from "../components/BrandLogoImg";
import { CardFlipModalShell } from "../components/CardFlipModalShell";
import { PictureImg } from "../components/PictureImg";
import { appVersionLabel } from "../lib/buildInfo";
import { publicRasterSources } from "../lib/publicRasterSources";
import { useUiStrings, useLocale, useSetLocale } from "../lib/locale/LocaleContext";
import styles from "./Home.module.css";

const HOME_AGE_GATE_KEY = "bv:homeAgeGateAck";

function MobileDeviceIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="18.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

function LargeScreenIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="4" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 21h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function readHomeAgeGateAck(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(HOME_AGE_GATE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeHomeAgeGateAck(): void {
  try {
    window.localStorage.setItem(HOME_AGE_GATE_KEY, "1");
  } catch {
    // ignore
  }
}

export function Home() {
  const ui = useUiStrings();
  const locale = useLocale();
  const setLocale = useSetLocale();
  const nav = useNavigate();
  const [ageGateOpen, setAgeGateOpen] = useState(() => !readHomeAgeGateAck());
  const [ageGatePhase, setAgeGatePhase] = useState<"ask" | "declined">("ask");

  const confirmAgeGate = () => {
    writeHomeAgeGateAck();
    setAgeGateOpen(false);
  };

  return (
    <>
    <div className={styles.languageToggle} role="group" aria-label={ui.home.languageLabel}>
      <button
        type="button"
        className={locale === "sv" ? styles.languageBtnActive : styles.languageBtn}
        onClick={() => setLocale("sv")}
        aria-pressed={locale === "sv"}
      >
        {ui.home.languageSv}
      </button>
      <span className={styles.languageSep} aria-hidden>
        |
      </span>
      <button
        type="button"
        className={locale === "en" ? styles.languageBtnActive : styles.languageBtn}
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
      >
        {ui.home.languageEn}
      </button>
    </div>

    <div className={styles.homeShell}>
      <div className={styles.logoHero}>
        <h1 className={styles.visuallyHidden}>{ui.home.title}</h1>
        <div className={styles.logoGlowSpin} aria-hidden>
          <img className={styles.logoGlow} src="/icons/circular-shine.svg" alt="" />
        </div>
        <BrandLogoImg variant="stacked" className={styles.logoImage} alt={ui.home.title} />
      </div>

      <div className={styles.heroCtaBlock}>
        <p className={styles.playtestBadge}>{ui.home.playtestBadge}</p>
        <div className={styles.heroCtaRow}>
        <ArcadeButton
          className={`${styles.heroCtaBtn} ${styles.heroJoinBtn}`}
          variant="pink"
          size="lg"
          onClick={() => nav("/join")}
        >
          <span data-arcade-label-icon="" className={styles.homeCtaIcon} aria-hidden>
            <MobileDeviceIcon />
          </span>
          {ui.home.primaryJoin}
        </ArcadeButton>
        <ArcadeButton
          className={styles.heroCtaBtn}
          variant="gray"
          size="lg"
          onClick={() => nav("/host-lobby")}
        >
          <span data-arcade-label-icon="" className={styles.homeCtaIcon} aria-hidden>
            <LargeScreenIcon />
          </span>
          {ui.home.createLobby}
        </ArcadeButton>
        </div>
      </div>
    </div>

    <section className={styles.homeWideOuter} aria-labelledby="home-how-to-heading">
      <div className={styles.homeWideInner}>
        <h2 id="home-how-to-heading" className={styles.howToTitle}>
          {ui.home.howToPlayTitle}
        </h2>
        <div className={styles.howToGrid}>
          <figure className={styles.explainerFigure}>
            <PictureImg
              className={styles.explainerImg}
              sources={publicRasterSources("/icons/bmm-explainer.png")}
              alt={ui.home.explainerAlt}
              loading="lazy"
              decoding="async"
            />
          </figure>
          <div className={styles.howToTextCol}>
            <p className={styles.howToBody}><strong>{ui.home.howToPlayLead}</strong></p>
            <p className={styles.howToBody}>{ui.home.howToPlayBody}</p>
            <p className={styles.howToBody}>{ui.home.howToPlayDeviceBody}</p>
            <p className={styles.howToBody}>{ui.home.howToPlayCheersBody}</p>
            <ArcadeButton
              className={styles.howToRulesBtn}
              variant="gray"
              size="sm"
              onClick={() => nav("/rules")}
            >
              {ui.home.footerRules}
            </ArcadeButton>
          </div>
        </div>
      </div>
    </section>

    <section className={styles.homeWideOuter} aria-labelledby="home-promo-heading">
      <div className={styles.homeWideInner}>
        <h2 id="home-promo-heading" className={styles.promoSectionTitle}>
          {ui.home.promoSectionTitle}
        </h2>
        <div className={styles.promoGrid}>
          {ui.home.promoCards.map((card) => (
            <a
              key={card.href}
              className={styles.promoCard}
              href={card.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div
                className={styles.promoCardMedia}
                style={{ backgroundImage: `url(${card.image})` }}
                aria-hidden
              />
              <div className={styles.promoCardOverlay} aria-hidden />
              <div className={styles.promoCardContent}>
                <div className={styles.promoCardTitle}>{card.title}</div>
                <p className={styles.promoCardBody}>{card.body}</p>
                <span className={styles.promoCardCta}>{card.cta}</span>
              </div>
            </a>
          ))}
        </div>
        <div className={styles.promoSocial}>
          <p className={styles.promoSocialLabel}>{ui.home.promoSocialLabel}</p>
          <div className={styles.promoSocialLinks}>
            {ui.home.promoSocialLinks.map((link, index) => (
              <span key={link.href} className={styles.promoSocialItem}>
                {index > 0 ? <span className={styles.promoSocialSep} aria-hidden>·</span> : null}
                <a
                  className={styles.promoSocialLink}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>

    <div className={styles.homeShell}>
      <nav className={styles.homeFooterNav} aria-label={ui.home.footerNavLabel}>
        <Link className={styles.homeFooterLink} to="/rules">
          {ui.home.footerRules}
        </Link>
        <Link className={styles.homeFooterLink} to="/login">
          {ui.home.loginLink}
        </Link>
      </nav>
    </div>

    <div className={styles.versionBadge} title={ui.home.deployedVersionTitle}>
      {appVersionLabel()}
    </div>

    {ageGateOpen ? (
      <CardFlipModalShell zIndex={200} maxWidth={480} instantFront>
        <div
          style={{
            width: "100%",
            borderRadius: 16,
            border: "1px solid #ffffff22",
            background: "var(--modal-panel-bg)",
            padding: "22px 18px 24px",
            textAlign: "center",
            color: "#ffffff",
            boxSizing: "border-box",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {ageGatePhase === "ask" ? (
            <>
              <h2
                style={{
                  margin: "0 0 14px",
                  fontFamily: '"Permanent Marker", var(--heading), sans-serif',
                  fontWeight: 400,
                  fontSize: "clamp(1.35rem, 4.5vw, 1.75rem)",
                  letterSpacing: "0.03em",
                  lineHeight: 1.2,
                  color: "#fef9c3",
                  textShadow: "0 2px 14px rgba(0,0,0,0.75), 0 0 20px rgba(250, 204, 21, 0.22)",
                }}
              >
                {ui.home.ageGateTitle}
              </h2>
              <p
                style={{
                  margin: "0 0 22px",
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: "rgba(248, 250, 252, 0.95)",
                }}
              >
                {ui.home.ageGateBody}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <ArcadeButton variant="pink" fullWidth onClick={confirmAgeGate}>
                  {ui.home.ageGateConfirm}
                </ArcadeButton>
                <ArcadeButton variant="gray" fullWidth onClick={() => setAgeGatePhase("declined")}>
                  {ui.home.ageGateDecline}
                </ArcadeButton>
              </div>
            </>
          ) : (
            <>
              <p
                style={{
                  margin: "0 0 22px",
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: "rgba(248, 250, 252, 0.95)",
                }}
              >
                {ui.home.ageGateDeclineBody}
              </p>
              <ArcadeButton variant="gray" fullWidth onClick={() => setAgeGatePhase("ask")}>
                {ui.home.ageGateBack}
              </ArcadeButton>
            </>
          )}
        </div>
      </CardFlipModalShell>
    ) : null}
    </>
  );
}
