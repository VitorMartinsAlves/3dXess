const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');


const BASE = 'https://vitormartinsalves.github.io/3dXess/';
const localeDirs = { 'pt-BR': 'ptBR', en: 'en', es: 'es', 'zh-CN': 'zhCN' };
const locales = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'site-routes.json'), 'utf8'));
const pageNames = { home: 'HomePage', about: 'AboutPage', learn: 'LearnPage', practice: 'PracticePage', challenges: 'ChallengesPage', rules: 'RulesPage', play: 'PlayPage', account: 'AccountPage' };
const pageMeta = Object.fromEntries(Object.entries(localeDirs).map(([locale, dir]) => [
  locale,
  JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'page-meta', dir + '.json'), 'utf8'))
]));
function componentFile(locale) {
  return path.join(__dirname, '..', 'src', 'pages', 'locales', localeDirs[locale] + '.jsx');
}
function readRoute(route) {
  for (const [locale, pages] of Object.entries(locales)) {
    for (const [page, target] of Object.entries(pages)) {
      if (target !== route) continue;
      const source = page === 'play'
        ? path.join(__dirname, '..', 'src', 'features', 'game', 'markup', 'GameMarkup.jsx')
        : componentFile(locale);
      return fs.readFileSync(source, 'utf8');
    }
  }
  throw new Error('Rota não encontrada: ' + route);
}

test('all 32 localized routes are represented by React page components and metadata', () => {
  for (const [locale, pages] of Object.entries(locales)) {
    const source = fs.readFileSync(componentFile(locale), 'utf8');
    for (const [page, route] of Object.entries(pages)) {
      if (page === 'account') {
        assert.ok(source.includes('export { AccountPage }'), locale + '/account export missing');
      } else if (page === 'home') {
        assert.ok(source.includes('import { HomePage } from "../HomePage.jsx"'), locale + '/home shared component import missing');
        assert.ok(source.includes('export { HomePage }'), locale + '/home shared component export missing');
      } else {
        assert.ok(source.includes('function ' + pageNames[page] + '()'), locale + '/' + page + ' component missing');
      }
      assert.ok(pageMeta[locale][page]?.title, locale + '/' + page + ' title missing');
      assert.ok(pageMeta[locale][page]?.description, locale + '/' + page + ' description missing');
      assert.ok(route !== undefined, locale + '/' + page + ' route missing');
    }
  }
});

test('React i18n is installed and initialized before localized pages render', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const lockfile = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package-lock.json'), 'utf8'));
  const main = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.jsx'), 'utf8');
  const i18n = fs.readFileSync(path.join(__dirname, '..', 'src', 'shared', 'i18n', 'index.js'), 'utf8');

  assert.ok(packageJson.dependencies.i18next, 'i18next dependency missing');
  assert.ok(packageJson.dependencies['react-i18next'], 'react-i18next dependency missing');
  assert.ok(lockfile.packages['node_modules/i18next'], 'i18next lock entry missing');
  assert.ok(lockfile.packages['node_modules/react-i18next'], 'react-i18next lock entry missing');
  assert.ok(main.includes('I18nextProvider'));
  assert.ok(main.includes('getLocaleI18n(locale)'));
  assert.ok(main.includes('document.documentElement.lang'));
  assert.ok(i18n.includes('SUPPORTED_LOCALES = ["pt-BR", "en", "es", "zh-CN"]'));
});

test('global and in-game navigation expose the main destinations without closing the active game', () => {
  const header = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'layout', 'SiteHeader.jsx'), 'utf8');
  const markup = fs.readFileSync(path.join(__dirname, '..', 'src', 'features', 'game', 'markup', 'GameMarkup.jsx'), 'utf8');

  assert.ok(header.includes('primaryNavigation = ["home", "learn", "practice", "challenges", "play"]'));
  assert.ok(header.includes('routeHref(locale, "account")'));
  assert.ok(markup.includes('data-game-route="account" href="/3dXess/conta/" target="_blank" rel="noopener noreferrer"'));
  assert.ok(markup.includes('aria-label="Abrir a conta em uma nova aba"'));
});

test('SEO manager creates canonical, Open Graph, Twitter and hreflang metadata', () => {
  const seo = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'seo', 'SeoManager.jsx'), 'utf8');
  for (const required of ['canonical', 'og:type', 'og:locale', 'twitter:card', 'hreflang', 'x-default']) {
    assert.ok(seo.includes(required), 'SEO manager missing ' + required);
  }
});

test('sitemap contains all 28 localized routes and resolves against the route registry', () => {
  const sitemap = fs.readFileSync(path.join(__dirname, '..', 'public', 'sitemap.xml'), 'utf8');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(locations.length, 32);
  for (const [locale, pages] of Object.entries(locales)) {
    for (const route of Object.values(pages)) {
      assert.ok(locations.includes(BASE + route), 'sitemap missing ' + locale + ': ' + route);
    }
  }
});

test('all localized pages provide valid structured data and social metadata', () => {
  for (const [locale, pages] of Object.entries(pageMeta)) {
    for (const [page, entry] of Object.entries(pages)) {
      assert.ok(entry.title && entry.description, locale + '/' + page + ' metadata incomplete');
      assert.ok(entry.schema, locale + '/' + page + ' structured data missing');
      assert.doesNotThrow(() => JSON.parse(JSON.stringify(entry.schema)));
    }
  }
});

test('localized pages contain readable React markup without serialized object labels', () => {
  for (const [locale, pages] of Object.entries(locales)) {
    const source = fs.readFileSync(componentFile(locale), 'utf8');
    assert.doesNotMatch(source, /\[object Object\]/, locale + ' contains an unserialized object label');
    assert.match(source, /site-card|site-hero|site-section/, locale + ' public page content missing');
    assert.equal(Object.keys(pages).length, 8);
    assert.ok(source.includes('export { AccountPage }'), locale + ' account page export missing');
  }
});

test('training routes render React content and use the isolated trainer runtime', () => {
  const runtime = fs.readFileSync(path.join(__dirname, '..', 'src', 'features', 'training', 'components', 'TrainerRuntime.jsx'), 'utf8');
  assert.match(runtime, /legacy\/vendor\/three\.min\.js/);
  assert.match(runtime, /legacy\/game\/board3d\.js/);
  assert.match(runtime, /legacy\/training\/practice\.js/);
  for (const locale of Object.keys(locales)) {
    const source = fs.readFileSync(componentFile(locale), 'utf8');
    assert.match(source, /TrainerRuntime mode="practice"/);
    assert.match(source, /TrainerRuntime mode="daily"/);
    assert.match(source, /training-board/);
  }
});

test('game page markup is mounted by React and keeps both renderer containers and modes', () => {
  const markup = fs.readFileSync(path.join(__dirname, '..', 'src', 'features', 'game', 'markup', 'GameMarkup.jsx'), 'utf8');
  for (const required of ['id="app"', 'id="board-2d"', 'id="board-3d"', 'data-board-mode="2d"', 'data-board-mode="3d"', 'id="lobby"', 'id="game-ui"']) {
    assert.ok(markup.includes(required), 'game markup missing ' + required);
  }
});

test('2D renderer is independent from WebGL and exposes keyboard-accessible squares', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'game', 'board2d.js'), 'utf8');
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
  const app = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'game', 'app.js'), 'utf8');
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
    assert.match(html, /className="lobby-head-actions"/);
    assert.match(html, /className="lobby-preferences"/);
    assert.match(html, /className="lobby-intro"/);
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
  const app = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'game', 'app.js'), 'utf8');
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
  const i18n = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'game', 'game-i18n.js'), 'utf8');
  for (const copy of [
    'Choose how to play', 'Find an opponent', 'Challenge the computer',
    'Vista del tablero', 'Encuentra un rival', 'Desafía al ordenador',
    '选择游戏方式', '寻找对手', '挑战电脑'
  ]) {
    assert.ok(i18n.includes(copy), 'missing lobby translation: ' + copy);
  }
});


test('2D board uses original pixel-art SVG sprites and readable outside coordinates', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'game', 'board2d.js'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'game.css'), 'utf8');
  const sprites = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'game', 'assets', 'pixel-chess-pieces.svg'), 'utf8');
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
  const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'game.css'), 'utf8');
  assert.match(styles, /\.board2d-target\s*\{[^}]*display:\s*none/s);
  assert.match(styles, /\.board2d-square\.is-legal\s+\.board2d-target[^}]*display:\s*block/s);
  assert.match(styles, /\.board2d-square\.is-capture\s+\.board2d-target[^}]*display:\s*block/s);
});

test('2D renderer animates legal moves, captures and castling without a permanent frame loop', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'game', 'board2d.js'), 'utf8');
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
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'game', 'board2d.js'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles', 'game.css'), 'utf8');
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
  const engine = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'game', 'engine.js'), 'utf8');
  const bot = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'game', 'bot.js'), 'utf8');
  vm.runInContext(engine, context, { timeout: 1000 });
  vm.runInContext(bot, context, { timeout: 1000 });

  let state = context.Chess.createInitialState();
  for (let ply = 0; ply < 12; ply++) {
    context.state = state;
    const result = vm.runInContext(
      "Bot.chooseMove(state, { level: 1, style: 'balanced', timeMs: 100 })",
      context,
      { timeout: 1500 }
    );
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
  const bot = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'game', 'bot.js'), 'utf8');
  assert.match(bot, /MAX_QUIESCENCE_CHECK_EXTENSION = 8/);
  assert.match(bot, /const hardPlyLimit = ctx\.quiescencePly \+ MAX_QUIESCENCE_CHECK_EXTENSION/);
  assert.match(bot, /if \(inCheck && ply >= hardPlyLimit\)/);
});

test('2D animations cannot leave destination pieces hidden', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'game', 'board2d.js'), 'utf8');
  assert.match(renderer, /cleanupTimer = window\.setTimeout\(cleanup, 1400\)/);
  assert.match(renderer, /cleanupTimer = window\.setTimeout\(cleanup, 1000\)/);
  assert.match(renderer, /try \{\s*animation = start\.element\.animate/);
  assert.match(renderer, /try \{\s*animation = ghost\.element\.animate/);
  assert.match(renderer, /try \{\s*animateLastMove\(previousBoard, lastMove, nextBoard\)/);
  assert.match(renderer, /renderedBoardSnapshot = copyBoard\(nextBoard\)/);
});

test('bot scheduling and HUD updates are independent from board render failures', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'game', 'app.js'), 'utf8');
  const commitStart = app.indexOf('function commitLocal(mv)');
  const commitEnd = app.indexOf('function undoBotMove()', commitStart);
  const commit = app.slice(commitStart, commitEnd);
  assert.ok(commit.indexOf('botAfterMove(prevState.turn)') < commit.indexOf('renderAll(true)'));

  const renderStart = app.indexOf('function renderAll(animate)');
  const renderEnd = app.indexOf('function renderBoard(animate)', renderStart);
  const renderAll = app.slice(renderStart, renderEnd);
  assert.match(renderAll, /try \{\s*renderBoard\(!!animate\)/);
  assert.match(renderAll, /catch \(error\)[\s\S]*renderBoard\(false\)/);
  assert.ok(renderAll.indexOf('renderHUD()') > renderAll.indexOf('catch (error)'));
});

test('switching board renderers restarts an in-flight bot turn', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'game', 'app.js'), 'utf8');
  const start = app.indexOf('function resumeBotTurnAfterBoardSwitch');
  const end = app.indexOf('function scheduleBotMove', start);
  assert.ok(start >= 0 && end > start, 'bot resume helper exists');
  const resume = app.slice(start, end);

  assert.match(resume, /app\.mode !== 'bot'/);
  assert.match(resume, /app\.game\.state\.turn !== app\.bot\.color/);
  assert.match(resume, /cancelBotThinking\(\)/);
  assert.match(resume, /stopBotWorker\(/);
  assert.match(resume, /scheduleBotMove\(\)/);

  assert.match(app, /activateBoard\('2d'\);\s*resumeBotTurnAfterBoardSwitch\(\)/);
  assert.match(app, /activateBoard\('3d'\);\s*resumeBotTurnAfterBoardSwitch\(\)/);
});

test('bot workers are isolated per move and always terminate after a response', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'game', 'app.js'), 'utf8');
  const start = app.indexOf('function ensureBotWorker()');
  const end = app.indexOf('function requestBotMove', start);
  const workerFactory = app.slice(start, end);
  assert.match(workerFactory, /new Worker\(new URL\('legacy\/game\/bot-worker\.js', document\.baseURI\)\.href\)/);
  assert.doesNotMatch(workerFactory, /if \(botWorker\) return botWorker/);
  assert.match(workerFactory, /worker\.onmessage = function/);
  assert.match(workerFactory, /worker\.terminate\(\)/);
  assert.match(workerFactory, /worker\.onerror = function/);
  assert.match(workerFactory, /worker\.onmessageerror = function/);
  assert.match(app, /function stopBotWorker\(error\)/);
});

test('2D bot turns bypass workers and use a bounded local calculation', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'game', 'app.js'), 'utf8');
  const start = app.indexOf('function scheduleBotMove');
  const end = app.indexOf('function botAfterMove', start);
  const scheduler = app.slice(start, end);
  assert.match(scheduler, /forceMainThread \|\| activeBoardMode === '2d'/);
  assert.match(scheduler, /timeMs: Math\.min\(budget, 900\)/);
  assert.match(scheduler, /return requestBotMove\(state, options\)/);
});

test('stalled bot searches restart without requiring a board-mode change', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'game', 'app.js'), 'utf8');
  assert.match(app, /watchdogTimer: null/);
  assert.match(app, /Math\.max\(6500, budget \+ 5500\)/);
  assert.match(app, /forceMainThread \|\| activeBoardMode === '2d'/);
  assert.match(app, /scheduleBotMove\(true\)/);
  assert.match(app, /stopBotWorker\(new Error\('Busca do bot cancelada\.'\)\)/);

  const commitStart = app.indexOf('function commitLocal(mv)');
  const commitEnd = app.indexOf('function undoBotMove()', commitStart);
  const commit = app.slice(commitStart, commitEnd);
  assert.ok(commit.indexOf('botAfterMove(prevState.turn)') < commit.indexOf('announceMove('));
});

test('bot worker failures and timeouts release the worker and scheduler', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'game', 'app.js'), 'utf8');
  assert.match(app, /worker\.onmessageerror/);
  assert.match(app, /worker\.terminate\(\)/);
  assert.match(app, /budget \+ 3500/);
  assert.match(app, /return requestBotMove\(state, options\)/);
  assert.match(app, /if \(forceMainThread \|\| activeBoardMode === '2d'\)[\s\S]*Bot\.chooseMove/);
  assert.match(app, /app\.bot\.thinking = false;\s*commitLocal\(move\)/);
});

test('site layout applies the body design system class and cleans it up', () => {
  const layout = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'layout', 'SiteLayout.jsx'), 'utf8');
  assert.match(layout, /document\.body\.classList\.add\("site-body"\)/);
  assert.match(layout, /return \(\) => document\.body\.classList\.remove\("site-body"\)/);
});


test('game waits for its stylesheet before mounting the lobby markup', () => {
  const runtime = fs.readFileSync(path.join(__dirname, '..', 'src', 'features', 'game', 'components', 'GameRuntime.jsx'), 'utf8');
  assert.match(runtime, /const \[stylesReady, setStylesReady\] = useState\(false\)/);
  assert.match(runtime, /import\("\.\.\/\.\.\/\.\.\/styles\/game\.css"\)/);
  assert.match(runtime, /if \(!stylesReady\) return <GameLoadingScreen error=\{error\} \/>;/);
  assert.match(runtime, /if \(!stylesReady \|\| error\) return undefined;/);
  assert.match(runtime, /loadLegacyScripts\(GAME_SCRIPTS\)/);
  assert.match(runtime, /onAuthStateChanged\(auth/);
  assert.match(runtime, /getDoc\(doc\(db, "users", user\.uid\)\)/);
  assert.match(runtime, /cacheAccountIdentity\(user\.uid, snapshot\.data\(\)\.username\)/);
  assert.match(runtime, /xadrez3d\.settings\.v3/);
  assert.match(runtime, /3dxess\.account\.session\.v1/);
  assert.ok(
    runtime.indexOf('import("../../../styles/game.css")') <
      runtime.indexOf("loadLegacyScripts(GAME_SCRIPTS)"),
    "game stylesheet must load before legacy scripts",
  );
});


test('Firebase accounts use email/password, native password reset and public player names', () => {
  const account = fs.readFileSync(path.join(__dirname, '..', 'src', 'features', 'account', 'AccountPage.jsx'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'App.jsx'), 'utf8');
  assert.match(app, /account: "AccountPage"/);
  for (const required of [
    'createUserWithEmailAndPassword',
    'signInWithEmailAndPassword',
    'sendPasswordResetEmail',
    'setDoc',
    'updateDoc',
    'serverTimestamp',
    'syncGameNickname',
    'xadrez3d.settings.v3',
    'creatingProfileRef',
    'permission-denied',
    'orderBy("rating"',
  ]) assert.ok(account.includes(required), 'account integration missing ' + required);
  assert.doesNotMatch(account, /signInWithCustomToken|callAccountApi|totp|QRCode/);
  assert.match(account, /type="email"/);
  for (const [locale, pages] of Object.entries(locales)) {
    assert.ok(pages.account, locale + ' account route missing');
    assert.ok(pageMeta[locale].account?.title, locale + ' account SEO metadata missing');
  }
});

test('Firestore rules allow safe self-created profiles but protect progression fields', () => {
  const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
  assert.match(rules, /match \/users\/\{uid\}/);
  assert.match(rules, /allow create: if request\.auth != null/);
  assert.match(rules, /request\.resource\.data\.rating == 1000/);
  assert.match(rules, /request\.resource\.data\.xp == 0/);
  assert.match(rules, /affectedKeys\(\)[\s\S]*hasOnly\(\['username', 'avatarUrl', 'bio', 'updatedAt'\]\)/);
  assert.match(rules, /match \/\{document=\*\*\} \{ allow read, write: if false; \}/);
  const firebaseClient = fs.readFileSync(path.join(__dirname, '..', 'src', 'shared', 'firebase', 'client.js'), 'utf8');
  assert.match(firebaseClient, /VITE_FIREBASE_API_KEY/);
  assert.doesNotMatch(firebaseClient, /accountApiUrl|private_key|service_account/i);
});

test('Firebase account pages do not depend on a separate backend', () => {
  const account = fs.readFileSync(path.join(__dirname, '..', 'src', 'features', 'account', 'AccountPage.jsx'), 'utf8');
  const workflow = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'pages.yml'), 'utf8');
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  assert.doesNotMatch(account, /fetch\(|https?:\/\//);
  assert.doesNotMatch(workflow, /VITE_ACCOUNT_API_URL/);
  assert.doesNotMatch(packageJson.scripts.check, /cloudflare\/worker/);
});

test('game lobby reads the exact account nickname key and distinguishes guest players', () => {
  const account = fs.readFileSync(path.join(__dirname, '..', 'src', 'features', 'account', 'AccountPage.jsx'), 'utf8');
  const game = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'game', 'app.js'), 'utf8');
  assert.match(account, /xadrez3d\.settings\.v3/);
  assert.match(account, /3dxess\.account\.session\.v1/);
  assert.match(game, /const SETTINGS_KEY = 'xadrez3d\.settings\.v3'/);
  assert.match(game, /const ACCOUNT_SESSION_KEY = '3dxess\.account\.session\.v1'/);
  assert.match(game, /function accountIdentity\(\)/);
  assert.match(game, /function isGuestPlayer\(\)/);
  assert.match(game, /function displayPlayerName\(player\)/);
  assert.match(game, /isGuest: isGuestPlayer\(\)/);
  assert.match(game, /isGuest: !data \|\| data\.isGuest !== false/);
  assert.match(game, /displayPlayerName\(p\)/);
  assert.match(game, /displayPlayerName\(room\.spectators\[id\]\)/);
});
