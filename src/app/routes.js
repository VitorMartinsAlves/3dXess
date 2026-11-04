import routeData from "../../site-routes.json";

export const SITE_ROUTES = routeData;
export const LANGUAGES = Object.keys(SITE_ROUTES);
export const BASE_URL = import.meta.env.BASE_URL;

export function resolveRoute(pathname) {
  const normalized = pathname === "/" ? "/" : `/${pathname.replace(/^\/+|\/+$/g, "")}/`;

  for (const [locale, pages] of Object.entries(SITE_ROUTES)) {
    for (const [page, route] of Object.entries(pages)) {
      const routePath = route ? `/${route}` : "/";
      if (normalized === routePath) return { locale, page, route };
    }
  }

  return null;
}

export function routeHref(locale, page) {
  const route = SITE_ROUTES[locale]?.[page];
  if (route === undefined) return BASE_URL;
  return `/${route}`;
}
