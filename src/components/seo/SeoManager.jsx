import { useEffect } from "react";
import { BASE_URL, SITE_ROUTES } from "../../app/routes.js";
import ptBR from "../../data/page-meta/ptBR.json";
import en from "../../data/page-meta/en.json";
import es from "../../data/page-meta/es.json";
import zhCN from "../../data/page-meta/zhCN.json";

const metadata = { "pt-BR": ptBR, en, es, "zh-CN": zhCN };
const ogLocales = { "pt-BR": "pt_BR", en: "en_US", es: "es_ES", "zh-CN": "zh_CN" };
const canonicalOrigin = "https://vitormartinsalves.github.io/3dXess/";

function upsertMeta(attribute, key, content) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content ?? "";
}

function upsertCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  element.href = href;
}

function updateAlternates(page) {
  document.head.querySelectorAll('link[data-seo-alternate="true"]').forEach((node) => node.remove());
  for (const [locale, pages] of Object.entries(SITE_ROUTES)) {
    const path = pages[page];
    if (path === undefined) continue;
    const link = document.createElement("link");
    link.rel = "alternate";
    link.hreflang = locale;
    link.href = canonicalOrigin + path;
    link.dataset.seoAlternate = "true";
    document.head.appendChild(link);
  }
  const fallback = document.createElement("link");
  fallback.rel = "alternate";
  fallback.hreflang = "x-default";
  fallback.href = canonicalOrigin + SITE_ROUTES["pt-BR"][page];
  fallback.dataset.seoAlternate = "true";
  document.head.appendChild(fallback);
}

export function SeoManager({ locale, page }) {
  useEffect(() => {
    const entry = metadata[locale]?.[page] ?? metadata["pt-BR"].home;
    const relative = SITE_ROUTES[locale]?.[page] ?? "";
    const canonical = canonicalOrigin + relative;
    const image = `${canonicalOrigin}og-image.png`;

    document.documentElement.lang = locale;
    document.title = entry.title;
    upsertMeta("name", "description", entry.description);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", "3dXess");
    upsertMeta("property", "og:locale", ogLocales[locale]);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:title", entry.title);
    upsertMeta("property", "og:description", entry.description);
    upsertMeta("property", "og:image", image);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", entry.title);
    upsertMeta("name", "twitter:description", entry.description);
    upsertMeta("name", "twitter:image", image);
    upsertCanonical(canonical);
    updateAlternates(page);

    let schema = document.getElementById("react-page-schema");
    if (schema) schema.remove();
    if (entry.schema) {
      schema = document.createElement("script");
      schema.id = "react-page-schema";
      schema.type = "application/ld+json";
      schema.textContent = JSON.stringify(entry.schema);
      document.head.appendChild(schema);
    }
  }, [locale, page]);

  return null;
}
