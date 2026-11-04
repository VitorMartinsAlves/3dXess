"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SITE_ROUTES, routeHref } from "../../app/routes.js";

const languageOptions = [
  ["pt-BR", "PT · Português"],
  ["en", "EN · English"],
  ["es", "ES · Español"],
  ["zh-CN", "中文 · 简体"],
];
const primaryNavigation = ["home", "learn", "practice", "challenges", "play"];

export function SiteHeader({ locale, page }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t, i18n } = useTranslation("common");

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  async function onLanguageChange(event) {
    const nextLocale = event.target.value;
    if (!SITE_ROUTES[nextLocale]?.[page]) return;
    await i18n.changeLanguage(nextLocale);
    window.location.assign(routeHref(nextLocale, page));
  }

  return (
    <header className="site-header">
      <div className="site-container site-header-inner">
        <a className="site-brand" href={routeHref(locale, "home")} aria-label={t("homeAria")}>
          <span className="site-brand-mark" aria-hidden="true">♞</span>
          <span className="site-brand-name">
            <span className="site-brand-title">{t("brand")}</span>
            <span className="site-brand-badge">{t("online")}</span>
            <small>{t("tagline")}</small>
          </span>
        </a>

        <button className="site-menu-toggle" type="button" aria-expanded={menuOpen}
          aria-controls="site-navigation" aria-label={menuOpen ? t("menuClose") : t("menuOpen")}
          onClick={() => setMenuOpen((open) => !open)}>
          <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
        </button>

        <nav className={`site-nav${menuOpen ? " is-open" : ""}`} id="site-navigation" aria-label={t("navLabel")}>
          {primaryNavigation.map((item) => (
            <a key={item} href={routeHref(locale, item)}
              className={item === "play" ? "site-nav-play" : undefined}
              aria-current={page === item ? "page" : undefined}
              onClick={() => setMenuOpen(false)}>{t(item)}</a>
          ))}
          <div className="site-nav-mobile-tools">
            <a href={routeHref(locale, "account")} aria-current={page === "account" ? "page" : undefined}
              onClick={() => setMenuOpen(false)}>{t("account")}</a>
            <label className="site-mobile-language"><span>{t("language")}</span>
              <select className="site-language" aria-label={t("language")} value={locale} onChange={onLanguageChange}>
                {languageOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
        </nav>

        <div className="site-header-actions">
          <select className="site-language" aria-label={t("language")} value={locale} onChange={onLanguageChange}>
            {languageOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <a className={`site-account-link${page === "account" ? " is-active" : ""}`}
            href={routeHref(locale, "account")} aria-current={page === "account" ? "page" : undefined}
            title={t("account")}>
            <span aria-hidden="true">♙</span><span>{t("account")}</span>
          </a>
        </div>
      </div>
    </header>
  );
}
