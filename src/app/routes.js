import routeData from "../../site-routes.json";

export const SITE_ROUTES = routeData;
export const BASE_PATH = "/3dXess";
export const BASE_URL = `${BASE_PATH}/`;
export const SITE_ORIGIN = "https://vitormartinsalves.github.io";
export const SITE_URL = `${SITE_ORIGIN}${BASE_URL}`;

const normalize = (value) => String(value ?? "").replace(/^\\/+|\\/+$/g, "");

export function resolveRoute(pathname) {
  const normalized = normalize(pathname).replace(/^3dXess(?:\\/|$)/, "");
  for (const [locale, pages] of Object.entries(SITE_ROUTES)) {
    for (const [page, route] of Object.entries(pages)) {
      if (normalized === normalize(route)) return { locale, page, route };
    }
  }
  return null;
}

export function routeHref(locale, page) {
  const route = SITE_ROUTES[locale]?.[page];
  if (route === undefined) return BASE_URL;
  return `${BASE_URL}${route}`;
}
