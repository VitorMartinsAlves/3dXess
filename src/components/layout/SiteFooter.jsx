import { useTranslation } from "react-i18next";
import { routeHref } from "../../app/routes.js";

const destinations = ["learn", "practice", "challenges", "rules", "about", "account", "play"];

export function SiteFooter({ locale }) {
  const { t } = useTranslation("common");
  return (
    <footer className="site-footer">
      <div className="site-container">
        <div className="site-footer-top">
          <div>
            <a className="site-brand" href={routeHref(locale, "home")}>
              <span className="site-brand-mark" aria-hidden="true">♞</span>
              <span className="site-brand-name">
                <span className="site-brand-title">3dXess</span>
                <span className="site-brand-badge">{t("online")}</span>
                <small>{t("tagline")}</small>
              </span>
            </a>
            <p className="site-footer-note">{t("footerNote")}</p>
          </div>
          <nav className="site-footer-links" aria-label={t("footerNavLabel")}>
            {destinations.map((destination) => (
              <a key={destination} href={routeHref(locale, destination)}>{t(destination)}</a>
            ))}
          </nav>
        </div>
        <div className="site-footer-bottom">
          <span>© {new Date().getFullYear()} 3dXess. {t("footerByline")}</span>
          <span>React · Three.js · WebRTC</span>
        </div>
      </div>
    </footer>
  );
}
