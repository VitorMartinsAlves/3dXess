const test = require('node:test');
const assert = require('node:assert/strict');

require('../legacy/game/engine.js');
const Chess = globalThis.Chess;

function perft(state, depth) {
  if (depth === 0) return 1;
  let total = 0;
  for (const move of Chess.legalMoves(state)) {
    const next = Chess.cloneState(state);
    Chess.applyMove(next, move);
    total += perft(next, depth - 1);
  }
  return total;
}

function findMove(state, from, to, promotion) {
  return Chess.findLegalMove(
    state,
    { r: from[1] - 1, f: Chess.FILES.indexOf(from[0]) },
    { r: to[1] - 1, f: Chess.FILES.indexOf(to[0]) },
    promotion || null
  );
}

test('posição inicial: perft 1–3', () => {
  const initial = Chess.createInitialState();
  assert.equal(perft(initial, 1), 20);
  assert.equal(perft(initial, 2), 400);
  assert.equal(perft(initial, 3), 8902);
});

test('posição Kiwipete: valida roque, peças bloqueadas e xeques', () => {
  const state = Chess.fenToState(
    'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'
  );
  assert.equal(perft(state, 1), 48);
  assert.equal(perft(state, 2), 2039);
});

test('roque move o rei e a torre', () => {
  const state = Chess.fenToState('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  const shortCastle = findMove(state, 'e1', 'g1');
  const longCastle = findMove(state, 'e1', 'c1');
  assert.equal(shortCastle.castle, 'k');
  assert.equal(longCastle.castle, 'q');
  Chess.applyMove(state, shortCastle);
  assert.equal(state.board[0][6].type, 'k');
  assert.equal(state.board[0][5].type, 'r');
  assert.equal(state.board[0][7], null);
});

test('captura en passant remove o peão capturado', () => {
  const state = Chess.fenToState('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2');
  const move = findMove(state, 'e5', 'd6');
  assert.equal(move.enPassant, true);
  Chess.applyMove(state, move);
  assert.equal(state.board[5][3].type, 'p');
  assert.equal(state.board[4][3], null);
});

test('promoção gera dama, torre, bispo e cavalo', () => {
  const state = Chess.fenToState('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
  const promotions = Chess.legalMoves(state)
    .filter((move) => move.from.r === 6 && move.from.f === 0 && move.to.r === 7)
    .map((move) => move.promotion)
    .sort();
  assert.deepEqual(promotions, ['b', 'n', 'q', 'r']);
});

test('50 lances tornam o empate reivindicável, não automático', () => {
  const state = Chess.fenToState('4k3/8/8/8/8/8/8/R3K3 w - - 100 51');
  const status = Chess.computeStatus(state);
  assert.equal(status.over, false);
  assert.equal(status.canClaimFiftyMove, true);
});

test('75 lances sem captura ou movimento de peão encerram automaticamente', () => {
  const state = Chess.fenToState('4k3/8/8/8/8/8/8/R3K3 w - - 150 76');
  const status = Chess.computeStatus(state);
  assert.equal(status.over, true);
  assert.equal(status.type, 'seventyfive');
});

test('repetição tripla permite reivindicar empate', () => {
  const state = Chess.createInitialState();
  const counts = Object.create(null);
  counts[Chess.positionKey(state)] = 3;
  const status = Chess.computeStatus(state, counts);
  assert.equal(status.over, false);
  assert.equal(status.canClaimThreefold, true);
});

test('repetição quíntupla encerra automaticamente', () => {
  const state = Chess.createInitialState();
  const counts = Object.create(null);
  counts[Chess.positionKey(state)] = 5;
  const status = Chess.computeStatus(state, counts);
  assert.equal(status.over, true);
  assert.equal(status.type, 'fivefold');
});

test('casa en passant não diferencia posições sem captura legal', () => {
  const withEp = Chess.fenToState('4k3/8/8/3p4/8/8/8/4K3 w - d6 0 2');
  const withoutEp = Chess.fenToState('4k3/8/8/3p4/8/8/8/4K3 w - - 0 2');
  assert.equal(Chess.positionKey(withEp), Chess.positionKey(withoutEp));
});
