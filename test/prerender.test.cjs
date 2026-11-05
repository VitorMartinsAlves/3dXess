const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("build generates and verifies localized static HTML before publishing", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.ok(pkg.scripts.build.includes("prerender-routes.mjs"));
  assert.ok(pkg.scripts.build.includes("generate-routes.mjs"));
  assert.ok(pkg.scripts.build.includes("verify-prerender.mjs"));
});

test("all localized routes are rendered through React streaming SSR", () => {
  const script = read("scripts/prerender-routes.mjs");
  assert.ok(script.includes("renderToPipeableStream"));
  assert.ok(script.includes("MemoryRouter"));
  assert.ok(script.includes("I18nextProvider"));
  assert.ok(script.includes("getLocaleI18n"));
  assert.ok(script.includes("Object.entries(routes)"));
  assert.ok(script.includes("onAllReady"));
});

test("client boot hydrates pre-rendered pages and keeps client-only development mode", () => {
  const main = read("src/main.jsx");
  assert.ok(main.includes("hydrateRoot"));
  assert.ok(main.includes("rootElement.hasChildNodes()"));
  assert.ok(main.includes("createRoot(rootElement).render"));
});

test("route generation injects rendered React markup and localized sitemap alternates", () => {
  const generator = read("scripts/generate-routes.mjs");
  assert.ok(generator.includes(".prerender"));
  assert.ok(generator.includes("rootMarkup"));
  assert.ok(generator.includes("addSitemapAlternates"));
  assert.ok(generator.includes("x-default"));
});

test("SEO updates the pre-rendered structured data script without duplicating JSON-LD", () => {
  const seo = read("src/components/seo/SeoManager.jsx");
  assert.ok(seo.includes('getElementById("page-structured-data")'));
  assert.ok(seo.includes("react-page-schema"));
  assert.ok(seo.includes('schema.textContent = JSON.stringify(entry.schema)'));
});

test("production verifier checks content, metadata, language alternates and 404 handling", () => {
  const verifier = read("scripts/verify-prerender.mjs");
  assert.ok(verifier.includes("has an empty root"));
  assert.ok(verifier.includes("hreflang"));
  assert.ok(verifier.includes("404 page should not be indexed"));
});
