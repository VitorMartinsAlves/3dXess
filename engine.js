/* Xadrez 3D - motor de regras (independente de UI) */
(function (global) {
  "use strict";

const FILES = 'abcdefgh';
const PROMOTION_PIECES = ['q', 'r', 'b', 'n'];

const KNIGHT_OFFSETS = [
  [1, 2], [2, 1], [2, -1], [1, -2],
  [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];
const KING_OFFSETS = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1],
];
const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

const PIECE_LETTERS = { p: '', n: 'C', b: 'B', r: 'T', q: 'D', k: 'R' };

function opponent(color) {
  return color === 'w' ? 'b' : 'w';
}

function inside(r, f) {
  return r >= 0 && r < 8 && f >= 0 && f < 8;
}

function pieceAt(board, r, f) {
  return inside(r, f) ? board[r][f] : null;
}

function squareName(r, f) {
  return FILES[f] + (r + 1);
}

function createInitialState() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

  for (let f = 0; f < 8; f++) {
    board[0][f] = { type: back[f], color: 'w' };
    board[1][f] = { type: 'p', color: 'w' };
    board[6][f] = { type: 'p', color: 'b' };
    board[7][f] = { type: back[f], color: 'b' };
  }

  return {
    board,
    turn: 'w',
    castling: { w: { k: true, q: true }, b: { k: true, q: true } },
    enPassant: null,
    halfmove: 0,
    fullmove: 1,
  };
}

function cloneState(st) {
  return {
    board: st.board.map((row) => row.map((p) => (p ? { ...p } : null))),
    turn: st.turn,
    castling: {
      w: { ...st.castling.w },
      b: { ...st.castling.b },
    },
    enPassant: st.enPassant ? { ...st.enPassant } : null,
    halfmove: st.halfmove,
    fullmove: st.fullmove,
  };
}

function isAttacked(board, r, f, by) {
  // Peões: um peão branco em (r-1, f±1) ataca (r, f).
  const pawnDir = by === 'w' ? 1 : -1;
  for (const df of [-1, 1]) {
    const p = pieceAt(board, r - pawnDir, f + df);
    if (p && p.color === by && p.type === 'p') return true;
  }

  // Cavalos
  for (const [dr, df] of KNIGHT_OFFSETS) {
    const p = pieceAt(board, r + dr, f + df);
    if (p && p.color === by && p.type === 'n') return true;
  }

  // Rei
  for (const [dr, df] of KING_OFFSETS) {
    const p = pieceAt(board, r + dr, f + df);
    if (p && p.color === by && p.type === 'k') return true;
  }

  // Torres / damas (linhas retas)
  for (const [dr, df] of ORTHO) {
    let tr = r + dr;
    let tf = f + df;
    while (inside(tr, tf)) {
      const p = board[tr][tf];
      if (p) {
        if (p.color === by && (p.type === 'r' || p.type === 'q')) return true;
        break;
      }
      tr += dr;
      tf += df;
    }
  }

  // Bispos / damas (diagonais)
  for (const [dr, df] of DIAG) {
    let tr = r + dr;
    let tf = f + df;
    while (inside(tr, tf)) {
      const p = board[tr][tf];
      if (p) {
        if (p.color === by && (p.type === 'b' || p.type === 'q')) return true;
        break;
      }
      tr += dr;
      tf += df;
    }
  }

  return false;
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (p && p.type === 'k' && p.color === color) return { r, f };
    }
  }
  return null;
}

function isInCheck(st, color) {
  const king = findKing(st.board, color);
  if (!king) return false;
  return isAttacked(st.board, king.r, king.f, opponent(color));
}

function generatePseudoMoves(st, color) {
  const b = st.board;
  const moves = [];

  const push = (fromR, fromF, toR, toF, piece, extra = {}) => {
    const target = b[toR][toF];
    moves.push({
      from: { r: fromR, f: fromF },
      to: { r: toR, f: toF },
      piece: piece.type,
      color,
      capture: !!target || !!extra.enPassant,
      ...extra,
    });
  };

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = b[r][f];
      if (!p || p.color !== color) continue;

      if (p.type === 'p') {
        const dir = color === 'w' ? 1 : -1;
        const startRank = color === 'w' ? 1 : 6;
        const promoRank = color === 'w' ? 7 : 0;
        const oneR = r + dir;

        // Avanço simples
        if (inside(oneR, f) && !b[oneR][f]) {
          if (oneR === promoRank) {
            for (const promo of PROMOTION_PIECES) {
              push(r, f, oneR, f, p, { promotion: promo });
            }
          } else {
            push(r, f, oneR, f, p);

            // Avanço duplo
            const twoR = r + 2 * dir;
            if (r === startRank && !b[twoR][f]) {
              push(r, f, twoR, f, p, { double: true });
            }
          }
        }

        // Capturas (incluindo en passant)
        for (const df of [-1, 1]) {
          const tr = r + dir;
          const tf = f + df;
          if (!inside(tr, tf)) continue;

          const target = b[tr][tf];
          if (target && target.color !== color) {
            if (tr === promoRank) {
              for (const promo of PROMOTION_PIECES) {
                push(r, f, tr, tf, p, { promotion: promo });
              }
            } else {
              push(r, f, tr, tf, p);
            }
          } else if (
            !target &&
            st.enPassant &&
            st.enPassant.r === tr &&
            st.enPassant.f === tf
          ) {
            push(r, f, tr, tf, p, { enPassant: true });
          }
        }
        continue;
      }

      if (p.type === 'n' || p.type === 'k') {
        const offsets = p.type === 'n' ? KNIGHT_OFFSETS : KING_OFFSETS;
        for (const [dr, df] of offsets) {
          const tr = r + dr;
          const tf = f + df;
          if (!inside(tr, tf)) continue;
          const target = b[tr][tf];
          if (target && target.color === color) continue;
          push(r, f, tr, tf, p);
        }

        // Roque
        if (p.type === 'k') {
          const homeRank = color === 'w' ? 0 : 7;
          const rights = st.castling[color];
          const enemy = opponent(color);

          if (r === homeRank && f === 4) {
            // Roque curto (lado do rei)
            if (
              rights.k &&
              !b[homeRank][5] &&
              !b[homeRank][6] &&
              b[homeRank][7] &&
              b[homeRank][7].type === 'r' &&
              b[homeRank][7].color === color &&
              !isAttacked(b, homeRank, 4, enemy) &&
              !isAttacked(b, homeRank, 5, enemy) &&
              !isAttacked(b, homeRank, 6, enemy)
            ) {
              push(r, f, homeRank, 6, p, { castle: 'k' });
            }

            // Roque longo (lado da dama)
            if (
              rights.q &&
              !b[homeRank][1] &&
              !b[homeRank][2] &&
              !b[homeRank][3] &&
              b[homeRank][0] &&
              b[homeRank][0].type === 'r' &&
              b[homeRank][0].color === color &&
              !isAttacked(b, homeRank, 4, enemy) &&
              !isAttacked(b, homeRank, 3, enemy) &&
              !isAttacked(b, homeRank, 2, enemy)
            ) {
              push(r, f, homeRank, 2, p, { castle: 'q' });
            }
          }
        }
        continue;
      }

      // Bispo, torre e dama
      const dirs =
        p.type === 'b' ? DIAG : p.type === 'r' ? ORTHO : [...ORTHO, ...DIAG];

      for (const [dr, df] of dirs) {
        let tr = r + dr;
        let tf = f + df;
        while (inside(tr, tf)) {
          const target = b[tr][tf];
          if (!target) {
            push(r, f, tr, tf, p);
          } else {
            if (target.color !== color) push(r, f, tr, tf, p);
            break;
          }
          tr += dr;
          tf += df;
        }
      }
    }
  }

  return moves;
}

/**
 * Aplica um lance (assume que já é legal) e devolve a peça capturada.
 */
function applyMove(st, mv) {
  const b = st.board;
  const piece = b[mv.from.r][mv.from.f];
  let captured = null;
  let capturedSquare = null;

  if (mv.enPassant) {
    captured = b[mv.from.r][mv.to.f];
    capturedSquare = { r: mv.from.r, f: mv.to.f };
    b[mv.from.r][mv.to.f] = null;
  } else if (b[mv.to.r][mv.to.f]) {
    captured = b[mv.to.r][mv.to.f];
    capturedSquare = { r: mv.to.r, f: mv.to.f };
  }

  b[mv.to.r][mv.to.f] = mv.promotion
    ? { type: mv.promotion, color: piece.color }
    : piece;
  b[mv.from.r][mv.from.f] = null;

  // Move a torre no roque
  if (piece.type === 'k' && Math.abs(mv.to.f - mv.from.f) === 2) {
    const rank = mv.from.r;
    if (mv.to.f === 6) {
      b[rank][5] = b[rank][7];
      b[rank][7] = null;
    } else {
      b[rank][3] = b[rank][0];
      b[rank][0] = null;
    }
  }

  // Atualiza direitos de roque
  const color = piece.color;
  const enemy = opponent(color);

  if (piece.type === 'k') {
    st.castling[color].k = false;
    st.castling[color].q = false;
  }

  if (piece.type === 'r') {
    const homeRank = color === 'w' ? 0 : 7;
    if (mv.from.r === homeRank) {
      if (mv.from.f === 0) st.castling[color].q = false;
      if (mv.from.f === 7) st.castling[color].k = false;
    }
  }

  if (captured && captured.type === 'r') {
    const enemyHome = enemy === 'w' ? 0 : 7;
    if (mv.to.r === enemyHome) {
      if (mv.to.f === 0) st.castling[enemy].q = false;
      if (mv.to.f === 7) st.castling[enemy].k = false;
    }
  }

  // Alvo de en passant
  st.enPassant =
    piece.type === 'p' && Math.abs(mv.to.r - mv.from.r) === 2
      ? { r: (mv.from.r + mv.to.r) / 2, f: mv.from.f }
      : null;

  // Regra dos 50 lances
  if (piece.type === 'p' || captured) st.halfmove = 0;
  else st.halfmove += 1;

  if (st.turn === 'b') st.fullmove += 1;
  st.turn = enemy;

  return { captured, capturedSquare };
}

function legalMoves(st, color = st.turn) {
  const result = [];

  for (const mv of generatePseudoMoves(st, color)) {
    const test = cloneState(st);
    applyMove(test, mv);
    if (!isInCheck(test, color)) result.push(mv);
  }

  return result;
}

function insufficientMaterial(board) {
  const pieces = [];
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      if (board[r][f]) pieces.push(board[r][f]);
    }
  }

  if (pieces.length <= 2) return true;
  if (pieces.length === 3) {
    return pieces.some((p) => p.type === 'b' || p.type === 'n');
  }
  return false;
}

function computeStatus(st) {
  const moves = legalMoves(st);
  const inCheck = isInCheck(st, st.turn);

  if (moves.length === 0) {
    return inCheck
      ? { over: true, type: 'checkmate', winner: opponent(st.turn), check: true }
      : { over: true, type: 'stalemate', check: false };
  }

  if (insufficientMaterial(st.board)) {
    return { over: true, type: 'insufficient', check: inCheck };
  }

  if (st.halfmove >= 100) {
    return { over: true, type: 'fifty', check: inCheck };
  }

  return { over: false, check: inCheck };
}

function moveNotation(st, mv) {
  if (mv.castle === 'k') return '0-0';
  if (mv.castle === 'q') return '0-0-0';

  const piece = st.board[mv.from.r][mv.from.f];
  const letter = PIECE_LETTERS[piece.type] || '';
  const from = squareName(mv.from.r, mv.from.f);
  const to = squareName(mv.to.r, mv.to.f);
  const separator = mv.capture ? 'x' : '-';
  let notation = `${letter}${from}${separator}${to}`;

  if (mv.promotion) {
    notation += `=${PIECE_LETTERS[mv.promotion]}`;
  }

  return notation;
}

  function stateToFen(st) {
    const rows = [];
    for (let r = 7; r >= 0; r--) {
      let row = '';
      let empty = 0;
      for (let f = 0; f < 8; f++) {
        const p = st.board[r][f];
        if (!p) {
          empty += 1;
          continue;
        }
        if (empty) {
          row += empty;
          empty = 0;
        }
        const letter = p.type;
        row += p.color === 'w' ? letter.toUpperCase() : letter;
      }
      if (empty) row += empty;
      rows.push(row);
    }

    let castling = '';
    if (st.castling.w.k) castling += 'K';
    if (st.castling.w.q) castling += 'Q';
    if (st.castling.b.k) castling += 'k';
    if (st.castling.b.q) castling += 'q';
    if (!castling) castling = '-';

    const ep = st.enPassant
      ? FILES[st.enPassant.f] + (st.enPassant.r + 1)
      : '-';

    return (
      rows.join('/') + ' ' + st.turn + ' ' + castling + ' ' + ep + ' ' +
      st.halfmove + ' ' + st.fullmove
    );
  }

  function fenToState(fen) {
    if (typeof fen !== 'string') return createInitialState();
    const parts = fen.trim().split(/\s+/);
    if (parts.length < 4) return createInitialState();

    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    const rows = parts[0].split('/');
    if (rows.length !== 8) return createInitialState();

    for (let i = 0; i < 8; i++) {
      const rank = 7 - i;
      let f = 0;
      for (const ch of rows[i]) {
        if (ch >= '1' && ch <= '8') {
          f += Number(ch);
          continue;
        }
        if (!/[prnbqkPRNBQK]/.test(ch) || f > 7) return createInitialState();
        board[rank][f] = {
          type: ch.toLowerCase(),
          color: ch === ch.toUpperCase() ? 'w' : 'b',
        };
        f += 1;
      }
      if (f !== 8) return createInitialState();
    }

    const rights = parts[2] || '-';
    let enPassant = null;
    if (parts[3] && parts[3] !== '-') {
      const f = FILES.indexOf(parts[3][0]);
      const r = Number(parts[3][1]) - 1;
      if (f >= 0 && r >= 0 && r < 8) enPassant = { r, f };
    }

    return {
      board,
      turn: parts[1] === 'b' ? 'b' : 'w',
      castling: {
        w: { k: rights.includes('K'), q: rights.includes('Q') },
        b: { k: rights.includes('k'), q: rights.includes('q') },
      },
      enPassant,
      halfmove: Math.max(0, Number(parts[4]) || 0),
      fullmove: Math.max(1, Number(parts[5]) || 1),
    };
  }

  function findLegalMove(st, from, to, promotion) {
    const candidates = legalMoves(st).filter(
      (mv) =>
        mv.from.r === from.r &&
        mv.from.f === from.f &&
        mv.to.r === to.r &&
        mv.to.f === to.f
    );
    if (candidates.length === 0) return null;

    if (promotion) {
      return candidates.find((mv) => mv.promotion === promotion) || null;
    }
    const normal = candidates.find((mv) => !mv.promotion);
    if (normal) return normal;
    return candidates.find((mv) => mv.promotion === 'q') || candidates[0];
  }

  global.Chess = {
    FILES,
    PROMOTION_PIECES,
    PIECE_LETTERS,
    opponent,
    inside,
    pieceAt,
    squareName,
    createInitialState,
    cloneState,
    isAttacked,
    findKing,
    isInCheck,
    generatePseudoMoves,
    applyMove,
    legalMoves,
    insufficientMaterial,
    computeStatus,
    moveNotation,
    stateToFen,
    fenToState,
    findLegalMove,
  };
})(typeof window !== "undefined" ? window : globalThis);
