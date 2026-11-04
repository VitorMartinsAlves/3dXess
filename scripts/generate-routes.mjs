import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const routes = JSON.parse(await readFile(join(root, "site-routes.json"), "utf8"));
const localeDirectories = { "pt-BR": "ptBR", en: "en", es: "es", "zh-CN": "zhCN" };
const ogLocales = { "pt-BR": "pt_BR", en: "en_US", es: "es_ES", "zh-CN": "zh_CN" };
const canonicalOrigin = "https://vitormartinsalves.github.io/3dXess/";
const template = await readFile(join(dist, "index.html"), "utf8");

function escapeAttribute(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function buildDocument(locale, page, route, metadata) {
  const canonical = canonicalOrigin + route;
  const alternates = Object.entries(routes).map(([language, pages]) => {
    return `<link rel="alternate" data-seo-alternate="true" hreflang="${language}" href="${canonicalOrigin + pages[page]}" />`;
  }).join("\n    ");
  const fallback = `<link rel="alternate" data-seo-alternate="true" hreflang="x-default" href="${canonicalOrigin + routes["pt-BR"][page]}" />`;
  const schema = metadata.schema
    ? `<script type="application/ld+json" id="page-structured-data">${JSON.stringify(metadata.schema).replace(/</g, "\\u003c")}</script>`
    : "";
  return template
    .replace('<html lang="pt-BR">', `<html lang="${locale}">`)
    .replaceAll("__TITLE__", escapeAttribute(metadata.title))
    .replaceAll("__DESCRIPTION__", escapeAttribute(metadata.description))
    .replaceAll("__CANONICAL__", escapeAttribute(canonical))
    .replace("__OG_LOCALE__", ogLocales[locale])
    .replace("__ALTERNATES__", `${alternates}\n    ${fallback}`)
    .replace('<script type="application/ld+json" id="page-structured-data">__SCHEMA__</script>', schema);
}

for (const [locale, pages] of Object.entries(routes)) {
  const directory = localeDirectories[locale];
  const metadata = JSON.parse(await readFile(join(root, "src", "data", "page-meta", `${directory}.json`), "utf8"));
  for (const [page, route] of Object.entries(pages)) {
    const destination = join(dist, route, "index.html");
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, buildDocument(locale, page, route, metadata[page]), "utf8");
  }
}

const homeMeta = JSON.parse(await readFile(join(root, "src/data/page-meta/ptBR.json"), "utf8")).home;
await writeFile(join(dist, "404.html"), buildDocument("pt-BR", "home", "", homeMeta), "utf8");
await cp(join(root, "public", "sitemap.xml"), join(dist, "sitemap.xml"));
await cp(join(root, "public", "robots.txt"), join(dist, "robots.txt"));
await writeFile(join(dist, ".nojekyll"), "", "utf8");
console.log("Rotas estáticas do GitHub Pages geradas com SEO localizado.");
