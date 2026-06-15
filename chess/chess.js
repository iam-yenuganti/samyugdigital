/* Minimal chess engine: board state, legal move generation, make/undo,
   check / checkmate / stalemate detection. Board is an 8x8 array.
   Rows: 0 = rank 8 (top), 7 = rank 1 (bottom). Cols: 0 = file a .. 7 = file h.
   A piece is { type, color } where type in {p,n,b,r,q,k}, color in {w,b}. */

(function (global) {
  "use strict";

  const WHITE = "w";
  const BLACK = "b";

  function cloneBoard(board) {
    return board.map((row) => row.map((sq) => (sq ? { type: sq.type, color: sq.color } : null)));
  }

  function initialBoard() {
    const back = ["r", "n", "b", "q", "k", "b", "n", "r"];
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    for (let c = 0; c < 8; c++) {
      board[0][c] = { type: back[c], color: BLACK };
      board[1][c] = { type: "p", color: BLACK };
      board[6][c] = { type: "p", color: WHITE };
      board[7][c] = { type: back[c], color: WHITE };
    }
    return board;
  }

  class Chess {
    constructor() {
      this.reset();
    }

    reset() {
      this.board = initialBoard();
      this.turn = WHITE;
      // castling rights
      this.castling = { wK: true, wQ: true, bK: true, bQ: true };
      this.enPassant = null; // {r, c} square that can be captured en passant
      this.halfmove = 0;
      this.fullmove = 1;
      this.history = []; // stack of undo info
    }

    static get WHITE() { return WHITE; }
    static get BLACK() { return BLACK; }

    inside(r, c) {
      return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    pieceAt(r, c) {
      return this.board[r][c];
    }

    opponent(color) {
      return color === WHITE ? BLACK : WHITE;
    }

    findKing(color, board = this.board) {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (p && p.type === "k" && p.color === color) return { r, c };
        }
      }
      return null;
    }

    // Is square (r,c) attacked by `color` on the given board?
    isAttacked(r, c, color, board = this.board) {
      // pawn attacks
      const dir = color === WHITE ? -1 : 1; // white pawns move up (toward row 0)
      for (const dc of [-1, 1]) {
        const pr = r + dir; // square a pawn would come from is opposite of its move dir
        // a pawn of `color` on (r - dir, c + dc) attacks (r,c)
        const sr = r - dir;
        const sc = c + dc;
        if (this.inside(sr, sc)) {
          const p = board[sr][sc];
          if (p && p.color === color && p.type === "p") return true;
        }
      }
      // knight
      const kn = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1],
      ];
      for (const [dr, dc] of kn) {
        const sr = r + dr, sc = c + dc;
        if (this.inside(sr, sc)) {
          const p = board[sr][sc];
          if (p && p.color === color && p.type === "n") return true;
        }
      }
      // king
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const sr = r + dr, sc = c + dc;
          if (this.inside(sr, sc)) {
            const p = board[sr][sc];
            if (p && p.color === color && p.type === "k") return true;
          }
        }
      }
      // sliding: bishop/queen (diagonals)
      const diag = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [dr, dc] of diag) {
        let sr = r + dr, sc = c + dc;
        while (this.inside(sr, sc)) {
          const p = board[sr][sc];
          if (p) {
            if (p.color === color && (p.type === "b" || p.type === "q")) return true;
            break;
          }
          sr += dr; sc += dc;
        }
      }
      // sliding: rook/queen (orthogonal)
      const orth = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of orth) {
        let sr = r + dr, sc = c + dc;
        while (this.inside(sr, sc)) {
          const p = board[sr][sc];
          if (p) {
            if (p.color === color && (p.type === "r" || p.type === "q")) return true;
            break;
          }
          sr += dr; sc += dc;
        }
      }
      return false;
    }

    inCheck(color) {
      const k = this.findKing(color);
      if (!k) return false;
      return this.isAttacked(k.r, k.c, this.opponent(color));
    }

    // Generate pseudo-legal moves for the side to move (or given color).
    pseudoMoves(color = this.turn) {
      const moves = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = this.board[r][c];
          if (!p || p.color !== color) continue;
          switch (p.type) {
            case "p": this.pawnMoves(r, c, p, moves); break;
            case "n": this.knightMoves(r, c, p, moves); break;
            case "b": this.slideMoves(r, c, p, moves, [[-1,-1],[-1,1],[1,-1],[1,1]]); break;
            case "r": this.slideMoves(r, c, p, moves, [[-1,0],[1,0],[0,-1],[0,1]]); break;
            case "q": this.slideMoves(r, c, p, moves, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]); break;
            case "k": this.kingMoves(r, c, p, moves); break;
          }
        }
      }
      return moves;
    }

    addMove(moves, from, to, extra = {}) {
      moves.push(Object.assign({ from, to }, extra));
    }

    pawnMoves(r, c, p, moves) {
      const dir = p.color === WHITE ? -1 : 1;
      const startRow = p.color === WHITE ? 6 : 1;
      const promoRow = p.color === WHITE ? 0 : 7;
      const one = r + dir;
      // forward one
      if (this.inside(one, c) && !this.board[one][c]) {
        if (one === promoRow) {
          for (const promo of ["q", "r", "b", "n"]) this.addMove(moves, { r, c }, { r: one, c }, { promotion: promo });
        } else {
          this.addMove(moves, { r, c }, { r: one, c });
        }
        // forward two
        const two = r + 2 * dir;
        if (r === startRow && !this.board[two][c]) {
          this.addMove(moves, { r, c }, { r: two, c }, { double: true });
        }
      }
      // captures
      for (const dc of [-1, 1]) {
        const tr = r + dir, tc = c + dc;
        if (!this.inside(tr, tc)) continue;
        const target = this.board[tr][tc];
        if (target && target.color !== p.color) {
          if (tr === promoRow) {
            for (const promo of ["q", "r", "b", "n"]) this.addMove(moves, { r, c }, { r: tr, c: tc }, { promotion: promo, capture: true });
          } else {
            this.addMove(moves, { r, c }, { r: tr, c: tc }, { capture: true });
          }
        } else if (this.enPassant && this.enPassant.r === tr && this.enPassant.c === tc) {
          this.addMove(moves, { r, c }, { r: tr, c: tc }, { enPassant: true, capture: true });
        }
      }
    }

    knightMoves(r, c, p, moves) {
      const kn = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for (const [dr, dc] of kn) {
        const tr = r + dr, tc = c + dc;
        if (!this.inside(tr, tc)) continue;
        const target = this.board[tr][tc];
        if (!target || target.color !== p.color) {
          this.addMove(moves, { r, c }, { r: tr, c: tc }, { capture: !!target });
        }
      }
    }

    slideMoves(r, c, p, moves, dirs) {
      for (const [dr, dc] of dirs) {
        let tr = r + dr, tc = c + dc;
        while (this.inside(tr, tc)) {
          const target = this.board[tr][tc];
          if (!target) {
            this.addMove(moves, { r, c }, { r: tr, c: tc });
          } else {
            if (target.color !== p.color) this.addMove(moves, { r, c }, { r: tr, c: tc }, { capture: true });
            break;
          }
          tr += dr; tc += dc;
        }
      }
    }

    kingMoves(r, c, p, moves) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const tr = r + dr, tc = c + dc;
          if (!this.inside(tr, tc)) continue;
          const target = this.board[tr][tc];
          if (!target || target.color !== p.color) {
            this.addMove(moves, { r, c }, { r: tr, c: tc }, { capture: !!target });
          }
        }
      }
      // castling
      const opp = this.opponent(p.color);
      const row = p.color === WHITE ? 7 : 0;
      if (r === row && c === 4 && !this.isAttacked(row, 4, opp)) {
        const kSide = p.color === WHITE ? this.castling.wK : this.castling.bK;
        const qSide = p.color === WHITE ? this.castling.wQ : this.castling.bQ;
        // king side
        if (kSide && !this.board[row][5] && !this.board[row][6]) {
          const rook = this.board[row][7];
          if (rook && rook.type === "r" && rook.color === p.color &&
              !this.isAttacked(row, 5, opp) && !this.isAttacked(row, 6, opp)) {
            this.addMove(moves, { r, c }, { r: row, c: 6 }, { castle: "K" });
          }
        }
        // queen side
        if (qSide && !this.board[row][3] && !this.board[row][2] && !this.board[row][1]) {
          const rook = this.board[row][0];
          if (rook && rook.type === "r" && rook.color === p.color &&
              !this.isAttacked(row, 3, opp) && !this.isAttacked(row, 2, opp)) {
            this.addMove(moves, { r, c }, { r: row, c: 2 }, { castle: "Q" });
          }
        }
      }
    }

    // Fully legal moves (filter out those leaving own king in check).
    legalMoves(color = this.turn) {
      const result = [];
      for (const m of this.pseudoMoves(color)) {
        this.makeMove(m);
        if (!this.inCheck(color)) result.push(m);
        this.undoMove();
      }
      return result;
    }

    movesFrom(r, c) {
      return this.legalMoves(this.turn).filter((m) => m.from.r === r && m.from.c === c);
    }

    makeMove(move) {
      const { from, to } = move;
      const piece = this.board[from.r][from.c];
      const undo = {
        move,
        piece: { type: piece.type, color: piece.color },
        captured: null,
        capturedSquare: null,
        castling: Object.assign({}, this.castling),
        enPassant: this.enPassant,
        halfmove: this.halfmove,
        fullmove: this.fullmove,
        turn: this.turn,
      };

      // en passant capture removes pawn behind target
      if (move.enPassant) {
        const capRow = from.r;
        undo.captured = this.board[capRow][to.c];
        undo.capturedSquare = { r: capRow, c: to.c };
        this.board[capRow][to.c] = null;
      } else if (this.board[to.r][to.c]) {
        undo.captured = this.board[to.r][to.c];
        undo.capturedSquare = { r: to.r, c: to.c };
      }

      // move the piece
      this.board[to.r][to.c] = piece;
      this.board[from.r][from.c] = null;

      // promotion
      if (move.promotion) {
        this.board[to.r][to.c] = { type: move.promotion, color: piece.color };
      }

      // castling rook move
      if (move.castle === "K") {
        const row = from.r;
        this.board[row][5] = this.board[row][7];
        this.board[row][7] = null;
      } else if (move.castle === "Q") {
        const row = from.r;
        this.board[row][3] = this.board[row][0];
        this.board[row][0] = null;
      }

      // update castling rights
      if (piece.type === "k") {
        if (piece.color === WHITE) { this.castling.wK = false; this.castling.wQ = false; }
        else { this.castling.bK = false; this.castling.bQ = false; }
      }
      const touchRook = (r, c) => {
        if (r === 7 && c === 0) this.castling.wQ = false;
        if (r === 7 && c === 7) this.castling.wK = false;
        if (r === 0 && c === 0) this.castling.bQ = false;
        if (r === 0 && c === 7) this.castling.bK = false;
      };
      touchRook(from.r, from.c);
      touchRook(to.r, to.c);

      // en passant target
      if (move.double) {
        this.enPassant = { r: (from.r + to.r) / 2, c: from.c };
      } else {
        this.enPassant = null;
      }

      // counters
      if (piece.type === "p" || undo.captured) this.halfmove = 0;
      else this.halfmove++;
      if (this.turn === BLACK) this.fullmove++;

      this.turn = this.opponent(this.turn);
      this.history.push(undo);
      return undo;
    }

    undoMove() {
      const undo = this.history.pop();
      if (!undo) return;
      const { move } = undo;
      const { from, to } = move;

      this.castling = undo.castling;
      this.enPassant = undo.enPassant;
      this.halfmove = undo.halfmove;
      this.fullmove = undo.fullmove;
      this.turn = undo.turn;

      // restore moving piece (un-promote if needed)
      this.board[from.r][from.c] = undo.piece;
      this.board[to.r][to.c] = null;

      // restore captured piece
      if (undo.captured && undo.capturedSquare) {
        this.board[undo.capturedSquare.r][undo.capturedSquare.c] = undo.captured;
      }

      // undo castling rook move
      if (move.castle === "K") {
        const row = from.r;
        this.board[row][7] = this.board[row][5];
        this.board[row][5] = null;
      } else if (move.castle === "Q") {
        const row = from.r;
        this.board[row][0] = this.board[row][3];
        this.board[row][3] = null;
      }
    }

    isCheckmate(color = this.turn) {
      return this.inCheck(color) && this.legalMoves(color).length === 0;
    }

    isStalemate(color = this.turn) {
      return !this.inCheck(color) && this.legalMoves(color).length === 0;
    }

    isGameOver() {
      return this.legalMoves(this.turn).length === 0 || this.halfmove >= 100 || this.insufficientMaterial();
    }

    insufficientMaterial() {
      const pieces = [];
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++)
          if (this.board[r][c]) pieces.push(this.board[r][c]);
      if (pieces.length <= 2) return true; // K vs K
      if (pieces.length === 3) {
        return pieces.some((p) => p.type === "b" || p.type === "n"); // K+minor vs K
      }
      return false;
    }

    // Standard algebraic-ish notation for a move (computed before making it).
    moveToSAN(move) {
      const files = "abcdefgh";
      const piece = this.board[move.from.r][move.from.c];
      if (move.castle === "K") return "O-O";
      if (move.castle === "Q") return "O-O-O";
      const dest = files[move.to.c] + (8 - move.to.r);
      let san = "";
      if (piece.type === "p") {
        if (move.capture) san += files[move.from.c] + "x";
        san += dest;
        if (move.promotion) san += "=" + move.promotion.toUpperCase();
      } else {
        san += piece.type.toUpperCase();
        if (move.capture) san += "x";
        san += dest;
      }
      // check/mate suffix
      this.makeMove(move);
      if (this.inCheck(this.turn)) {
        san += this.legalMoves(this.turn).length === 0 ? "#" : "+";
      }
      this.undoMove();
      return san;
    }

    cloneState() {
      return {
        board: cloneBoard(this.board),
        turn: this.turn,
        castling: Object.assign({}, this.castling),
        enPassant: this.enPassant,
        halfmove: this.halfmove,
        fullmove: this.fullmove,
      };
    }
  }

  global.Chess = Chess;
})(typeof window !== "undefined" ? window : globalThis);
