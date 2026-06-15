/* UI glue: render board, handle clicks, run the bot, show status/history. */

(function () {
  "use strict";

  // Use solid (filled) glyphs for both colors; CSS colors them so white
  // pieces stay visible on light squares.
  const GLYPHS = {
    w: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
    b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
  };

  // Named bots with rating, search depth and a touch of personality (randomness).
  const BOTS = [
    { id: "martin", name: "Martin", rating: 250, depth: 1, randomness: 0.9, avatar: "🐣" },
    { id: "bella", name: "Bella", rating: 600, depth: 1, randomness: 0.55, avatar: "🐱" },
    { id: "aron", name: "Aron", rating: 1000, depth: 2, randomness: 0.35, avatar: "🤖" },
    { id: "nelson", name: "Nelson", rating: 1300, depth: 2, randomness: 0.15, avatar: "🦊" },
    { id: "sven", name: "Sven", rating: 1600, depth: 3, randomness: 0.05, avatar: "🐻" },
    { id: "maria", name: "Maria", rating: 2000, depth: 4, randomness: 0.0, avatar: "👑" },
  ];

  const boardEl = document.getElementById("board");
  const turnLabel = document.getElementById("turnLabel");
  const messageEl = document.getElementById("message");
  const historyEl = document.getElementById("history");
  const sideSelect = document.getElementById("side");
  const botListEl = document.getElementById("botList");
  const newGameBtn = document.getElementById("newGame");
  const undoBtn = document.getElementById("undo");
  const promotionModal = document.getElementById("promotion");

  const scoreWinsEl = document.getElementById("scoreWins");
  const scoreDrawsEl = document.getElementById("scoreDraws");
  const scoreLossesEl = document.getElementById("scoreLosses");
  const pointsEl = document.getElementById("points");
  const ratingEl = document.getElementById("rating");

  let game = new Chess();
  let humanColor = "w";
  let selected = null; // {r, c}
  let legalForSelected = [];
  let lastMove = null; // {from, to}
  let sanList = [];
  let busy = false; // bot thinking / animating
  let selectedBot = BOTS[2];
  let resultRecorded = false;

  // Persistent dashboard stats.
  const STORAGE_KEY = "chessDashboard.v1";
  let stats = loadStats();

  function loadStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return { wins: 0, draws: 0, losses: 0, points: 0, rating: 800 };
  }

  function saveStats() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); } catch (e) { /* ignore */ }
  }

  function renderDashboard() {
    scoreWinsEl.textContent = stats.wins;
    scoreDrawsEl.textContent = stats.draws;
    scoreLossesEl.textContent = stats.losses;
    pointsEl.textContent = stats.points;
    ratingEl.textContent = stats.rating;
  }

  function renderBotList() {
    botListEl.innerHTML = "";
    for (const bot of BOTS) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "bot-card" + (bot.id === selectedBot.id ? " active" : "");
      card.innerHTML = `
        <span class="bot-avatar">${bot.avatar}</span>
        <span class="bot-info">
          <span class="bot-name">${bot.name}</span>
          <span class="bot-rating">${bot.rating}</span>
        </span>`;
      card.addEventListener("click", () => {
        selectedBot = bot;
        renderBotList();
      });
      botListEl.appendChild(card);
    }
  }

  function flipped() {
    return humanColor === "b";
  }

  function render() {
    boardEl.innerHTML = "";
    const kingInCheck = game.inCheck(game.turn) ? game.findKing(game.turn) : null;

    for (let dr = 0; dr < 8; dr++) {
      for (let dc = 0; dc < 8; dc++) {
        const r = flipped() ? 7 - dr : dr;
        const c = flipped() ? 7 - dc : dc;
        const sq = document.createElement("div");
        sq.className = "square " + ((r + c) % 2 === 0 ? "light" : "dark");
        sq.dataset.r = r;
        sq.dataset.c = c;

        const piece = game.board[r][c];
        if (piece) {
          sq.classList.add(piece.color === "w" ? "white-piece" : "black-piece");
          const span = document.createElement("span");
          span.className = "piece";
          span.textContent = GLYPHS[piece.color][piece.type];
          sq.appendChild(span);
        }

        if (selected && selected.r === r && selected.c === c) sq.classList.add("selected");
        if (lastMove && ((lastMove.from.r === r && lastMove.from.c === c) ||
            (lastMove.to.r === r && lastMove.to.c === c))) {
          sq.classList.add("lastmove");
        }
        if (kingInCheck && kingInCheck.r === r && kingInCheck.c === c) sq.classList.add("check");

        // coordinates on edges
        if (dc === 0) {
          const rank = document.createElement("span");
          rank.className = "coord rank";
          rank.textContent = 8 - r;
          sq.appendChild(rank);
        }
        if (dr === 7) {
          const file = document.createElement("span");
          file.className = "coord file";
          file.textContent = "abcdefgh"[c];
          sq.appendChild(file);
        }

        sq.addEventListener("click", () => onSquareClick(r, c));
        boardEl.appendChild(sq);
      }
    }

    turnLabel.textContent = game.turn === "w" ? "White" : "Black";
    renderHistory();
    updateStatus();
  }

  function renderHistory() {
    historyEl.innerHTML = "";
    for (let i = 0; i < sanList.length; i += 2) {
      const li = document.createElement("li");
      const white = document.createElement("span");
      white.className = "ply";
      white.textContent = sanList[i] || "";
      li.appendChild(white);
      if (sanList[i + 1]) {
        const black = document.createElement("span");
        black.className = "ply";
        black.textContent = sanList[i + 1];
        li.appendChild(black);
      }
      historyEl.appendChild(li);
    }
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  function updateStatus() {
    let msg = "";
    let result = null; // "win" | "loss" | "draw"
    if (game.isCheckmate(game.turn)) {
      const loserColor = game.turn;
      const winner = loserColor === "w" ? "Black" : "White";
      msg = `Checkmate — ${winner} wins!`;
      result = loserColor === humanColor ? "loss" : "win";
    } else if (game.isStalemate(game.turn)) {
      msg = "Stalemate — draw.";
      result = "draw";
    } else if (game.halfmove >= 100) {
      msg = "Draw — 50-move rule.";
      result = "draw";
    } else if (game.insufficientMaterial()) {
      msg = "Draw — insufficient material.";
      result = "draw";
    } else if (game.inCheck(game.turn)) {
      msg = "Check!";
    }
    messageEl.textContent = msg;

    if (result && !resultRecorded) {
      recordResult(result);
    }
  }

  function recordResult(result) {
    resultRecorded = true;
    const expected = 1 / (1 + Math.pow(10, (selectedBot.rating - stats.rating) / 400));
    const actual = result === "win" ? 1 : result === "draw" ? 0.5 : 0;
    const K = 32;
    stats.rating = Math.max(100, Math.round(stats.rating + K * (actual - expected)));

    if (result === "win") {
      stats.wins++;
      stats.points += Math.max(1, Math.round(selectedBot.rating / 100));
    } else if (result === "draw") {
      stats.draws++;
      stats.points += 1;
    } else {
      stats.losses++;
    }
    saveStats();
    renderDashboard();
  }

  function gameOver() {
    return game.isGameOver();
  }

  function onSquareClick(r, c) {
    if (busy || gameOver()) return;
    if (game.turn !== humanColor) return;

    const piece = game.board[r][c];

    if (selected) {
      const move = legalForSelected.find((m) => m.to.r === r && m.to.c === c);
      if (move) {
        playHumanMove(move);
        return;
      }
      // reselect own piece or clear
      if (piece && piece.color === humanColor) {
        selectSquare(r, c);
      } else {
        clearSelection();
        render();
      }
      return;
    }

    if (piece && piece.color === humanColor) {
      selectSquare(r, c);
    }
  }

  function selectSquare(r, c) {
    selected = { r, c };
    // moves are still computed (needed to validate), but NOT shown as hints
    legalForSelected = game.movesFrom(r, c);
    render();
  }

  function clearSelection() {
    selected = null;
    legalForSelected = [];
  }

  function playHumanMove(move) {
    const promos = legalForSelected.filter(
      (m) => m.to.r === move.to.r && m.to.c === move.to.c && m.promotion
    );
    if (promos.length > 0) {
      askPromotion((piece) => {
        const chosen = promos.find((m) => m.promotion === piece);
        commitMove(chosen);
      });
    } else {
      commitMove(move);
    }
  }

  function commitMove(move) {
    const san = game.moveToSAN(move);
    game.makeMove(move);
    sanList.push(san);
    lastMove = { from: move.from, to: move.to };
    clearSelection();
    render();

    if (!gameOver() && game.turn !== humanColor) {
      scheduleBot();
    }
  }

  // Pick a move for the selected bot, applying its personality randomness.
  function chooseBotMove() {
    if (Math.random() < selectedBot.randomness) {
      const moves = game.legalMoves(game.turn);
      if (moves.length === 0) return null;
      return moves[Math.floor(Math.random() * moves.length)];
    }
    return ChessBot.bestMove(game, selectedBot.depth);
  }

  function scheduleBot() {
    busy = true;
    messageEl.textContent = `${selectedBot.name} is thinking…`;
    // let the UI paint before the (synchronous) search runs
    setTimeout(() => {
      const move = chooseBotMove();
      busy = false;
      if (!move) {
        render();
        return;
      }
      const san = game.moveToSAN(move);
      game.makeMove(move);
      sanList.push(san);
      lastMove = { from: move.from, to: move.to };
      render();
    }, 250);
  }

  function askPromotion(callback) {
    promotionModal.classList.remove("hidden");
    const handlers = [];
    promotionModal.querySelectorAll(".promo-btn").forEach((btn) => {
      const handler = () => {
        promotionModal.classList.add("hidden");
        handlers.forEach(({ b, h }) => b.removeEventListener("click", h));
        callback(btn.dataset.piece);
      };
      handlers.push({ b: btn, h: handler });
      btn.addEventListener("click", handler);
    });
  }

  function newGame() {
    game = new Chess();
    humanColor = sideSelect.value;
    selected = null;
    legalForSelected = [];
    lastMove = null;
    sanList = [];
    busy = false;
    resultRecorded = false;
    render();
    if (game.turn !== humanColor) scheduleBot();
  }

  function undo() {
    if (busy) return;
    // undo back to the human's previous turn (undo bot + human ply)
    if (game.history.length === 0) return;
    game.undoMove();
    sanList.pop();
    if (game.turn !== humanColor && game.history.length > 0) {
      game.undoMove();
      sanList.pop();
    }
    clearSelection();
    lastMove = game.history.length
      ? game.history[game.history.length - 1].move
      : null;
    if (lastMove) lastMove = { from: lastMove.from, to: lastMove.to };
    render();
  }

  newGameBtn.addEventListener("click", newGame);
  undoBtn.addEventListener("click", undo);

  renderBotList();
  renderDashboard();
  newGame();
})();
