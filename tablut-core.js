(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.TablutCore = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var SIZE = 9;
  var THRONE = { r: 4, c: 4 };
  var CORNERS = [
    { r: 0, c: 0 },
    { r: 0, c: 8 },
    { r: 8, c: 0 },
    { r: 8, c: 8 }
  ];
  var DIRECTIONS = [
    { r: -1, c: 0 },
    { r: 1, c: 0 },
    { r: 0, c: -1 },
    { r: 0, c: 1 }
  ];

  function piece(side, type) {
    return { side: side, type: type || "soldier" };
  }

  function emptyBoard() {
    return Array.from({ length: SIZE }, function () {
      return Array.from({ length: SIZE }, function () {
        return null;
      });
    });
  }

  function cloneBoard(board) {
    return board.map(function (row) {
      return row.map(function (cell) {
        return cell ? { side: cell.side, type: cell.type } : null;
      });
    });
  }

  function keyOf(pos) {
    return pos.r + "," + pos.c;
  }

  function inBounds(pos) {
    return pos.r >= 0 && pos.r < SIZE && pos.c >= 0 && pos.c < SIZE;
  }

  function samePos(a, b) {
    return a.r === b.r && a.c === b.c;
  }

  function isCorner(pos) {
    return CORNERS.some(function (corner) {
      return samePos(corner, pos);
    });
  }

  function isEdge(pos) {
    return pos.r === 0 || pos.r === SIZE - 1 || pos.c === 0 || pos.c === SIZE - 1;
  }

  function isThrone(pos) {
    return samePos(THRONE, pos);
  }

  function isRestrictedForPiece(pos, movingPiece) {
    if (!movingPiece) return true;
    if (movingPiece.type === "king") return false;
    return isThrone(pos);
  }

  function isHostileSquare(pos) {
    return isThrone(pos);
  }

  function initialBoard() {
    var board = emptyBoard();

    [
      [0, 3], [0, 4], [0, 5], [1, 4],
      [3, 0], [4, 0], [5, 0], [4, 1],
      [3, 8], [4, 8], [5, 8], [4, 7],
      [7, 4], [8, 3], [8, 4], [8, 5]
    ].forEach(function (coord) {
      board[coord[0]][coord[1]] = piece("attacker");
    });

    [
      [2, 4], [3, 4], [4, 2], [4, 3],
      [4, 5], [4, 6], [5, 4], [6, 4]
    ].forEach(function (coord) {
      board[coord[0]][coord[1]] = piece("defender");
    });

    board[THRONE.r][THRONE.c] = piece("defender", "king");
    return board;
  }

  function initialState() {
    return {
      board: initialBoard(),
      turn: "attacker",
      winner: null,
      reason: "",
      lastMove: null,
      captured: [],
      moveNumber: 1
    };
  }

  function otherSide(side) {
    return side === "attacker" ? "defender" : "attacker";
  }

  function getLegalMovesForPiece(state, from) {
    var board = state.board;
    var movingPiece = board[from.r] && board[from.r][from.c];
    if (!movingPiece || movingPiece.side !== state.turn || state.winner) return [];

    var moves = [];
    DIRECTIONS.forEach(function (dir) {
      var pos = { r: from.r + dir.r, c: from.c + dir.c };
      while (inBounds(pos)) {
        if (board[pos.r][pos.c]) break;
        if (isRestrictedForPiece(pos, movingPiece)) break;
        moves.push({
          from: { r: from.r, c: from.c },
          to: { r: pos.r, c: pos.c }
        });
        pos = { r: pos.r + dir.r, c: pos.c + dir.c };
      }
    });
    return moves;
  }

  function getAllLegalMoves(state, side) {
    if (state.winner) return [];
    var scopedState = {
      board: state.board,
      turn: side || state.turn,
      winner: state.winner
    };
    var moves = [];
    for (var r = 0; r < SIZE; r += 1) {
      for (var c = 0; c < SIZE; c += 1) {
        var current = state.board[r][c];
        if (current && current.side === scopedState.turn) {
          moves = moves.concat(getLegalMovesForPiece(scopedState, { r: r, c: c }));
        }
      }
    }
    return moves;
  }

  function findKing(board) {
    for (var r = 0; r < SIZE; r += 1) {
      for (var c = 0; c < SIZE; c += 1) {
        var current = board[r][c];
        if (current && current.type === "king") return { r: r, c: c };
      }
    }
    return null;
  }

  function isOwnBlocker(board, pos, side) {
    if (!inBounds(pos)) return false;
    var current = board[pos.r][pos.c];
    return Boolean(current && current.side === side);
  }

  function isCaptureBlocker(board, pos, side) {
    if (!inBounds(pos)) return false;
    return isOwnBlocker(board, pos, side) || isHostileSquare(pos);
  }

  function captureRegularPieces(board, movedTo, movingSide) {
    var captured = [];
    DIRECTIONS.forEach(function (dir) {
      var adjacent = { r: movedTo.r + dir.r, c: movedTo.c + dir.c };
      if (!inBounds(adjacent)) return;
      var target = board[adjacent.r][adjacent.c];
      if (!target || target.side === movingSide || target.type === "king") return;

      var beyond = { r: adjacent.r + dir.r, c: adjacent.c + dir.c };
      if (isCaptureBlocker(board, beyond, movingSide)) {
        board[adjacent.r][adjacent.c] = null;
        captured.push({ r: adjacent.r, c: adjacent.c, piece: target });
      }
    });
    return captured;
  }

  function isKingCaptured(board) {
    var king = findKing(board);
    if (!king) return true;
    if (isEdge(king)) return false;

    for (var i = 0; i < DIRECTIONS.length; i += 1) {
      var dir = DIRECTIONS[i];
      var pos = { r: king.r + dir.r, c: king.c + dir.c };
      if (!inBounds(pos)) continue;

      var blocker = board[pos.r][pos.c];
      if (blocker && blocker.side === "attacker") continue;
      if (isHostileSquare(pos)) continue;
      return false;
    }

    return true;
  }

  function movesEqual(a, b) {
    return a.from.r === b.from.r &&
      a.from.c === b.from.c &&
      a.to.r === b.to.r &&
      a.to.c === b.to.c;
  }

  function applyMove(state, move) {
    if (state.winner) return state;

    var legal = getAllLegalMoves(state, state.turn).some(function (candidate) {
      return movesEqual(candidate, move);
    });
    if (!legal) {
      throw new Error("Illegal Tablut move from " + keyOf(move.from) + " to " + keyOf(move.to));
    }

    var board = cloneBoard(state.board);
    var movingPiece = board[move.from.r][move.from.c];
    board[move.from.r][move.from.c] = null;
    board[move.to.r][move.to.c] = movingPiece;

    var next = {
      board: board,
      turn: otherSide(state.turn),
      winner: null,
      reason: "",
      lastMove: {
        from: { r: move.from.r, c: move.from.c },
        to: { r: move.to.r, c: move.to.c },
        piece: { side: movingPiece.side, type: movingPiece.type }
      },
      captured: [],
      moveNumber: state.turn === "defender" ? state.moveNumber + 1 : state.moveNumber
    };

    if (movingPiece.type === "king" && isEdge(move.to)) {
      next.winner = "defender";
      next.reason = "The king escaped to the edge of the board.";
      return next;
    }

    next.captured = captureRegularPieces(board, move.to, movingPiece.side);

    if (movingPiece.side === "attacker" && isKingCaptured(board)) {
      next.winner = "attacker";
      next.reason = "The king was surrounded and captured.";
      return next;
    }

    var replyMoves = getAllLegalMoves(next, next.turn);
    if (replyMoves.length === 0) {
      next.winner = next.turn === "defender" ? "attacker" : "defender";
      next.reason = next.turn === "defender"
        ? "The defenders have no legal moves."
        : "The attackers have no legal moves.";
      return next;
    }

    return next;
  }

  function pieceCounts(board) {
    var counts = {
      attackers: 0,
      defenders: 0,
      king: 0
    };
    for (var r = 0; r < SIZE; r += 1) {
      for (var c = 0; c < SIZE; c += 1) {
        var current = board[r][c];
        if (!current) continue;
        if (current.side === "attacker") counts.attackers += 1;
        if (current.side === "defender" && current.type !== "king") counts.defenders += 1;
        if (current.type === "king") counts.king += 1;
      }
    }
    return counts;
  }

  function distanceToClosestEdge(pos) {
    return Math.min(pos.r, pos.c, SIZE - 1 - pos.r, SIZE - 1 - pos.c);
  }

  function openEscapeLane(board, king) {
    if (!king) return 0;
    var lanes = 0;
    DIRECTIONS.forEach(function (dir) {
      var pos = { r: king.r + dir.r, c: king.c + dir.c };
      while (inBounds(pos)) {
        if (board[pos.r][pos.c]) return;
        if (isEdge(pos)) {
          lanes += 1;
          return;
        }
        if (isThrone(pos)) {
          pos = { r: pos.r + dir.r, c: pos.c + dir.c };
          continue;
        }
        pos = { r: pos.r + dir.r, c: pos.c + dir.c };
      }
    });
    return lanes;
  }

  function kingPressure(board, king) {
    if (!king) return 4;
    return DIRECTIONS.reduce(function (total, dir) {
      var pos = { r: king.r + dir.r, c: king.c + dir.c };
      if (!inBounds(pos)) return total + 1;
      var current = board[pos.r][pos.c];
      if (current && current.side === "attacker") return total + 1;
      if (isHostileSquare(pos)) return total + 1;
      return total;
    }, 0);
  }

  function evaluateState(state, perspective) {
    if (state.winner) {
      return state.winner === perspective ? 100000 : -100000;
    }

    var counts = pieceCounts(state.board);
    var king = findKing(state.board);
    var defenderValue = counts.defenders * 120 + counts.king * 600;
    var attackerValue = counts.attackers * 80;
    var lanes = openEscapeLane(state.board, king);
    var pressure = kingPressure(state.board, king);
    var distance = king ? distanceToClosestEdge(king) : 99;
    var defenderScore = defenderValue - attackerValue + lanes * 700 - distance * 45 - pressure * 180;

    var defenderMobility = getAllLegalMoves(state, "defender").length;
    var attackerMobility = getAllLegalMoves(state, "attacker").length;
    defenderScore += (defenderMobility - attackerMobility) * 3;

    return perspective === "defender" ? defenderScore : -defenderScore;
  }

  function movePriority(state, move, perspective) {
    var movingPiece = state.board[move.from.r][move.from.c];
    var score = 0;
    if (movingPiece.type === "king") {
      score -= distanceToClosestEdge(move.to) * 80;
      if (isEdge(move.to)) score += 10000;
    }

    var next;
    try {
      next = applyMove(state, move);
      score += next.captured.length * 350;
      if (next.winner === perspective) score += 20000;
      if (next.winner && next.winner !== perspective) score -= 20000;
      score += evaluateState(next, perspective) / 20;
    } catch (error) {
      score -= 99999;
    }
    return score;
  }

  function orderedMoves(state, perspective, limit) {
    var moves = getAllLegalMoves(state, state.turn).map(function (move) {
      return { move: move, score: movePriority(state, move, perspective) };
    });
    moves.sort(function (a, b) {
      return b.score - a.score;
    });
    if (limit && moves.length > limit) moves = moves.slice(0, limit);
    return moves.map(function (entry) {
      return entry.move;
    });
  }

  function eloProfile(elo) {
    var bounded = Math.max(0, Math.min(3000, Number(elo) || 0));
    if (bounded < 250) return { depth: 0, noise: 700, breadth: 60, pick: 7 };
    if (bounded < 900) return { depth: 1, noise: 420, breadth: 50, pick: 5 };
    if (bounded < 1600) return { depth: 2, noise: 180, breadth: 38, pick: 3 };
    if (bounded < 2400) return { depth: 3, noise: 55, breadth: 28, pick: 2 };
    return { depth: 3, noise: 0, breadth: 34, pick: 1 };
  }

  function minimax(state, depth, alpha, beta, maximizing, perspective, profile) {
    if (depth === 0 || state.winner) {
      return evaluateState(state, perspective);
    }

    var moves = orderedMoves(state, perspective, profile.breadth);
    if (!moves.length) {
      return evaluateState(state, perspective);
    }

    if (maximizing) {
      var best = -Infinity;
      for (var i = 0; i < moves.length; i += 1) {
        best = Math.max(best, minimax(applyMove(state, moves[i]), depth - 1, alpha, beta, false, perspective, profile));
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    }

    var worst = Infinity;
    for (var j = 0; j < moves.length; j += 1) {
      worst = Math.min(worst, minimax(applyMove(state, moves[j]), depth - 1, alpha, beta, true, perspective, profile));
      beta = Math.min(beta, worst);
      if (beta <= alpha) break;
    }
    return worst;
  }

  function chooseAiMove(state, elo, aiSide) {
    var profile = eloProfile(elo);
    var moves = orderedMoves(state, aiSide, profile.breadth);
    if (!moves.length) return null;
    if (profile.depth === 0) {
      return moves[Math.floor(Math.random() * Math.min(moves.length, profile.pick))];
    }

    var scored = moves.map(function (move) {
      var next = applyMove(state, move);
      var score = minimax(next, profile.depth - 1, -Infinity, Infinity, false, aiSide, profile);
      if (profile.noise) {
        score += (Math.random() * 2 - 1) * profile.noise;
      }
      return { move: move, score: score };
    });

    scored.sort(function (a, b) {
      return b.score - a.score;
    });

    var pickCount = Math.min(profile.pick, scored.length);
    var chosen = scored[Math.floor(Math.random() * pickCount)];
    return chosen.move;
  }

  return {
    SIZE: SIZE,
    THRONE: THRONE,
    CORNERS: CORNERS,
    initialState: initialState,
    cloneBoard: cloneBoard,
    getLegalMovesForPiece: getLegalMovesForPiece,
    getAllLegalMoves: getAllLegalMoves,
    applyMove: applyMove,
    chooseAiMove: chooseAiMove,
    evaluateState: evaluateState,
    findKing: findKing,
    isCorner: isCorner,
    isEdge: isEdge,
    isThrone: isThrone,
    isKingCaptured: isKingCaptured,
    otherSide: otherSide
  };
});
