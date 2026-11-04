import { lazy, Suspense, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { resolveRoute } from "./app/routes.js";
import { SeoManager } from "./components/seo/SeoManager.jsx";
import { SiteLayout } from "./components/layout/SiteLayout.jsx";
import { ErrorBoundary } from "./components/feedback/ErrorBoundary.jsx";

const localeLoaders = {
  "pt-BR": () => import("./pages/locales/ptBR.jsx"),
  en: () => import("./pages/locales/en.jsx"),
  es: () => import("./pages/locales/es.jsx"),
  "zh-CN": () => import("./pages/locales/zhCN.jsx"),
};
const exportsByPage = {
  home: "HomePage",
  about: "AboutPage",
  learn: "LearnPage",
  practice: "PracticePage",
  challenges: "ChallengesPage",
  rules: "RulesPage",
  play: "PlayPage",
};

function createPage(locale, page) {
  const loadLocale = localeLoaders[locale];
  const exportName = exportsByPage[page];
  if (!loadLocale || !exportName) return null;

  return lazy(() => loadLocale().then((module) => {
    const component = module[exportName];
    if (!component) throw new Error(`Página React ausente: ${locale}/${page}`);
    return { default: component };
  }));
}

const pages = Object.fromEntries(
  Object.keys(localeLoaders).map((locale) => [
    locale,
    Object.fromEntries(Object.keys(exportsByPage).map((page) => [page, createPage(locale, page)])),
  ]),
);

function NotFoundPage() {
  return (
    <main id="main" className="site-container site-section">
      <span className="site-eyebrow">404</span>
      <h1>Página não encontrada</h1>
      <p>O endereço acessado não corresponde a uma página do 3dXess.</p>
      <a className="site-button site-button-primary" href="/3dXess/">Voltar ao início</a>
    </main>
  );
}

export default function App() {
  const location = useLocation();
  const route = resolveRoute(location.pathname);
  const Page = route ? pages[route.locale]?.[route.page] : null;

  useLayoutEffect(() => {
    document.documentElement.lang = route?.locale ?? "pt-BR";
  }, [route?.locale]);

  if (!route || !Page) return <NotFoundPage />;

  const content = (
    <ErrorBoundary key={`${route.locale}:${route.page}`}>
      <Suspense fallback={<div className="site-loading" role="status" aria-live="polite">Carregando…</div>}>
        <Page />
      </Suspense>
    </ErrorBoundary>
  );

  return (
    <>
      <SeoManager locale={route.locale} page={route.page} />
      {route.page === "play" ? content : <SiteLayout locale={route.locale} page={route.page}>{content}</SiteLayout>}
    </>
  );
}
