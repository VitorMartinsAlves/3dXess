/* Xadrez 3D - bot local (avaliação + busca alfa-beta) */
(function (global) {
  'use strict';

  const C = global.Chess;
  if (!C) return;

  const MATE = 1000000;
  const INF = 1000000000;
  const MAX_QUIESCENCE_CHECK_EXTENSION = 8;
  const PIECE_VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

  /* Níveis: profundidade, tempo de busca, chance de lance aleatório,
     ruído na avaliação e profundidade da busca de capturas. */
  const LEVELS = {
    1: {
      label: 'Muito fácil', name: 'Patinho', elo: '~400',
      depth: 1, timeMs: 120, book: 0.12, blunder: 0.40, noise: 75,
      quiescence: 1, minDelay: 240, delayJitter: 260,
      desc: 'Joga de forma imprevisível, às vezes deixa peças de graça. Ideal para aprender.',
    },
    2: {
      label: 'Fácil', name: 'Aprendiz', elo: '~800',
      depth: 2, timeMs: 260, book: 0.24, blunder: 0.16, noise: 38,
      quiescence: 2, minDelay: 260, delayJitter: 280,
      desc: 'Já enxerga capturas simples, mas ainda comete erros táticos.',
    },
    3: {
      label: 'Médio', name: 'Tático', elo: '~1200',
      depth: 2, timeMs: 650, book: 0.42, blunder: 0.05, noise: 16,
      quiescence: 4, minDelay: 300, delayJitter: 300,
      desc: 'Calcula algumas jogadas à frente e costuma punir peças penduradas.',
    },
    4: {
      label: 'Difícil', name: 'Veterano', elo: '~1600',
      depth: 3, timeMs: 1100, book: 0.58, blunder: 0, noise: 6,
      quiescence: 4, minDelay: 340, delayJitter: 320,
      desc: 'Busca com profundidade 3, boa visão tática e erros raros.',
    },
    5: {
      label: 'Muito difícil', name: 'Mestre', elo: '~2000',
      depth: 4, timeMs: 1900, book: 0.70, blunder: 0, noise: 0,
      quiescence: 6, minDelay: 380, delayJitter: 340,
      desc: 'Busca profunda, ordenação de lances e avaliação posicional forte.',
    },
    6: {
      label: 'Mestre', name: 'Grão-mestre', elo: '~2300',
      depth: 5, timeMs: 3400, book: 0.78, blunder: 0, noise: 0,
      quiescence: 8, minDelay: 420, delayJitter: 380,
      desc: 'O nível mais forte: busca profunda com tempo maior. Prepare a defesa.',
    },
  };

  const STYLES = {
    balanced: {
      label: 'Equilibrado', desc: 'Mistura ataque, defesa e posição.',
      pst: 1, king: 1, pawns: 1, aggression: 0.2, randomness: 1,
    },
    aggressive: {
      label: 'Agressivo', desc: 'Gosta de atacar o rei e criar complicações.',
      pst: 1.08, king: 0.65, pawns: 0.85, aggression: 1.35, randomness: 1.1,
    },
    defensive: {
      label: 'Defensivo', desc: 'Protege o rei, a estrutura de peões e evita riscos.',
      pst: 0.98, king: 1.7, pawns: 1.3, aggression: 0.15, randomness: 0.9,
    },
    positional: {
      label: 'Posicional', desc: 'Valoriza casas boas, mobilidade e peões saudáveis.',
      pst: 1.15, king: 1.1, pawns: 1.35, aggression: 0.45, randomness: 0.8,
    },
  };

  /* Tabelas posicionais (linha 8 no topo, linha 1 embaixo). */
  const PAWN_PST = [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ];

  const KNIGHT_PST = [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ];

  const BISHOP_PST = [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ];

  const ROOK_PST = [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ];

  const QUEEN_PST = [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ];

  const KING_MID_PST = [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ];

  const KING_END_PST = [
    -50, -40, -30, -20, -20, -30, -40, -50,
    -30, -20, -10, 0, 0, -10, -20, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -30, 0, 0, 0, 0, -30, -30,
    -50, -30, -30, -30, -30, -30, -30, -50,
  ];

  const PST = {
    p: PAWN_PST, n: KNIGHT_PST, b: BISHOP_PST,
    r: ROOK_PST, q: QUEEN_PST,
  };

  function pstValue(table, r, f, color) {
    return color === 'w' ? table[(7 - r) * 8 + f] : table[r * 8 + (7 - f)];
  }

  function fenKey(st) {
    return C.stateToFen(st).split(' ').slice(0, 4).join(' ');
  }

  function moveToUci(mv) {
    return C.squareName(mv.from.r, mv.from.f) + C.squareName(mv.to.r, mv.to.f) +
      (mv.promotion || '');
  }

  function uciToMove(st, uci) {
    if (!uci || uci.length < 4) return null;
    const files = C.FILES;
    const from = { r: Number(uci[1]) - 1, f: files.indexOf(uci[0]) };
    const to = { r: Number(uci[3]) - 1, f: files.indexOf(uci[2]) };
    if (from.r < 0 || from.r > 7 || from.f < 0 || from.f > 7) return null;
    if (to.r < 0 || to.r > 7 || to.f < 0 || to.f > 7) return null;
    return C.findLegalMove(st, from, to, uci[4] || null);
  }

  function sameMove(a, b) {
    return a && b && a.from.r === b.from.r && a.from.f === b.from.f &&
      a.to.r === b.to.r && a.to.f === b.to.f && (a.promotion || '') === (b.promotion || '');
  }

  /* ------------------------------------------------------------
     MAKE / UNMAKE RÁPIDO (usado só na busca)
     ------------------------------------------------------------ */
  function makeMove(st, mv) {
    const b = st.board;
    const piece = b[mv.from.r][mv.from.f];
    const undo = {
      piece: piece,
      captured: null,
      capturedSquare: null,
      castling: {
        w: { k: st.castling.w.k, q: st.castling.w.q },
        b: { k: st.castling.b.k, q: st.castling.b.q },
      },
      enPassant: st.enPassant,
      halfmove: st.halfmove,
      fullmove: st.fullmove,
      turn: st.turn,
      rook: null,
    };

    if (mv.enPassant) {
      undo.captured = b[mv.from.r][mv.to.f];
      undo.capturedSquare = { r: mv.from.r, f: mv.to.f };
      b[mv.from.r][mv.to.f] = null;
    } else if (b[mv.to.r][mv.to.f]) {
      undo.captured = b[mv.to.r][mv.to.f];
      undo.capturedSquare = { r: mv.to.r, f: mv.to.f };
    }

    b[mv.to.r][mv.to.f] = mv.promotion
      ? { type: mv.promotion, color: piece.color }
      : piece;
    b[mv.from.r][mv.from.f] = null;

    if (piece.type === 'k' && Math.abs(mv.to.f - mv.from.f) === 2) {
      const rank = mv.from.r;
      if (mv.to.f === 6) {
        undo.rook = { from: { r: rank, f: 7 }, to: { r: rank, f: 5 }, piece: b[rank][7] };
        b[rank][5] = b[rank][7];
        b[rank][7] = null;
      } else {
        undo.rook = { from: { r: rank, f: 0 }, to: { r: rank, f: 3 }, piece: b[rank][0] };
        b[rank][3] = b[rank][0];
        b[rank][0] = null;
      }
    }

    const color = piece.color;
    const enemy = C.opponent(color);

    if (piece.type === 'k') {
      st.castling[color].k = false;
      st.castling[color].q = false;
    }
    if (piece.type === 'r') {
      const home = color === 'w' ? 0 : 7;
      if (mv.from.r === home) {
        if (mv.from.f === 0) st.castling[color].q = false;
        if (mv.from.f === 7) st.castling[color].k = false;
      }
    }
    if (undo.captured && undo.captured.type === 'r') {
      const enemyHome = enemy === 'w' ? 0 : 7;
      if (mv.to.r === enemyHome) {
        if (mv.to.f === 0) st.castling[enemy].q = false;
        if (mv.to.f === 7) st.castling[enemy].k = false;
      }
    }

    st.enPassant = piece.type === 'p' && Math.abs(mv.to.r - mv.from.r) === 2
      ? { r: (mv.from.r + mv.to.r) / 2, f: mv.from.f }
      : null;

    if (piece.type === 'p' || undo.captured) st.halfmove = 0;
    else st.halfmove += 1;

    if (st.turn === 'b') st.fullmove += 1;
    st.turn = enemy;

    return undo;
  }

  function unmakeMove(st, mv, undo) {
    const b = st.board;

    if (undo.rook) {
      b[undo.rook.from.r][undo.rook.from.f] = undo.rook.piece;
      b[undo.rook.to.r][undo.rook.to.f] = null;
    }

    if (mv.enPassant) {
      b[mv.to.r][mv.to.f] = null;
      if (undo.capturedSquare) {
        b[undo.capturedSquare.r][undo.capturedSquare.f] = undo.captured;
      }
    } else {
      b[mv.to.r][mv.to.f] = undo.captured || null;
    }

    b[mv.from.r][mv.from.f] = undo.piece;

    st.castling.w.k = undo.castling.w.k;
    st.castling.w.q = undo.castling.w.q;
    st.castling.b.k = undo.castling.b.k;
    st.castling.b.q = undo.castling.b.q;
    st.enPassant = undo.enPassant;
    st.halfmove = undo.halfmove;
    st.fullmove = undo.fullmove;
    st.turn = undo.turn;
  }

  function legalMovesFast(st, color) {
    const side = color || st.turn;
    const pseudo = C.generatePseudoMoves(st, side);
    const legal = [];
    for (let i = 0; i < pseudo.length; i++) {
      const mv = pseudo[i];
      const undo = makeMove(st, mv);
      if (!C.isInCheck(st, side)) legal.push(mv);
      unmakeMove(st, mv, undo);
    }
    return legal;
  }

  /* ------------------------------------------------------------
     AVALIAÇÃO POSICIONAL
     ------------------------------------------------------------ */
  function evaluateWhite(st, cfg) {
    const b = st.board;
    let score = 0;
    let phaseMat = 0;

    const pawns = { w: [0, 0, 0, 0, 0, 0, 0, 0], b: [0, 0, 0, 0, 0, 0, 0, 0] };
    const pawnList = { w: [], b: [] };
    const bishops = { w: 0, b: 0 };
    const rooks = { w: [], b: [] };
    const attackers = { w: [], b: [] };
    const kings = { w: null, b: null };

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = b[r][f];
        if (!p) continue;
        const color = p.color;

        if (p.type === 'k') {
          kings[color] = { r: r, f: f };
          continue;
        }

        const value = PIECE_VALUE[p.type] || 0;
        const table = PST[p.type];
        const bonus = table ? pstValue(table, r, f, color) : 0;
        score += color === 'w'
          ? value + bonus * cfg.pst
          : -(value + bonus * cfg.pst);

        if (p.type !== 'p') phaseMat += value;
        if (p.type === 'p') {
          pawns[color][f] += 1;
          pawnList[color].push({ r: r, f: f });
        } else if (p.type === 'b') {
          bishops[color] += 1;
          attackers[color].push({ r: r, f: f, type: p.type });
        } else if (p.type === 'r') {
          rooks[color].push({ r: r, f: f });
          attackers[color].push({ r: r, f: f, type: p.type });
        } else if (p.type === 'q' || p.type === 'n') {
          attackers[color].push({ r: r, f: f, type: p.type });
        }
      }
    }

    const phase = Math.min(1, Math.max(0.18, phaseMat / 5200));

    /* Rei: tabela de meio-jogo misturada com a de final. */
    for (const color of ['w', 'b']) {
      const k = kings[color];
      if (!k) continue;
      const mid = pstValue(KING_MID_PST, k.r, k.f, color);
      const end = pstValue(KING_END_PST, k.r, k.f, color);
      const value = (mid * phase + end * (1 - phase)) * cfg.king;
      score += color === 'w' ? value : -value;
    }

    /* Estrutura de peões. */
    for (const color of ['w', 'b']) {
      const sign = color === 'w' ? 1 : -1;
      const enemy = C.opponent(color);
      const own = pawns[color];
      const enemyPawns = pawnList[enemy];

      for (let f = 0; f < 8; f++) {
        const count = own[f];
        if (count > 1) score += sign * (-12 * (count - 1)) * cfg.pawns;
        if (count > 0 && (own[f - 1] || 0) === 0 && (own[f + 1] || 0) === 0) {
          score += sign * -14 * cfg.pawns;
        }
      }

      for (let i = 0; i < pawnList[color].length; i++) {
        const p = pawnList[color][i];

        let passed = true;
        for (let j = 0; j < enemyPawns.length; j++) {
          const ep = enemyPawns[j];
          if (Math.abs(ep.f - p.f) <= 1 &&
              (color === 'w' ? ep.r > p.r : ep.r < p.r)) {
            passed = false;
            break;
          }
        }
        if (passed) {
          const advance = color === 'w' ? p.r : 7 - p.r;
          score += sign * (12 + advance * 7) * cfg.pawns;
        }

        let connected = false;
        const behind = color === 'w' ? p.r - 1 : p.r + 1;
        for (const df of [-1, 1]) {
          const ff = p.f + df;
          if (ff < 0 || ff > 7) continue;
          if ((behind >= 0 && behind < 8 && b[behind][ff] &&
               b[behind][ff].type === 'p' && b[behind][ff].color === color) ||
              (b[p.r][ff] && b[p.r][ff].type === 'p' && b[p.r][ff].color === color)) {
            connected = true;
          }
        }
        if (connected) score += sign * 4 * cfg.pawns;
      }
    }

    /* Par de bispos. */
    if (bishops.w >= 2) score += 28 * cfg.pst;
    if (bishops.b >= 2) score -= 28 * cfg.pst;

    /* Torres em colunas abertas/semiabertas. */
    for (const color of ['w', 'b']) {
      const sign = color === 'w' ? 1 : -1;
      const enemy = C.opponent(color);
      for (let i = 0; i < rooks[color].length; i++) {
        const rook = rooks[color][i];
        const ownPawns = pawns[color][rook.f];
        const enemyPawns = pawns[enemy][rook.f];
        if (ownPawns === 0) {
          score += sign * (enemyPawns === 0 ? 18 : 8) * cfg.pst;
        }
      }
    }

    /* Escudo do rei no meio-jogo. */
    if (phase > 0.35) {
      for (const color of ['w', 'b']) {
        const k = kings[color];
        if (!k) continue;
        const sign = color === 'w' ? 1 : -1;
        const dir = color === 'w' ? 1 : -1;
        const rank = k.r + dir;
        if (rank < 0 || rank > 7) continue;
        for (let df = -1; df <= 1; df++) {
          const ff = k.f + df;
          if (ff < 0 || ff > 7) continue;
          const p = b[rank][ff];
          if (p && p.type === 'p' && p.color === color) {
            score += sign * 8 * cfg.king;
          } else {
            score += sign * -5 * cfg.king;
          }
        }
      }
    }

    /* Estilo agressivo: peças perto do rei inimigo. */
    if (cfg.aggression > 0) {
      for (const color of ['w', 'b']) {
        const enemyKing = kings[C.opponent(color)];
        if (!enemyKing) continue;
        const sign = color === 'w' ? 1 : -1;
        for (let i = 0; i < attackers[color].length; i++) {
          const p = attackers[color][i];
          const dist = Math.max(Math.abs(p.r - enemyKing.r), Math.abs(p.f - enemyKing.f));
          if (dist <= 6) {
            score += sign * (7 - dist) * 2.2 * cfg.aggression;
          }
        }
      }
    }

    /* Tempo: quem tem a vez ganha um pequeno bônus. */
    score += st.turn === 'w' ? 8 : -8;
    return score;
  }

  function makeRandom(ctx) {
    ctx.rngState = (ctx.rngState * 1664525 + 1013904223) >>> 0;
    return ctx.rngState / 4294967296;
  }

  function evaluate(st, ctx) {
    if (st.halfmove >= 100) return 0;
    if (C.insufficientMaterial(st.board)) return 0;

    const white = evaluateWhite(st, ctx.style);
    let value = st.turn === 'w' ? white : -white;
    if (ctx.noise > 0) value += (makeRandom(ctx) * 2 - 1) * ctx.noise;
    return value;
  }

  /* ------------------------------------------------------------
     LIVRO DE ABERTURAS (pequeno, para variar as partidas)
     ------------------------------------------------------------ */
  const BOOK_LINES = [
    ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6', 'b5a4', 'g8f6', 'e1g1', 'f8e7'],
    ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'c2c3', 'g8f6', 'd2d3', 'd7d6'],
    ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'd2d4', 'e5d4', 'f3d4', 'g8f6', 'b1c3', 'f8b4'],
    ['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3', 'a7a6'],
    ['e2e4', 'c7c5', 'b1c3', 'b8c6', 'g2g3', 'g7g6', 'f1g2', 'f8g7'],
    ['e2e4', 'e7e6', 'd2d4', 'd7d5', 'b1c3', 'g8f6', 'e4e5', 'f6d7'],
    ['e2e4', 'c7c6', 'd2d4', 'd7d5', 'b1c3', 'd5e4', 'c3e4', 'c8f5'],
    ['e2e4', 'd7d5', 'e4d5', 'd8d5', 'b1c3', 'd5a5', 'd2d4', 'g8f6'],
    ['d2d4', 'd7d5', 'c2c4', 'e7e6', 'b1c3', 'g8f6', 'c4d5', 'e6d5'],
    ['d2d4', 'd7d5', 'c2c4', 'c7c6', 'g1f3', 'g8f6', 'b1c3', 'd5c4'],
    ['d2d4', 'g8f6', 'c2c4', 'g7g6', 'b1c3', 'f8g7', 'e2e4', 'd7d6'],
    ['d2d4', 'g8f6', 'c2c4', 'e7e6', 'g1f3', 'b7b6', 'g2g3', 'c8b7'],
    ['c2c4', 'e7e5', 'b1c3', 'g8f6', 'g2g3', 'd7d5', 'c4d5', 'f6d5'],
    ['g1f3', 'd7d5', 'g2g3', 'g8f6', 'f1g2', 'g7g6', 'e1g1', 'f8g7'],
    ['e2e4', 'e7e5', 'f2f4', 'e5f4', 'g1f3', 'g7g5', 'f1c4', 'g5g4'],
    ['d2d4', 'd7d5', 'c1f4', 'g8f6', 'e2e3', 'e7e6', 'g1f3', 'c7c5'],
  ];

  const BOOK = {};

  function buildBook() {
    for (let i = 0; i < BOOK_LINES.length; i++) {
      const line = BOOK_LINES[i];
      const st = C.createInitialState();
      for (let j = 0; j < line.length; j++) {
        const uci = line[j];
        const key = fenKey(st);
        if (!BOOK[key]) BOOK[key] = [];
        if (BOOK[key].indexOf(uci) === -1) BOOK[key].push(uci);

        const mv = uciToMove(st, uci);
        if (!mv) break;
        C.applyMove(st, mv);
      }
    }
  }

  buildBook();

  function bookMove(st, cfg) {
    if (Math.random() >= cfg.book) return null;
    const list = BOOK[fenKey(st)];
    if (!list || !list.length) return null;

    const candidates = [];
    for (let i = 0; i < list.length; i++) {
      const mv = uciToMove(st, list[i]);
      if (mv) candidates.push(mv);
    }
    if (!candidates.length) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /* ------------------------------------------------------------
     BUSCA
     ------------------------------------------------------------ */
  function moveKey(mv) {
    return (mv.from.r * 8 + mv.from.f) * 64 + (mv.to.r * 8 + mv.to.f) +
      (mv.promotion ? 4096 : 0);
  }

  function orderMoves(st, moves, ctx, ply) {
    const killers = ctx.killers[ply] || (ctx.killers[ply] = []);

    for (let i = 0; i < moves.length; i++) {
      const mv = moves[i];
      const attacker = st.board[mv.from.r][mv.from.f];
      const victim = mv.enPassant ? { type: 'p' } : st.board[mv.to.r][mv.to.f];
      let score = 0;

      if (victim) {
        score += 100000 + (PIECE_VALUE[victim.type] || 0) * 10 -
          (PIECE_VALUE[attacker.type] || 0);
      }
      if (mv.promotion) score += 90000 + (PIECE_VALUE[mv.promotion] || 0);
      for (let k = 0; k < killers.length; k++) {
        if (sameMove(mv, killers[k])) score += 80000;
      }
      score += ctx.history[moveKey(mv)] || 0;
      mv._botScore = score;
    }

    moves.sort(function (a, b) { return b._botScore - a._botScore; });
  }

  function randomMove(st, moves) {
    let total = 0;
    const weights = [];
    for (let i = 0; i < moves.length; i++) {
      let weight = 1;
      if (moves[i].capture) weight += 2;
      if (moves[i].promotion) weight += 5;
      weights.push(weight);
      total += weight;
    }

    let pick = Math.random() * total;
    for (let i = 0; i < moves.length; i++) {
      pick -= weights[i];
      if (pick <= 0) return moves[i];
    }
    return moves[0];
  }

  function quiesce(st, alpha, beta, ply, ctx) {
    ctx.nodes += 1;
    if ((ctx.nodes & 127) === 0 && Date.now() > ctx.deadline) {
      ctx.aborted = true;
      return 0;
    }

    const inCheck = C.isInCheck(st, st.turn);
    const all = legalMovesFast(st);

    if (!all.length) {
      return inCheck ? -MATE + ply : 0;
    }

    if (!inCheck) {
      const stand = evaluate(st, ctx);
      if (stand >= beta) return beta;
      if (stand > alpha) alpha = stand;
      if (ply >= ctx.quiescencePly) return alpha;
    }

    /*
     * Evita uma extensão ilimitada em sequências de xeques/perpétuos.
     * No limite, um lado em xeque ainda escolhe entre todas as evasões
     * legais, mas avalia a posição resultante sem continuar a recursão.
     */
    const hardPlyLimit = ctx.quiescencePly + MAX_QUIESCENCE_CHECK_EXTENSION;
    if (inCheck && ply >= hardPlyLimit) {
      let best = -INF;
      for (let i = 0; i < all.length; i++) {
        const mv = all[i];
        const undo = makeMove(st, mv);
        const score = -evaluate(st, ctx);
        unmakeMove(st, mv, undo);
        if (score > best) best = score;
      }
      return best;
    }

    const moves = [];
    for (let i = 0; i < all.length; i++) {
      if (inCheck || all[i].capture || all[i].promotion) moves.push(all[i]);
    }
    if (!moves.length) return alpha;

    orderMoves(st, moves, ctx, ply);
    for (let i = 0; i < moves.length; i++) {
      const mv = moves[i];
      const undo = makeMove(st, mv);
      const score = -quiesce(st, -beta, -alpha, ply + 1, ctx);
      unmakeMove(st, mv, undo);

      if (ctx.aborted) return 0;
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  function negamax(st, depth, alpha, beta, ply, ctx) {
    ctx.nodes += 1;
    if ((ctx.nodes & 1023) === 0 && Date.now() > ctx.deadline) {
      ctx.aborted = true;
      return 0;
    }

    if (st.halfmove >= 100) return 0;
    if (depth <= 0) return quiesce(st, alpha, beta, ply, ctx);

    const moves = legalMovesFast(st);
    if (!moves.length) {
      return C.isInCheck(st, st.turn) ? -MATE + ply : 0;
    }

    orderMoves(st, moves, ctx, ply);
    let best = -INF;

    for (let i = 0; i < moves.length; i++) {
      const mv = moves[i];
      const undo = makeMove(st, mv);
      const score = -negamax(st, depth - 1, -beta, -alpha, ply + 1, ctx);
      unmakeMove(st, mv, undo);

      if (ctx.aborted) return 0;

      if (score > best) {
        best = score;
        if (ply === 0) ctx.bestMove = mv;
      }
      if (score > alpha) alpha = score;
      if (alpha >= beta) {
        if (!mv.capture && !mv.promotion) {
          const killers = ctx.killers[ply] || (ctx.killers[ply] = []);
          if (!sameMove(killers[0], mv)) {
            killers[1] = killers[0];
            killers[0] = mv;
          }
          const key = moveKey(mv);
          ctx.history[key] = (ctx.history[key] || 0) + depth * depth;
        }
        break;
      }
    }

    return best;
  }

  /* ------------------------------------------------------------
     API PÚBLICA
     ------------------------------------------------------------ */
  function normalizeLevel(value) {
    const n = Math.round(Number(value) || 3);
    return LEVELS[n] ? n : 3;
  }

  function chooseMove(state, options) {
    options = options || {};
    const levelId = normalizeLevel(options.level);
    const cfg = LEVELS[levelId];
    const styleId = STYLES[options.style] ? options.style : 'balanced';
    const style = STYLES[styleId];

    const st = C.cloneState(state);
    const legal = legalMovesFast(st);
    if (!legal.length) return null;

    const start = Date.now();
    const fromBook = bookMove(st, cfg);
    if (fromBook) {
      return {
        move: fromBook,
        uci: moveToUci(fromBook),
        info: {
          level: levelId, style: styleId, depth: 0, score: 0,
          nodes: 0, timeMs: Date.now() - start, book: true, random: false,
        },
      };
    }

    if (Math.random() < cfg.blunder) {
      const mv = randomMove(st, legal);
      return {
        move: mv,
        uci: moveToUci(mv),
        info: {
          level: levelId, style: styleId, depth: 0, score: 0,
          nodes: 0, timeMs: Date.now() - start, book: false, random: true,
        },
      };
    }

    const budget = Math.max(30, Number(options.timeMs) || cfg.timeMs);
    const ctx = {
      style: style,
      noise: cfg.noise * style.randomness,
      deadline: start + budget,
      nodes: 0,
      aborted: false,
      bestMove: null,
      killers: [],
      history: {},
      quiescencePly: cfg.quiescence,
      rngState: (start ^ Math.floor(Math.random() * 0xffffffff)) >>> 0,
    };

    let best = null;
    let bestScore = 0;
    let completedDepth = 0;

    for (let depth = 1; depth <= cfg.depth; depth++) {
      ctx.aborted = false;
      ctx.bestMove = null;
      const score = negamax(st, depth, -INF, INF, 0, ctx);
      if (ctx.aborted) break;
      if (ctx.bestMove) {
        best = ctx.bestMove;
        bestScore = score;
        completedDepth = depth;
      }
      if (Math.abs(score) >= MATE - 1000) break;
    }

    if (!best) best = randomMove(st, legal);

    return {
      move: best,
      uci: moveToUci(best),
      info: {
        level: levelId, style: styleId, depth: completedDepth,
        score: bestScore, nodes: ctx.nodes, timeMs: Date.now() - start,
        book: false, random: false,
      },
    };
  }

  function evaluateState(state, options) {
    options = options || {};
    const st = C.cloneState(state);
    const style = STYLES[options.style] || STYLES.balanced;
    const ctx = {
      style: style,
      noise: 0,
      rngState: 1,
      quiescencePly: 0,
    };
    const side = evaluate(st, ctx);
    return st.turn === 'w' ? side : -side;
  }

  function perft(st, depth) {
    if (depth === 0) return 1;
    const moves = legalMovesFast(st);
    if (depth === 1) return moves.length;
    let total = 0;
    for (let i = 0; i < moves.length; i++) {
      const mv = moves[i];
      const undo = makeMove(st, mv);
      total += perft(st, depth - 1);
      unmakeMove(st, mv, undo);
    }
    return total;
  }

  global.Bot = {
    LEVELS: LEVELS,
    STYLES: STYLES,
    chooseMove: chooseMove,
    evaluateState: evaluateState,
    _test: {
      makeMove: makeMove,
      unmakeMove: unmakeMove,
      legalMovesFast: legalMovesFast,
      perft: perft,
      evaluateWhite: evaluateWhite,
      uciToMove: uciToMove,
      moveToUci: moveToUci,
      BOOK: BOOK,
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
