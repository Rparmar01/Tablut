const assert = require("assert");
const Tablut = require("../tablut-core");

function emptyBoard() {
  return Array.from({ length: Tablut.SIZE }, () => Array.from({ length: Tablut.SIZE }, () => null));
}

function soldier(side) {
  return { side, type: "soldier" };
}

function king() {
  return { side: "defender", type: "king" };
}

function stateWith(board, turn = "attacker") {
  return {
    board,
    turn,
    winner: null,
    reason: "",
    lastMove: null,
    captured: [],
    moveNumber: 1
  };
}

function hasMove(moves, from, to) {
  return moves.some((move) =>
    move.from.r === from.r &&
    move.from.c === from.c &&
    move.to.r === to.r &&
    move.to.c === to.c
  );
}

{
  const state = Tablut.initialState();
  assert.strictEqual(Tablut.getAllLegalMoves(state, "attacker").length > 0, true);
  assert.strictEqual(Tablut.findKing(state.board).r, 4);
  assert.strictEqual(Tablut.findKing(state.board).c, 4);
}

{
  const board = emptyBoard();
  board[4][3] = soldier("attacker");
  const state = stateWith(board, "attacker");
  const moves = Tablut.getLegalMovesForPiece(state, { r: 4, c: 3 });
  assert.strictEqual(hasMove(moves, { r: 4, c: 3 }, { r: 4, c: 4 }), false, "soldiers cannot enter the throne");
  assert.strictEqual(hasMove(moves, { r: 4, c: 3 }, { r: 4, c: 5 }), false, "soldiers cannot cross the throne");
}

{
  const board = emptyBoard();
  board[4][4] = king();
  const state = stateWith(board, "defender");
  const moves = Tablut.getLegalMovesForPiece(state, { r: 4, c: 4 });
  assert.strictEqual(hasMove(moves, { r: 4, c: 4 }, { r: 0, c: 4 }), true, "king can cross the throne rank");
}

{
  const board = emptyBoard();
  board[3][2] = soldier("attacker");
  board[4][3] = soldier("defender");
  const next = Tablut.applyMove(stateWith(board, "attacker"), {
    from: { r: 3, c: 2 },
    to: { r: 4, c: 2 }
  });
  assert.strictEqual(next.board[4][3], null, "the throne captures as a hostile square");
  assert.strictEqual(next.captured.length, 1);
}

{
  const board = emptyBoard();
  board[1][0] = king();
  const next = Tablut.applyMove(stateWith(board, "defender"), {
    from: { r: 1, c: 0 },
    to: { r: 0, c: 0 }
  });
  assert.strictEqual(next.winner, "defender", "king wins by reaching an edge");
}

{
  const board = emptyBoard();
  board[4][4] = king();
  board[4][3] = soldier("attacker");
  board[4][5] = soldier("attacker");
  board[3][4] = soldier("attacker");
  board[6][4] = soldier("attacker");
  const next = Tablut.applyMove(stateWith(board, "attacker"), {
    from: { r: 6, c: 4 },
    to: { r: 5, c: 4 }
  });
  assert.strictEqual(next.winner, "attacker", "king is captured when surrounded on four sides");
}

{
  const state = Tablut.initialState();
  const move = Tablut.chooseAiMove(state, 1500, "attacker");
  assert.ok(move, "AI should choose an opening move");
  assert.doesNotThrow(() => Tablut.applyMove(state, move));
}

console.log("Tablut core tests passed.");
