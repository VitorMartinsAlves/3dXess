const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const BASE = 'https://vitormartinsalves.github.io/3dXess/';
const locales = {
  'pt-BR': { home: '', about: 'sobre/', learn: 'aprender/', practice: 'praticar/', challenges: 'desafios/', rules: 'regras/', play: 'jogar/' },
  en: { home: 'en/', about: 'en/about/', learn: 'en/learn/', practice: 'en/practice/', challenges: 'en/challenges/', rules: 'en/rules/', play: 'en/play/' },
  es: { home: 'es/', about: 'es/acerca/', learn: 'es/aprender/', practice: 'es/practica/', challenges: 'es/desafios/', rules: 'es/reglas/', play: 'es/jugar/' },
  'zh-CN': { home: 'zh-cn/', about: 'zh-cn/about/', learn: 'zh-cn/learn/', practice: 'zh-cn/practice/', challenges: 'zh-cn/challenges/', rules: 'zh-cn/rules/', play: 'zh-cn/play/' }
};

function fileFor(route) {
  return path.join(__dirname, '..', route ? route + 'index.html' : 'index.html');
}
function readRoute(route) { return fs.readFileSync(fileFor(route), 'utf8'); }
function expectedAlternates(page) {
  return Object.entries(locales).map(([locale, routes]) => ({ locale, url: BASE + routes[page] }));
}

test('all 28 localized pages exist and declare language and canonical URL', () => {
  for (const [locale, routes] of Object.entries(locales)) {
    for (const [page, route] of Object.entries(routes)) {
      const html = readRoute(route);
      assert.ok(html.includes('<html lang="' + locale + '"'), locale + '/' + page + ' lang');
      assert.ok(html.includes('<link rel="canonical" href="' + BASE + route + '"'), locale + '/' + page + ' canonical');
      assert.match(html, /<title>[^<]+<\/title>/i, locale + '/' + page + ' title');
      assert.match(html, /name="description"/i, locale + '/' + page + ' description');
    }
  }
});

test('each localized page has reciprocal hreflang links and x-default', () => {
  for (const [locale, routes] of Object.entries(locales)) {
    for (const [page, route] of Object.entries(routes)) {
      const html = readRoute(route);
      for (const item of expectedAlternates(page)) {
        assert.ok(html.includes('hreflang="' + item.locale + '" href="' + item.url + '"'), locale + '/' + page + ' missing ' + item.locale);
      }
      const fallback = BASE + locales['pt-BR'][page];
      assert.ok(html.includes('hreflang="x-default" href="' + fallback + '"'), locale + '/' + page + ' missing x-default');
    }
  }
});

test('every sitemap URL resolves to a page in this repository', () => {
  const sitemap = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.equal(locs.length, 28);
  for (const [locale, routes] of Object.entries(locales)) {
    for (const route of Object.values(routes)) {
      assert.ok(locs.includes(BASE + route), 'sitemap missing ' + locale + ': ' + route);
      assert.ok(fs.existsSync(fileFor(route)), 'page file missing: ' + route);
    }
  }
});

test('trainer pages load the 3D engine and shared trainer module', () => {
  for (const [locale, routes] of Object.entries(locales)) {
    for (const page of ['practice', 'challenges']) {
      const html = readRoute(routes[page]);
      assert.match(html, /vendor\/three\.min\.js/);
      assert.match(html, /engine\.js/);
      assert.match(html, /board3d\.js/);
      assert.match(html, /practice\.js/);
      assert.match(html, /id="training-board"/);
    }
  }
});

test('localized game pages load the translation module and language switcher', () => {
  for (const [locale, routes] of Object.entries(locales)) {
    const html = readRoute(routes.play);
    assert.match(html, /game-i18n\.js/);
    assert.match(html, /id="game-language-switch"/);
    assert.ok(html.includes('lang="' + locale + '"'));
  }
});
