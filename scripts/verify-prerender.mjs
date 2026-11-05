import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const routes = JSON.parse(await readFile(join(root, "site-routes.json"), "utf8"));
const localeDirectories = { "pt-BR": "ptBR", en: "en", es: "es", "zh-CN": "zhCN" };
const canonicalOrigin = "https://vitormartinsalves.github.io/3dXess/";
let checked = 0;

for (const [locale, pages] of Object.entries(routes)) {
  const metadata = JSON.parse(await readFile(join(root, "src", "data", "page-meta", localeDirectories[locale] + ".json"), "utf8"));
  for (const [page, route] of Object.entries(pages)) {
    const file = join(dist, route, "index.html");
    const html = await readFile(file, "utf8");
    assert.ok(html.includes('<html lang="' + locale + '">'), locale + "/" + page + " language tag missing");
    assert.ok(html.includes("<title>" + metadata[page].title + "</title>"), locale + "/" + page + " title missing");
    assert.ok(html.includes('rel="canonical" href="' + canonicalOrigin + route + '"'), locale + "/" + page + " canonical missing");
    assert.ok(html.includes('<div id="root">'), locale + "/" + page + " root mount missing");
    assert.ok(!html.includes('<div id="root"></div>'), locale + "/" + page + " has an empty root");
    assert.ok(html.includes("<main"), locale + "/" + page + " has no pre-rendered main content");
    assert.ok(html.includes("<h1"), locale + "/" + page + " has no pre-rendered primary heading");
    assert.equal(html.split("hreflang=").length - 1, 5, locale + "/" + page + " should expose four languages and x-default");
    checked += 1;
  }
}

const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
const entries = sitemap.split("<url>").slice(1).map((block) => block.split("</url>")[0]);
assert.equal(entries.length, checked, "sitemap route count does not match generated routes");
for (const [index, entry] of entries.entries()) {
  assert.equal(entry.split("hreflang=").length - 1, 5, "sitemap entry " + (index + 1) + " is missing language alternates");
}

const notFound = await readFile(join(dist, "404.html"), "utf8");
assert.ok(notFound.includes("Página não encontrada"), "404 page content missing");
assert.ok(notFound.includes('content="noindex,follow"'), "404 page should not be indexed");
assert.ok(!notFound.includes('<div id="root"></div>'), "404 page should be pre-rendered");

console.log("SEO estático validado: " + checked + " páginas, conteúdo HTML, canonical, hreflang, sitemap e 404.");
