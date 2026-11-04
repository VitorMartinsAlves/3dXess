/* ============================================================
   Xadrez 3D Online — 100% navegador, P2P via WebRTC (Trystero)
   Sem servidor, sem banco de dados, sem conta.
   ============================================================ */
(function () {
  'use strict';

  const C = window.Chess;
  const B = window.Board3D;
  const $ = function (id) { return document.getElementById(id); };

  const APP_ID = 'xadrez3d-online-v1-2026';
  const LOBBY_ID = 'lobby-v1';
  const PRESENCE_ID = 'presence-v1-2026';
  const PRESENCE_HEARTBEAT = 5000;
  const PRESENCE_TTL = 15000;
  const TRYSTERO_CDN = 'https://cdn.jsdelivr.net/npm/trystero@0.26.0/+esm';
  const TRYSTERO_TIMEOUT_MS = 15000;

  // STUN/TURN: o STUN descobre o endereço público; o TURN retransmite os
  // pacotes quando o NAT/CGNAT do provedor impede a conexão direta.
  //
  // A lista usa relays públicos de melhor esforço. Dois deles aceitam
  // alocação anônima; os outros usam credenciais estáticas publicadas por
  // projetos abertos. Todos foram testados com alocação TURN real.
  // Para uso intenso, troque por um TURN próprio (coturn) ou por credenciais
  // temporárias de um provedor. O relay não vê o conteúdo: o WebRTC já é
  // criptografado ponta a ponta.
  const TURN_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    // alocação anônima (o navegador exige usuário/senha mesmo assim)
    { urls: 'turn:webrtc.free-solutions.org:3478', username: 'free', credential: 'free' },
    { urls: 'turn:ovh1.p2pd.net:4589', username: 'free', credential: 'free' },
    // credenciais públicas de projetos abertos
    {
      urls: 'turn:turn.bettercrewl.ink:3478',
      username: 'M9DRVaByiujoXeuYAAAG',
      credential: 'TpHR9HQNZ8taxjb3',
    },
    {
      urls: 'turn:turn.quickblox.com:3478',
      username: 'quickblox',
      credential: 'baccb97ba2d92d71e26eb9886da5f1e0',
    },
  ];
  const SETTINGS_KEY = 'xadrez3d.settings.v3';
  const BOT_KEY = 'xadrez3d.bot.v1';
  const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  const TIME_CONTROLS = {
    '1+0': { initial: 60, inc: 0, label: '1 min' },
    '3+0': { initial: 180, inc: 0, label: '3 min' },
    '3+2': { initial: 180, inc: 2, label: '3 min + 2s' },
    '5+0': { initial: 300, inc: 0, label: '5 min' },
    '5+3': { initial: 300, inc: 3, label: '5 min + 3s' },
    '10+0': { initial: 600, inc: 0, label: '10 min' },
    '10+5': { initial: 600, inc: 5, label: '10 min + 5s' },
    '15+10': { initial: 900, inc: 10, label: '15 min + 10s' },
    unlimited: { initial: 0, inc: 0, label: 'Sem tempo' },
  };

  /* ------------------------------------------------------------
     ESTADO DA INTERFACE / JOGO
     ------------------------------------------------------------ */
  const app = {
    mode: 'local',              // 'local' | 'online'
    roomCode: null,
    room: null,
    myColor: null,              // 'w' | 'b' | null
    myRole: 'player',           // 'player' | 'spectator'
    game: {
      state: C.createInitialState(),
      positionCounts: createPositionCounts(C.createInitialState()),
      lastMove: null,
      status: { over: false, check: false },
    },
    selected: null,
    legalForSelected: [],
    pendingPromotion: null,
    localHistory: [],
    lastRenderedVersion: -1,
    lastResultKey: '',
    lastDrawPrompt: '',
    lastChatKey: '',
    unreadChat: 0,
    lastClockBroadcast: 0,
    leaving: false,
    bot: {
      active: false,
      level: 3,
      style: 'balanced',
      color: 'b',
      name: 'Bot',
      tc: '10+0',
      thinking: false,
      clocks: null,
      increment: 0,
      running: false,
      turnStartedAt: 0,
      requestSeq: 0,
      pendingTimer: null,
    },
  };

  /* ------------------------------------------------------------
     ESTADO DA REDE P2P
     ------------------------------------------------------------ */
  const net = {
    mod: null,
    selfId: null,
    room: null,
    roomId: null,
    isHost: false,
    hostRoom: null,
    hostId: null,
    hostOffset: 0,
    actions: null,
    roomTimer: null,
    hostTicker: null,
    hostGraceTimer: null,
    waitHintTimer: null,
    waitingSince: 0,
    graceTimers: {},
    chatRate: {},
    joinSeq: 0,
    lastJoinError: '',
    lobby: null,
    lobbyActions: null,
    lobbyTimer: null,
    lobbyAds: {},
    lobbySeekers: {},
    presence: null,
    presenceActions: null,
    presenceTimer: null,
    presenceStates: {},
    presenceFailed: false,
    lastPresenceAt: 0,
    quick: {
      active: false,
      tc: '5+3',
      colorPref: 'random',
      startedAt: 0,
      claiming: false,
      timer: null,
      matchTimer: null,
      matchPeer: null,
      matchPayload: null,
    },
    pendingInvite: null,
  };

  let trysteroPromise = null;
  let confirmResolver = null;
  let loaderRetry = null;

  /* ------------------------------------------------------------
     PREFERÊNCIAS DO BOT E WORKER DE BUSCA
     ------------------------------------------------------------ */
  const DEFAULT_BOT_PREFS = {
    level: 3,
    style: 'balanced',
    color: 'random',
    tc: '10+0',
  };

  let botPrefs = Object.assign({}, DEFAULT_BOT_PREFS);
  let botWorker = null;
  let botWorkerBroken = false;
  let botWorkerSeq = 0;
  const botPending = new Map();

  function loadBotPrefs() {
    try {
      const raw = localStorage.getItem(BOT_KEY);
      if (raw) botPrefs = Object.assign({}, DEFAULT_BOT_PREFS, JSON.parse(raw));
    } catch (e) { /* ignore */ }
    botPrefs.level = Math.min(6, Math.max(1, Math.round(Number(botPrefs.level) || 3)));
    if (!window.Bot || !window.Bot.STYLES[botPrefs.style]) botPrefs.style = 'balanced';
    if (['random', 'w', 'b'].indexOf(botPrefs.color) === -1) botPrefs.color = 'random';
    if (!TIME_CONTROLS[botPrefs.tc]) botPrefs.tc = '10+0';
  }

  function saveBotPrefs() {
    try { localStorage.setItem(BOT_KEY, JSON.stringify(botPrefs)); } catch (e) { /* ignore */ }
  }

  function rejectBotPending(error) {
    botPending.forEach(function (entry) {
      window.clearTimeout(entry.timeout);
      entry.reject(error);
    });
    botPending.clear();
  }

  function ensureBotWorker() {
    if (botWorker) return botWorker;
    if (botWorkerBroken || typeof Worker === 'undefined' || location.protocol === 'file:') {
      return null;
    }

    try {
      botWorker = new Worker('bot-worker.js');
      botWorker.onmessage = function (event) {
        const data = event.data || {};
        const entry = botPending.get(data.id);
        if (!entry) return;
        botPending.delete(data.id);
        window.clearTimeout(entry.timeout);
        if (data.ok && data.uci) entry.resolve(data);
        else entry.reject(new Error(data.error || 'O bot não encontrou um lance.'));
      };
      botWorker.onerror = function () {
        botWorkerBroken = true;
        botWorker = null;
        rejectBotPending(new Error('Falha ao iniciar o worker do bot.'));
      };
    } catch (e) {
      botWorkerBroken = true;
      botWorker = null;
      return null;
    }

    return botWorker;
  }

  function requestBotMove(state, options) {
    const fen = C.stateToFen(state);
    const worker = ensureBotWorker();
    if (!worker) return Promise.resolve(window.Bot.chooseMove(state, options));

    return new Promise(function (resolve, reject) {
      const id = ++botWorkerSeq;
      const budget = Math.max(300, Number(options.timeMs) || 1000);
      const timeout = window.setTimeout(function () {
        botPending.delete(id);
        reject(new Error('Tempo esgotado no bot.'));
      }, budget + 6000);

      botPending.set(id, { resolve: resolve, reject: reject, timeout: timeout });
      try {
        worker.postMessage({ type: 'move', id: id, fen: fen, options: options });
      } catch (e) {
        window.clearTimeout(timeout);
        botPending.delete(id);
        reject(e);
      }
    });
  }

  function uciToMove(st, uci) {
    if (!uci || uci.length < 4) return null;
    const from = { r: Number(uci[1]) - 1, f: C.FILES.indexOf(uci[0]) };
    const to = { r: Number(uci[3]) - 1, f: C.FILES.indexOf(uci[2]) };
    if (from.r < 0 || from.r > 7 || from.f < 0 || from.f > 7) return null;
    if (to.r < 0 || to.r > 7 || to.f < 0 || to.f > 7) return null;
    return C.findLegalMove(st, from, to, uci[4] || null);
  }

  function hostNow() {
    return Date.now() - net.hostOffset;
  }

  /* ------------------------------------------------------------
     CONFIGURAÇÕES
     ------------------------------------------------------------ */
  const DEFAULT_SETTINGS = {
    nickname: '',
    theme: 'classic',
    skin: 'classic',
    effects: true,
    sound: true,
    autoFocus: true,
    showPresence: true,
  };

  let settings = Object.assign({}, DEFAULT_SETTINGS);

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) settings = Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw));
    } catch (e) { /* ignore */ }
    if (!settings.nickname) {
      settings.nickname = 'Jogador' + Math.floor(100 + Math.random() * 900);
      saveSettings();
    }
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
  }

  function applyVisualSettings() {
    if (boardReady) {
      B.setTheme(settings.theme);
      B.setSkin(settings.skin);
    }
    B.setEffects(settings.effects);
  }

  function myName() {
    return (settings.nickname || 'Jogador').slice(0, 20);
  }

  function cleanName(value) {
    return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 20) || 'Jogador';
  }

  function createPositionCounts(state) {
    const counts = {};
    counts[C.positionKey(state)] = 1;
    return counts;
  }

  /* ------------------------------------------------------------
     UTILITÁRIOS
     ------------------------------------------------------------ */
  function randomCode() {
    const bytes = new Uint8Array(5);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    let out = '';
    for (let i = 0; i < 5; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    return out;
  }

  function normalizeCode(value) {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  }

  function isMobile() {
    return window.matchMedia('(max-width: 720px)').matches;
  }

  function isCompactLandscape() {
    return window.matchMedia('(orientation: landscape) and (max-height: 540px)').matches;
  }

  function setPanelCollapsed(collapsed) {
    const panel = $('panel');
    if (!panel) return;
    const on = !!collapsed && isMobile() && !isCompactLandscape();
    panel.classList.toggle('collapsed', on);
    document.body.classList.toggle('panel-collapsed', on);

    const button = $('panel-toggle');
    if (button) {
      const label = on ? 'Expandir painel' : 'Recolher painel';
      button.title = label;
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-expanded', on ? 'false' : 'true');
    }
  }

  function tcInfo(label) {
    return TIME_CONTROLS[label] || TIME_CONTROLS['5+3'];
  }

  function formatClock(ms) {
    if (ms === null || ms === undefined) return '∞';
    const total = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    return m + ':' + String(s).padStart(2, '0');
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function resultText(reason, winner) {
    const side = winner === 'w' ? 'das brancas' : winner === 'b' ? 'das pretas' : null;
    switch (reason) {
      case 'checkmate': return 'Xeque-mate! Vitória ' + (side || '') + '.';
      case 'resign': return 'Vitória ' + (side || '') + ' por desistência.';
      case 'timeout': return 'Vitória ' + (side || '') + ' por tempo esgotado.';
      case 'abandonment': return 'Vitória ' + (side || '') + ' por abandono.';
      case 'stalemate': return 'Empate por afogamento: o rei não tem lances legais.';
      case 'insufficient': return 'Empate por material insuficiente.';
      case 'fifty': return 'Empate reivindicado pela regra dos 50 lances.';
      case 'threefold': return 'Empate reivindicado por repetição tripla.';
      case 'seventyfive': return 'Empate automático pela regra dos 75 lances.';
      case 'fivefold': return 'Empate automático por repetição quíntupla.';
      case 'agreement': return 'Empate por acordo entre os jogadores.';
      default: return 'Fim de jogo.';
    }
  }

  function statusLabel(status) {
    if (status.over) {
      if (status.type === 'checkmate') {
        return 'Xeque-mate! As ' + (status.winner === 'w' ? 'brancas' : 'pretas') + ' venceram.';
      }
      if (status.type === 'stalemate') return 'Empate por afogamento.';
      if (status.type === 'insufficient') return 'Empate por material insuficiente.';
      if (status.type === 'fifty') return 'Empate reivindicado pela regra dos 50 lances.';
      if (status.type === 'threefold') return 'Empate reivindicado por repetição tripla.';
      if (status.type === 'seventyfive') return 'Empate automático pela regra dos 75 lances.';
      if (status.type === 'fivefold') return 'Empate automático por repetição quíntupla.';
      return 'Fim de jogo.';
    }
    if (status.canClaimThreefold) return 'Empate reivindicável por repetição tripla.';
    if (status.canClaimFiftyMove) return 'Empate reivindicável pela regra dos 50 lances.';
    if (status.check) return 'Xeque! Proteja o rei.';
    return 'Selecione uma peça para jogar.';
  }

  /* ------------------------------------------------------------
     TOASTS / LOADER / CONFIRMAÇÃO
     ------------------------------------------------------------ */
  function toast(message, type, ms) {
    const box = $('toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = message;
    box.appendChild(el);
    window.setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-6px)';
      window.setTimeout(function () { el.remove(); }, 220);
    }, ms || 3200);
  }

  function resetLoaderUi() {
    const loader = $('loader');
    if (!loader) return;
    const card = loader.querySelector('.loader-card');
    if (card) card.classList.remove('error');
    const hint = $('loader-hint');
    if (hint) {
      hint.textContent = '';
      hint.classList.add('hidden');
    }
    const extra = $('loader-extra');
    if (extra) extra.classList.add('hidden');
    loaderRetry = null;
  }

  function showLoader(text) {
    $('loader-text').textContent = text || 'Conectando…';
    resetLoaderUi();
    $('loader').classList.remove('hidden');
  }

  function hideLoader() {
    const loader = $('loader');
    if (loader) loader.classList.add('hidden');
    resetLoaderUi();
  }

  function showConnectError(title, hint, retry) {
    const loader = $('loader');
    if (!loader) return;
    $('loader-text').textContent = title || 'Não foi possível conectar';
    const card = loader.querySelector('.loader-card');
    if (card) card.classList.add('error');
    const hintEl = $('loader-hint');
    if (hintEl) {
      hintEl.textContent = hint || '';
      hintEl.classList.toggle('hidden', !hint);
    }
    const extra = $('loader-extra');
    if (extra) extra.classList.remove('hidden');
    const retryBtn = $('loader-retry');
    if (retryBtn) retryBtn.classList.toggle('hidden', !retry);
    loaderRetry = retry || null;
    loader.classList.remove('hidden');
  }

  function confirmDialog(title, text, yesLabel) {
    return new Promise(function (resolve) {
      confirmResolver = resolve;
      $('confirm-title').textContent = title;
      $('confirm-text').textContent = text;
      $('confirm-yes').textContent = yesLabel || 'Confirmar';
      $('confirm').classList.remove('hidden');
    });
  }

  function closeConfirm(value) {
    $('confirm').classList.add('hidden');
    if (confirmResolver) {
      const resolve = confirmResolver;
      confirmResolver = null;
      resolve(value);
    }
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        resolve();
      } catch (e) {
        reject(e);
      } finally {
        ta.remove();
      }
    });
  }

  function inviteLink() {
    if (!net.roomId && !app.roomCode) return location.href;
    return location.origin + location.pathname + '?room=' + (net.roomId || app.roomCode);
  }

  function setNetStatus(kind, text, title) {
    const el = $('net-status');
    if (!el) return;
    el.className = 'fb-status ' + kind;
    el.textContent = text;
    el.title = title || text;
  }

  /* ------------------------------------------------------------
     SOM
     ------------------------------------------------------------ */
  let audioCtx = null;

  function audio() {
    if (!settings.sound) return null;
    try {
      if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        audioCtx = new Ctx();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    } catch (e) { return null; }
  }

  function tone(freq, duration, type, volume, delay) {
    const ctx = audio();
    if (!ctx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume || 0.05, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  const Sound = {
    move: function () { tone(430, 0.07, 'triangle', 0.045); },
    capture: function () { tone(190, 0.12, 'sawtooth', 0.05); tone(90, 0.16, 'sine', 0.04, 0.02); },
    castle: function () { tone(330, 0.07, 'triangle', 0.04); tone(440, 0.09, 'triangle', 0.04, 0.07); },
    check: function () { tone(720, 0.1, 'square', 0.035); tone(900, 0.12, 'square', 0.03, 0.1); },
    end: function () { tone(520, 0.16, 'sine', 0.05); tone(390, 0.2, 'sine', 0.05, 0.16); tone(260, 0.3, 'sine', 0.05, 0.34); },
    start: function () { tone(392, 0.1, 'sine', 0.04); tone(523, 0.12, 'sine', 0.04, 0.1); },
    error: function () { tone(150, 0.12, 'square', 0.04); },
    chat: function () { tone(880, 0.05, 'sine', 0.03); },
  };

  /* ------------------------------------------------------------
     P2P — CARREGAMENTO DO TRYSTERO
     ------------------------------------------------------------ */
  function importTrystero() {
    // Preferência: pacote servido pelo próprio site (não depende de CDN).
    let local = 'vendor/trystero/trystero.js';
    try { local = new URL(local, document.baseURI).href; } catch (e) { /* ignore */ }
    return import(local).catch(function (err) {
      console.warn('Trystero local indisponível, tentando CDN:', err);
      return import(TRYSTERO_CDN);
    });
  }

  function loadTrystero() {
    if (net.mod) return Promise.resolve(net.mod);
    if (trysteroPromise) return trysteroPromise;

    setNetStatus('', 'carregando P2P…');

    let timeoutId = null;
    const timeout = new Promise(function (_, reject) {
      timeoutId = window.setTimeout(function () {
        reject(new Error('Tempo esgotado ao carregar a biblioteca P2P.'));
      }, TRYSTERO_TIMEOUT_MS);
    });

    trysteroPromise = Promise.race([importTrystero(), timeout]).then(function (mod) {
      window.clearTimeout(timeoutId);
      net.mod = mod;
      net.selfId = mod.selfId;
      setNetStatus('ok', 'P2P pronto', 'WebRTC carregado. A conexão é direta entre os navegadores.');
      const uidEl = $('uid-label');
      if (uidEl) uidEl.textContent = 'Peer ' + String(net.selfId).slice(0, 6) + '…';
      return mod;
    }).catch(function (err) {
      window.clearTimeout(timeoutId);
      trysteroPromise = null;
      setNetStatus('off', 'P2P indisponível', 'Não foi possível carregar a biblioteca P2P. Verifique a internet.');
      console.error('Trystero:', err);
      throw err;
    });
    return trysteroPromise;
  }

  function trysteroConfig() {
    return {
      appId: APP_ID,
      relayConfig: { warnOnRelayFailure: false },
      turnConfig: TURN_SERVERS,
    };
  }

  /* ------------------------------------------------------------
     P2P — MODELO DA SALA (memória do anfitrião)
     ------------------------------------------------------------ */
  function moveRecord(mv) {
    return {
      from: { r: mv.from.r, f: mv.from.f },
      to: { r: mv.to.r, f: mv.to.f },
      promotion: mv.promotion || null,
      castle: mv.castle || null,
      enPassant: !!mv.enPassant,
    };
  }

  function makeRoom(opts, hostColor, guest) {
    const now = Date.now();
    const info = tcInfo(opts.tc);
    const initial = info.initial * 1000;
    const increment = info.inc * 1000;
    const room = {
      rev: 1,
      meta: {
        name: opts.name || ('Sala de ' + myName()),
        public: !!opts.public,
        tc: opts.tc,
        initial: initial,
        increment: increment,
        createdAt: now,
        createdBy: net.selfId,
        status: guest ? 'playing' : 'waiting',
      },
      players: {},
      spectators: {},
      game: {
        fen: C.stateToFen(C.createInitialState()),
        lastMove: null,
        clocks: { w: initial, b: initial },
        turnStartedAt: now,
        running: !!(guest && initial > 0),
        version: 1,
      },
      moves: {},
      chat: {},
      result: null,
      drawOffer: null,
      rematch: {},
      chatSeq: 0,
      moveSeq: 0,
    };

    room.players[hostColor] = {
      id: net.selfId,
      name: myName(),
      connected: true,
    };

    if (guest) {
      room.players[C.opponent(hostColor)] = {
        id: guest.id,
        name: guest.name || 'Jogador',
        connected: true,
      };
    }

    return room;
  }

  function findColorByPeer(room, peerId) {
    if (!room || !room.players) return null;
    for (const color of ['w', 'b']) {
      const p = room.players[color];
      if (p && p.id === peerId) return color;
    }
    return null;
  }

  function hostStartGame(room) {
    const initial = Number(room.meta.initial) || 0;
    const initialState = C.createInitialState();
    room.meta.status = 'playing';
    room.game = {
      fen: C.stateToFen(initialState),
      positionCounts: createPositionCounts(initialState),
      lastMove: null,
      clocks: { w: initial, b: initial },
      turnStartedAt: Date.now(),
      running: initial > 0,
      version: (Number(room.game && room.game.version) || 0) + 1,
    };
    room.moves = {};
    room.moveSeq = 0;
    room.result = null;
    room.drawOffer = null;
    room.rematch = {};
  }

  function hostFinish(room, winner, reason) {
    room.meta.status = 'finished';
    room.result = {
      winner: winner || null,
      reason: reason,
      at: Date.now(),
    };
    if (room.game) room.game.running = false;
    room.rematch = {};
    room.drawOffer = null;
    if (room.meta && room.meta.public) advertiseRoom(true);
  }

  function hostCommit(room) {
    room.rev = (Number(room.rev) || 0) + 1;
    broadcastState();
    applyRoom(room, true);
  }

  /* ------------------------------------------------------------
     P2P — ENTRAR / SAIR DA SALA
     ------------------------------------------------------------ */
  function joinPrivateRoom(code, isHost) {
    return loadTrystero().then(function (mod) {
      leavePrivateRoom(true);
      net.roomId = code;
      net.isHost = isHost;
      const joinSeq = net.joinSeq;

      const room = mod.joinRoom(trysteroConfig(), 'room-' + code, {
        onJoinError: function (info) {
          const detail = info && info.error ? String(info.error) : 'Falha ao abrir a conexão WebRTC.';
          net.lastJoinError = detail;
          console.warn('WebRTC:', detail);
          if (net.isHost) return;
          const seq = joinSeq;
          const roomCode = code;
          window.setTimeout(function () {
            if (seq !== net.joinSeq || app.room || net.isHost) return;
            guestConnectFailed(seq, roomCode, detail);
          }, 700);
        },
      });
      net.room = room;

      const actions = {
        state: room.makeAction('state'),
        intent: room.makeAction('intent'),
        hello: room.makeAction('hello'),
        notice: room.makeAction('notice'),
        bye: room.makeAction('bye'),
      };
      net.actions = actions;

      actions.state.onMessage = function (data, ctx) {
        if (net.isHost || !data || !data.room) return;
        if (!net.hostId) net.hostId = ctx.peerId;
        if (net.hostId && ctx.peerId !== net.hostId) return;
        applyRemoteRoom(data.room, data.sentAt, ctx.peerId);
      };

      actions.intent.onMessage = function (data, ctx) {
        if (net.isHost) handleIntent(ctx.peerId, data);
      };

      actions.hello.onMessage = function (data, ctx) {
        if (net.isHost) handleHello(ctx.peerId, data);
      };

      actions.notice.onMessage = function (data) {
        if (net.isHost || !data) return;
        if (data.type === 'move-rejected') {
          toast(data.message || 'O anfitrião recusou o lance.', 'error');
          Sound.error();
          app.lastRenderedVersion = -1;
          if (app.room) applyRoom(app.room, false);
        } else if (data.type === 'info') {
          toast(data.message || '');
        }
      };

      actions.bye.onMessage = function (data) {
        if (net.isHost) return;
        if (data && data.reason === 'host-left') {
          toast('O anfitrião encerrou a sala.', 'error', 5000);
          backToLobby(true);
        }
      };

      room.onPeerJoin = function (peerId) {
        if (net.isHost) {
          if (net.quick.matchPeer && peerId === net.quick.matchPeer) {
            stopMatchRetry();
            net.quick.matchPeer = null;
            net.quick.matchPayload = null;
            leaveLobby();
          }
          sendStateTo(peerId);
          window.setTimeout(function () {
            if (net.isHost) sendStateTo(peerId);
          }, 300);
        } else {
          actions.hello.send({ name: myName() }, { target: peerId }).catch(function () { /* ignore */ });
        }
      };

      room.onPeerLeave = function (peerId) {
        if (net.isHost) {
          handlePeerDisconnect(peerId);
        } else if (peerId === net.hostId && !net.hostGraceTimer) {
          toast('Conexão com o anfitrião perdida. Tentando reconectar…', 'error', 4000);
          showLoader('Reconectando ao anfitrião…');
          net.hostGraceTimer = window.setTimeout(function () {
            net.hostGraceTimer = null;
            if (!net.room) return;
            hideLoader();
            toast('Não foi possível reconectar ao anfitrião.', 'error', 5000);
            backToLobby(true);
          }, 10000);
        }
      };

      return room;
    });
  }

  function leavePrivateRoom(silent) {
    if (net.room) {
      try { net.room.leave(); } catch (e) { /* ignore */ }
    }
    stopHostTicker();
    stopMatchRetry();
    if (net.waitHintTimer) {
      window.clearTimeout(net.waitHintTimer);
      net.waitHintTimer = null;
    }
    net.quick.matchPeer = null;
    net.quick.matchPayload = null;
    Object.keys(net.graceTimers).forEach(function (key) {
      window.clearTimeout(net.graceTimers[key]);
    });
    net.graceTimers = {};
    net.chatRate = {};
    if (net.roomTimer) {
      window.clearTimeout(net.roomTimer);
      net.roomTimer = null;
    }
    if (net.hostGraceTimer) {
      window.clearTimeout(net.hostGraceTimer);
      net.hostGraceTimer = null;
    }
    net.room = null;
    net.actions = null;
    net.roomId = null;
    app.roomCode = null;
    net.hostId = null;
    net.hostRoom = null;
    net.isHost = false;
    net.hostOffset = 0;
    if (!silent) app.room = null;
  }

  function sendStateTo(peerId) {
    if (!net.isHost || !net.hostRoom || !net.actions) return;
    const payload = { room: net.hostRoom, sentAt: Date.now() };
    const options = peerId ? { target: peerId } : undefined;
    net.actions.state.send(payload, options).catch(function () { /* ignore */ });
  }

  function broadcastState() {
    sendStateTo(null);
  }

  function applyRemoteRoom(room, sentAt, fromPeer) {
    if (!room || !room.meta) return;
    if (app.room && Number(room.rev) < Number(app.room.rev)) return;

    net.hostOffset = Math.max(0, Date.now() - (Number(sentAt) || Date.now()));
    net.hostId = fromPeer || net.hostId;

    if (net.roomTimer) {
      window.clearTimeout(net.roomTimer);
      net.roomTimer = null;
    }
    if (net.hostGraceTimer) {
      window.clearTimeout(net.hostGraceTimer);
      net.hostGraceTimer = null;
    }
    hideLoader();
    applyRoom(room, true);
  }

  function sendHelloToAll() {
    if (!net.actions || !net.room) return;
    const peers = net.room.getPeers();
    const ids = Object.keys(peers);
    for (let i = 0; i < ids.length; i++) {
      net.actions.hello.send({ name: myName() }, { target: ids[i] }).catch(function () { /* ignore */ });
    }
  }

  function sendIntent(payload) {
    if (!net.actions) return;
    const options = net.hostId ? { target: net.hostId } : undefined;
    net.actions.intent.send(payload, options).catch(function () {
      toast('Falha ao enviar a ação. Verifique a conexão.', 'error');
    });
  }

  /* ------------------------------------------------------------
     P2P — LADO DO ANFITRIÃO
     ------------------------------------------------------------ */
  function handleHello(peerId, data) {
    if (!net.isHost || !net.hostRoom) return;
    const room = net.hostRoom;
    const name = cleanName(data && data.name);
    let color = findColorByPeer(room, peerId);

    if (color) {
      room.players[color].name = name;
      room.players[color].connected = true;
      if (net.graceTimers[peerId]) {
        window.clearTimeout(net.graceTimers[peerId]);
        delete net.graceTimers[peerId];
      }
    } else if (room.spectators[peerId]) {
      room.spectators[peerId].name = name;
      room.spectators[peerId].connected = true;
    } else {
      const free = ['w', 'b'].find(function (c) { return !room.players[c]; });
      if (free) {
        room.players[free] = { id: peerId, name: name, connected: true };
        if (room.players.w && room.players.b && room.meta.status === 'waiting') {
          hostStartGame(room);
        }
      } else {
        room.spectators[peerId] = { name: name, connected: true };
      }
    }

    hostCommit(room);
  }

  function handlePeerDisconnect(peerId) {
    if (!net.isHost || !net.hostRoom) return;
    const room = net.hostRoom;
    const color = findColorByPeer(room, peerId);

    delete net.chatRate[peerId];

    if (color) {
      room.players[color].connected = false;
      hostCommit(room);

      if (net.graceTimers[peerId]) window.clearTimeout(net.graceTimers[peerId]);
      net.graceTimers[peerId] = window.setTimeout(function () {
        delete net.graceTimers[peerId];
        if (!net.isHost || !net.hostRoom) return;
        const current = net.hostRoom;
        const c = findColorByPeer(current, peerId);
        if (!c) return;
        if (current.players[c] && current.players[c].connected === false) {
          if (current.meta.status === 'playing') {
            hostFinish(current, C.opponent(c), 'abandonment');
          }
          delete current.players[c];
          hostCommit(current);
        }
      }, 10000);
    } else if (room.spectators[peerId]) {
      delete room.spectators[peerId];
      hostCommit(room);
    }
  }

  function handleIntent(peerId, intent) {
    if (!net.isHost || !net.hostRoom || !intent || !intent.type) return;
    const room = net.hostRoom;
    const color = findColorByPeer(room, peerId);

    switch (intent.type) {
      case 'move':
        if (color) hostApplyMove(room, color, intent);
        break;

      case 'chat':
        hostChat(room, peerId, intent.text, color);
        break;

      case 'resign':
        if (color && room.meta.status === 'playing') {
          hostFinish(room, C.opponent(color), 'resign');
          hostCommit(room);
        }
        break;

      case 'draw':
        if (color) {
          hostDraw(room, color, intent.action);
        }
        break;

      case 'rematch':
        if (color) hostRematch(room, color);
        break;

      case 'leave':
        handlePeerDisconnect(peerId);
        break;

      default:
        break;
    }
  }

  function hostApplyMove(room, color, intent) {
    if (!room || !room.game || room.meta.status !== 'playing') return;
    if (!intent.from || !intent.to) return;

    const st = C.fenToState(room.game.fen);
    room.game.positionCounts = room.game.positionCounts || createPositionCounts(st);
    if (st.turn !== color) {
      sendNotice(room, color, 'Não é a sua vez.');
      return;
    }

    const from = { r: Number(intent.from.r), f: Number(intent.from.f) };
    const to = { r: Number(intent.to.r), f: Number(intent.to.f) };
    const promotion = intent.promotion || null;

    if (![from.r, from.f, to.r, to.f].every(function (n) { return n >= 0 && n < 8; })) {
      sendNotice(room, color, 'Lance inválido.');
      return;
    }

    const found = C.findLegalMove(st, from, to, promotion);
    if (!found) {
      sendNotice(room, color, 'Lance ilegal.');
      return;
    }

    const now = Date.now();
    const meta = room.meta;
    const clocks = room.game.clocks || { w: 0, b: 0 };
    const running = !!room.game.running && Number(meta.initial) > 0;
    let remaining = typeof clocks[color] === 'number' ? clocks[color] : Number(meta.initial) || 0;

    if (running) {
      remaining = remaining - (now - (Number(room.game.turnStartedAt) || now));
      if (remaining <= 0) {
        clocks[color] = 0;
        room.game.clocks = clocks;
        hostFinish(room, C.opponent(color), 'timeout');
        hostCommit(room);
        return;
      }
      remaining += Number(meta.increment) || 0;
    }

    const san = C.moveNotation(st, found);
    C.applyMove(st, found);
    const position = C.positionKey(st);
    room.game.positionCounts[position] = (Number(room.game.positionCounts[position]) || 0) + 1;
    const status = C.computeStatus(st, room.game.positionCounts);
    const suffix = status.type === 'checkmate' ? '#' : status.check ? '+' : '';

    room.game.fen = C.stateToFen(st);
    room.game.lastMove = moveRecord(found);
    if (running) clocks[color] = Math.max(0, remaining);
    room.game.clocks = clocks;
    room.game.turnStartedAt = now;
    room.game.version = (Number(room.game.version) || 0) + 1;
    room.game.running = running;

    room.moveSeq = (Number(room.moveSeq) || 0) + 1;
    const moveId = 'm' + String(room.moveSeq).padStart(5, '0');
    room.moves = room.moves || {};
    room.moves[moveId] = {
      san: san + suffix,
      from: found.from,
      to: found.to,
      promotion: found.promotion || null,
      at: now,
    };
    trimMoves(room);
    room.drawOffer = null;

    if (status.over) {
      hostFinish(room, status.winner || null, status.type);
    }

    hostCommit(room);
  }

  function sendNotice(room, color, message) {
    if (!net.actions) return;
    const player = room.players[color];
    if (!player || !player.id) return;
    net.actions.notice.send({ type: 'move-rejected', message: message }, { target: player.id })
      .catch(function () { /* ignore */ });
  }

  function trimMoves(room) {
    const keys = Object.keys(room.moves || {}).sort();
    while (keys.length > 400) {
      delete room.moves[keys.shift()];
    }
  }

  function allowChatMessage(peerId) {
    const now = Date.now();
    const recent = (net.chatRate[peerId] || []).filter(function (timestamp) {
      return now - timestamp < 10000;
    });

    // Até cinco mensagens por dez segundos, com intervalo mínimo de 750 ms.
    if (recent.length >= 5 || (recent.length && now - recent[recent.length - 1] < 750)) {
      net.chatRate[peerId] = recent;
      return false;
    }

    recent.push(now);
    net.chatRate[peerId] = recent;
    return true;
  }

  function hostChat(room, peerId, text, color) {
    const player = color ? room.players[color] : null;
    const isRegisteredPlayer = !!(player && player.id === peerId);
    const spectator = room.spectators && room.spectators[peerId];

    // Somente jogadores e espectadores cadastrados pelo anfitrião podem publicar.
    if (!isRegisteredPlayer && !spectator) return;
    if (typeof text !== 'string' || !allowChatMessage(peerId)) return;

    const clean = text.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 300);
    if (!clean) return;

    const name = isRegisteredPlayer ? player.name : spectator.name;

    room.chatSeq = (Number(room.chatSeq) || 0) + 1;
    const chatId = 'c' + String(room.chatSeq).padStart(6, '0');
    room.chat = room.chat || {};
    room.chat[chatId] = {
      name: name,
      color: color || '',
      role: color ? 'player' : 'spectator',
      text: clean,
      at: Date.now(),
    };

    const keys = Object.keys(room.chat).sort();
    while (keys.length > 100) {
      delete room.chat[keys.shift()];
    }

    hostCommit(room);
  }

  function hostDraw(room, color, action) {
    if (!room || room.meta.status !== 'playing') return;

    if (action === 'claim') {
      const state = C.fenToState(room.game.fen);
      if (state.turn !== color) return;
      const status = C.computeStatus(state, room.game.positionCounts);
      const reason = status.canClaimThreefold
        ? 'threefold'
        : status.canClaimFiftyMove ? 'fifty' : null;
      if (!reason) return;
      hostFinish(room, null, reason);
      hostCommit(room);
      return;
    }

    if (action === 'offer') {
      if (room.drawOffer) return;
      room.drawOffer = { by: color, at: Date.now() };
      hostCommit(room);
      return;
    }

    if (!room.drawOffer) return;

    if (action === 'accept') {
      if (room.drawOffer.by === color) return;
      hostFinish(room, null, 'agreement');
      hostCommit(room);
      return;
    }

    if (action === 'decline' || action === 'cancel') {
      if (action === 'cancel' && room.drawOffer.by !== color) return;
      if (action === 'decline' && room.drawOffer.by === color) return;
      room.drawOffer = null;
      hostCommit(room);
    }
  }

  function hostRematch(room, color) {
    if (!room || room.meta.status !== 'finished') return;
    if (!room.players.w || !room.players.b) return;

    room.rematch = room.rematch || {};
    room.rematch[color] = true;

    if (room.rematch.w && room.rematch.b) {
      const w = room.players.w;
      const b = room.players.b;
      room.players = { w: b, b: w };
      hostStartGame(room);
    }

    hostCommit(room);
  }

  function startHostTicker() {
    stopHostTicker();
    net.hostTicker = window.setInterval(function () {
      if (!net.isHost || !net.hostRoom) return;
      const room = net.hostRoom;

      if (room.meta.status === 'playing' && room.game.running) {
        const st = C.fenToState(room.game.fen);
        const turn = st.turn;
        const remaining = Number(room.game.clocks[turn]) -
          (Date.now() - (Number(room.game.turnStartedAt) || Date.now()));

        if (remaining <= 0) {
          room.game.clocks[turn] = 0;
          hostFinish(room, C.opponent(turn), 'timeout');
          hostCommit(room);
        }
      }

      if (room.meta.public &&
          (room.meta.status === 'waiting' || room.meta.status === 'playing') &&
          net.lobbyActions) {
        advertiseRoom();
      }
    }, 1000);
  }

  function stopHostTicker() {
    if (net.hostTicker) {
      window.clearInterval(net.hostTicker);
      net.hostTicker = null;
    }
  }

  /* ------------------------------------------------------------
     P2P — LOBBY COMPARTILHADO (salas públicas e partida rápida)
     ------------------------------------------------------------ */
  function ensureLobby() {
    if (net.lobby) return Promise.resolve(net.lobby);

    return loadTrystero().then(function (mod) {
      if (net.lobby) return net.lobby;

      const room = mod.joinRoom(trysteroConfig(), LOBBY_ID);
      net.lobby = room;

      const actions = {
        advertise: room.makeAction('advertise'),
        seek: room.makeAction('seek'),
        unseek: room.makeAction('unseek'),
        match: room.makeAction('match'),
        who: room.makeAction('who'),
      };
      net.lobbyActions = actions;

      actions.advertise.onMessage = function (data) {
        if (!data || !data.code || data.host === net.selfId) return;
        net.lobbyAds[data.code] = data;
        renderPublicRooms();
      };

      actions.seek.onMessage = function (data, ctx) {
        handleSeek(data, ctx.peerId);
      };

      actions.unseek.onMessage = function (data, ctx) {
        delete net.lobbySeekers[ctx.peerId];
      };

      actions.match.onMessage = function (data, ctx) {
        handleIncomingMatch(data, ctx.peerId);
      };

      actions.who.onMessage = function () {
        if (net.isHost && net.hostRoom && net.hostRoom.meta.public) advertiseRoom(true);
      };

      room.onPeerJoin = function () {
        if (net.quick.active && !net.quick.claiming) sendSeek();
      };

      room.onPeerLeave = function (peerId) {
        Object.keys(net.lobbyAds).forEach(function (code) {
          if (net.lobbyAds[code].host === peerId) delete net.lobbyAds[code];
        });
        delete net.lobbySeekers[peerId];
        renderPublicRooms();
      };

      if (!net.lobbyTimer) {
        net.lobbyTimer = window.setInterval(function () {
          pruneLobby();
          renderPublicRooms();
        }, 3000);
      }

      setNetStatus('ok', 'P2P pronto', 'Conectado à rede P2P. A conexão é direta entre os navegadores.');
      renderPublicRooms();
      return room;
    }).catch(function (err) {
      net.lobby = null;
      net.lobbyActions = null;
      setNetStatus('off', 'P2P indisponível', 'Não foi possível carregar a rede P2P. Verifique a internet.');
      console.error('Lobby P2P:', err);
      throw err;
    });
  }

  function leaveLobby() {
    if (net.lobby) {
      try { net.lobby.leave(); } catch (e) { /* ignore */ }
    }
    net.lobby = null;
    net.lobbyActions = null;
    if (net.lobbyTimer) {
      window.clearInterval(net.lobbyTimer);
      net.lobbyTimer = null;
    }
  }

  function leaveLobbySoon() {
    window.setTimeout(function () {
      if (!net.room) return;
      leaveLobby();
    }, 1400);
  }

  function pruneLobby() {
    const now = Date.now();
    Object.keys(net.lobbyAds).forEach(function (code) {
      const ad = net.lobbyAds[code];
      if (!ad || now - (Number(ad.at) || 0) > 20000) delete net.lobbyAds[code];
    });
    Object.keys(net.lobbySeekers).forEach(function (peer) {
      const seek = net.lobbySeekers[peer];
      if (!seek || now - (Number(seek.at) || 0) > 12000) delete net.lobbySeekers[peer];
    });
  }

  function advertiseRoom(force) {
    if (!net.isHost || !net.hostRoom || !net.lobbyActions) return;
    const room = net.hostRoom;
    if (!room.meta.public) return;

    const now = Date.now();
    if (!force && now - (Number(net.lastAdAt) || 0) < 4000) return;
    net.lastAdAt = now;

    const players = Object.keys(room.players || {}).length;
    net.lobbyActions.advertise.send({
      code: net.roomId,
      name: room.meta.name,
      tc: room.meta.tc,
      status: room.meta.status,
      players: players,
      host: net.selfId,
      at: now,
    }).catch(function () { /* ignore */ });
  }

  function requestAds() {
    if (!net.lobbyActions) return;
    net.lobbyActions.who.send({ at: Date.now() }).catch(function () { /* ignore */ });
  }

  function renderPublicRooms() {
    const list = $('public-rooms');
    if (!list) return;

    pruneLobby();
    const ads = Object.keys(net.lobbyAds)
      .map(function (code) { return net.lobbyAds[code]; })
      .filter(function (ad) {
        return ad && ad.code && ad.host !== net.selfId &&
          (ad.status === 'waiting' || ad.status === 'playing');
      })
      .sort(function (a, b) {
        if (a.status !== b.status) return a.status === 'waiting' ? -1 : 1;
        return (Number(b.at) || 0) - (Number(a.at) || 0);
      });

    const count = $('public-count');
    if (count) {
      count.textContent = ads.length
        ? ads.length + (ads.length === 1 ? ' sala disponível' : ' salas disponíveis')
        : 'Nenhuma sala pública agora';
    }

    if (!ads.length) {
      list.innerHTML = '<div class="empty-state">As salas aparecem aqui enquanto o anfitrião estiver online.</div>';
      return;
    }

    list.innerHTML = ads.map(function (ad) {
      const info = tcInfo(ad.tc);
      const status = ad.status === 'waiting' ? 'aguardando adversário' : 'em andamento · entre para assistir';
      return '<div class="public-room">' +
        '<div>' +
          '<div class="pr-name">' + escapeHtml(ad.name || 'Sala') + '</div>' +
          '<div class="pr-meta">' + escapeHtml(info.label) + ' · ' + escapeHtml(status) +
            ' · <span class="pr-code">' + escapeHtml(ad.code) + '</span></div>' +
        '</div>' +
        '<button class="primary small" type="button" data-code="' + escapeHtml(ad.code) + '">' +
          (ad.status === 'waiting' ? 'Entrar' : 'Assistir') +
        '</button>' +
      '</div>';
    }).join('');
  }

  /* ------------------------------------------------------------
     P2P — PRESENÇA (contador de jogadores online)
     Sem servidor: cada aba entra numa sala Trystero e anuncia o
     próprio estado. A contagem é uma aproximação em tempo real.
     ------------------------------------------------------------ */
  function presenceStatus() {
    if (net.quick.active) return 'searching';
    if (app.bot.active) return 'playing';
    if (app.mode === 'online' && (net.room || net.hostRoom)) return 'playing';
    if (!$('game-ui').classList.contains('hidden')) return 'playing';
    return 'lobby';
  }

  function setLiveValue(id, value) {
    const el = $(id);
    if (!el) return;
    const next = String(value);
    if (el.textContent === next) return;
    el.textContent = next;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  function renderPresence() {
    const box = $('live-stats');
    if (!box) return;

    if (!settings.showPresence || net.presenceFailed) {
      box.classList.add('hidden');
      return;
    }
    box.classList.remove('hidden');

    if (!net.presence) {
      box.classList.add('is-connecting');
      setLiveValue('live-online', '—');
      setLiveValue('live-searching', '—');
      setLiveValue('live-playing', '—');
      return;
    }
    box.classList.remove('is-connecting');

    const now = Date.now();
    const self = presenceStatus();
    let searching = self === 'searching' ? 1 : 0;
    let playing = self === 'playing' ? 1 : 0;

    Object.keys(net.presenceStates).forEach(function (peerId) {
      const state = net.presenceStates[peerId];
      if (!state || now - (Number(state.at) || 0) > PRESENCE_TTL) return;
      if (state.s === 'searching') searching += 1;
      else if (state.s === 'playing') playing += 1;
    });

    // getPeers() é a fonte mais confiável para "online".
    const online = Object.keys(net.presence.getPeers() || {}).length + 1;

    setLiveValue('live-online', online);
    setLiveValue('live-searching', searching);
    setLiveValue('live-playing', playing);
  }

  function prunePresence() {
    const now = Date.now();
    Object.keys(net.presenceStates).forEach(function (peerId) {
      const state = net.presenceStates[peerId];
      if (!state || now - (Number(state.at) || 0) > PRESENCE_TTL) {
        delete net.presenceStates[peerId];
      }
    });
  }

  function sendPresence(force, target) {
    if (!net.presenceActions) return;
    const now = Date.now();
    if (!force && now - (Number(net.lastPresenceAt) || 0) < 2500) return;
    net.lastPresenceAt = now;
    const options = target ? { target: target } : undefined;
    net.presenceActions.state.send({ s: presenceStatus(), at: now }, options)
      .catch(function () { /* ignore */ });
  }

  function ensurePresence() {
    if (!settings.showPresence) {
      renderPresence();
      return Promise.resolve(null);
    }
    if (net.presence) {
      sendPresence(true);
      renderPresence();
      return Promise.resolve(net.presence);
    }

    net.presenceFailed = false;
    return loadTrystero().then(function (mod) {
      if (net.presence) return net.presence;

      const room = mod.joinRoom(trysteroConfig(), PRESENCE_ID);
      net.presence = room;

      const state = room.makeAction('state');
      net.presenceActions = { state: state };

      state.onMessage = function (data, ctx) {
        if (!data || !data.s) return;
        net.presenceStates[ctx.peerId] = { s: data.s, at: Date.now() };
        renderPresence();
      };

      room.onPeerJoin = function (peerId) {
        sendPresence(true, peerId);
        renderPresence();
      };

      room.onPeerLeave = function (peerId) {
        delete net.presenceStates[peerId];
        renderPresence();
      };

      if (net.presenceTimer) window.clearInterval(net.presenceTimer);
      net.presenceTimer = window.setInterval(function () {
        prunePresence();
        sendPresence(false);
        renderPresence();
      }, PRESENCE_HEARTBEAT);

      sendPresence(true);
      renderPresence();
      return room;
    }).catch(function (err) {
      console.error('Presença P2P:', err);
      net.presence = null;
      net.presenceActions = null;
      net.presenceFailed = true;
      renderPresence();
      return null;
    });
  }

  function leavePresence() {
    if (net.presence) {
      try { net.presence.leave(); } catch (e) { /* ignore */ }
    }
    net.presence = null;
    net.presenceActions = null;
    net.presenceStates = {};
    net.lastPresenceAt = 0;
    if (net.presenceTimer) {
      window.clearInterval(net.presenceTimer);
      net.presenceTimer = null;
    }
    renderPresence();
  }

  function schedulePresence() {
    if (!settings.showPresence) {
      setNetStatus('', 'P2P sob demanda', 'Contador online desativado nas configurações.');
      renderPresence();
      return;
    }

    const start = function () {
      ensurePresence().then(function (room) {
        if (room) {
          setNetStatus('ok', 'P2P pronto', 'Conectado à rede P2P. A conexão é direta entre os navegadores.');
        }
      });
    };

    // Espera a página carregar para não competir com o tabuleiro 3D.
    if (document.readyState === 'complete') {
      window.setTimeout(start, 1500);
    } else {
      window.addEventListener('load', function () {
        window.setTimeout(start, 1500);
      }, { once: true });
    }
  }

  function watchPresenceUi() {
    const gameUi = $('game-ui');
    if (!gameUi || !window.MutationObserver) return;
    new MutationObserver(function () {
      sendPresence(true);
      renderPresence();
    }).observe(gameUi, { attributes: true, attributeFilter: ['class'] });
  }

  function resolveColors(mine, theirs) {
    const a = mine === 'w' || mine === 'b' ? mine : null;
    const b = theirs === 'w' || theirs === 'b' ? theirs : null;
    if (a && b) {
      if (a !== b) return { host: a, guest: b };
      return Math.random() < 0.5 ? { host: 'w', guest: 'b' } : { host: 'b', guest: 'w' };
    }
    if (a) return { host: a, guest: C.opponent(a) };
    if (b) return { host: C.opponent(b), guest: b };
    return Math.random() < 0.5 ? { host: 'w', guest: 'b' } : { host: 'b', guest: 'w' };
  }

  function sendSeek() {
    if (!net.quick.active || net.quick.claiming || !net.lobbyActions) return;
    net.lobbyActions.seek.send({
      name: myName(),
      tc: net.quick.tc,
      colorPref: net.quick.colorPref,
      peer: net.selfId,
      at: Date.now(),
    }).catch(function () { /* ignore */ });
  }

  function handleSeek(data, peerId) {
    if (!data || !peerId || peerId === net.selfId) return;
    if (!net.quick.active || net.quick.claiming) return;
    if (net.room || net.hostRoom) return;
    if (data.tc !== net.quick.tc) return;

    net.lobbySeekers[peerId] = data;
    // Regra determinística: o peer com selfId menor inicia a sala.
    if (String(net.selfId) < String(peerId)) {
      startMatchedRoom(data, peerId);
    }
  }

  function startMatchedRoom(seek, peerId) {
    if (net.quick.claiming) return;
    net.quick.claiming = true;
    stopSeekTimer();

    const tc = seek.tc || net.quick.tc;
    const colors = resolveColors(net.quick.colorPref, seek.colorPref);
    const code = randomCode();
    const guestName = cleanName(seek.name);
    const roomName = 'Partida rápida';
    const matchPayload = {
      type: 'match',
      code: code,
      tc: tc,
      hostColor: colors.host,
      name: roomName,
    };

    net.quick.matchPeer = peerId;
    net.quick.matchPayload = matchPayload;

    showLoader('Conectando ao adversário…');

    if (net.lobbyActions) {
      net.lobbyActions.match.send(matchPayload, { target: peerId }).catch(function () { /* ignore */ });
    }

    joinPrivateRoom(code, true).then(function () {
      net.quick.matchPeer = peerId;
      net.quick.matchPayload = matchPayload;
      net.hostRoom = makeRoom(
        { name: roomName, public: false, tc: tc },
        colors.host,
        { id: peerId, name: guestName }
      );
      net.quick.active = false;
      net.quick.claiming = false;
      net.lastAdAt = 0;
      startHostTicker();
      enterRoom('host');
      hideLoader();
      startMatchRetry(matchPayload, peerId);
      toast('Adversário encontrado! Sala ' + code + '.', 'success');
    }).catch(function (err) {
      console.error('Partida rápida:', err);
      net.quick.active = false;
      net.quick.claiming = false;
      net.quick.matchPeer = null;
      net.quick.matchPayload = null;
      hideLoader();
      setQuickUi(false);
      toast('Não foi possível iniciar a partida. Tente de novo.', 'error');
    });
  }

  function handleIncomingMatch(data, peerId) {
    if (!data || !data.code) return;
    if (!net.quick.active || net.quick.claiming) return;
    if (net.room || net.hostRoom) return;

    net.quick.claiming = true;
    net.quick.active = false;
    stopSeekTimer();
    setQuickUi(false);
    leaveLobbySoon();
    showLoader('Adversário encontrado! Conectando…');
    joinAsGuest(data.code, true);
  }

  function stopSeekTimer() {
    if (net.quick.timer) {
      window.clearInterval(net.quick.timer);
      net.quick.timer = null;
    }
  }

  function stopMatchRetry() {
    if (net.quick.matchTimer) {
      window.clearInterval(net.quick.matchTimer);
      net.quick.matchTimer = null;
    }
  }

  function startMatchRetry(payload, peerId) {
    stopMatchRetry();
    let tries = 0;

    net.quick.matchTimer = window.setInterval(function () {
      if (!net.isHost || !net.room) {
        stopMatchRetry();
        return;
      }

      if (net.room.getPeers()[peerId]) {
        stopMatchRetry();
        net.quick.matchPeer = null;
        net.quick.matchPayload = null;
        leaveLobby();
        return;
      }

      tries += 1;
      if (tries > 8) {
        stopMatchRetry();
        net.quick.matchPeer = null;
        net.quick.matchPayload = null;
        leaveLobby();
        return;
      }

      if (net.lobbyActions) {
        net.lobbyActions.match.send(payload, { target: peerId }).catch(function () { /* ignore */ });
      }
    }, 2000);
  }

  function setQuickUi(active) {
    const start = $('quick-match');
    const cancel = $('cancel-match');
    const box = $('match-status');
    if (start) start.classList.toggle('hidden', !!active);
    if (cancel) cancel.classList.toggle('hidden', !active);
    if (box) {
      box.classList.toggle('hidden', !active);
      if (active) {
        const info = tcInfo(net.quick.tc);
        box.textContent = 'Procurando adversário · ' + info.label +
          ' · a conexão é direta entre os navegadores';
      }
    }
    sendPresence(true);
    renderPresence();
  }

  function tryQuickMatch() {
    if (net.room || net.hostRoom) {
      toast('Você já está em uma sala.');
      return;
    }
    if (net.quick.active) return;

    net.quick.tc = $('quick-tc').value || '5+3';
    net.quick.colorPref = $('quick-color').value || 'random';
    net.quick.active = true;
    net.quick.claiming = false;
    net.quick.startedAt = Date.now();

    setQuickUi(true);
    ensureLobby().then(function () {
      sendSeek();
      stopSeekTimer();
      net.quick.timer = window.setInterval(sendSeek, 2500);
    }).catch(function () {
      net.quick.active = false;
      setQuickUi(false);
      toast('Não foi possível entrar na fila. Verifique a internet.', 'error');
    });
  }

  function cancelQuickMatch() {
    if (!net.quick.active) return;
    net.quick.active = false;
    net.quick.claiming = false;
    stopSeekTimer();
    stopMatchRetry();
    net.quick.matchPeer = null;
    net.quick.matchPayload = null;
    if (net.lobbyActions) {
      net.lobbyActions.unseek.send({ at: Date.now() }).catch(function () { /* ignore */ });
    }
    setQuickUi(false);
    toast('Busca cancelada.');
  }

  /* ------------------------------------------------------------
     SALAS — CRIAR / ENTRAR / SAIR
     ------------------------------------------------------------ */
  function createRoom() {
    if (net.room || net.hostRoom) {
      toast('Você já está em uma sala.');
      return;
    }

    const name = ($('create-name').value || '').trim().slice(0, 30) || ('Sala de ' + myName());
    const tc = $('create-tc').value || '5+3';
    const pref = $('create-color').value;
    const isPublic = $('create-visibility').value === 'public';
    const hostColor = pref === 'w' || pref === 'b' ? pref : (Math.random() < 0.5 ? 'w' : 'b');
    const code = randomCode();

    showLoader('Criando sala…');

    const ready = isPublic
      ? ensureLobby().catch(function () { return null; })
      : Promise.resolve(null);

    ready.then(function () {
      return joinPrivateRoom(code, true);
    }).then(function () {
      net.hostRoom = makeRoom({ name: name, public: isPublic, tc: tc }, hostColor, null);
      net.lastAdAt = 0;
      startHostTicker();
      enterRoom('host');
      hideLoader();
      if (isPublic) advertiseRoom(true);
      toast('Sala ' + code + ' criada. Convide alguém com o link.', 'success');
    }).catch(function (err) {
      console.error('Criar sala:', err);
      showConnectError(
        'Não foi possível criar a sala',
        'A rede P2P não iniciou. Verifique sua internet, desative VPN/bloqueadores e tente novamente.',
        function () { createRoom(); }
      );
    });
  }

  function guestConnectFailed(seq, code, detail) {
    if (seq !== net.joinSeq || app.room || net.isHost) return;
    if (net.roomTimer) {
      window.clearTimeout(net.roomTimer);
      net.roomTimer = null;
    }
    const isTurn = /turn/i.test(detail || '');
    const hint = isTurn
      ? 'A conexão direta falhou e o servidor de relay (TURN) não respondeu. Tente outra rede — Wi-Fi ou dados móveis —, desative a VPN e evite redes corporativas.'
      : 'Confirme se o anfitrião continua com a sala aberta. Redes diferentes às vezes bloqueiam a conexão direta: tente o mesmo Wi-Fi, desative a VPN ou troque de navegador.';
    showConnectError('Não foi possível conectar à sala ' + (code || ''), hint, function () {
      joinAsGuest(code, false);
    });
  }

  function joinAsGuest(code, fromMatch) {
    const clean = normalizeCode(code);
    if (clean.length < 4) {
      toast('Digite um código de sala válido.', 'error');
      return;
    }

    if (net.room || net.hostRoom) leavePrivateRoom(true);
    app.room = null;
    app.game = {
      state: C.createInitialState(),
      positionCounts: createPositionCounts(C.createInitialState()),
      lastMove: null,
      status: { over: false, check: false },
    };
    app.game.status = C.computeStatus(app.game.state, app.game.positionCounts);

    const seq = ++net.joinSeq;
    net.lastJoinError = '';

    showLoader(fromMatch ? 'Conectando ao adversário…' : 'Conectando à rede P2P…');

    joinPrivateRoom(clean, false).then(function () {
      if (seq !== net.joinSeq) return;
      enterRoom('guest');
      sendHelloToAll();
      showLoader('Aguardando o anfitrião · sala ' + clean + '…');

      if (net.roomTimer) window.clearTimeout(net.roomTimer);

      const startedAt = Date.now();
      const tick = function () {
        net.roomTimer = null;
        if (seq !== net.joinSeq || app.room) return;

        const elapsed = Date.now() - startedAt;
        if (elapsed >= 25000) {
          guestConnectFailed(seq, clean, net.lastJoinError);
          return;
        }

        const hintEl = $('loader-hint');
        if (hintEl) {
          hintEl.textContent = elapsed < 10000
            ? 'Procurando o anfitrião nos relays públicos…'
            : 'Conexão em andamento. Redes diferentes podem bloquear o P2P; o relay (TURN) está sendo tentado.';
          hintEl.classList.remove('hidden');
        }
        net.roomTimer = window.setTimeout(tick, 5000);
      };
      net.roomTimer = window.setTimeout(tick, 5000);
    }).catch(function (err) {
      if (seq !== net.joinSeq) return;
      console.error('Entrar na sala:', err);
      showConnectError(
        'Não foi possível iniciar a conexão',
        'A biblioteca P2P não carregou. Verifique sua internet, desative bloqueadores de anúncio/VPN e tente novamente.',
        function () { joinAsGuest(clean, fromMatch); }
      );
    });
  }

  function joinByCode() {
    const code = normalizeCode($('join-code').value);
    if (code.length < 4) {
      toast('Digite o código de 5 caracteres.', 'error');
      return;
    }
    joinAsGuest(code, false);
  }

  function enterRoom(role) {
    clearBotRuntime();
    app.bot.active = false;
    app.bot.clocks = null;
    document.body.classList.remove('bot-mode');

    app.mode = 'online';
    app.roomCode = net.roomId;
    app.myRole = role === 'spectator' ? 'spectator' : 'player';
    app.selected = null;
    app.legalForSelected = [];
    app.pendingPromotion = null;
    app.lastRenderedVersion = -1;
    app.lastResultKey = '';
    app.lastDrawPrompt = '';
    app.unreadChat = 0;

    $('lobby').classList.add('hidden');
    $('game-ui').classList.remove('hidden');

    ensureBoard();
    B.setInteractive(true);
    setPanelCollapsed(true);

    if (net.roomId) {
      try {
        history.replaceState(null, '', location.pathname + '?room=' + net.roomId);
      } catch (e) { /* ignore */ }
    }

    if (net.isHost && net.hostRoom) {
      applyRoom(net.hostRoom, false);
      if (net.hostRoom.meta.status === 'waiting') {
        net.waitingSince = Date.now();
        if (net.waitHintTimer) window.clearTimeout(net.waitHintTimer);
        net.waitHintTimer = window.setTimeout(function () {
          net.waitHintTimer = null;
          if (!net.isHost || !net.hostRoom || net.hostRoom.meta.status !== 'waiting') return;
          renderHUD();
        }, 45000);
      }
    } else {
      renderAll(false);
    }
  }

  function backToLobby(remote) {
    if (app.leaving) return;
    app.leaving = true;

    net.joinSeq += 1;
    net.lastJoinError = '';

    clearBotRuntime();
    app.bot.active = false;
    app.bot.clocks = null;
    document.body.classList.remove('bot-mode');
    document.body.classList.remove('has-actions');

    leavePrivateRoom(true);
    stopSeekTimer();
    net.quick.active = false;
    net.quick.claiming = false;
    setQuickUi(false);

    app.room = null;
    app.mode = 'local';
    app.myColor = null;
    app.myRole = 'player';
    app.selected = null;
    app.legalForSelected = [];
    app.pendingPromotion = null;
    app.lastRenderedVersion = -1;
    app.lastResultKey = '';
    app.lastDrawPrompt = '';
    app.unreadChat = 0;

    $('promotion').classList.add('hidden');
    $('result').classList.add('hidden');
    $('settings').classList.add('hidden');
    $('game-ui').classList.add('hidden');
    $('lobby').classList.remove('hidden');
    B.setInteractive(false);

    try {
      history.replaceState(null, '', location.pathname);
    } catch (e) { /* ignore */ }

    renderLobbyIdentity();
    renderPublicRooms();

    if (remote) toast('Você voltou ao lobby.');
    app.leaving = false;
  }

  function leaveRoom() {
    if (app.mode !== 'online' || !net.room) {
      backToLobby(false);
      return;
    }

    confirmDialog(
      'Sair da sala?',
      net.isHost
        ? 'Você é o anfitrião. A sala será encerrada para todos.'
        : 'Você vai sair da partida. O anfitrião será avisado.',
      'Sair'
    ).then(function (ok) {
      if (!ok) return;

      if (net.isHost) {
        if (net.actions) {
          net.actions.bye.send({ reason: 'host-left' }).catch(function () { /* ignore */ });
        }
        window.setTimeout(function () { backToLobby(true); }, 250);
      } else {
        sendIntent({ type: 'leave' });
        window.setTimeout(function () { backToLobby(true); }, 150);
      }
    });
  }

  function handleInviteFromUrl() {
    let code = '';
    try {
      const params = new URLSearchParams(location.search);
      code = normalizeCode(params.get('room'));
    } catch (e) { /* ignore */ }

    if (!code) return;

    net.pendingInvite = code;
    const input = $('join-code');
    if (input) input.value = code;
    switchTab('join');
    toast('Convite recebido: sala ' + code + '. Conectando…');

    window.setTimeout(function () {
      if (net.pendingInvite !== code) return;
      net.pendingInvite = null;
      joinAsGuest(code, false);
    }, 900);
  }

  /* ------------------------------------------------------------
     TABULEIRO 3D E PARTIDA LOCAL
     ------------------------------------------------------------ */
  const PIECE_SYMBOLS = {
    w: { q: '\u2655', r: '\u2656', b: '\u2657', n: '\u2658' },
    b: { q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E' },
  };

  let boardReady = false;

  function ensureBoard() {
    if (boardReady) return;
    try {
      B.init($('app'));
      B.onSquareClick(handleSquareClick);
      boardReady = true;
      applyVisualSettings();
      B.setInteractive(false);
    } catch (err) {
      boardReady = false;
      console.error('Board3D:', err);
      const error = $('load-error');
      if (error) {
        const text = error.querySelector('p');
        if (text) {
          text.textContent = 'Seu navegador não conseguiu iniciar o WebGL, necessário para o tabuleiro 3D. Ative a aceleração de hardware e recarregue a página.';
        }
        error.hidden = false;
      } else {
        toast('Não foi possível iniciar o tabuleiro 3D. Recarregue a página.', 'error', 6000);
      }
    }
  }

  function clearBotRuntime() {
    app.bot.requestSeq += 1;
    app.bot.thinking = false;
    app.bot.running = false;
    if (app.bot.pendingTimer) {
      window.clearTimeout(app.bot.pendingTimer);
      app.bot.pendingTimer = null;
    }
  }

  function resetLocalGame() {
    clearBotRuntime();
    app.bot.active = false;
    app.bot.clocks = null;
    document.body.classList.remove('bot-mode');

    app.game = {
      state: C.createInitialState(),
      positionCounts: createPositionCounts(C.createInitialState()),
      lastMove: null,
      status: { over: false, check: false },
    };
    app.game.status = C.computeStatus(app.game.state, app.game.positionCounts);
    app.localHistory = [];
    app.selected = null;
    app.legalForSelected = [];
    app.pendingPromotion = null;
    app.lastRenderedVersion = -1;
    app.lastResultKey = '';
    app.lastDrawPrompt = '';
    app.unreadChat = 0;
    app.prevRoomStatus = null;

    $('result').classList.add('hidden');
    $('promotion').classList.add('hidden');
    if (boardReady) B.setOrientation('w');
    renderAll(false);
    if (boardReady) B.playIntro();
  }

  function startLocalGame() {
    clearBotRuntime();
    app.bot.active = false;
    app.bot.clocks = null;
    document.body.classList.remove('bot-mode');

    app.mode = 'local';
    app.room = null;
    app.roomCode = null;
    app.myColor = 'w';
    app.myRole = 'player';
    app.leaving = false;

    $('lobby').classList.add('hidden');
    $('game-ui').classList.remove('hidden');

    ensureBoard();
    B.setInteractive(true);
    resetLocalGame();
    setPanelCollapsed(true);

    try {
      history.replaceState(null, '', location.pathname);
    } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------
     PARTIDA CONTRA O BOT
     ------------------------------------------------------------ */
  function botLevelInfo(level) {
    if (window.Bot && window.Bot.LEVELS[level]) return window.Bot.LEVELS[level];
    return { label: 'Médio', name: 'Bot', elo: '~1200', desc: 'Bot local.', timeMs: 650, minDelay: 300, delayJitter: 300 };
  }

  function updateBotDescription() {
    const select = $('bot-level');
    if (!select) return;
    const level = Math.min(6, Math.max(1, Math.round(Number(select.value) || 3)));
    const info = botLevelInfo(level);
    const desc = $('bot-level-desc');
    if (desc) {
      desc.textContent = info.label + ' · ' + info.name + ' (' + info.elo + ') — ' + info.desc;
    }
  }

  function applyBotPrefsToForm() {
    const level = $('bot-level');
    if (level) level.value = String(botPrefs.level);
    const style = $('bot-style');
    if (style) style.value = botPrefs.style;
    const color = $('bot-color');
    if (color) color.value = botPrefs.color;
    const tc = $('bot-tc');
    if (tc) tc.value = botPrefs.tc;
    updateBotDescription();
  }

  function startBotGame() {
    if (!window.Bot) {
      toast('O bot não carregou. Recarregue a página.', 'error');
      return;
    }

    const level = Math.min(6, Math.max(1, Math.round(Number($('bot-level').value) || 3)));
    const style = $('bot-style').value || 'balanced';
    const colorPref = $('bot-color').value || 'random';
    const tc = $('bot-tc').value || '10+0';

    botPrefs = { level: level, style: style, color: colorPref, tc: tc };
    saveBotPrefs();

    const myColor = colorPref === 'random'
      ? (Math.random() < 0.5 ? 'w' : 'b')
      : colorPref;
    const info = botLevelInfo(level);

    clearBotRuntime();
    app.mode = 'bot';
    app.room = null;
    app.roomCode = null;
    app.myColor = myColor;
    app.myRole = 'player';
    app.leaving = false;
    app.bot.active = true;
    app.bot.level = level;
    app.bot.style = style;
    app.bot.color = C.opponent(myColor);
    app.bot.name = info.name || 'Bot';
    app.bot.tc = tc;
    app.bot.lastResult = null;

    $('lobby').classList.add('hidden');
    $('game-ui').classList.remove('hidden');
    document.body.classList.add('bot-mode');

    ensureBoard();
    B.setInteractive(true);
    resetBotGame(false);
    setPanelCollapsed(true);

    try {
      history.replaceState(null, '', location.pathname);
    } catch (e) { /* ignore */ }

    toast(
      'Você joga com as ' + (myColor === 'w' ? 'brancas' : 'pretas') +
      ' contra o bot ' + app.bot.name + '.',
      'success',
      4200
    );
  }

  function resetBotGame(swapColors) {
    if (!app.bot.active) return;
    clearBotRuntime();

    if (swapColors) {
      app.myColor = C.opponent(app.myColor);
      app.bot.color = C.opponent(app.myColor);
    }

    app.game = {
      state: C.createInitialState(),
      positionCounts: createPositionCounts(C.createInitialState()),
      lastMove: null,
      status: { over: false, check: false },
    };
    app.game.status = C.computeStatus(app.game.state, app.game.positionCounts);
    app.localHistory = [];
    app.selected = null;
    app.legalForSelected = [];
    app.pendingPromotion = null;
    app.lastRenderedVersion = -1;
    app.lastResultKey = '';
    app.lastDrawPrompt = '';
    app.unreadChat = 0;
    app.prevRoomStatus = null;

    const tc = tcInfo(app.bot.tc);
    const initial = tc.initial ? tc.initial * 1000 : null;
    app.bot.clocks = initial ? { w: initial, b: initial } : null;
    app.bot.increment = (tc.inc || 0) * 1000;
    app.bot.running = !!initial;
    app.bot.turnStartedAt = Date.now();
    app.bot.thinking = false;
    app.bot.lastResult = null;

    $('result').classList.add('hidden');
    $('promotion').classList.add('hidden');
    if (boardReady) B.setOrientation(app.myColor);

    renderAll(false);
    if (boardReady) B.playIntro();

    if (app.game.state.turn === app.bot.color) scheduleBotMove();
  }

  function botClockFor(color) {
    if (!app.bot.clocks) return null;
    let ms = Number(app.bot.clocks[color]);
    if (!isFinite(ms)) ms = 0;

    if (app.bot.running && app.game.state.turn === color && !app.game.status.over) {
      ms -= Math.max(0, Date.now() - app.bot.turnStartedAt);
    }
    return Math.max(0, ms);
  }

  function updateBotClocks() {
    if (app.mode !== 'bot' || !app.bot.active) return;

    const st = app.game.state;
    const bottomColor = app.myColor || 'w';
    const topColor = C.opponent(bottomColor);
    setClockEl($('top-clock'), botClockFor(topColor));
    setClockEl($('bottom-clock'), botClockFor(bottomColor));

    if (app.bot.running && app.bot.clocks && !app.game.status.over) {
      const active = st.turn;
      if (botClockFor(active) <= 0) {
        finishBotGame('timeout', C.opponent(active));
      }
    }
  }

  function cancelBotThinking() {
    app.bot.requestSeq += 1;
    app.bot.thinking = false;
    if (app.bot.pendingTimer) {
      window.clearTimeout(app.bot.pendingTimer);
      app.bot.pendingTimer = null;
    }
  }

  function scheduleBotMove() {
    if (app.mode !== 'bot' || !app.bot.active) return;
    if (app.game.status.over || app.game.state.turn !== app.bot.color) return;
    if (app.bot.thinking) return;

    const requestId = app.bot.requestSeq + 1;
    app.bot.requestSeq = requestId;
    app.bot.thinking = true;
    renderHUD();

    const level = app.bot.level;
    const info = botLevelInfo(level);
    const remaining = app.bot.clocks ? botClockFor(app.bot.color) : null;

    if (remaining !== null && remaining <= 0) {
      finishBotGame('timeout', C.opponent(app.bot.color));
      return;
    }

    const budget = remaining === null
      ? info.timeMs
      : Math.max(60, Math.min(info.timeMs, remaining - 120));
    const state = C.cloneState(app.game.state);
    const started = Date.now();
    const minDelay = (info.minDelay || 300) + Math.random() * (info.delayJitter || 300);

    function applyResult(result) {
      if (requestId !== app.bot.requestSeq) return;
      if (app.mode !== 'bot' || !app.bot.active) return;
      if (app.game.status.over || app.game.state.turn !== app.bot.color) return;

      const move = uciToMove(app.game.state, result.uci);
      if (!move) throw new Error('Lance inválido do bot.');

      const wait = Math.max(0, minDelay - (Date.now() - started));
      app.bot.pendingTimer = window.setTimeout(function () {
        app.bot.pendingTimer = null;
        if (requestId !== app.bot.requestSeq) return;
        if (app.mode !== 'bot' || !app.bot.active) return;
        if (app.game.status.over || app.game.state.turn !== app.bot.color) return;

        if (app.bot.clocks && botClockFor(app.bot.color) <= 0) {
          finishBotGame('timeout', C.opponent(app.bot.color));
          return;
        }

        app.bot.thinking = false;
        commitLocal(move);
      }, wait);
    }

    function fallback() {
      if (requestId !== app.bot.requestSeq) return;
      try {
        const result = window.Bot.chooseMove(state, {
          level: level,
          style: app.bot.style,
          timeMs: Math.min(budget, 800),
        });
        if (!result) throw new Error('Sem lance.');
        applyResult(result);
      } catch (e) {
        if (requestId !== app.bot.requestSeq) return;
        app.bot.thinking = false;
        toast('O bot não conseguiu calcular um lance.', 'error');
        renderHUD();
      }
    }

    requestBotMove(state, { level: level, style: app.bot.style, timeMs: budget })
      .then(applyResult)
      .catch(function (err) {
        if (requestId !== app.bot.requestSeq) return;
        console.warn('Bot worker:', err && err.message ? err.message : err);
        fallback();
      });
  }

  function botAfterMove(mover) {
    if (app.mode !== 'bot' || !app.bot.active) return;

    if (app.bot.clocks && app.bot.running) {
      const elapsed = Math.max(0, Date.now() - app.bot.turnStartedAt);
      app.bot.clocks[mover] = Math.max(0, app.bot.clocks[mover] - elapsed);
      if (app.bot.clocks[mover] > 0) app.bot.clocks[mover] += app.bot.increment;
      app.bot.turnStartedAt = Date.now();
    }

    if (app.game.status.over) {
      app.bot.running = false;
      return;
    }

    if (app.bot.clocks && app.bot.clocks[mover] <= 0) {
      finishBotGame('timeout', C.opponent(mover));
      return;
    }

    if (app.game.state.turn === app.bot.color) scheduleBotMove();
  }

  function finishBotGame(reason, winner) {
    if (app.mode !== 'bot' || !app.bot.active) return;
    if (app.game.status.over) return;

    cancelBotThinking();
    app.bot.running = false;
    app.game.status = {
      over: true,
      type: reason,
      winner: winner || null,
      check: C.isInCheck(app.game.state, app.game.state.turn),
    };
    app.bot.lastResult = { reason: reason, winner: winner || null, at: Date.now() };

    renderAll(false);
    maybeShowLocalResult();
  }

  function onBotResign() {
    if (app.mode !== 'bot' || app.game.status.over) return;
    confirmDialog('Desistir da partida?', 'Você vai perder esta partida.', 'Desistir')
      .then(function (ok) {
        if (!ok) return;
        finishBotGame('resign', app.bot.color);
      });
  }

  function onBotDraw() {
    if (app.mode !== 'bot' || app.game.status.over) return;

    const claimStatus = C.computeStatus(app.game.state, app.game.positionCounts);
    if (app.game.state.turn === app.myColor &&
        (claimStatus.canClaimThreefold || claimStatus.canClaimFiftyMove)) {
      finishBotGame(claimStatus.canClaimThreefold ? 'threefold' : 'fifty', null);
      toast('Empate reivindicado.', 'success');
      return;
    }

    const score = window.Bot
      ? window.Bot.evaluateState(app.game.state, { style: app.bot.style })
      : 0;
    const botScore = app.bot.color === 'w' ? score : -score;
    const accept = app.bot.level <= 2 || botScore <= 40;

    if (accept) {
      finishBotGame('agreement', null);
      toast('O bot aceitou o empate.', 'success');
    } else {
      toast('O bot recusou o empate.', 'error');
    }
  }

  function requestBotRematch() {
    if (app.mode !== 'bot' || !app.bot.active || !app.game.status.over) return;
    resetBotGame(true);
    toast('Revanche! As cores foram trocadas.', 'success');
  }

  function newGame() {
    if (app.mode === 'bot') resetBotGame(false);
    else resetLocalGame();
  }

  function selectSquare(r, f) {
    app.selected = { r: r, f: f };
    app.legalForSelected = C.legalMoves(app.game.state).filter(function (mv) {
      return mv.from.r === r && mv.from.f === f;
    });
    renderBoard(false);
  }

  function clearSelection() {
    app.selected = null;
    app.legalForSelected = [];
    renderBoard(false);
  }

  function openPromotion(candidates) {
    app.pendingPromotion = candidates;
    const color = candidates[0] && candidates[0].color ? candidates[0].color : app.game.state.turn;
    const symbols = PIECE_SYMBOLS[color] || PIECE_SYMBOLS.w;
    const buttons = $('promotion').querySelectorAll('button[data-piece]');
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].textContent = symbols[buttons[i].dataset.piece] || '';
    }
    $('promotion').classList.remove('hidden');
  }

  function closePromotion() {
    app.pendingPromotion = null;
    $('promotion').classList.add('hidden');
  }

  function handleSquareClick(r, f) {
    if (app.pendingPromotion) return;
    if (app.mode === 'online') {
      if (!app.room || app.room.meta.status !== 'playing' || app.game.status.over) return;
      if (!app.myColor || app.myRole !== 'player') return;
      if (app.game.state.turn !== app.myColor) return;
    } else if (app.mode === 'bot') {
      if (app.game.status.over || !app.bot.active) return;
      if (app.game.state.turn !== app.myColor) return;
      if (app.bot.thinking) return;
    } else if (app.game.status.over) {
      return;
    }

    const st = app.game.state;
    const piece = st.board[r][f];

    if (app.selected) {
      const candidates = app.legalForSelected.filter(function (mv) {
        return mv.to.r === r && mv.to.f === f;
      });

      if (candidates.length > 0) {
        if (candidates[0].promotion || candidates.some(function (mv) { return !!mv.promotion; })) {
          openPromotion(candidates);
        } else {
          playMove(candidates[0]);
        }
        return;
      }

      if (piece && piece.color === st.turn) {
        selectSquare(r, f);
        return;
      }

      clearSelection();
      return;
    }

    if (piece && piece.color === st.turn) selectSquare(r, f);
  }

  function playMove(mv) {
    if (!mv) return;

    if (app.mode === 'local' || app.mode === 'bot') {
      commitLocal(mv);
      return;
    }

    if (!app.room || app.room.meta.status !== 'playing') return;

    app.selected = null;
    app.legalForSelected = [];
    app.pendingPromotion = null;
    renderBoard(false);

    const intent = {
      type: 'move',
      from: { r: mv.from.r, f: mv.from.f },
      to: { r: mv.to.r, f: mv.to.f },
      promotion: mv.promotion || null,
    };

    if (net.isHost) {
      hostApplyMove(net.hostRoom, app.myColor, intent);
    } else {
      sendIntent(intent);
    }
  }

  function commitLocal(mv) {
    const prevState = C.cloneState(app.game.state);
    const snapshot = C.cloneState(app.game.state);
    const previousPositionCounts = app.game.positionCounts || createPositionCounts(prevState);
    const notation = C.moveNotation(app.game.state, mv);
    const previousLast = app.game.lastMove;

    app.game.positionCounts = Object.assign({}, previousPositionCounts);
    C.applyMove(app.game.state, mv);
    const position = C.positionKey(app.game.state);
    app.game.positionCounts[position] = (Number(app.game.positionCounts[position]) || 0) + 1;
    app.game.lastMove = moveRecord(mv);
    app.game.status = C.computeStatus(app.game.state, app.game.positionCounts);

    const suffix = app.game.status.type === 'checkmate' ? '#' : app.game.status.check ? '+' : '';

    app.localHistory.push({
      state: snapshot,
      positionCounts: previousPositionCounts,
      lastMove: previousLast,
      notation: notation + suffix,
    });

    app.selected = null;
    app.legalForSelected = [];
    app.pendingPromotion = null;

    announceMove(mv, prevState, app.game.status);
    renderAll(true);
    maybeShowLocalResult();

    if (app.mode === 'bot') botAfterMove(prevState.turn);
  }

  function undoBotMove() {
    if (!app.bot.active || app.localHistory.length === 0) return;

    cancelBotThinking();

    let entry = app.localHistory.pop();
    app.game.state = entry.state;
    app.game.positionCounts = entry.positionCounts || createPositionCounts(entry.state);
    app.game.lastMove = entry.lastMove;

    /* Remove também a resposta do bot até voltar a vez do jogador. */
    let guard = 0;
    while (app.game.state.turn !== app.myColor && app.localHistory.length && guard < 6) {
      entry = app.localHistory.pop();
      app.game.state = entry.state;
      app.game.positionCounts = entry.positionCounts || createPositionCounts(entry.state);
      app.game.lastMove = entry.lastMove;
      guard += 1;
    }

    app.game.status = C.computeStatus(app.game.state, app.game.positionCounts);
    app.selected = null;
    app.legalForSelected = [];
    app.pendingPromotion = null;
    app.lastResultKey = '';
    app.bot.lastResult = null;
    app.bot.turnStartedAt = Date.now();
    if (app.bot.clocks) app.bot.running = true;

    closePromotion();
    $('result').classList.add('hidden');
    renderAll(false);

    if (app.game.state.turn === app.bot.color) scheduleBotMove();
    else toast('Jogada desfeita.');
  }

  function undoLocalMove() {
    if (app.mode === 'bot') {
      undoBotMove();
      return;
    }
    if (app.mode !== 'local' || app.localHistory.length === 0) return;

    const entry = app.localHistory.pop();
    app.game.state = entry.state;
    app.game.positionCounts = entry.positionCounts || createPositionCounts(entry.state);
    app.game.lastMove = entry.lastMove;
    app.game.status = C.computeStatus(app.game.state, app.game.positionCounts);

    closePromotion();
    app.selected = null;
    app.legalForSelected = [];
    app.lastResultKey = '';

    renderAll(false);
  }

  function announceMove(mv, prevState, status) {
    if (!mv || !mv.to) return;

    let capture = !!mv.enPassant;
    if (!capture && prevState && prevState.board && prevState.board[mv.to.r]) {
      capture = !!prevState.board[mv.to.r][mv.to.f];
    }

    B.playEffect(mv.promotion ? 'promotion' : capture ? 'capture' : 'move', mv.to.r, mv.to.f);

    if (status.check || status.type === 'checkmate') {
      const king = C.findKing(app.game.state.board, app.game.state.turn);
      if (king) B.playEffect('check', king.r, king.f);
    }

    if (status.over) Sound.end();
    else if (status.check) Sound.check();
    else if (capture) Sound.capture();
    else if (mv.castle) Sound.castle();
    else Sound.move();
  }

  /* ------------------------------------------------------------
     APLICAR ESTADO AUTORITATIVO DO ANFITRIÃO
     ------------------------------------------------------------ */
  function applyRoom(room, isRemote) {
    if (!room || !room.meta || !room.game) return;

    const prevVersion = app.lastRenderedVersion;
    const prevStatus = app.prevRoomStatus;
    const prevState = app.game.state;
    const hadRoom = !!app.room;
    const version = Number(room.game.version) || 0;
    const shouldPlayIntro = room.meta.status === 'playing' &&
      (!hadRoom || prevStatus !== 'playing');

    app.room = room;
    app.mode = 'online';

    const color = findColorByPeer(room, net.selfId);
    app.myColor = color || null;
    app.myRole = color ? 'player' : 'spectator';

    const st = C.fenToState(room.game.fen);
    app.game.state = st;
    app.game.lastMove = room.game.lastMove || null;

    const status = C.computeStatus(st, room.game.positionCounts);
    if (room.result) {
      status.over = true;
      status.type = room.result.reason;
      status.winner = room.result.winner || status.winner || null;
    }
    app.game.status = status;

    if (version !== prevVersion && hadRoom && room.game.lastMove) {
      announceMove(room.game.lastMove, prevState, status);
    }

    if (prevStatus && prevStatus !== 'playing' && room.meta.status === 'playing') {
      Sound.start();
    }
    app.prevRoomStatus = room.meta.status;

    if (room.meta.status === 'playing' && !room.result) {
      $('result').classList.add('hidden');
      app.lastResultKey = '';
    }

    if (settings.autoFocus && app.myColor) B.setOrientation(app.myColor);

    app.selected = null;
    app.legalForSelected = [];
    app.pendingPromotion = null;
    $('promotion').classList.add('hidden');

    hideLoader();
    renderAll(!shouldPlayIntro);
    if (shouldPlayIntro && boardReady) B.playIntro();
    maybeHandleDrawOffer();
    maybeShowRoomResult();
  }

  /* ------------------------------------------------------------
     RENDERIZAÇÃO
     ------------------------------------------------------------ */
  function renderAll(animate) {
    renderBoard(!!animate);
    renderHUD();
    updateMoves();
    updateChat();

    if (app.mode === 'online' && app.room) {
      maybeHandleDrawOffer();
      maybeShowRoomResult();
      app.lastRenderedVersion = Number(app.room.game.version) || 0;
    } else {
      maybeShowLocalResult();
    }
  }

  function renderBoard(animate) {
    if (!boardReady) return;
    const st = app.game.state;
    let checkSquare = null;
    if (app.game.status.check || app.game.status.type === 'checkmate') {
      const king = C.findKing(st.board, st.turn);
      if (king) checkSquare = king;
    }

    B.setState(st, {
      lastMove: app.game.lastMove,
      selected: app.selected,
      legalMoves: app.selected ? app.legalForSelected : [],
      checkSquare: checkSquare,
      animate: !!animate,
    });
  }

  function clockFor(color, room, st) {
    if (!room || !room.meta.initial) return null;
    const clocks = room.game.clocks || {};
    let ms = Number(clocks[color]);
    if (!isFinite(ms)) ms = 0;

    if (room.meta.status === 'playing' && room.game.running && st.turn === color) {
      const started = Number(room.game.turnStartedAt) || hostNow();
      ms -= Math.max(0, hostNow() - started);
    }
    return Math.max(0, ms);
  }

  function setClockEl(el, ms) {
    if (!el) return;
    el.textContent = formatClock(ms);
    const playing = (app.mode === 'bot' && app.bot.active && !app.game.status.over) ||
      (app.room && app.room.meta.status === 'playing');
    el.classList.toggle('low', ms !== null && ms <= 20000 && !!playing);
  }

  function updateClocks() {
    if (app.mode === 'bot') {
      updateBotClocks();
      return;
    }
    if (app.mode !== 'online' || !app.room) return;
    const st = app.game.state;
    const bottomColor = app.myColor || 'w';
    const topColor = C.opponent(bottomColor);
    setClockEl($('top-clock'), clockFor(topColor, app.room, st));
    setClockEl($('bottom-clock'), clockFor(bottomColor, app.room, st));
  }

  function renderHUD() {
    const online = app.mode === 'online' && !!app.room;
    const botMode = app.mode === 'bot' && !!app.bot.active;
    const room = online ? app.room : null;
    const st = app.game.state;
    const status = app.game.status;
    const bottomColor = online ? (app.myColor || 'w') : botMode ? (app.myColor || 'w') : 'w';
    const topColor = C.opponent(bottomColor);

    function nameFor(color) {
      if (botMode) {
        return color === app.myColor ? myName() : app.bot.name + ' (bot)';
      }
      if (!room) return color === 'w' ? 'Brancas' : 'Pretas';
      const p = room.players && room.players[color];
      return p && p.name ? p.name : (color === 'w' ? 'Brancas' : 'Pretas');
    }

    const topName = $('top-name');
    const bottomName = $('bottom-name');
    const topRole = $('top-role');
    const bottomRole = $('bottom-role');
    if (topName) topName.textContent = nameFor(topColor);
    if (bottomName) bottomName.textContent = nameFor(bottomColor);

    if (botMode) {
      const info = botLevelInfo(app.bot.level);
      if (topRole) topRole.textContent = 'bot · ' + info.label;
      if (bottomRole) bottomRole.textContent = 'você';
    } else if (!room) {
      if (topRole) topRole.textContent = 'adversário local';
      if (bottomRole) bottomRole.textContent = 'você';
    } else if (room.meta.status === 'waiting') {
      if (topRole) topRole.textContent = 'aguardando…';
      if (bottomRole) bottomRole.textContent = net.isHost ? 'você · anfitrião' : 'conectando…';
    } else if (app.myRole === 'spectator') {
      if (topRole) topRole.textContent = topColor === 'w' ? 'brancas' : 'pretas';
      if (bottomRole) bottomRole.textContent = bottomColor === 'w' ? 'brancas' : 'pretas';
    } else {
      const opponent = room.players && room.players[topColor];
      if (topRole) {
        topRole.textContent = !opponent ? 'aguardando…' :
          opponent.connected === false ? 'reconectando…' : 'adversário';
      }
      if (bottomRole) bottomRole.textContent = 'você' + (net.isHost ? ' · anfitrião' : '');
    }

    const topDot = $('top-dot');
    const bottomDot = $('bottom-dot');
    if (topDot) topDot.className = 'pdot ' + (topColor === 'w' ? 'white' : 'black');
    if (bottomDot) bottomDot.className = 'pdot ' + (bottomColor === 'w' ? 'white' : 'black');

    const topCard = $('player-top');
    const bottomCard = $('player-bottom');
    if (topCard) topCard.classList.toggle('active', !status.over && st.turn === topColor);
    if (bottomCard) bottomCard.classList.toggle('active', !status.over && st.turn === bottomColor);

    if (online) {
      updateClocks();
    } else if (botMode) {
      updateBotClocks();
    } else {
      setClockEl($('top-clock'), null);
      setClockEl($('bottom-clock'), null);
    }

    const turnDot = $('turn-dot');
    const turnText = $('turn-text');
    if (turnDot) turnDot.className = 'dot ' + (st.turn === 'w' ? 'white' : 'black');
    if (turnText) {
      let label = st.turn === 'w' ? 'Vez das brancas' : 'Vez das pretas';
      if (status.over) label = 'Fim de jogo';
      else if (room && room.meta.status === 'waiting') label = 'Aguardando adversário';
      else if (botMode) {
        if (app.bot.thinking) label = 'Bot pensando…';
        else label += st.turn === app.myColor ? ' · sua vez' : ' · bot';
      } else if (online && app.myRole === 'player' && app.myColor) {
        label += st.turn === app.myColor ? ' · sua vez' : ' · adversário';
      }
      turnText.textContent = label;
    }

    const statusEl = $('status');
    if (statusEl) {
      let text;
      if (room && room.meta.status === 'waiting') {
        text = 'Compartilhe o link de convite para começar.';
      } else if (room && room.result) {
        text = resultText(room.result.reason, room.result.winner);
      } else if (online && app.myRole === 'spectator') {
        text = 'Você está assistindo. O tabuleiro é atualizado em tempo real.';
      } else if (botMode && status.type === 'resign' && status.over) {
        text = status.winner === app.myColor
          ? 'O bot desistiu. Você venceu!'
          : 'Você desistiu. O bot venceu.';
      } else if (botMode && app.bot.thinking && !status.over) {
        text = 'Bot pensando…';
      } else if (botMode && st.turn === app.myColor && !status.over && !status.check) {
        text = 'Sua vez. Selecione uma peça.';
      } else {
        text = statusLabel(status);
      }
      if (room && room.meta.status === 'playing' && room.drawOffer) {
        text += room.drawOffer.by === app.myColor
          ? ' Oferta de empate enviada.'
          : ' O adversário propôs empate.';
      }
      statusEl.textContent = text;
      statusEl.className = 'status' +
        (status.over ? ' over' : status.check ? ' check' : '');
    }

    const subtitle = $('game-subtitle');
    if (subtitle) {
      if (botMode) subtitle.textContent = 'Contra o bot · ' + botLevelInfo(app.bot.level).label;
      else if (!online) subtitle.textContent = 'Modo local · mesmo dispositivo';
      else if (room.meta.status === 'waiting') subtitle.textContent = 'Sala aguardando adversário';
      else if (room.meta.status === 'finished') subtitle.textContent = 'Partida encerrada · P2P';
      else if (app.myRole === 'spectator') subtitle.textContent = 'Assistindo · P2P';
      else subtitle.textContent = 'Partida online · P2P';
    }

    const chip = $('room-chip');
    if (chip) chip.classList.toggle('hidden', !online);
    const codeEl = $('room-code');
    if (codeEl && online) codeEl.textContent = net.roomId || '-----';

    const spectators = $('spectators');
    if (spectators) {
      const names = room ? Object.keys(room.spectators || {}).map(function (id) {
        return room.spectators[id].name;
      }).filter(Boolean) : [];
      if (names.length) {
        spectators.textContent = 'Assistindo: ' + names.join(', ');
        spectators.classList.remove('hidden');
      } else {
        spectators.classList.add('hidden');
      }
    }

    const undoBtn = $('undo-btn');
    const newLocalBtn = $('new-local-btn');
    const leaveBtn = $('leave-btn');
    if (undoBtn) {
      undoBtn.classList.toggle('hidden', online);
      undoBtn.disabled = botMode && (!app.localHistory.length || app.game.status.over);
    }
    if (newLocalBtn) newLocalBtn.classList.toggle('hidden', online);
    if (leaveBtn) leaveBtn.classList.toggle('hidden', !online);

    const actions = $('room-actions');
    const showActions = botMode || (online && app.myRole === 'player' &&
      (room.meta.status === 'playing' || room.meta.status === 'finished'));
    if (actions) actions.classList.toggle('hidden', !showActions);
    document.body.classList.toggle('has-actions', showActions);

    if (showActions) {
      const playing = botMode ? !status.over : room.meta.status === 'playing';
      const drawBtn = $('draw-btn');
      const resignBtn = $('resign-btn');
      const rematchBtn = $('rematch-btn');

      if (drawBtn) {
        drawBtn.classList.toggle('hidden', !playing);
        drawBtn.disabled = !playing;
        if (playing) {
          const canClaimDraw = app.myRole === 'player' &&
            st.turn === app.myColor &&
            (status.canClaimThreefold || status.canClaimFiftyMove);
          if (canClaimDraw) {
            drawBtn.textContent = 'Reivindicar empate';
          } else if (botMode) {
            drawBtn.textContent = 'Empate';
          } else {
            const offer = room.drawOffer;
            drawBtn.textContent = offer
              ? (offer.by === app.myColor ? 'Cancelar empate' : 'Aceitar empate')
              : 'Empate';
          }
        }
      }

      if (resignBtn) {
        resignBtn.classList.toggle('hidden', !playing);
        resignBtn.disabled = !playing;
      }

      if (rematchBtn) {
        const canRematch = botMode
          ? status.over
          : (room.meta.status === 'finished' && room.players.w && room.players.b);
        rematchBtn.classList.toggle('hidden', !canRematch);
        if (canRematch) {
          if (botMode) {
            rematchBtn.textContent = 'Revanche';
            rematchBtn.disabled = false;
          } else {
            const waiting = !!(room.rematch && room.rematch[app.myColor]);
            rematchBtn.textContent = waiting ? 'Aguardando revanche…' : 'Revanche';
            rematchBtn.disabled = waiting;
          }
        }
      }
    }

    const waitingBanner = $('waiting-banner');
    const waiting = online && net.isHost && room.meta.status === 'waiting';
    if (waitingBanner) waitingBanner.classList.toggle('hidden', !waiting);
    const waitingText = $('waiting-text');
    if (waitingText && waiting) {
      if (!net.waitingSince) net.waitingSince = Date.now();
      const waited = Date.now() - net.waitingSince;
      waitingText.textContent = waited > 45000
        ? 'Ainda aguardando · se a pessoa não conseguir entrar, tente o mesmo Wi-Fi, desative a VPN ou use dados móveis'
        : 'Aguardando o adversário entrar · sala ' + (net.roomId || '-----');
    } else if (!waiting) {
      net.waitingSince = 0;
    }

    const chatInput = $('chat-input');
    if (chatInput) {
      chatInput.disabled = !online;
      chatInput.placeholder = online ? 'Escreva uma mensagem…' : 'Chat disponível no modo online';
    }
  }

  function updateMoves() {
    const el = $('move-list');
    if (!el) return;

    let entries = [];
    if (app.mode === 'online' && app.room) {
      const moves = app.room.moves || {};
      entries = Object.keys(moves).sort().map(function (key) { return moves[key].san; });
    } else {
      entries = app.localHistory.map(function (entry) { return entry.notation; });
    }

    if (!entries.length) {
      el.innerHTML = '<div class="empty">Nenhum lance ainda</div>';
      return;
    }

    const rows = [];
    for (let i = 0; i < entries.length; i += 2) {
      const number = i / 2 + 1;
      rows.push(
        '<div class="move-row"><span class="num">' + number + '.</span>' +
        '<span>' + escapeHtml(entries[i] || '') + '</span>' +
        '<span>' + escapeHtml(entries[i + 1] || '') + '</span></div>'
      );
    }
    el.innerHTML = rows.join('');
    el.scrollTop = el.scrollHeight;
  }

  function setChatBadge(count) {
    const badge = $('chat-badge');
    if (!badge) return;
    badge.textContent = String(count);
    badge.classList.toggle('hidden', !count);
  }

  function updateChat() {
    const box = $('chat-messages');
    if (!box) return;

    const online = app.mode === 'online' && !!app.room;
    let messages = [];

    if (online) {
      const chat = app.room.chat || {};
      messages = Object.keys(chat).sort().map(function (key) {
        return { id: key, name: chat[key].name, color: chat[key].color, role: chat[key].role, text: chat[key].text };
      });
    }

    if (!messages.length) {
      box.innerHTML = '<div class="empty">' +
        (online ? 'Sem mensagens.' : 'Chat disponível no modo online.') + '</div>';
      app.lastChatKey = '';
      app.unreadChat = 0;
      setChatBadge(0);
      return;
    }

    const last = messages[messages.length - 1];
    const key = last.id + '|' + messages.length;
    const paneActive = $('pane-chat').classList.contains('active');

    if (app.lastChatKey && key !== app.lastChatKey && !paneActive) {
      app.unreadChat += 1;
      Sound.chat();
    }
    app.lastChatKey = key;

    box.innerHTML = messages.map(function (msg) {
      const whoClass = msg.color === 'w' ? 'w' : msg.color === 'b' ? 'b' : 's';
      const role = msg.role === 'spectator' ? ' · espectador' : '';
      return '<div class="chat-msg">' +
        '<div class="who ' + whoClass + '">' + escapeHtml(msg.name || 'Jogador') + role + '</div>' +
        '<div class="txt">' + escapeHtml(msg.text || '') + '</div>' +
      '</div>';
    }).join('');
    box.scrollTop = box.scrollHeight;

    setChatBadge(paneActive ? 0 : app.unreadChat);
  }

  function maybeShowLocalResult() {
    if (app.mode !== 'local' && app.mode !== 'bot') return;
    const status = app.game.status;
    if (!status.over) return;

    const botMode = app.mode === 'bot';
    const key = (botMode ? 'bot|' : 'local|') + status.type + '|' + (status.winner || '') + '|' +
      app.game.state.fullmove + '|' + app.localHistory.length;
    if (app.lastResultKey === key) return;
    app.lastResultKey = key;

    const title = $('result-title');
    const text = $('result-text');
    const rematch = $('result-rematch');

    if (title) {
      if (status.type === 'checkmate') title.textContent = 'Xeque-mate';
      else if (status.type === 'stalemate' || status.type === 'insufficient' ||
               status.type === 'fifty' || status.type === 'threefold' ||
               status.type === 'seventyfive' || status.type === 'fivefold' ||
               status.type === 'agreement') title.textContent = 'Empate';
      else title.textContent = 'Fim de jogo';
    }

    if (text) {
      if (botMode && status.type === 'resign') {
        text.textContent = status.winner === app.myColor
          ? 'O bot desistiu. Você venceu!'
          : 'Você desistiu. O bot venceu.';
      } else {
        text.textContent = resultText(status.type, status.winner);
      }
    }

    if (rematch) {
      rematch.classList.toggle('hidden', !botMode);
      rematch.disabled = false;
      rematch.textContent = 'Revanche';
    }

    $('result').classList.remove('hidden');
    Sound.end();
  }

  function maybeShowRoomResult() {
    if (app.mode !== 'online' || !app.room || !app.room.result) return;
    const result = app.room.result;
    const key = 'room|' + result.at + '|' + result.reason + '|' + (result.winner || '');
    if (app.lastResultKey === key) return;
    app.lastResultKey = key;

    const title = $('result-title');
    const text = $('result-text');
    const rematch = $('result-rematch');
    if (title) {
      title.textContent = result.winner
        ? 'Vitória das ' + (result.winner === 'w' ? 'brancas' : 'pretas')
        : 'Empate';
    }
    if (text) text.textContent = resultText(result.reason, result.winner);

    const canRematch = app.myRole === 'player' && app.room.players.w && app.room.players.b;
    if (rematch) {
      rematch.classList.toggle('hidden', !canRematch);
      rematch.disabled = false;
      rematch.textContent = 'Revanche';
    }
    $('result').classList.remove('hidden');
    Sound.end();
  }

  function maybeHandleDrawOffer() {
    if (app.mode !== 'online' || !app.room || !app.room.drawOffer ||
        app.room.meta.status !== 'playing') {
      app.lastDrawPrompt = '';
      return;
    }

    const offer = app.room.drawOffer;
    if (offer.by === app.myColor) return;

    const key = String(offer.at) + '|' + offer.by;
    if (app.lastDrawPrompt === key) return;

    if (confirmResolver) {
      if (!app.drawRetryTimer) {
        app.drawRetryTimer = window.setTimeout(function () {
          app.drawRetryTimer = null;
          maybeHandleDrawOffer();
        }, 1800);
      }
      return;
    }

    app.lastDrawPrompt = key;
    confirmDialog('Propor empate', 'O adversário propôs empate. Aceitar?', 'Aceitar')
      .then(function (accepted) {
        if (app.mode !== 'online' || !app.room || !app.room.drawOffer) return;
        const action = accepted ? 'accept' : 'decline';
        if (net.isHost) hostDraw(net.hostRoom, app.myColor, action);
        else sendIntent({ type: 'draw', action: action });
      });
  }

  /* ------------------------------------------------------------
     CONFIGURAÇÕES E AÇÕES DA PARTIDA
     ------------------------------------------------------------ */
  function populateSettingsOptions() {
    const theme = $('opt-theme');
    const skin = $('opt-skin');
    if (!B || !B.THEMES || !B.SKINS) return;

    if (theme) {
      theme.innerHTML = Object.keys(B.THEMES).map(function (key) {
        return '<option value="' + key + '">' + B.THEMES[key].label + '</option>';
      }).join('');
    }
    if (skin) {
      skin.innerHTML = Object.keys(B.SKINS).map(function (key) {
        return '<option value="' + key + '">' + B.SKINS[key].label + '</option>';
      }).join('');
    }
  }

  function renderLobbyIdentity() {
    const nick = $('nickname');
    if (nick) nick.value = myName();
    const optNick = $('opt-nickname');
    if (optNick) optNick.value = myName();
    const uid = $('uid-label');
    if (uid) {
      uid.textContent = net.selfId ? 'Peer ' + String(net.selfId).slice(0, 6) + '…' : '';
    }
  }

  function openSettings() {
    populateSettingsOptions();
    const effects = $('opt-effects');
    const sound = $('opt-sound');
    const autofocus = $('opt-autofocus');
    const theme = $('opt-theme');
    const skin = $('opt-skin');
    const nick = $('opt-nickname');
    if (effects) effects.checked = !!settings.effects;
    if (sound) sound.checked = !!settings.sound;
    if (autofocus) autofocus.checked = !!settings.autoFocus;
    const presence = $('opt-presence');
    if (presence) presence.checked = settings.showPresence !== false;
    if (theme) theme.value = settings.theme;
    if (skin) skin.value = settings.skin;
    if (nick) nick.value = myName();
    $('settings').classList.remove('hidden');
  }

  function previewVisuals() {
    if (!boardReady) return;
    const theme = $('opt-theme');
    const skin = $('opt-skin');
    const effects = $('opt-effects');
    if (theme) B.setTheme(theme.value);
    if (skin) B.setSkin(skin.value);
    if (effects) B.setEffects(effects.checked);
  }

  function announceName() {
    if (app.mode !== 'online' || !app.room) return;
    if (net.isHost && net.hostRoom) {
      const color = findColorByPeer(net.hostRoom, net.selfId);
      if (color && net.hostRoom.players[color]) {
        net.hostRoom.players[color].name = myName();
        hostCommit(net.hostRoom);
      }
    } else {
      sendHelloToAll();
    }
  }

  function saveSettingsFromModal(quiet) {
    const nick = $('opt-nickname');
    const theme = $('opt-theme');
    const skin = $('opt-skin');
    const effects = $('opt-effects');
    const sound = $('opt-sound');
    const autofocus = $('opt-autofocus');
    const presence = $('opt-presence');

    settings.nickname = cleanName(nick ? nick.value : settings.nickname);
    settings.theme = theme ? theme.value : settings.theme;
    settings.skin = skin ? skin.value : settings.skin;
    settings.effects = effects ? !!effects.checked : settings.effects;
    settings.sound = sound ? !!sound.checked : settings.sound;
    settings.autoFocus = autofocus ? !!autofocus.checked : settings.autoFocus;

    const wantedPresence = presence ? !!presence.checked : settings.showPresence;
    const presenceChanged = settings.showPresence !== wantedPresence;
    settings.showPresence = wantedPresence;

    saveSettings();
    applyVisualSettings();
    renderLobbyIdentity();
    announceName();

    if (presenceChanged) {
      if (settings.showPresence) {
        ensurePresence().then(function (room) {
          if (room) {
            setNetStatus('ok', 'P2P pronto', 'Conectado à rede P2P. A conexão é direta entre os navegadores.');
          }
        }).catch(function () { /* ignore */ });
      } else {
        leavePresence();
        setNetStatus('', 'P2P sob demanda', 'Contador online desativado nas configurações.');
      }
    }

    if (settings.autoFocus && app.myColor && boardReady) B.setOrientation(app.myColor);

    $('settings').classList.add('hidden');
    if (!quiet) toast('Configurações salvas.', 'success');
  }

  function requestRematch() {
    if (app.mode === 'bot') {
      requestBotRematch();
      return;
    }
    if (app.mode !== 'online' || !app.room || app.room.meta.status !== 'finished') return;
    if (!app.myColor) return;

    if (net.isHost) hostRematch(net.hostRoom, app.myColor);
    else sendIntent({ type: 'rematch' });

    toast('Pedido de revanche enviado.');
  }

  function onResign() {
    if (app.mode === 'bot') {
      onBotResign();
      return;
    }
    if (app.mode !== 'online' || !app.room || app.room.meta.status !== 'playing') return;
    if (!app.myColor || app.myRole !== 'player') return;

    confirmDialog('Desistir da partida?', 'Você vai perder esta partida.', 'Desistir')
      .then(function (ok) {
        if (!ok) return;
        if (net.isHost) {
          hostFinish(net.hostRoom, C.opponent(app.myColor), 'resign');
          hostCommit(net.hostRoom);
        } else {
          sendIntent({ type: 'resign' });
        }
      });
  }

  function onDrawClick() {
    if (app.mode === 'bot') {
      onBotDraw();
      return;
    }
    if (app.mode !== 'online' || !app.room || app.room.meta.status !== 'playing') return;
    if (!app.myColor || app.myRole !== 'player') return;

    const claimStatus = C.computeStatus(app.game.state, app.room.game.positionCounts);
    const canClaimDraw = app.game.state.turn === app.myColor &&
      (claimStatus.canClaimThreefold || claimStatus.canClaimFiftyMove);
    const offer = app.room.drawOffer;
    let action = canClaimDraw ? 'claim' : 'offer';
    if (!canClaimDraw && offer) action = offer.by === app.myColor ? 'cancel' : 'accept';

    if (net.isHost) hostDraw(net.hostRoom, app.myColor, action);
    else sendIntent({ type: 'draw', action: action });

    if (action === 'offer') toast('Oferta de empate enviada.', 'success');
  }

  function sendChat(event) {
    if (event) event.preventDefault();
    const input = $('chat-input');
    if (!input) return;

    const text = String(input.value || '').trim().slice(0, 300);
    if (!text) return;

    if (app.mode !== 'online' || !app.room) {
      toast('O chat está disponível apenas em partidas online.');
      return;
    }

    if (net.isHost) hostChat(net.hostRoom, net.selfId, text, app.myColor);
    else sendIntent({ type: 'chat', text: text });

    input.value = '';
  }

  function copyInvite() {
    if (app.mode !== 'online' || !net.roomId) {
      toast('Entre em uma sala para copiar o convite.');
      return;
    }
    const link = inviteLink();
    copyText(link).then(function () {
      toast('Link de convite copiado!', 'success');
    }).catch(function () {
      toast(link);
    });
  }

  function switchTab(name) {
    const tabs = document.querySelectorAll('.tab');
    for (let i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].dataset.tab === name);
    }
    const panels = document.querySelectorAll('.tab-panel');
    for (let i = 0; i < panels.length; i++) {
      panels[i].classList.toggle('active', panels[i].id === 'tab-' + name);
    }

    if (name === 'public') {
      ensureLobby().then(function () {
        requestAds();
        renderPublicRooms();
      }).catch(function () {
        const list = $('public-rooms');
        if (list) {
          list.innerHTML = '<div class="empty-state">Não foi possível carregar as salas. Verifique a internet.</div>';
        }
      });
    } else if (name === 'join') {
      const input = $('join-code');
      if (input && !input.value) window.setTimeout(function () { input.focus(); }, 60);
    }
  }

  /* ------------------------------------------------------------
     WIRING DA INTERFACE
     ------------------------------------------------------------ */
  function on(id, event, handler) {
    const el = $(id);
    if (el) el.addEventListener(event, handler);
  }

  function wireEvents() {
    const tabs = document.querySelectorAll('.tab');
    for (let i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        switchTab(this.dataset.tab);
      });
    }

    on('quick-match', 'click', tryQuickMatch);
    on('cancel-match', 'click', cancelQuickMatch);
    on('create-room', 'click', createRoom);
    on('join-btn', 'click', joinByCode);
    on('local-play', 'click', startLocalGame);
    on('bot-play', 'click', startBotGame);

    on('loader-retry', 'click', function () {
      const retry = loaderRetry;
      if (!retry) return;
      loaderRetry = null;
      hideLoader();
      retry();
    });
    on('loader-cancel', 'click', function () {
      net.joinSeq += 1;
      hideLoader();
      backToLobby(true);
    });

    on('bot-level', 'change', function () {
      botPrefs.level = Math.min(6, Math.max(1, Math.round(Number(this.value) || 3)));
      saveBotPrefs();
      updateBotDescription();
    });
    on('bot-style', 'change', function () {
      botPrefs.style = this.value;
      saveBotPrefs();
    });
    on('bot-color', 'change', function () {
      botPrefs.color = this.value;
      saveBotPrefs();
    });
    on('bot-tc', 'change', function () {
      botPrefs.tc = this.value;
      saveBotPrefs();
    });

    on('panel-toggle', 'click', function () {
      const panel = $('panel');
      setPanelCollapsed(!panel.classList.contains('collapsed'));
    });

    on('join-code', 'keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        joinByCode();
      }
    });

    on('refresh-public', 'click', function () {
      ensureLobby().then(function () {
        requestAds();
        renderPublicRooms();
      }).catch(function () {
        toast('Não foi possível atualizar as salas.', 'error');
      });
    });

    const publicRooms = $('public-rooms');
    if (publicRooms) {
      publicRooms.addEventListener('click', function (event) {
        const button = event.target.closest('button[data-code]');
        if (!button) return;
        joinAsGuest(button.dataset.code, false);
      });
    }

    on('open-settings-lobby', 'click', openSettings);
    on('settings-btn', 'click', openSettings);
    on('close-settings', 'click', function () { saveSettingsFromModal(true); });
    on('save-settings', 'click', function () { saveSettingsFromModal(false); });
    on('reset-camera', 'click', function () {
      if (boardReady) B.resetCamera();
    });

    on('nickname', 'change', function () {
      settings.nickname = cleanName(this.value);
      this.value = settings.nickname;
      saveSettings();
      renderLobbyIdentity();
      announceName();
    });

    on('opt-theme', 'change', previewVisuals);
    on('opt-skin', 'change', previewVisuals);
    on('opt-effects', 'change', previewVisuals);

    on('home-btn', 'click', function () {
      if (app.mode === 'online' && net.room) leaveRoom();
      else backToLobby(false);
    });

    on('flip-btn', 'click', function () {
      if (!boardReady) return;
      B.setOrientation(B.getOrientation() === 'w' ? 'b' : 'w');
    });

    on('undo-btn', 'click', undoLocalMove);
    on('new-local-btn', 'click', newGame);
    on('leave-btn', 'click', leaveRoom);
    on('draw-btn', 'click', onDrawClick);
    on('resign-btn', 'click', onResign);
    on('rematch-btn', 'click', requestRematch);

    on('copy-invite', 'click', copyInvite);
    on('copy-invite-2', 'click', copyInvite);

    on('result-rematch', 'click', function () {
      if (app.mode === 'online' && app.room) {
        requestRematch();
      } else if (app.mode === 'bot') {
        requestBotRematch();
      } else {
        $('result').classList.add('hidden');
        resetLocalGame();
      }
    });
    on('result-close', 'click', function () {
      $('result').classList.add('hidden');
    });

    on('confirm-yes', 'click', function () { closeConfirm(true); });
    on('confirm-no', 'click', function () { closeConfirm(false); });

    const chatForm = $('chat-form');
    if (chatForm) chatForm.addEventListener('submit', sendChat);

    const promoButtons = document.querySelectorAll('#promotion button[data-piece]');
    for (let i = 0; i < promoButtons.length; i++) {
      promoButtons[i].addEventListener('click', function () {
        if (!app.pendingPromotion) return;
        const piece = this.dataset.piece;
        const move = app.pendingPromotion.find(function (mv) { return mv.promotion === piece; });
        closePromotion();
        if (move) playMove(move);
      });
    }

    const pTabs = document.querySelectorAll('.ptab');
    for (let i = 0; i < pTabs.length; i++) {
      pTabs[i].addEventListener('click', function () {
        const name = this.dataset.ptab;
        for (let j = 0; j < pTabs.length; j++) {
          pTabs[j].classList.toggle('active', pTabs[j] === this);
        }
        $('pane-moves').classList.toggle('active', name === 'moves');
        $('pane-chat').classList.toggle('active', name === 'chat');
        if (name === 'chat') {
          app.unreadChat = 0;
          setChatBadge(0);
          updateChat();
          const input = $('chat-input');
          if (input && !input.disabled) input.focus();
        }
      });
    }

    window.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (!$('promotion').classList.contains('hidden')) {
        closePromotion();
      } else if (app.selected) {
        clearSelection();
      } else if (!$('settings').classList.contains('hidden')) {
        saveSettingsFromModal(true);
      } else if (!$('result').classList.contains('hidden')) {
        $('result').classList.add('hidden');
      }
    });

    window.addEventListener('beforeunload', function () {
      if (net.isHost && net.actions) {
        try { net.actions.bye.send({ reason: 'host-left' }); } catch (e) { /* ignore */ }
      }
    });
  }

  /* ------------------------------------------------------------
     INICIALIZAÇÃO
     ------------------------------------------------------------ */
  function init() {
    if (!C || !B) {
      const error = $('load-error');
      if (error) error.hidden = false;
      return;
    }

    loadSettings();
    loadBotPrefs();
    populateSettingsOptions();
    applyBotPrefsToForm();
    renderLobbyIdentity();
    applyVisualSettings();
    setQuickUi(false);
    wireEvents();
    watchPresenceUi();
    schedulePresence();
    switchTab('quick');
    handleInviteFromUrl();

    window.addEventListener('resize', function () {
      if (!isMobile() || isCompactLandscape()) setPanelCollapsed(false);
    });

    window.setInterval(function () {
      updateClocks();
    }, 250);
  }

  /* Hook de depuração: usado por testes e pelo console do navegador. */
  window.__xadrez = {
    app: app,
    net: net,
    settings: function () { return settings; },
    startLocalGame: startLocalGame,
    startBotGame: startBotGame,
    resetLocalGame: resetLocalGame,
    resetBotGame: resetBotGame,
    requestBotRematch: requestBotRematch,
    updateBotDescription: updateBotDescription,
    setPanelCollapsed: setPanelCollapsed,
    playMove: playMove,
    handleSquareClick: handleSquareClick,
    renderAll: renderAll,
    undoLocalMove: undoLocalMove,
    createRoom: createRoom,
    joinAsGuest: joinAsGuest,
    tryQuickMatch: tryQuickMatch,
    backToLobby: backToLobby,
  };

  init();
})();