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

const pages = Object.fromEntries(
  Object.entries(localeLoaders).map(([locale, loadLocale]) => [
    locale,
    Object.fromEntries(
      Object.entries(exportsByPage).map(([page, exportName]) => [
        page,
        lazy(() =>
          loadLocale().then((module) => {
            const Page = module[exportName];
            if (typeof Page !== "function") {
              throw new Error(`A página "${page}" não existe no idioma "${locale}".`);
            }
            return { default: Page };
          }),
        ),
      ]),
    ),
  ]),
);

const AccountPage = lazy(() =>
  import("./features/account/AccountPage.jsx").then((module) => ({
    default: module.AccountPage,
  })),
);

const loadingLabels = {
  "pt-BR": "Carregando página…",
  en: "Loading page…",
  es: "Cargando página…",
  "zh-CN": "正在加载页面…",
};

function PageLoading({ locale }) {
  return (
    <main
      id="main"
      className="site-container site-section site-page-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="site-eyebrow">3dXess</span>
      <p>{loadingLabels[locale] || loadingLabels["pt-BR"]}</p>
    </main>
  );
}

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
  const Page = route
    ? route.page === "account"
      ? AccountPage
      : pages[route.locale]?.[route.page]
    : null;

  useLayoutEffect(() => {
    document.documentElement.lang = route?.locale ?? "pt-BR";
  }, [route?.locale]);

  if (!route || !Page) return <NotFoundPage />;

  const content = (
    <Suspense fallback={<PageLoading locale={route.locale} />}>
      <ErrorBoundary key={`${route.locale}:${route.page}`}>
        <Page locale={route.locale} />
      </ErrorBoundary>
    </Suspense>
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
