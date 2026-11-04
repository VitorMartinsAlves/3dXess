const test = require('node:test');
const assert = require('node:assert/strict');
require('../engine.js');
const Chess = globalThis.Chess;

function move(state, from, to, promotion) {
  return Chess.findLegalMove(
    state,
    { r: Number(from[1]) - 1, f: Chess.FILES.indexOf(from[0]) },
    { r: Number(to[1]) - 1, f: Chess.FILES.indexOf(to[0]) },
    promotion || null
  );
}

test('training scenario: rook delivers back-rank checkmate', () => {
  const state = Chess.fenToState('6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1');
  const mv = move(state, 'e1', 'e8');
  assert.ok(mv);
  Chess.applyMove(state, mv);
  assert.equal(Chess.computeStatus(state).type, 'checkmate');
});

test('training scenario: rook captures the unprotected queen', () => {
  const state = Chess.fenToState('4k3/8/8/8/8/8/4q3/4R1K1 w - - 0 1');
  const mv = move(state, 'e1', 'e2');
  assert.ok(mv);
  const result = Chess.applyMove(state, mv);
  assert.equal(result.captured.type, 'q');
});

test('training scenario: kingside castling is legal', () => {
  const state = Chess.fenToState('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  const mv = move(state, 'e1', 'g1');
  assert.ok(mv);
  assert.equal(mv.castle, 'k');
});

test('training scenario: a7-a8 promotes to a queen', () => {
  const state = Chess.fenToState('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
  const mv = move(state, 'a7', 'a8', 'q');
  assert.ok(mv);
  assert.equal(mv.promotion, 'q');
});
