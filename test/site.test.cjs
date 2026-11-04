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

test('all localized pages include complete social metadata and valid structured data', () => {
  const localesForOpenGraph = {
    'pt-BR': 'pt_BR',
    en: 'en_US',
    es: 'es_ES',
    'zh-CN': 'zh_CN'
  };

  for (const [locale, routes] of Object.entries(locales)) {
    for (const [page, route] of Object.entries(routes)) {
      const html = readRoute(route);
      assert.match(html, /<meta property="og:type" content="website"/, locale + '/' + page + ' og:type');
      assert.ok(html.includes('property="og:locale" content="' + localesForOpenGraph[locale] + '"'), locale + '/' + page + ' og:locale');
      for (const key of ['og:url', 'og:title', 'og:description', 'og:image']) {
        assert.ok(html.includes('property="' + key + '"'), locale + '/' + page + ' ' + key);
      }
      for (const key of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
        assert.ok(html.includes('name="' + key + '"'), locale + '/' + page + ' ' + key);
      }

      const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
      assert.ok(schemas.length > 0, locale + '/' + page + ' structured data');
      for (const schema of schemas) {
        assert.doesNotThrow(() => JSON.parse(schema[1]), locale + '/' + page + ' valid JSON-LD');
      }
    }
  }
});

test('localized pages contain readable content without broken object labels', () => {
  const homeTitles = {
    'pt-BR': ['Partidas contra amigos e o bot', 'Treinamento por posição', 'Desafios diários de xadrez'],
    en: ['Play friends or the bot', 'Position-based training', 'Daily chess challenges'],
    es: ['Juega contra amigos o el bot', 'Práctica por posiciones', 'Desafíos diarios de ajedrez'],
    'zh-CN': ['与朋友或电脑对弈', '按局面进行训练', '每日国际象棋挑战']
  };

  for (const [locale, routes] of Object.entries(locales)) {
    for (const route of Object.values(routes)) {
      assert.doesNotMatch(readRoute(route), /\[object Object\]/, locale + '/' + route + ' has an unserialized object label');
    }

    const html = readRoute(routes.home);
    const cards = [...html.matchAll(/<article class="site-card">[\s\S]*?<h3>([\s\S]*?)<\/h3>/g)]
      .map(match => match[1]);
    assert.deepEqual(cards, homeTitles[locale], locale + ' homepage feature headings');
    assert.match(html, /<nav class="site-footer-links" aria-label="[^"]+"/, locale + ' footer navigation label');
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

test('localized game pages expose both board modes without eagerly loading WebGL', () => {
  for (const [locale, routes] of Object.entries(locales)) {
    const html = readRoute(routes.play);
    assert.match(html, /game-i18n\.js/);
    assert.match(html, /board2d\.js/);
    assert.match(html, /id="game-language-switch"/);
    assert.match(html, /id="board-2d"/);
    assert.match(html, /id="board-3d"/);
    assert.match(html, /data-board-mode="2d"/);
    assert.match(html, /data-board-mode="3d"/);
    assert.doesNotMatch(html, /vendor\/three\.min\.js|vendor\/OrbitControls\.js/);
    assert.doesNotMatch(html, /src="board3d\.js"/);
    assert.ok(html.includes('lang="' + locale + '"'));
  }
});

test('2D renderer is independent from WebGL and exposes keyboard-accessible squares', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'board2d.js'), 'utf8');
  assert.doesNotMatch(renderer, /THREE\./);
  assert.match(renderer, /global\.Board2D/);
  assert.match(renderer, /role', 'grid'/);
  assert.match(renderer, /ArrowUp/);
  assert.match(renderer, /ArrowDown/);
  assert.match(renderer, /ArrowLeft/);
  assert.match(renderer, /ArrowRight/);
  assert.match(renderer, /aria-label/);
  assert.match(renderer, /viewRow < 8/);
  assert.match(renderer, /viewCol < 8/);
});

test('game loads the 3D renderer only when selected and persists the choice', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.match(app, /boardMode: '2d'/);
  assert.match(app, /function loadBoard3DAssets/);
  assert.match(app, /vendor\/three\.min\.js/);
  assert.match(app, /vendor\/OrbitControls\.js/);
  assert.match(app, /function setBoardMode/);
  assert.match(app, /saveSettings\(\)/);
  assert.match(app, /data-board-mode/);
});
