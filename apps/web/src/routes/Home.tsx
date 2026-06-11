import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArcadeButton } from "../components/ArcadeButton";
import { CardFlipModalShell } from "../components/CardFlipModalShell";
import { PictureImg } from "../components/PictureImg";
import { appVersionLabel } from "../lib/buildInfo";
import { publicRasterSources } from "../lib/publicRasterSources";
import { sv } from "../lib/uiStrings";
import styles from "./Home.module.css";

const HOME_AGE_GATE_KEY = "bv:homeAgeGateAck";

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
  const nav = useNavigate();
  const [ageGateOpen, setAgeGateOpen] = useState(() => !readHomeAgeGateAck());
  const [ageGatePhase, setAgeGatePhase] = useState<"ask" | "declined">("ask");

  const confirmAgeGate = () => {
    writeHomeAgeGateAck();
    setAgeGateOpen(false);
  };

  return (
    <>
    <div className={styles.homeShell}>
      <div className={styles.logoHero}>
        <div className={styles.logoGlowSpin} aria-hidden>
          <img className={styles.logoGlow} src="/icons/circular-shine.svg" alt="" />
        </div>
        <img className={styles.logoImage} src="/icons/bmm-logo.png" alt="Bryggmästarnas Mästare" />
      </div>

      <div className={styles.heroCtaRow}>
        <ArcadeButton variant="pink" size="lg" fullWidth onClick={() => nav("/join")}>
          {sv.home.primaryJoin}
        </ArcadeButton>
        <ArcadeButton variant="gray" size="lg" fullWidth onClick={() => nav("/host-lobby")}>
          {sv.home.createLobby}
        </ArcadeButton>
      </div>
    </div>

    <section className={styles.homeWideOuter} aria-labelledby="home-how-to-heading">
      <div className={styles.homeWideInner}>
        <h4 id="home-how-to-heading" className={styles.howToTitle}>
          {sv.home.howToPlayTitle}
        </h4>
        <div className={styles.howToGrid}>
          <figure className={styles.explainerFigure}>
            <PictureImg
              className={styles.explainerImg}
              sources={publicRasterSources("/icons/bmm-explainer.png")}
              alt={sv.home.explainerAlt}
              loading="lazy"
              decoding="async"
            />
          </figure>
          <div className={styles.howToTextCol}>
            <p className={styles.howToBody}><strong>{sv.home.howToPlayLead}</strong></p>
            <p className={styles.howToBody}>{sv.home.howToPlayBody}</p>
            <p className={styles.howToBody}>{sv.home.howToPlayDeviceBody}</p>
            <p className={styles.howToBody}>{sv.home.howToPlayCheersBody}</p>
            <ArcadeButton
              className={styles.howToRulesBtn}
              variant="gray"
              size="sm"
              onClick={() => nav("/rules")}
            >
              {sv.home.footerRules}
            </ArcadeButton>
          </div>
        </div>
      </div>
    </section>

    <section className={styles.homeWideOuter} aria-labelledby="home-promo-heading">
      <div className={styles.homeWideInner}>
        <h4 id="home-promo-heading" className={styles.promoSectionTitle}>
          {sv.home.promoSectionTitle}
        </h4>
        <div className={styles.promoGrid}>
          {sv.home.promoCards.map((card) => (
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
          <p className={styles.promoSocialLabel}>{sv.home.promoSocialLabel}</p>
          <div className={styles.promoSocialLinks}>
            {sv.home.promoSocialLinks.map((link, index) => (
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
      <nav className={styles.homeFooterNav}>
        <Link className={styles.homeFooterLink} to="/login">
          Logga in
        </Link>
      </nav>
    </div>

    <div className={styles.versionBadge} title="Deployad version">
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
                {sv.home.ageGateTitle}
              </h2>
              <p
                style={{
                  margin: "0 0 22px",
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: "rgba(248, 250, 252, 0.95)",
                }}
              >
                {sv.home.ageGateBody}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <ArcadeButton variant="pink" fullWidth onClick={confirmAgeGate}>
                  {sv.home.ageGateConfirm}
                </ArcadeButton>
                <ArcadeButton variant="gray" fullWidth onClick={() => setAgeGatePhase("declined")}>
                  {sv.home.ageGateDecline}
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
                {sv.home.ageGateDeclineBody}
              </p>
              <ArcadeButton variant="gray" fullWidth onClick={() => setAgeGatePhase("ask")}>
                {sv.home.ageGateBack}
              </ArcadeButton>
            </>
          )}
        </div>
      </CardFlipModalShell>
    ) : null}
    </>
  );
}
