import { useLayoutEffect } from "react";
import { SiteHeader } from "./SiteHeader.jsx";
import { SiteFooter } from "./SiteFooter.jsx";

export function SiteLayout({ locale, page, children }) {
  useLayoutEffect(() => {
    document.body.classList.add("site-body");
    return () => document.body.classList.remove("site-body");
  }, []);

  return (
    <>
      <a className="site-skip" href="#main">Pular para o conteúdo</a>
      <SiteHeader locale={locale} page={page} />
      {children}
      <SiteFooter locale={locale} />
    </>
  );
}
