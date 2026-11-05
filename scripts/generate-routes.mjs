import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const routes = JSON.parse(await readFile(join(root, "site-routes.json"), "utf8"));
const localeDirectories = { "pt-BR": "ptBR", en: "en", es: "es", "zh-CN": "zhCN" };
const ogLocales = { "pt-BR": "pt_BR", en: "en_US", es: "es_ES", "zh-CN": "zh_CN" };
const canonicalOrigin = "https://vitormartinsalves.github.io/3dXess/";
const template = await readFile(join(dist, "index.html"), "utf8");
const rootPlaceholder = '<div id="root"></div>';

function escapeAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function buildDocument(locale, route, metadata, rootMarkup) {
  const canonical = canonicalOrigin + route;
  const page = Object.entries(routes[locale]).find(([, value]) => value === route)?.[0];
  if (!page) throw new Error("Não foi possível identificar a rota " + locale + "/" + route);

  const alternates = Object.entries(routes).map(([language, pages]) => {
    return '<link rel="alternate" data-seo-alternate="true" hreflang="' + language + '" href="' + canonicalOrigin + pages[page] + '" />';
  }).join("\n    ");
  const fallback = '<link rel="alternate" data-seo-alternate="true" hreflang="x-default" href="' + canonicalOrigin + routes["pt-BR"][page] + '" />';
  const schema = metadata.schema
    ? '<script type="application/ld+json" id="page-structured-data">' + JSON.stringify(metadata.schema).replace(/</g, "\\u003c") + "</script>"
    : "";

  let document = template
    .replace('<html lang="pt-BR">', '<html lang="' + locale + '">')
    .replaceAll("__TITLE__", escapeAttribute(metadata.title))
    .replaceAll("__DESCRIPTION__", escapeAttribute(metadata.description))
    .replaceAll("__CANONICAL__", escapeAttribute(canonical))
    .replace("__OG_LOCALE__", ogLocales[locale])
    .replace("__ALTERNATES__", alternates + "\n    " + fallback)
    .replace('<script type="application/ld+json" id="page-structured-data">__SCHEMA__</script>', schema);

  if (!document.includes(rootPlaceholder)) {
    throw new Error("O template HTML não contém o ponto de montagem #root.");
  }
  document = document.replace(rootPlaceholder, '<div id="root">' + rootMarkup + "</div>");
  return document;
}

function addSitemapAlternates(xml) {
  const routeByUrl = new Map();
  for (const [locale, pages] of Object.entries(routes)) {
    for (const [page, route] of Object.entries(pages)) {
      routeByUrl.set(canonicalOrigin + route, { locale, page });
    }
  }

  const blocks = xml.split("<url>");
  return blocks.map((block, index) => {
    if (index === 0) return block;
    const closingIndex = block.indexOf("</url>");
    if (closingIndex < 0) return block;

    const body = block.slice(0, closingIndex);
    const suffix = block.slice(closingIndex + "</url>".length);
    const locationStart = body.indexOf("<loc>");
    const locationEnd = body.indexOf("</loc>");
    if (locationStart < 0 || locationEnd < 0) return block;

    const location = body.slice(locationStart + "<loc>".length, locationEnd).trim();
    const route = routeByUrl.get(location);
    if (!route) return block;

    const cleanBody = body
      .split("\n")
      .filter((line) => !line.trim().startsWith("<xhtml:link"))
      .join("\n");
    const links = Object.entries(routes).map(([language, pages]) => {
      return '<xhtml:link rel="alternate" hreflang="' + language + '" href="' + canonicalOrigin + pages[route.page] + '"/>';
    });
    links.push('<xhtml:link rel="alternate" hreflang="x-default" href="' + canonicalOrigin + routes["pt-BR"][route.page] + '"/>');

    return cleanBody + "\n    " + links.join("\n    ") + "\n  </url>" + suffix;
  }).join("<url>");
}

for (const [locale, pages] of Object.entries(routes)) {
  const directory = localeDirectories[locale];
  const metadata = JSON.parse(await readFile(join(root, "src", "data", "page-meta", directory + ".json"), "utf8"));
  for (const [page, route] of Object.entries(pages)) {
    const staticMarkup = await readFile(join(dist, ".prerender", locale, page + ".html"), "utf8");
    const destination = join(dist, route, "index.html");
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, buildDocument(locale, route, metadata[page], staticMarkup), "utf8");
  }
}

const notFoundMarkup = await readFile(join(dist, ".prerender", "404.html"), "utf8");
const notFoundMeta = {
  title: "Página não encontrada | 3dXess",
  description: "O endereço acessado não corresponde a uma página do 3dXess.",
  schema: null,
};
let notFoundDocument = buildDocument("pt-BR", "", notFoundMeta, notFoundMarkup)
  .replace('content="index,follow,max-image-preview:large"', 'content="noindex,follow"');
notFoundDocument = notFoundDocument
  .split("\n")
  .filter((line) => !line.includes('rel="canonical"') && !line.includes('rel="alternate"'))
  .join("\n");
await writeFile(join(dist, "404.html"), notFoundDocument, "utf8");

const sitemap = await readFile(join(root, "public", "sitemap.xml"), "utf8");
await writeFile(join(dist, "sitemap.xml"), addSitemapAlternates(sitemap), "utf8");
await cp(join(root, "public", "robots.txt"), join(dist, "robots.txt"));
await writeFile(join(dist, ".nojekyll"), "", "utf8");
await rm(join(dist, ".prerender"), { recursive: true, force: true });
console.log("Rotas localizadas, sitemap e página 404 gerados com HTML pré-renderizado.");
