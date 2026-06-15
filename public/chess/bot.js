/* Chess bot using minimax with alpha-beta pruning and a simple
   material + piece-square table evaluation. */

(function (global) {
  "use strict";

  const VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

  // Piece-square tables (from White's perspective, row 0 = rank 8).
  const PST = {
    p: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [50, 50, 50, 50, 50, 50, 50, 50],
      [10, 10, 20, 30, 30, 20, 10, 10],
      [5, 5, 10, 25, 25, 10, 5, 5],
      [0, 0, 0, 20, 20, 0, 0, 0],
      [5, -5, -10, 0, 0, -10, -5, 5],
      [5, 10, 10, -20, -20, 10, 10, 5],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    n: [
      [-50, -40, -30, -30, -30, -30, -40, -50],
      [-40, -20, 0, 0, 0, 0, -20, -40],
      [-30, 0, 10, 15, 15, 10, 0, -30],
      [-30, 5, 15, 20, 20, 15, 5, -30],
      [-30, 0, 15, 20, 20, 15, 0, -30],
      [-30, 5, 10, 15, 15, 10, 5, -30],
      [-40, -20, 0, 5, 5, 0, -20, -40],
      [-50, -40, -30, -30, -30, -30, -40, -50],
    ],
    b: [
      [-20, -10, -10, -10, -10, -10, -10, -20],
      [-10, 0, 0, 0, 0, 0, 0, -10],
      [-10, 0, 5, 10, 10, 5, 0, -10],
      [-10, 5, 5, 10, 10, 5, 5, -10],
      [-10, 0, 10, 10, 10, 10, 0, -10],
      [-10, 10, 10, 10, 10, 10, 10, -10],
      [-10, 5, 0, 0, 0, 0, 5, -10],
      [-20, -10, -10, -10, -10, -10, -10, -20],
    ],
    r: [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [5, 10, 10, 10, 10, 10, 10, 5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [0, 0, 0, 5, 5, 0, 0, 0],
    ],
    q: [
      [-20, -10, -10, -5, -5, -10, -10, -20],
      [-10, 0, 0, 0, 0, 0, 0, -10],
      [-10, 0, 5, 5, 5, 5, 0, -10],
      [-5, 0, 5, 5, 5, 5, 0, -5],
      [0, 0, 5, 5, 5, 5, 0, -5],
      [-10, 5, 5, 5, 5, 5, 0, -10],
      [-10, 0, 5, 0, 0, 0, 0, -10],
      [-20, -10, -10, -5, -5, -10, -10, -20],
    ],
    k: [
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-20, -30, -30, -40, -40, -30, -30, -20],
      [-10, -20, -20, -20, -20, -20, -20, -10],
      [20, 20, 0, 0, 0, 0, 20, 20],
      [20, 30, 10, 0, 0, 10, 30, 20],
    ],
  };

  // Evaluate from the perspective of `forColor` (positive = good for that color).
  function evaluate(game, forColor) {
    let score = 0;
    const board = game.board;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (!p) continue;
        const base = VALUES[p.type];
        const pst = p.color === "w" ? PST[p.type][r][c] : PST[p.type][7 - r][c];
        const val = base + pst;
        score += p.color === forColor ? val : -val;
      }
    }
    return score;
  }

  // Order moves: captures and promotions first (improves alpha-beta pruning).
  function orderMoves(moves) {
    return moves.slice().sort((a, b) => {
      const av = (a.capture ? 10 : 0) + (a.promotion ? 5 : 0);
      const bv = (b.capture ? 10 : 0) + (b.promotion ? 5 : 0);
      return bv - av;
    });
  }

  function search(game, depth, alpha, beta, maximizing, rootColor) {
    if (depth === 0) {
      return evaluate(game, rootColor);
    }
    const moves = game.legalMoves(game.turn);
    if (moves.length === 0) {
      if (game.inCheck(game.turn)) {
        // checkmate: bad for side to move
        const mateScore = 100000 - (10 - depth);
        return game.turn === rootColor ? -mateScore : mateScore;
      }
      return 0; // stalemate
    }

    const ordered = orderMoves(moves);
    if (maximizing) {
      let best = -Infinity;
      for (const m of ordered) {
        game.makeMove(m);
        const val = search(game, depth - 1, alpha, beta, false, rootColor);
        game.undoMove();
        if (val > best) best = val;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const m of ordered) {
        game.makeMove(m);
        const val = search(game, depth - 1, alpha, beta, true, rootColor);
        game.undoMove();
        if (val < best) best = val;
        if (best < beta) beta = best;
        if (alpha >= beta) break;
      }
      return best;
    }
  }

  // Pick the best move for the side to move at the given search depth.
  function bestMove(game, depth) {
    const rootColor = game.turn;
    const moves = orderMoves(game.legalMoves(rootColor));
    if (moves.length === 0) return null;

    let best = -Infinity;
    let bestMoves = [];
    for (const m of moves) {
      game.makeMove(m);
      const val = search(game, depth - 1, -Infinity, Infinity, false, rootColor);
      game.undoMove();
      if (val > best) {
        best = val;
        bestMoves = [m];
      } else if (val === best) {
        bestMoves.push(m);
      }
    }
    // tie-break randomly for variety
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  global.ChessBot = { bestMove, evaluate };
})(typeof window !== "undefined" ? window : globalThis);
