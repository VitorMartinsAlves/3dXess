import { SiteHeader } from "./SiteHeader.jsx";
import { SiteFooter } from "./SiteFooter.jsx";

export function SiteLayout({ locale, page, children }) {
  return (
    <div className="site-body">
      <a className="site-skip" href="#main">Pular para o conteúdo</a>
      <SiteHeader locale={locale} page={page} />
      {children}
      <SiteFooter locale={locale} />
    </div>
  );
}
