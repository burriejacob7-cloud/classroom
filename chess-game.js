const chessBoard = document.getElementById('chessBoard');
const chessStatus = document.getElementById('chessStatus');
const chessResetBtn = document.getElementById('chessResetBtn');
const chessWhiteCaptures = document.getElementById('chessWhiteCaptures');
const chessBlackCaptures = document.getElementById('chessBlackCaptures');
const chessLastMove = document.getElementById('chessLastMove');
const chessDifficultyButtons = document.querySelectorAll('[data-chess-difficulty]');

async function initializeChess() {
  let Chess;
  try {
    ({ Chess } = await import('https://cdn.jsdelivr.net/npm/chess.js@1.4.0/+esm'));
  } catch {
    chessStatus.textContent = 'Chess could not load. Check your internet connection and refresh.';
    return;
  }

  const pieceGlyphs = {
    w: { k: 0x2654, q: 0x2655, r: 0x2656, b: 0x2657, n: 0x2658, p: 0x2659 },
    b: { k: 0x265a, q: 0x265b, r: 0x265c, b: 0x265d, n: 0x265e, p: 0x265f },
  };
  const pieceNames = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
  const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  const game = new Chess();
  let difficulty = 'easy';
  let selectedSquare = null;
  let legalTargets = [];
  let thinking = false;
  let computerTimer = null;
  let capturedByWhite = [];
  let capturedByBlack = [];

  function toMove(move) {
    return { from: move.from, to: move.to, promotion: move.promotion || 'q' };
  }

  function updateStatus() {
    if (game.isCheckmate()) {
      chessStatus.textContent = game.turn() === 'w' ? 'Checkmate. Computer wins.' : 'Checkmate. You win!';
    } else if (game.isDraw()) {
      chessStatus.textContent = game.isStalemate() ? 'Draw by stalemate.' : 'The game is a draw.';
    } else if (thinking) {
      chessStatus.textContent = 'Computer is thinking...';
    } else {
      const side = game.turn() === 'w' ? 'Your move' : 'Computer to move';
      chessStatus.textContent = game.isCheck() ? `Check. ${side}.` : `${side}.`;
    }

    chessWhiteCaptures.textContent = capturedByWhite.length
      ? capturedByWhite.map((type) => String.fromCodePoint(pieceGlyphs.b[type])).join(' ')
      : 'None';
    chessBlackCaptures.textContent = capturedByBlack.length
      ? capturedByBlack.map((type) => String.fromCodePoint(pieceGlyphs.w[type])).join(' ')
      : 'None';

    const history = game.history({ verbose: true });
    chessLastMove.textContent = history.length ? `${history.at(-1).from} → ${history.at(-1).to}` : '--';
  }

  function renderBoard() {
    chessBoard.replaceChildren();
    const position = game.board();
    const history = game.history({ verbose: true });
    const last = history.at(-1);

    position.forEach((row, rowIndex) => {
      row.forEach((piece, colIndex) => {
        const square = `${'abcdefgh'[colIndex]}${8 - rowIndex}`;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `chess-square ${(rowIndex + colIndex) % 2 === 0 ? 'light' : 'dark'}`;
        button.dataset.square = square;
        button.setAttribute('role', 'gridcell');

        if (piece) {
          button.textContent = String.fromCodePoint(pieceGlyphs[piece.color][piece.type]);
          button.classList.add(piece.color === 'w' ? 'white-piece' : 'black-piece');
          button.setAttribute('aria-label', `${square}, ${piece.color === 'w' ? 'white' : 'black'} ${pieceNames[piece.type]}`);
        } else {
          button.setAttribute('aria-label', `${square}, empty`);
        }

        if (selectedSquare === square) button.classList.add('selected');
        if (last && (last.from === square || last.to === square)) button.classList.add('last-move');
        if (legalTargets.some((move) => move.to === square)) {
          button.classList.add(game.get(square) ? 'legal-capture' : 'legal-target');
        }
        button.disabled = thinking || game.isGameOver() || game.turn() !== 'w';
        button.addEventListener('click', () => selectSquare(square));
        chessBoard.appendChild(button);
      });
    });
    updateStatus();
  }

  function evaluatePosition() {
    if (game.isCheckmate()) return game.turn() === 'w' ? -100000 : 100000;
    if (game.isDraw()) return 0;

    let score = 0;
    game.board().forEach((row, rowIndex) => {
      row.forEach((piece, colIndex) => {
        if (!piece) return;
        const sign = piece.color === 'w' ? 1 : -1;
        const centerDistance = Math.abs(3.5 - colIndex) + Math.abs(3.5 - rowIndex);
        let positional = (7 - centerDistance) * 3;
        if (piece.type === 'p') positional += (piece.color === 'w' ? 6 - rowIndex : rowIndex - 1) * 5;
        if (piece.type === 'n' || piece.type === 'b') positional *= 1.5;
        score += sign * (pieceValues[piece.type] + positional);
      });
    });
    return score;
  }

  function orderMoves(moves) {
    return moves.sort((first, second) => {
      const firstScore = (first.captured ? pieceValues[first.captured] : 0) + (first.promotion ? pieceValues[first.promotion] : 0);
      const secondScore = (second.captured ? pieceValues[second.captured] : 0) + (second.promotion ? pieceValues[second.promotion] : 0);
      return secondScore - firstScore;
    });
  }

  function search(depth, alpha, beta) {
    if (depth === 0 || game.isGameOver()) return evaluatePosition();

    const moves = orderMoves(game.moves({ verbose: true }));
    if (game.turn() === 'w') {
      let best = -Infinity;
      for (const move of moves) {
        game.move(toMove(move));
        best = Math.max(best, search(depth - 1, alpha, beta));
        game.undo();
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    }

    let best = Infinity;
    for (const move of moves) {
      game.move(toMove(move));
      best = Math.min(best, search(depth - 1, alpha, beta));
      game.undo();
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  function chooseComputerMove() {
    const moves = orderMoves(game.moves({ verbose: true }));
    if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];

    let bestScore = Infinity;
    let bestMoves = [];
    const depth = difficulty === 'hard' ? 2 : 1;
    for (const move of moves) {
      game.move(toMove(move));
      const score = search(depth, -Infinity, Infinity);
      game.undo();
      if (score < bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (score === bestScore) {
        bestMoves.push(move);
      }
    }
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  function makeComputerMove() {
    computerTimer = null;
    if (game.isGameOver() || game.turn() !== 'b') {
      thinking = false;
      renderBoard();
      return;
    }
    const move = chooseComputerMove();
    if (move) {
      const result = game.move(toMove(move));
      if (result.captured) capturedByBlack.push(result.captured);
    }
    thinking = false;
    selectedSquare = null;
    legalTargets = [];
    renderBoard();
  }

  function selectSquare(square) {
    if (thinking || game.isGameOver() || game.turn() !== 'w') return;
    if (selectedSquare && legalTargets.some((move) => move.to === square)) {
      const move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
      if (move) {
        if (move.captured) capturedByWhite.push(move.captured);
        selectedSquare = null;
        legalTargets = [];
        thinking = !game.isGameOver();
        renderBoard();
        if (thinking) computerTimer = window.setTimeout(makeComputerMove, 220);
        return;
      }
    }

    const piece = game.get(square);
    if (piece && piece.color === 'w') {
      selectedSquare = square;
      legalTargets = game.moves({ square, verbose: true });
    } else {
      selectedSquare = null;
      legalTargets = [];
    }
    renderBoard();
  }

  function resetGame() {
    if (computerTimer !== null) window.clearTimeout(computerTimer);
    computerTimer = null;
    game.reset();
    selectedSquare = null;
    legalTargets = [];
    thinking = false;
    capturedByWhite = [];
    capturedByBlack = [];
    renderBoard();
  }

  chessDifficultyButtons.forEach((button) => {
    button.addEventListener('click', () => {
      difficulty = button.dataset.chessDifficulty;
      chessDifficultyButtons.forEach((option) => {
        const active = option === button;
        option.classList.toggle('active', active);
        option.setAttribute('aria-pressed', String(active));
      });
    });
  });
  chessResetBtn.addEventListener('click', resetGame);
  renderBoard();
}

initializeChess();