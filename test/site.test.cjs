const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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
  assert.match(renderer, /square.type = 'button'/);
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
  const ensureStart = app.indexOf('function ensureBoard');
  const ensureEnd = app.indexOf('function clearBotRuntime', ensureStart);
  const ensureBoard = app.slice(ensureStart, ensureEnd);
  assert.match(ensureBoard, /settings\.boardMode === '3d'/);
  assert.match(ensureBoard, /activateBoard\('2d'\)/);
});


test('localized game lobbies have clear sections, accessible tabs, and local play in the correct place', () => {
  for (const [locale, routes] of Object.entries(locales)) {
    const html = readRoute(routes.play);
    assert.match(html, /class="lobby-head-actions"/);
    assert.match(html, /class="lobby-preferences"/);
    assert.match(html, /class="lobby-intro"/);
    assert.match(html, /aria-label="Modos de jogo"/);
    for (const name of ['quick', 'bot', 'create', 'join', 'public']) {
      assert.match(html, new RegExp('id="tab-btn-' + name + '"[^>]*role="tab"[^>]*aria-controls="tab-' + name + '"'));
      assert.match(html, new RegExp('id="tab-' + name + '"[^>]*role="tabpanel"[^>]*aria-labelledby="tab-btn-' + name + '"'));
    }

    const quickStart = html.indexOf('id="tab-quick"');
    const botStart = html.indexOf('id="tab-bot"');
    const joinStart = html.indexOf('id="tab-join"');
    const publicStart = html.indexOf('id="tab-public"');
    assert.ok(html.slice(quickStart, botStart).includes('id="local-play"'), locale + ' local play belongs to quick play');
    assert.doesNotMatch(html.slice(joinStart, publicStart), /id="local-play"/, locale + ' join tab should only handle invites');
  }
});

test('lobby tabs support keyboard navigation and expose selected state', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const switchStart = app.indexOf('function switchTab');
  const switchEnd = app.indexOf('WIRING DA INTERFACE', switchStart);
  const switchTab = app.slice(switchStart, switchEnd);
  assert.match(switchTab, /aria-selected/);
  assert.match(switchTab, /aria-hidden/);
  assert.match(switchTab, /tabIndex = active \? 0 : -1/);

  const wireStart = app.indexOf('function wireEvents');
  const wireEnd = app.indexOf('INICIALIZAÇÃO', wireStart);
  const wire = app.slice(wireStart, wireEnd);
  for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
    assert.ok(wire.includes("event.key === '" + key + "'"), 'tab key support: ' + key);
  }
});

test('new lobby copy is translated in English, Spanish and Simplified Chinese', () => {
  const i18n = fs.readFileSync(path.join(__dirname, '..', 'game-i18n.js'), 'utf8');
  for (const copy of [
    'Choose how to play', 'Find an opponent', 'Challenge the computer',
    'Vista del tablero', 'Encuentra un rival', 'Desafía al ordenador',
    '选择游戏方式', '寻找对手', '挑战电脑'
  ]) {
    assert.ok(i18n.includes(copy), 'missing lobby translation: ' + copy);
  }
});


test('2D board uses original pixel-art SVG sprites and readable outside coordinates', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'board2d.js'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
  const sprites = fs.readFileSync(path.join(__dirname, '..', 'assets', 'pixel-chess-pieces.svg'), 'utf8');
  assert.match(renderer, /assets\/pixel-chess-pieces\.svg/);
  for (const piece of ['p', 'r', 'n', 'b', 'q', 'k']) {
    assert.match(sprites, new RegExp('<symbol id="' + piece + '"'));
    assert.ok(renderer.includes("piece.type"), 'piece renderer resolves chess type');
  }
  assert.match(renderer, /createCoordinateStrip/);
  assert.match(renderer, /updateCoordinates/);
  assert.match(renderer, /setAttribute\('role', 'grid'\)/);
  assert.match(renderer, /setAttribute\('role', 'row'\)/);
  assert.match(renderer, /setAttribute\('role', 'gridcell'\)/);
  assert.match(styles, /\.board2d-row \{[\s\S]*display: grid/);
  assert.match(styles, /image-rendering: pixelated/);
  assert.match(styles, /board2d-coordinates/);
  assert.match(styles, /--piece-outline-color/);
});


test('2D legal move markers stay hidden until a piece is selected', () => {
  const styles = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
  assert.match(styles, /\.board2d-target\s*\{[^}]*display:\s*none/s);
  assert.match(styles, /\.board2d-square\.is-legal\s+\.board2d-target[^}]*display:\s*block/s);
  assert.match(styles, /\.board2d-square\.is-capture\s+\.board2d-target[^}]*display:\s*block/s);
});

test('2D renderer animates legal moves, captures and castling without a permanent frame loop', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'board2d.js'), 'utf8');
  assert.match(renderer, /function animateLastMove/);
  assert.match(renderer, /function animateMove/);
  assert.match(renderer, /function animateCapture/);
  assert.match(renderer, /typeof start\.element\.animate !== 'function'/);
  assert.match(renderer, /move\.castle/);
  assert.match(renderer, /lastMove\.enPassant/);
  assert.match(renderer, /options\.animate && boardChanged/);
  assert.match(renderer, /prefers-reduced-motion/);
  assert.doesNotMatch(renderer, /requestAnimationFrame/);
});


test('2D move animation uses the new destination piece and a board-relative motion overlay', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'board2d.js'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
  assert.match(renderer, /function animateLastMove\(previousBoard, move, nextBoard\)/);
  assert.match(renderer, /movingPiece \|\| destinationPiece/);
  assert.match(renderer, /motionLayer\.getBoundingClientRect\(\)/);
  assert.match(renderer, /document\.body\.appendChild\(motionLayer\)/);
  assert.match(renderer, /destination\.classList\.add\('is-animating-arrival'\)/);
  assert.match(styles, /\.board2d-motion-layer\s*\{\s*position:\s*fixed/);
  assert.match(renderer, /options\.animate && boardChanged/);
  assert.match(styles, /\.board2d-square\.is-animating-arrival\s*>\s*\.board2d-piece\s*\{\s*opacity:\s*0/);
  assert.doesNotMatch(renderer, /typeof Element === 'undefined'/);
});


test('bot completes multiple consecutive turns within its bounded search budget', () => {
  const context = vm.createContext({});
  const engine = fs.readFileSync(path.join(__dirname, '..', 'engine.js'), 'utf8');
  const bot = fs.readFileSync(path.join(__dirname, '..', 'bot.js'), 'utf8');
  vm.runInContext(engine, context, { timeout: 1000 });
  vm.runInContext(bot, context, { timeout: 1000 });

  let state = context.Chess.createInitialState();
  for (let ply = 0; ply < 12; ply++) {
    const result = context.Bot.chooseMove(state, {
      level: 1,
      style: 'balanced',
      timeMs: 100
    });
    assert.ok(result && result.uci, 'bot should return a move on ply ' + ply);
    const move = context.Chess.findLegalMove(
      state,
      result.move.from,
      result.move.to,
      result.move.promotion || null
    );
    assert.ok(move, 'bot move must be legal on ply ' + ply);
    context.Chess.applyMove(state, move);
  }
});

test('quiescence search caps consecutive check extensions', () => {
  const bot = fs.readFileSync(path.join(__dirname, '..', 'bot.js'), 'utf8');
  assert.match(bot, /MAX_QUIESCENCE_CHECK_EXTENSION = 8/);
  assert.match(bot, /const hardPlyLimit = ctx\.quiescencePly \+ MAX_QUIESCENCE_CHECK_EXTENSION/);
  assert.match(bot, /if \(inCheck && ply >= hardPlyLimit\)/);
});

test('bot worker failures and timeouts release the worker and scheduler', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.match(app, /botWorker\.onmessageerror/);
  assert.match(app, /worker\.terminate\(\)/);
  assert.match(app, /budget \+ 3500/);
  assert.match(app, /Promise\.resolve\(\)\.then\(function \(\) \{\s*return requestBotMove/);
  assert.match(app, /app\.bot\.thinking = false;\s*commitLocal\(move\)/);
});
