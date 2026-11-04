import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { resolveRoute } from "./app/routes.js";
import * as ptBR from "./pages/locales/ptBR.jsx";
import * as en from "./pages/locales/en.jsx";
import * as es from "./pages/locales/es.jsx";
import * as zhCN from "./pages/locales/zhCN.jsx";
import { SeoManager } from "./components/seo/SeoManager.jsx";
import { SiteLayout } from "./components/layout/SiteLayout.jsx";
import { ErrorBoundary } from "./components/feedback/ErrorBoundary.jsx";

const localeModules = {
  "pt-BR": ptBR,
  en,
  es,
  "zh-CN": zhCN,
};

const exportsByPage = {
  home: "HomePage",
  about: "AboutPage",
  learn: "LearnPage",
  practice: "PracticePage",
  challenges: "ChallengesPage",
  rules: "RulesPage",
  play: "PlayPage",
  account: "AccountPage",
};

const pages = Object.fromEntries(
  Object.entries(localeModules).map(([locale, module]) => [
    locale,
    Object.fromEntries(
      Object.entries(exportsByPage).map(([page, exportName]) => [
        page,
        module[exportName] ?? null,
      ]),
    ),
  ]),
);

function NotFoundPage() {
  return (
    <main id="main" className="site-container site-section">
      <span className="site-eyebrow">404</span>
      <h1>Página não encontrada</h1>
      <p>O endereço acessado não corresponde a uma página do 3dXess.</p>
      <a className="site-button site-button-primary" href="/3dXess/">
        Voltar ao início
      </a>
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
      <Page locale={route.locale} />
    </ErrorBoundary>
  );

  return (
    <>
      <SeoManager locale={route.locale} page={route.page} />
      {route.page === "play" ? (
        content
      ) : (
        <SiteLayout locale={route.locale} page={route.page}>
          {content}
        </SiteLayout>
      )}
    </>
  );
}
