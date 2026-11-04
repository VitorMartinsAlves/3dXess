import { useTranslation } from "react-i18next";
import { routeHref } from "../app/routes.js";

const board = [
  ["♜","♞","♝","♛","♚","♝","♞","♜"],
  ["♟","♟","♟","♟","♟","♟","♟","♟"],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["♙","♙","♙","♙","♙","♙","♙","♙"],
  ["♖","♘","♗","♕","♔","♗","♘","♖"],
];

export function HomePage({ locale = "pt-BR" }) {
  const { t } = useTranslation("home");
  const cards = [
    { key: "play", icon: "♞", title: "playTitle", description: "playDescription", link: "playLink" },
    { key: "learn", icon: "⌖", title: "learnTitle", description: "learnDescription", link: "learnLink" },
    { key: "practice", icon: "♟", title: "practiceTitle", description: "practiceDescription", link: "practiceLink" },
    { key: "challenges", icon: "◇", title: "challengeTitle", description: "challengeDescription", link: "challengeLink" },
  ];

  return (
    <main id="main">
      <section className="site-hero home-hero">
        <div className="site-container site-hero-grid">
          <div className="home-hero-copy">
            <span className="site-eyebrow">{t("eyebrow")}</span>
            <h1>{t("titleA")}<br /><span className="site-gradient-text">{t("titleB")}</span></h1>
            <p className="site-lead">{t("intro")}</p>
            <div className="site-hero-actions">
              <a className="site-button site-button-primary" href={routeHref(locale, "play")}>{t("primary")} <span aria-hidden="true">↗</span></a>
              <a className="site-button site-button-secondary" href={routeHref(locale, "learn")}>{t("secondary")}</a>
            </div>
            <ul className="site-proof home-benefits">
              {t("benefits").split("|").map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="site-board-wrap home-board-wrap">
            <div className="site-board-glow" />
            <div className="site-hero-board">
              <div className="site-board-grid" role="img" aria-label={t("boardLabel")}>
                {board.flatMap((row, rowIndex) => row.map((piece, colIndex) => (
                  <div key={rowIndex * 8 + colIndex} className={"site-board-square " + ((rowIndex + colIndex) % 2 ? "dark" : "light")}>
                    {piece ? <span aria-hidden="true">{piece}</span> : null}
                  </div>
                )))}
              </div>
            </div>
            <div className="site-board-caption"><strong>3D BOARD</strong>{t("boardLabel")}</div>
          </div>
        </div>
      </section>

      <section className="site-section home-paths">
        <div className="site-container">
          <div className="site-section-head">
            <div><span className="site-eyebrow">{t("sectionEyebrow")}</span><h2>{t("sectionTitle")}</h2></div>
            <p>{t("sectionIntro")}</p>
          </div>
          <div className="home-feature-grid">
            {cards.map((card) => (
              <a className="home-feature-card" href={routeHref(locale, card.key)} key={card.key}>
                <span className="home-feature-icon" aria-hidden="true">{card.icon}</span>
                <span className="home-feature-title">{t(card.title)}</span>
                <span className="home-feature-description">{t(card.description)}</span>
                <span className="home-feature-link">{t(card.link)} <span aria-hidden="true">↗</span></span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="site-section site-section-alt home-account-section">
        <div className="site-container">
          <div className="site-banner">
            <div><span className="site-kicker">{t("accountTitle")}</span><h2>{t("accountTitle")}</h2><p>{t("accountDescription")}</p></div>
            <a className="site-button site-button-secondary" href={routeHref(locale, "account")}>{t("accountLink")} ↗</a>
          </div>
        </div>
      </section>

      <section className="site-section home-final-section">
        <div className="site-container">
          <div className="site-banner home-final-banner">
            <div><h2>{t("lastTitle")}</h2><p>{t("lastDescription")}</p></div>
            <a className="site-button site-button-primary" href={routeHref(locale, "play")}>{t("lastLink")} ↗</a>
          </div>
        </div>
      </section>
    </main>
  );
}
