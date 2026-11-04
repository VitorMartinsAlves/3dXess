import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BASE_URL, SITE_ROUTES, routeHref } from "../../app/routes.js";

const labels = {
  "pt-BR": { home: "Início", learn: "Aprender", practice: "Praticar", challenges: "Desafios", about: "Sobre", play: "Jogar agora", account: "Conta", brand: "Xadrez 3D", subtitle: "Salas, partidas rápidas e links de convite" },
  en: { home: "Home", learn: "Learn", practice: "Practice", challenges: "Challenges", about: "About", play: "Play now", account: "Account", brand: "3D Chess", subtitle: "Rooms, quick games and invite links" },
  es: { home: "Inicio", learn: "Aprender", practice: "Practicar", challenges: "Desafíos", about: "Acerca de", play: "Jugar ahora", account: "Cuenta", brand: "Ajedrez 3D", subtitle: "Salas, partidas rápidas y enlaces de invitación" },
  "zh-CN": { home: "首页", learn: "学习", practice: "练习", challenges: "挑战", about: "关于", play: "开始对局", account: "账户", brand: "3D 国际象棋", subtitle: "房间、快速对局和邀请链接" },
};
const languageOptions = [
  ["pt-BR", "PT · Português"], ["en", "EN · English"],
  ["es", "ES · Español"], ["zh-CN", "中文 · 简体"],
];

export function SiteHeader({ locale, page }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const t = labels[locale] ?? labels["pt-BR"];
  const navItems = ["home", "learn", "practice", "challenges", "about", "account"];

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  function onLanguageChange(event) {
    const nextLocale = event.target.value;
    const nextRoute = SITE_ROUTES[nextLocale]?.[page];
    if (nextRoute !== undefined) window.location.assign(`${BASE_URL}${nextRoute}`);
  }

  return (
    <header className="site-header">
      <div className="site-container site-header-inner">
        <Link className="site-brand" to={routeHref(locale, "home")} reloadDocument aria-label={`${t.brand} — ${t.home}`}>
          <span className="site-brand-mark" aria-hidden="true">♞</span>
          <span className="site-brand-name">
            <span className="site-brand-title">{t.brand}</span>{" "}
            <span className="site-brand-badge">Online</span>
            <small>{t.subtitle}</small>
          </span>
        </Link>
        <button
          className="site-menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="site-navigation"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
        </button>
        <nav className={`site-nav${menuOpen ? " is-open" : ""}`} id="site-navigation" aria-label="Navegação principal">
          {navItems.map((item) => (
            <Link key={item} to={routeHref(locale, item)} reloadDocument aria-current={page === item ? "page" : undefined} onClick={() => setMenuOpen(false)}>
              {t[item]}
            </Link>
          ))}
        </nav>
        <div className="site-header-actions">
          <select className="site-language" aria-label="Idioma" value={locale} onChange={onLanguageChange}>
            {languageOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <Link className="site-button site-button-primary" to={routeHref(locale, "play")} reloadDocument>{t.play}</Link>
        </div>
      </div>
    </header>
  );
}
