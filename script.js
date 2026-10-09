const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const bestScoreEl = document.getElementById('best-score');
const statusText = document.getElementById('statusText');
const startBtn = document.getElementById('startBtn');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const PLAYER_WIDTH = 110;
const PLAYER_HEIGHT = 18;
const keys = { left: false, right: false };

let animationId = null;
let lastFrameTime = 0;
let spawnTimer = 0;
let stars = [];
let hazards = [];
let score = 0;
let lives = 3;
let bestScore = Number(localStorage.getItem('starlight-best-score') || 0);
let running = false;

const player = {
  x: WIDTH / 2 - PLAYER_WIDTH / 2,
  y: HEIGHT - PLAYER_HEIGHT - 18,
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  speed: 520,
};

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function updateBestScore() {
  bestScoreEl.textContent = String(bestScore);
}

function updateHud() {
  scoreEl.textContent = String(score);
  livesEl.textContent = String(lives);
}

function resetPlayer() {
  player.x = WIDTH / 2 - player.width / 2;
}

function createStar() {
  const size = randomBetween(8, 16);
  stars.push({
    x: randomBetween(size, WIDTH - size),
    y: -size,
    radius: size,
    speed: randomBetween(200, 320),
    drift: randomBetween(-55, 55),
    pulse: randomBetween(0, Math.PI * 2),
  });
}

function createHazard() {
  const size = randomBetween(11, 18);
  hazards.push({
    x: randomBetween(size, WIDTH - size),
    y: -size,
    radius: size,
    speed: randomBetween(240, 360),
    drift: randomBetween(-90, 90),
  });
}

function resetCatcherGame() {
  score = 0;
  lives = 3;
  stars = [];
  hazards = [];
  spawnTimer = 0;
  lastFrameTime = 0;
  resetPlayer();
  updateHud();
  statusText.textContent = 'Collect stars. Avoid the void.';
}

function startCatcherGame() {
  resetCatcherGame();
  running = true;
  startBtn.textContent = 'Restart Game';
  statusText.textContent = 'Game on! Catch the stars.';
  if (animationId) cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(gameLoop);
}

function stopCatcherGame(message) {
  running = false;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('starlight-best-score', String(bestScore));
    updateBestScore();
  }
  statusText.textContent = message;
  cancelAnimationFrame(animationId);
  animationId = null;
}

function handleInput(delta) {
  if (keys.left) player.x -= player.speed * delta;
  if (keys.right) player.x += player.speed * delta;
  player.x = Math.max(0, Math.min(WIDTH - player.width, player.x));
}

function updateObjects(delta) {
  for (const star of stars) {
    star.y += star.speed * delta;
    star.x += star.drift * delta;
    star.pulse += delta * 4;

    if (star.x < star.radius || star.x > WIDTH - star.radius) {
      star.drift *= -1;
    }

    const hit =
      star.y + star.radius >= player.y &&
      star.y - star.radius <= player.y + player.height &&
      star.x >= player.x &&
      star.x <= player.x + player.width;

    if (hit) {
      score += 10;
      star.y = HEIGHT + 100;
      updateHud();
    }
  }

  for (const hazard of hazards) {
    hazard.y += hazard.speed * delta;
    hazard.x += hazard.drift * delta;

    if (hazard.x < hazard.radius || hazard.x > WIDTH - hazard.radius) {
      hazard.drift *= -1;
    }

    const hit =
      hazard.y + hazard.radius >= player.y &&
      hazard.y - hazard.radius <= player.y + player.height &&
      hazard.x >= player.x &&
      hazard.x <= player.x + player.width;

    if (hit) {
      lives -= 1;
      hazard.y = HEIGHT + 100;
      updateHud();
      if (lives <= 0) {
        stopCatcherGame('Game over! Press start for another round.');
      }
    }
  }

  stars = stars.filter((star) => star.y < HEIGHT + 40 && star.y > -60);
  hazards = hazards.filter((hazard) => hazard.y < HEIGHT + 50 && hazard.y > -50);
}

function spawnItems(delta) {
  spawnTimer += delta;
  if (spawnTimer >= 1.0) {
    spawnTimer = 0;
    if (Math.random() < 0.75) {
      createStar();
    } else {
      createHazard();
    }

    if (Math.random() < 0.28) {
      createHazard();
    }
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, '#050c1d');
  gradient.addColorStop(1, '#0f2254');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let i = 0; i < 90; i += 1) {
    const x = (i * 73) % WIDTH;
    const y = ((i * 41) + (performance.now() * 0.02)) % HEIGHT;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawPlayer() {
  const x = player.x;
  const y = player.y;

  ctx.save();
  ctx.translate(x + player.width / 2, y + player.height / 2);
  ctx.fillStyle = '#7ae6ff';
  ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
  ctx.fillStyle = '#e8fbff';
  ctx.fillRect(-18, -12, 36, 8);
  ctx.restore();
}

function drawStar(star) {
  const { x, y, radius, pulse } = star;
  const glow = 1 + Math.sin(pulse) * 0.2;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(glow, glow);
  ctx.beginPath();
  const spikes = 5;
  const outerRadius = radius;
  const innerRadius = radius * 0.45;

  for (let i = 0; i < spikes * 2; i += 1) {
    const angle = (Math.PI / spikes) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  ctx.closePath();
  ctx.fillStyle = '#ffd166';
  ctx.shadowColor = '#ffd166';
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.restore();
}

function drawHazard(hazard) {
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = '#ff6b6b';
  ctx.shadowColor = '#ff6b6b';
  ctx.shadowBlur = 16;
  ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawUI() {
  if (!running) {
    ctx.fillStyle = 'rgba(8, 11, 19, 0.28)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

function drawFrame() {
  drawBackground();
  for (const star of stars) drawStar(star);
  for (const hazard of hazards) drawHazard(hazard);
  drawPlayer();
  drawUI();
}

function gameLoop(timestamp) {
  if (!running) return;

  if (!lastFrameTime) {
    lastFrameTime = timestamp;
  }

  const delta = Math.min((timestamp - lastFrameTime) / 1000, 0.035);
  lastFrameTime = timestamp;

  handleInput(delta);
  spawnItems(delta);
  updateObjects(delta);
  drawFrame();

  if (running) {
    animationId = requestAnimationFrame(gameLoop);
  }
}

const tabButtons = document.querySelectorAll('.tab-btn');
const gamePanels = document.querySelectorAll('.game-panel');

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    tabButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
    gamePanels.forEach((panel) => {
      panel.classList.toggle('active', panel.id === `${button.dataset.game}-game`);
    });
    setNightfallActive(button.dataset.game === 'nightfall');
    setBlocksActive(button.dataset.game === 'blocks');
  });
});

const arcadeGames = [
  { tab: 'catcher', name: 'Starlight Catcher', description: 'Catch stars and dodge hazards.', keywords: 'space stars action' },
  { tab: 'reaction', name: 'Reaction Rush', description: 'Test your reaction time.', keywords: 'speed reflex timing' },
  { tab: 'memory', name: 'Memory Match', description: 'Find matching pairs.', keywords: 'cards brain memory puzzle' },
  { tab: 'snake', name: 'Snake', description: 'Eat food and grow without crashing.', keywords: 'classic arcade action' },
  { tab: 'tictactoe', name: 'Tic-Tac-Toe', description: 'Play strategy against the computer.', keywords: 'strategy board puzzle' },
  { tab: 'maze', name: 'Maze Runner', description: 'Find the way through the maze.', keywords: 'path puzzle maze' },
  { tab: 'number', name: 'Number Puzzle', description: 'Slide tiles into the right order.', keywords: 'numbers logic brain puzzle' },
  { tab: 'dino', name: 'Dino Dash', description: 'Jump over obstacles in an endless run.', keywords: 'runner action dinosaur' },
  { tab: 'nightfall', name: 'Nightfall: Last Light', description: 'Hold out against the infected after dark.', keywords: 'horror survival shooter zombies waves' },
  { tab: 'blocks', name: 'Stackfall', description: 'Rotate and stack falling blocks to clear rows.', keywords: 'falling blocks puzzle arcade' },
  { tab: 'chess', name: 'Chess', description: 'Play a strategy match against the computer.', keywords: 'board strategy easy normal hard' },
];

const arcadeSearchInput = document.getElementById('arcadeSearchInput');
const arcadeSearchStatus = document.getElementById('arcadeSearchStatus');
const arcadeSearchResults = document.getElementById('arcadeSearchResults');

function renderArcadeSearchResults() {
  const query = arcadeSearchInput.value.trim().toLowerCase();
  const matches = arcadeGames.filter((game) =>
    `${game.name} ${game.description} ${game.keywords}`.toLowerCase().includes(query)
  );

  arcadeSearchResults.replaceChildren();
  arcadeSearchStatus.textContent = matches.length === 1
    ? '1 game found'
    : `${matches.length} games found`;

  matches.forEach((game) => {
    const result = document.createElement('button');
    result.type = 'button';
    result.className = 'local-game-result';

    const title = document.createElement('span');
    title.className = 'game-result-title';
    title.textContent = game.name;

    const description = document.createElement('span');
    description.className = 'game-result-description';
    description.textContent = game.description;

    result.append(title, description);
    result.addEventListener('click', () => {
      Array.from(tabButtons).find((button) => button.dataset.game === game.tab)?.click();
    });
    arcadeSearchResults.appendChild(result);
  });
}

arcadeSearchInput.addEventListener('input', renderArcadeSearchResults);
renderArcadeSearchResults();

document.addEventListener('keydown', (event) => {
  if (document.getElementById('blocks-game').classList.contains('active')) return;
  const key = event.key.toLowerCase();
  if (event.key === 'ArrowLeft' || key === 'a') keys.left = true;
  if (event.key === 'ArrowRight' || key === 'd') keys.right = true;
});

document.addEventListener('keyup', (event) => {
  if (document.getElementById('blocks-game').classList.contains('active')) return;
  const key = event.key.toLowerCase();
  if (event.key === 'ArrowLeft' || key === 'a') keys.left = false;
  if (event.key === 'ArrowRight' || key === 'd') keys.right = false;
});

startBtn.addEventListener('click', startCatcherGame);
updateBestScore();
updateHud();
resetCatcherGame();
drawFrame();

const reactionBox = document.getElementById('reactionBox');
const reactionBestEl = document.getElementById('reaction-best');
const reactionStartBtn = document.getElementById('reactionStartBtn');

let reactionTimer = null;
let reactionReady = false;
let reactionStartTime = 0;
let bestReaction = Number(localStorage.getItem('pixel-best-reaction') || 0);

function updateReactionBest() {
  reactionBestEl.textContent = `${bestReaction || 0}ms`;
}

function startReactionRound() {
  clearTimeout(reactionTimer);
  reactionReady = false;
  reactionStartTime = 0;
  reactionBox.textContent = 'Wait...';
  reactionBox.classList.add('waiting');
  reactionBox.classList.remove('ready');

  const delay = randomBetween(1200, 3000);
  reactionTimer = setTimeout(() => {
    reactionReady = true;
    reactionStartTime = Date.now();
    reactionBox.textContent = 'CLICK!';
    reactionBox.classList.add('ready');
    reactionBox.classList.remove('waiting');
  }, delay);
}

reactionStartBtn.addEventListener('click', startReactionRound);
reactionBox.addEventListener('click', () => {
  if (!reactionReady) {
    clearTimeout(reactionTimer);
    reactionBox.textContent = 'Too soon!';
    reactionBox.classList.remove('ready', 'waiting');
    reactionReady = false;
    return;
  }

  const reactionTime = Date.now() - reactionStartTime;
  reactionReady = false;
  reactionBox.textContent = `${reactionTime}ms`;
  reactionBox.classList.remove('ready', 'waiting');

  if (bestReaction === 0 || reactionTime < bestReaction) {
    bestReaction = reactionTime;
    localStorage.setItem('pixel-best-reaction', String(bestReaction));
    updateReactionBest();
  }
});

updateReactionBest();

const memoryBoard = document.getElementById('memoryBoard');
const memoryMatchesEl = document.getElementById('memory-matches');
const memoryMovesEl = document.getElementById('memory-moves');
const memoryResetBtn = document.getElementById('memoryResetBtn');
const memorySymbols = ['★', '✦', '✧', '⚡', '☄', '☾', '✶', '◆'];
let memoryCards = [];
let memoryFlipped = [];
let memoryLocked = false;
let memoryMatches = 0;
let memoryMoves = 0;

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function updateMemoryStats() {
  memoryMatchesEl.textContent = `${memoryMatches} / 8`;
  memoryMovesEl.textContent = String(memoryMoves);
}

function buildMemoryBoard() {
  memoryCards = shuffle([...memorySymbols, ...memorySymbols]).map((symbol, index) => ({
    id: index,
    symbol,
    matched: false,
  }));

  memoryFlipped = [];
  memoryLocked = false;
  memoryMatches = 0;
  memoryMoves = 0;
  memoryBoard.innerHTML = '';
  updateMemoryStats();

  memoryCards.forEach((card) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'memory-card';
    button.dataset.id = String(card.id);
    button.textContent = card.symbol;
    button.addEventListener('click', () => flipMemoryCard(button, card));
    memoryBoard.appendChild(button);
  });
}

function flipMemoryCard(button, card) {
  if (memoryLocked || memoryFlipped.includes(card.id) || card.matched) return;

  button.classList.add('revealed');
  memoryFlipped.push(card.id);

  if (memoryFlipped.length === 2) {
    memoryMoves += 1;
    updateMemoryStats();
    const [firstId, secondId] = memoryFlipped;
    const firstCard = memoryCards.find((item) => item.id === firstId);
    const secondCard = memoryCards.find((item) => item.id === secondId);

    if (firstCard.symbol === secondCard.symbol) {
      firstCard.matched = true;
      secondCard.matched = true;
      memoryMatches += 1;
      updateMemoryStats();

      Array.from(memoryBoard.children).forEach((tile) => {
        const tileId = Number(tile.dataset.id);
        if (tileId === firstId || tileId === secondId) {
          tile.classList.add('matched');
        }
      });

      memoryFlipped = [];

      if (memoryMatches === 8) {
        setTimeout(() => {
          alert('You matched every tile! Nice work!');
        }, 200);
      }
      return;
    }

    memoryLocked = true;
    setTimeout(() => {
      memoryBoard.querySelectorAll('.memory-card.revealed').forEach((tile) => {
        tile.classList.remove('revealed');
      });
      memoryFlipped = [];
      memoryLocked = false;
    }, 700);
  }
}

memoryResetBtn.addEventListener('click', buildMemoryBoard);
buildMemoryBoard();

const snakeCanvas = document.getElementById('snakeCanvas');
const snakeCtx = snakeCanvas.getContext('2d');
const snakeScoreEl = document.getElementById('snake-score');
const snakeBestEl = document.getElementById('snake-best');
const snakeStartBtn = document.getElementById('snakeStartBtn');

let snakeInterval = null;
let snake = [];
let snakeDirection = { x: 1, y: 0 };
let nextSnakeDirection = { x: 1, y: 0 };
let snakeFood = { x: 10, y: 8 };
let snakeScore = 0;
let snakeBest = Number(localStorage.getItem('pixel-snake-best') || 0);

function updateSnakeBest() {
  snakeBestEl.textContent = String(snakeBest);
}

function initSnake() {
  snake = [
    { x: 7, y: 7 },
    { x: 6, y: 7 },
    { x: 5, y: 7 },
  ];
  snakeDirection = { x: 1, y: 0 };
  nextSnakeDirection = { x: 1, y: 0 };
  snakeScore = 0;
  snakeScoreEl.textContent = String(snakeScore);
  spawnSnakeFood();
}

function spawnSnakeFood() {
  do {
    snakeFood.x = Math.floor(Math.random() * 18);
    snakeFood.y = Math.floor(Math.random() * 18);
  } while (snake.some((segment) => segment.x === snakeFood.x && segment.y === snakeFood.y));
}

function drawSnake() {
  snakeCtx.clearRect(0, 0, snakeCanvas.width, snakeCanvas.height);
  snakeCtx.fillStyle = '#081321';
  snakeCtx.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);

  for (let x = 0; x < 18; x += 1) {
    for (let y = 0; y < 18; y += 1) {
      snakeCtx.strokeStyle = 'rgba(255,255,255,0.05)';
      snakeCtx.strokeRect(x * 20, y * 20, 20, 20);
    }
  }

  snakeCtx.fillStyle = '#ffd166';
  snakeCtx.fillRect(snakeFood.x * 20, snakeFood.y * 20, 20, 20);

  snake.forEach((segment, index) => {
    snakeCtx.fillStyle = index === 0 ? '#7ae6ff' : '#5ee7ad';
    snakeCtx.fillRect(segment.x * 20, segment.y * 20, 18, 18);
  });
}

function endSnakeGame() {
  clearInterval(snakeInterval);
  snakeInterval = null;
  if (snakeScore > snakeBest) {
    snakeBest = snakeScore;
    localStorage.setItem('pixel-snake-best', String(snakeBest));
    updateSnakeBest();
  }
  alert('Snake crashed!');
}

function tickSnake() {
  snakeDirection = nextSnakeDirection;
  const head = { x: snake[0].x + snakeDirection.x, y: snake[0].y + snakeDirection.y };

  if (
    head.x < 0 || head.y < 0 || head.x >= 18 || head.y >= 18 ||
    snake.some((segment) => segment.x === head.x && segment.y === head.y)
  ) {
    endSnakeGame();
    return;
  }

  snake.unshift(head);

  if (head.x === snakeFood.x && head.y === snakeFood.y) {
    snakeScore += 1;
    snakeScoreEl.textContent = String(snakeScore);
    spawnSnakeFood();
  } else {
    snake.pop();
  }

  drawSnake();
}

function startSnakeGame() {
  initSnake();
  drawSnake();
  clearInterval(snakeInterval);
  snakeInterval = setInterval(tickSnake, 120);
}

snakeStartBtn.addEventListener('click', startSnakeGame);
updateSnakeBest();
initSnake();
drawSnake();

document.addEventListener('keydown', (event) => {
  if (document.getElementById('blocks-game').classList.contains('active')) return;
  const key = event.key.toLowerCase();
  if (event.key === 'ArrowUp' || key === 'w') nextSnakeDirection = { x: 0, y: -1 };
  if (event.key === 'ArrowDown' || key === 's') nextSnakeDirection = { x: 0, y: 1 };
  if (event.key === 'ArrowLeft' || key === 'a') nextSnakeDirection = { x: -1, y: 0 };
  if (event.key === 'ArrowRight' || key === 'd') nextSnakeDirection = { x: 1, y: 0 };
});

const tttBoard = document.getElementById('tttBoard');
const tttStatus = document.getElementById('ttt-status');
const tttResetBtn = document.getElementById('tttResetBtn');
let tttBoardState = Array(9).fill('');
let tttCurrent = 'X';
let tttGameLocked = false;

function winningLines() {
  return [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
}

function checkWin(state) {
  for (const combo of winningLines()) {
    const [a, b, c] = combo;
    if (state[a] && state[a] === state[b] && state[a] === state[c]) {
      return combo;
    }
  }
  return null;
}

function renderTTT() {
  tttBoard.innerHTML = '';
  tttBoardState.forEach((value, index) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'ttt-cell';
    cell.textContent = value;
    cell.addEventListener('click', () => handleTTTMove(index));
    tttBoard.appendChild(cell);
  });
  tttStatus.textContent = tttGameLocked ? 'Round complete' : `Your turn: ${tttCurrent}`;
}

function finishTTT(winner) {
  tttGameLocked = true;
  tttStatus.textContent = winner ? `Winner: ${winner}` : 'Draw game!';
}

function computerMove() {
  if (tttGameLocked) return;

  const available = tttBoardState.map((value, index) => (value ? null : index)).filter((value) => value !== null);
  if (!available.length) return;

  const winMove = available.find((index) => {
    const test = [...tttBoardState];
    test[index] = 'O';
    return checkWin(test);
  });

  if (winMove !== undefined) {
    tttBoardState[winMove] = 'O';
    renderTTT();
    const winner = checkWin(tttBoardState);
    if (winner) {
      finishTTT('O');
      return;
    }
    if (tttBoardState.every(Boolean)) {
      finishTTT(null);
      return;
    }
    tttCurrent = 'X';
    renderTTT();
    return;
  }

  const blockMove = available.find((index) => {
    const test = [...tttBoardState];
    test[index] = 'X';
    return checkWin(test);
  });

  if (blockMove !== undefined) {
    tttBoardState[blockMove] = 'O';
    renderTTT();
    const winner = checkWin(tttBoardState);
    if (winner) {
      finishTTT('O');
      return;
    }
    if (tttBoardState.every(Boolean)) {
      finishTTT(null);
      return;
    }
    tttCurrent = 'X';
    renderTTT();
    return;
  }

  const center = 4;
  const preferred = [center, 0, 2, 6, 8, 1, 3, 5, 7].find((index) => tttBoardState[index] === '');
  if (preferred !== undefined) {
    tttBoardState[preferred] = 'O';
  }

  renderTTT();

  const winner = checkWin(tttBoardState);
  if (winner) {
    finishTTT('O');
    return;
  }
  if (tttBoardState.every(Boolean)) {
    finishTTT(null);
    return;
  }
  tttCurrent = 'X';
  renderTTT();
}

function handleTTTMove(index) {
  if (tttBoardState[index] || tttGameLocked || tttCurrent !== 'X') return;

  tttBoardState[index] = 'X';
  const win = checkWin(tttBoardState);
  if (win) {
    finishTTT('X');
    return;
  }
  if (tttBoardState.every(Boolean)) {
    finishTTT(null);
    return;
  }

  tttCurrent = 'O';
  renderTTT();
  setTimeout(computerMove, 260);
}

function resetTTT() {
  tttBoardState = Array(9).fill('');
  tttCurrent = 'X';
  tttGameLocked = false;
  renderTTT();
}

tttResetBtn.addEventListener('click', resetTTT);
resetTTT();

const mazeBoard = document.getElementById('mazeBoard');
const mazeMovesEl = document.getElementById('maze-moves');
const mazeResetBtn = document.getElementById('mazeResetBtn');

const mazeLayout = [
  'S..#....',
  '#.#.##.#',
  '#...#..#',
  '.##.#..#',
  '#....#.#',
  '#.##.#.#',
  '#....#..',
  '...#..G#',
];

let mazePlayer = { x: 0, y: 0 };
let mazeMoves = 0;

function updateMazeMoves() {
  mazeMovesEl.textContent = String(mazeMoves);
}

function renderMaze() {
  mazeBoard.innerHTML = '';
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const cell = document.createElement('div');
      cell.className = 'maze-cell';
      const value = mazeLayout[row][col];
      if (value === '#') cell.classList.add('wall');
      if (row === mazePlayer.y && col === mazePlayer.x) cell.classList.add('player');
      if (value === 'G') cell.classList.add('goal');
      mazeBoard.appendChild(cell);
    }
  }
}

function moveMaze(dx, dy) {
  const nextX = mazePlayer.x + dx;
  const nextY = mazePlayer.y + dy;
  if (nextX < 0 || nextY < 0 || nextX >= 8 || nextY >= 8) return;
  const nextValue = mazeLayout[nextY][nextX];
  if (nextValue === '#') return;

  mazePlayer.x = nextX;
  mazePlayer.y = nextY;
  mazeMoves += 1;
  updateMazeMoves();

  if (mazeLayout[nextY][nextX] === 'G') {
    alert('You escaped the maze!');
    resetMaze();
    return;
  }

  renderMaze();
}

function resetMaze() {
  mazePlayer = { x: 0, y: 0 };
  mazeMoves = 0;
  updateMazeMoves();
  renderMaze();
}

mazeResetBtn.addEventListener('click', resetMaze);
document.addEventListener('keydown', (event) => {
  if (document.getElementById('blocks-game').classList.contains('active')) return;
  if (event.key === 'ArrowUp') moveMaze(0, -1);
  if (event.key === 'ArrowDown') moveMaze(0, 1);
  if (event.key === 'ArrowLeft') moveMaze(-1, 0);
  if (event.key === 'ArrowRight') moveMaze(1, 0);
});
resetMaze();

const numberBoard = document.getElementById('numberBoard');
const numberMovesEl = document.getElementById('number-moves');
const numberResetBtn = document.getElementById('numberResetBtn');
let numberTiles = [];
let numberMoves = 0;

function isSolved() {
  return numberTiles.every((tile, index) => tile === (index + 1) % 9 || (index === 8 && tile === 0));
}

function setNumberBoard() {
  numberBoard.innerHTML = '';
  numberTiles.forEach((value, index) => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'number-tile';
    if (value === 0) tile.classList.add('empty');
    tile.textContent = value === 0 ? '' : String(value);
    tile.addEventListener('click', () => moveNumberTile(index));
    numberBoard.appendChild(tile);
  });
  numberMovesEl.textContent = String(numberMoves);
}

function moveNumberTile(index) {
  const emptyIndex = numberTiles.indexOf(0);
  const row = Math.floor(index / 3);
  const col = index % 3;
  const emptyRow = Math.floor(emptyIndex / 3);
  const emptyCol = emptyIndex % 3;
  const distance = Math.abs(row - emptyRow) + Math.abs(col - emptyCol);

  if (distance !== 1) return;

  [numberTiles[index], numberTiles[emptyIndex]] = [numberTiles[emptyIndex], numberTiles[index]];
  numberMoves += 1;
  setNumberBoard();

  if (isSolved()) {
    alert('Solved!');
  }
}

function shuffleNumbers() {
  numberTiles = Array.from({ length: 9 }, (_, index) => index + 1);
  numberTiles.pop();
  numberTiles.push(0);
  for (let i = numberTiles.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [numberTiles[i], numberTiles[j]] = [numberTiles[j], numberTiles[i]];
  }
  numberMoves = 0;
  setNumberBoard();
}

numberResetBtn.addEventListener('click', shuffleNumbers);
shuffleNumbers();

document.addEventListener('keydown', (event) => {
  if (document.getElementById('blocks-game').classList.contains('active')) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    const emptyIndex = numberTiles.indexOf(0);
    const row = Math.floor(emptyIndex / 3);
    const col = emptyIndex % 3;

    if (event.key === 'ArrowUp' && row < 2) {
      moveNumberTile(row * 3 + col + 3);
    }
    if (event.key === 'ArrowDown' && row > 0) {
      moveNumberTile(row * 3 + col - 3);
    }
    if (event.key === 'ArrowLeft' && col < 2) {
      moveNumberTile(row * 3 + col + 1);
    }
    if (event.key === 'ArrowRight' && col > 0) {
      moveNumberTile(row * 3 + col - 1);
    }
  }
});

const dinoCanvas = document.getElementById('dinoCanvas');
const dinoCtx = dinoCanvas.getContext('2d');
const dinoScoreEl = document.getElementById('dino-score');
const dinoStartBtn = document.getElementById('dinoStartBtn');

let dinoGameRunning = false;
let dinoFrame = null;
let dino = { x: 60, y: 150, width: 28, height: 36, vy: 0 };
let dinoObstacles = [];
let dinoScore = 0;
let dinoLastTime = 0;
let dinoSpawnTimer = 0;

function resetDinoGame() {
  dino = { x: 60, y: 150, width: 28, height: 36, vy: 0 };
  dinoObstacles = [];
  dinoScore = 0;
  dinoSpawnTimer = 0;
  dinoLastTime = 0;
  dinoScoreEl.textContent = String(dinoScore);
}

function jumpDino() {
  if (!dinoGameRunning) return;
  if (dino.y >= 150) {
    dino.vy = -540;
  }
}

document.addEventListener('keydown', (event) => {
  if (document.getElementById('blocks-game').classList.contains('active')) return;
  if (event.key === ' ' || event.key === 'ArrowUp') {
    jumpDino();
  }
});

function updateDino(delta) {
  dino.vy += 1400 * delta;
  dino.y += dino.vy * delta;
  if (dino.y > 150) {
    dino.y = 150;
    dino.vy = 0;
  }

  dinoSpawnTimer += delta;
  if (dinoSpawnTimer > 1.2) {
    dinoSpawnTimer = 0;
    const height = randomBetween(22, 48);
    dinoObstacles.push({ x: 720, width: 20, height, y: 170 - height });
  }

  dinoObstacles.forEach((obstacle) => {
    obstacle.x -= 260 * delta;
  });

  dinoObstacles = dinoObstacles.filter((obstacle) => obstacle.x + obstacle.width > -10);
  dinoScore += delta * 12;
  dinoScoreEl.textContent = String(Math.floor(dinoScore));

  const hitBoxX = dino.x + 8;
  const hitBoxY = dino.y + 4;

  for (const obstacle of dinoObstacles) {
    if (
      hitBoxX < obstacle.x + obstacle.width &&
      hitBoxX + dino.width > obstacle.x &&
      hitBoxY < obstacle.y + obstacle.height &&
      hitBoxY + dino.height > obstacle.y
    ) {
      dinoGameRunning = false;
      alert('Dino crash!');
      return;
    }
  }
}

function drawDinoScene() {
  dinoCtx.clearRect(0, 0, dinoCanvas.width, dinoCanvas.height);
  dinoCtx.fillStyle = '#081321';
  dinoCtx.fillRect(0, 0, dinoCanvas.width, dinoCanvas.height);

  dinoCtx.fillStyle = '#a7f3d0';
  dinoCtx.fillRect(0, 188, dinoCanvas.width, 32);

  dinoCtx.fillStyle = '#7ae6ff';
  dinoCtx.fillRect(dino.x, dino.y, dino.width, dino.height);

  dinoObstacles.forEach((obstacle) => {
    dinoCtx.fillStyle = '#ff6b6b';
    dinoCtx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  });
}

function dinoLoop(timestamp) {
  if (!dinoGameRunning) return;

  if (!dinoLastTime) dinoLastTime = timestamp;
  const delta = Math.min((timestamp - dinoLastTime) / 1000, 0.03);
  dinoLastTime = timestamp;

  updateDino(delta);
  drawDinoScene();

  if (dinoGameRunning) {
    dinoFrame = requestAnimationFrame(dinoLoop);
  }
}

function startDinoGame() {
  resetDinoGame();
  dinoGameRunning = true;
  dinoFrame = requestAnimationFrame(dinoLoop);
}

dinoStartBtn.addEventListener('click', startDinoGame);
resetDinoGame();
drawDinoScene();

const nightfallCanvas = document.getElementById('nightfallCanvas');
const nightfallCtx = nightfallCanvas.getContext('2d');
const nightfallStartBtn = document.getElementById('nightfallStartBtn');
const nightfallStatusEl = document.getElementById('nightfall-status');
const nightfallWaveEl = document.getElementById('nightfall-wave');
const nightfallKillsEl = document.getElementById('nightfall-kills');
const nightfallBestEl = document.getElementById('nightfall-best');
const nightfallHealthValueEl = document.getElementById('nightfall-health-value');
const nightfallHealthBar = document.getElementById('nightfall-health-bar');
const nightfallAmmoEl = document.getElementById('nightfall-ammo');
const nightfallCoinsEl = document.getElementById('nightfall-coins');
const nightfallShop = document.getElementById('nightfallShop');
const nightfallShopCoinsEl = document.getElementById('nightfall-shop-coins');
const nightfallNextWaveBtn = document.getElementById('nightfallNextWaveBtn');
const nightfallKeys = new Set();
const nightfallBest = Number(localStorage.getItem('pixel-nightfall-best') || 0);

const nightfallBlocks = [
  { x: 145, y: 118, w: 108, h: 52, kind: 'crate' },
  { x: 710, y: 130, w: 92, h: 72, kind: 'crate' },
  { x: 315, y: 96, w: 54, h: 110, kind: 'pillar' },
  { x: 570, y: 390, w: 110, h: 55, kind: 'crate' },
  { x: 220, y: 414, w: 64, h: 94, kind: 'pillar' },
  { x: 415, y: 450, w: 118, h: 42, kind: 'crate' },
  { x: 760, y: 370, w: 56, h: 100, kind: 'pillar' },
  { x: 394, y: 260, w: 82, h: 52, kind: 'crate' },
];

const nightfallPlayer = { x: 480, y: 330, radius: 15, speed: 205, health: 100, angle: -Math.PI / 2 };
let nightfallRunning = false;
let nightfallFrame = null;
let nightfallLastTime = 0;
let nightfallWave = 0;
let nightfallKills = 0;
let nightfallMagazine = 12;
let nightfallMagazineSize = 12;
let nightfallReserve = 72;
let nightfallCoins = 0;
let nightfallDamage = 1;
let nightfallFireRateLevel = 0;
let nightfallHealthLevel = 0;
let nightfallMagazineLevel = 0;
let nightfallMaxHealth = 100;
let nightfallEnemies = [];
let nightfallBullets = [];
let nightfallDrops = [];
let nightfallEffects = [];
let nightfallToSpawn = 0;
let nightfallSpawnTimer = 0;
let nightfallShopOpen = false;
let nightfallShotCooldown = 0;
let nightfallReloadTimer = 0;
let nightfallAttackCooldown = 0;
let nightfallShake = 0;
let nightfallIsFiring = false;
let nightfallPointer = { x: 760, y: 300 };

function updateNightfallHud() {
  nightfallWaveEl.textContent = String(nightfallWave);
  nightfallKillsEl.textContent = String(nightfallKills);
  nightfallCoinsEl.textContent = String(nightfallCoins);
  nightfallHealthValueEl.textContent = String(Math.max(0, Math.ceil(nightfallPlayer.health)));
  nightfallHealthBar.style.width = `${Math.max(0, nightfallPlayer.health / nightfallMaxHealth * 100)}%`;
  nightfallAmmoEl.textContent = `${nightfallMagazine} / ${nightfallReserve}`;
  nightfallShopCoinsEl.textContent = String(nightfallCoins);
  updateNightfallShop();
}

function getNightfallUpgradeInfo(type) {
  const damageLevel = nightfallDamage - 1;
  const upgrades = {
    damage: { level: damageLevel, max: 15, cost: 8 + damageLevel * 8 },
    fireRate: { level: nightfallFireRateLevel, max: 15, cost: 10 + nightfallFireRateLevel * 7 },
    health: { level: nightfallHealthLevel, max: 15, cost: 12 + nightfallHealthLevel * 8 },
    magazine: { level: nightfallMagazineLevel, max: 15, cost: 10 + nightfallMagazineLevel * 8 },
  };
  return upgrades[type];
}

function updateNightfallShop() {
  nightfallShop.hidden = !nightfallShopOpen;
  nightfallShopCoinsEl.textContent = String(nightfallCoins);
  nightfallShop.querySelectorAll('[data-nightfall-upgrade]').forEach((button) => {
    const info = getNightfallUpgradeInfo(button.dataset.nightfallUpgrade);
    const maxed = info.level >= info.max;
    button.disabled = !nightfallShopOpen || maxed || nightfallCoins < info.cost;
    button.querySelector('[data-upgrade-cost]').textContent = maxed ? 'MAXED' : `${info.cost} scrap`;
  });
  nightfallNextWaveBtn.disabled = !nightfallShopOpen;
}

function buyNightfallUpgrade(type) {
  if (!nightfallShopOpen) return;
  const info = getNightfallUpgradeInfo(type);
  if (!info || info.level >= info.max || nightfallCoins < info.cost) return;

  nightfallCoins -= info.cost;
  if (type === 'damage') {
    nightfallDamage += 1;
  } else if (type === 'fireRate') {
    nightfallFireRateLevel += 1;
  } else if (type === 'health') {
    nightfallHealthLevel += 1;
    nightfallMaxHealth += 20;
    nightfallPlayer.health = Math.min(nightfallMaxHealth, nightfallPlayer.health + 35);
  } else if (type === 'magazine') {
    nightfallMagazineLevel += 1;
    nightfallMagazineSize += 4;
    nightfallMagazine += 4;
  }

  const upgradeName = document.querySelector(`[data-nightfall-upgrade="${type}"] .upgrade-name`).textContent;
  nightfallStatusEl.textContent = `${upgradeName} installed.`;
  updateNightfallHud();
}

function startNightfallWave() {
  nightfallWave += 1;
  nightfallShopOpen = false;
  nightfallReserve = Math.min(120, nightfallReserve + 24);
  nightfallToSpawn = 4 + nightfallWave * 2;
  nightfallSpawnTimer = 0.45;
  const bossWave = nightfallWave % 5 === 0;
  nightfallStatusEl.textContent = bossWave
    ? `BOSS WAVE ${nightfallWave}: The Warden is closing in. Supply cache recovered.`
    : `Wave ${nightfallWave}: supply cache recovered.`;
  if (bossWave) spawnNightfallEnemy(true);
  if (nightfallWave > nightfallBest) {
    localStorage.setItem('pixel-nightfall-best', String(nightfallWave));
    nightfallBestEl.textContent = String(nightfallWave);
  }
  updateNightfallHud();
}

function resetNightfallGame() {
  nightfallWave = 0;
  nightfallKills = 0;
  nightfallMagazine = 12;
  nightfallMagazineSize = 12;
  nightfallReserve = 72;
  nightfallCoins = 0;
  nightfallDamage = 1;
  nightfallFireRateLevel = 0;
  nightfallHealthLevel = 0;
  nightfallMagazineLevel = 0;
  nightfallMaxHealth = 100;
  nightfallPlayer.x = 480;
  nightfallPlayer.y = 330;
  nightfallPlayer.health = 100;
  nightfallPlayer.angle = -Math.PI / 2;
  nightfallEnemies = [];
  nightfallBullets = [];
  nightfallDrops = [];
  nightfallEffects = [];
  nightfallToSpawn = 0;
  nightfallSpawnTimer = 0;
  nightfallShopOpen = false;
  nightfallShotCooldown = 0;
  nightfallReloadTimer = 0;
  nightfallAttackCooldown = 0;
  nightfallShake = 0;
  nightfallLastTime = 0;
  updateNightfallHud();
}

function nightfallCircleHitsBlock(x, y, radius) {
  return nightfallBlocks.some((block) => {
    const closestX = Math.max(block.x, Math.min(x, block.x + block.w));
    const closestY = Math.max(block.y, Math.min(y, block.y + block.h));
    const dx = x - closestX;
    const dy = y - closestY;
    return dx * dx + dy * dy < radius * radius;
  });
}

function spawnNightfallEnemy(boss = false) {
  let x = 0;
  let y = 0;
  let tries = 0;
  do {
    const edge = Math.floor(Math.random() * 4);
    x = edge < 2 ? randomBetween(40, 920) : (edge === 2 ? 28 : 932);
    y = edge < 2 ? (edge === 0 ? 28 : 572) : randomBetween(40, 560);
    tries += 1;
  } while ((Math.hypot(x - nightfallPlayer.x, y - nightfallPlayer.y) < 280 || nightfallCircleHitsBlock(x, y, 16)) && tries < 30);

  const bossTier = boss ? Math.floor(nightfallWave / 5) - 1 : 0;
  const bossScale = 1 + bossTier * 0.2;
  const brute = boss || (nightfallWave >= 3 && Math.random() < 0.16);
  const bossHealth = 20 + bossTier * 20;
  nightfallEnemies.push({
    x,
    y,
    radius: boss ? Math.round(28 * bossScale) : brute ? 19 : 14,
    health: boss ? bossHealth : brute ? 3 + Math.floor(nightfallWave / 4) : 1 + Math.floor(nightfallWave / 7),
    maxHealth: boss ? bossHealth : 0,
    speed: boss ? 42 * bossScale : brute ? 43 + nightfallWave * 1.2 : 60 + Math.min(nightfallWave * 2, 28),
    damage: boss ? Math.round(14 * bossScale) : brute ? 19 : 11,
    attackTimer: randomBetween(0.2, 0.8) / (boss ? bossScale : 1),
    brute,
    boss,
    bossTier,
    bossScale,
    wobble: randomBetween(0, Math.PI * 2),
  });
}

function nightfallAimFromPointer(event) {
  const rect = nightfallCanvas.getBoundingClientRect();
  nightfallPointer.x = (event.clientX - rect.left) * nightfallCanvas.width / rect.width;
  nightfallPointer.y = (event.clientY - rect.top) * nightfallCanvas.height / rect.height;
  nightfallPlayer.angle = Math.atan2(nightfallPointer.y - nightfallPlayer.y, nightfallPointer.x - nightfallPlayer.x);
}

function reloadNightfall() {
  if (!nightfallRunning || nightfallReloadTimer > 0 || nightfallMagazine === nightfallMagazineSize || nightfallReserve <= 0) return;
  nightfallReloadTimer = 1.05;
  nightfallStatusEl.textContent = 'Reloading...';
}

function fireNightfallWeapon() {
  if (!nightfallRunning || nightfallReloadTimer > 0 || nightfallShotCooldown > 0) return;
  if (nightfallMagazine <= 0) {
    reloadNightfall();
    return;
  }

  const spread = randomBetween(-0.045, 0.045);
  const angle = nightfallPlayer.angle + spread;
  nightfallBullets.push({
    x: nightfallPlayer.x + Math.cos(angle) * 23,
    y: nightfallPlayer.y + Math.sin(angle) * 23,
    vx: Math.cos(angle) * 650,
    vy: Math.sin(angle) * 650,
    life: 0.75,
  });
  nightfallEffects.push({ x: nightfallPlayer.x + Math.cos(angle) * 31, y: nightfallPlayer.y + Math.sin(angle) * 31, life: 0.08, maxLife: 0.08, type: 'muzzle' });
  nightfallMagazine -= 1;
  nightfallShotCooldown = Math.max(0.035, 0.15 - nightfallFireRateLevel * 0.0075);
  nightfallShake = Math.max(nightfallShake, 1.4);
  updateNightfallHud();
  if (nightfallMagazine === 0) {
    if (nightfallReserve > 0) {
      reloadNightfall();
    } else {
      nightfallStatusEl.textContent = 'Out of ammo. Move over a supply drop.';
    }
  }
}

function killNightfallEnemy(index) {
  const enemy = nightfallEnemies[index];
  nightfallKills += 1;
  nightfallEffects.push({ x: enemy.x, y: enemy.y, life: 0.35, maxLife: 0.35, type: 'burst' });
  nightfallDrops.push({
    x: enemy.x,
    y: enemy.y,
    type: 'scrap',
    amount: enemy.boss ? 12 + enemy.bossTier * 4 : enemy.brute ? Math.floor(randomBetween(3, 6)) : Math.floor(randomBetween(1, 3)),
    pulse: 0,
  });
  if (enemy.boss) nightfallStatusEl.textContent = `The Warden is down. Recover its scrap.`;
  if (nightfallKills % 4 === 0) {
    nightfallDrops.push({ x: enemy.x, y: enemy.y, type: 'ammo', pulse: 0 });
  } else if (Math.random() < 0.12) {
    nightfallDrops.push({ x: enemy.x, y: enemy.y, type: 'health', pulse: 0 });
  }
  nightfallEnemies.splice(index, 1);
  updateNightfallHud();
}

function updateNightfall(delta) {
  nightfallShotCooldown = Math.max(0, nightfallShotCooldown - delta);
  nightfallAttackCooldown = Math.max(0, nightfallAttackCooldown - delta);
  nightfallShake = Math.max(0, nightfallShake - delta * 10);

  if (nightfallReloadTimer > 0) {
    nightfallReloadTimer -= delta;
    if (nightfallReloadTimer <= 0) {
      const loaded = Math.min(nightfallMagazineSize - nightfallMagazine, nightfallReserve);
      nightfallMagazine += loaded;
      nightfallReserve -= loaded;
      nightfallStatusEl.textContent = `Wave ${nightfallWave}: keep moving.`;
      updateNightfallHud();
    }
  }
  if (nightfallMagazine === 0 && nightfallReserve > 0 && nightfallReloadTimer === 0) {
    reloadNightfall();
  }

  let moveX = Number(nightfallKeys.has('right') || nightfallKeys.has('d')) - Number(nightfallKeys.has('left') || nightfallKeys.has('a'));
  let moveY = Number(nightfallKeys.has('down') || nightfallKeys.has('s')) - Number(nightfallKeys.has('up') || nightfallKeys.has('w'));
  const moveLength = Math.hypot(moveX, moveY) || 1;
  moveX = moveX / moveLength * nightfallPlayer.speed * delta;
  moveY = moveY / moveLength * nightfallPlayer.speed * delta;

  const nextX = Math.max(24, Math.min(936, nightfallPlayer.x + moveX));
  const nextY = Math.max(24, Math.min(576, nightfallPlayer.y + moveY));
  if (!nightfallCircleHitsBlock(nextX, nightfallPlayer.y, nightfallPlayer.radius)) nightfallPlayer.x = nextX;
  if (!nightfallCircleHitsBlock(nightfallPlayer.x, nextY, nightfallPlayer.radius)) nightfallPlayer.y = nextY;

  if (nightfallIsFiring) fireNightfallWeapon();

  if (!nightfallShopOpen && nightfallToSpawn > 0) {
    nightfallSpawnTimer -= delta;
    if (nightfallSpawnTimer <= 0) {
      spawnNightfallEnemy();
      nightfallToSpawn -= 1;
      nightfallSpawnTimer = Math.max(0.34, 0.92 - nightfallWave * 0.025);
    }
  } else if (!nightfallShopOpen && nightfallToSpawn === 0 && nightfallEnemies.length === 0) {
    nightfallShopOpen = true;
    nightfallStatusEl.textContent = `Wave ${nightfallWave} clear. Collect nearby scrap and prepare.`;
    updateNightfallShop();
  }

  nightfallEnemies.forEach((enemy) => {
    enemy.wobble += delta * 5;
    enemy.attackTimer -= delta;
    const dx = nightfallPlayer.x - enemy.x;
    const dy = nightfallPlayer.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance > enemy.radius + nightfallPlayer.radius + 3) {
      const stepX = dx / distance * enemy.speed * delta;
      const stepY = dy / distance * enemy.speed * delta;
      if (!nightfallCircleHitsBlock(enemy.x + stepX, enemy.y, enemy.radius)) enemy.x += stepX;
      if (!nightfallCircleHitsBlock(enemy.x, enemy.y + stepY, enemy.radius)) enemy.y += stepY;
    } else if (enemy.attackTimer <= 0 && nightfallAttackCooldown <= 0) {
      nightfallPlayer.health -= enemy.damage;
      enemy.attackTimer = enemy.boss ? 0.82 / enemy.bossScale : 0.82;
      nightfallAttackCooldown = enemy.boss ? 0.24 / enemy.bossScale : 0.24;
      nightfallShake = 5;
      nightfallEffects.push({ x: nightfallPlayer.x, y: nightfallPlayer.y, life: 0.24, maxLife: 0.24, type: 'hit' });
      updateNightfallHud();
    }
  });

  nightfallBullets.forEach((bullet) => {
    bullet.x += bullet.vx * delta;
    bullet.y += bullet.vy * delta;
    bullet.life -= delta;
    if (nightfallCircleHitsBlock(bullet.x, bullet.y, 2)) bullet.life = 0;
    for (let i = nightfallEnemies.length - 1; i >= 0 && bullet.life > 0; i -= 1) {
      const enemy = nightfallEnemies[i];
      if (Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < enemy.radius + 3) {
        enemy.health -= nightfallDamage;
        bullet.life = 0;
        nightfallEffects.push({ x: bullet.x, y: bullet.y, life: 0.12, maxLife: 0.12, type: 'spark' });
        if (enemy.health <= 0) killNightfallEnemy(i);
      }
    }
  });
  nightfallBullets = nightfallBullets.filter((bullet) => bullet.life > 0);

  nightfallDrops.forEach((drop) => {
    drop.pulse += delta * 4;
    if (Math.hypot(drop.x - nightfallPlayer.x, drop.y - nightfallPlayer.y) < 27) {
      if (drop.type === 'scrap') {
        nightfallCoins += drop.amount;
        nightfallStatusEl.textContent = `Recovered ${drop.amount} scrap.`;
      } else if (drop.type === 'ammo') {
        nightfallReserve = Math.min(120, nightfallReserve + 24);
        nightfallStatusEl.textContent = 'Ammo recovered.';
      } else {
        nightfallPlayer.health = Math.min(nightfallMaxHealth, nightfallPlayer.health + 28);
        nightfallStatusEl.textContent = 'First aid recovered.';
      }
      drop.collected = true;
      updateNightfallHud();
    }
  });
  nightfallDrops = nightfallDrops.filter((drop) => !drop.collected);

  nightfallEffects.forEach((effect) => { effect.life -= delta; });
  nightfallEffects = nightfallEffects.filter((effect) => effect.life > 0);

  if (nightfallPlayer.health <= 0) {
    nightfallPlayer.health = 0;
    nightfallRunning = false;
    nightfallFrame = null;
    nightfallShopOpen = false;
    nightfallStatusEl.textContent = `Run ended at wave ${nightfallWave}. ${nightfallKills} infected stopped.`;
    nightfallStartBtn.textContent = 'Try again';
    updateNightfallHud();
  }
}

function drawNightfallScene() {
  const ctx = nightfallCtx;
  ctx.clearRect(0, 0, nightfallCanvas.width, nightfallCanvas.height);
  ctx.save();
  if (nightfallShake > 0) ctx.translate(randomBetween(-nightfallShake, nightfallShake), randomBetween(-nightfallShake, nightfallShake));

  ctx.fillStyle = '#202923';
  ctx.fillRect(0, 0, 960, 600);
  ctx.fillStyle = '#252d27';
  for (let x = 0; x < 960; x += 48) {
    for (let y = 0; y < 600; y += 48) {
      ctx.fillStyle = ((x / 48 + y / 48) % 2 === 0) ? '#252d27' : '#222a25';
      ctx.fillRect(x, y, 47, 47);
      ctx.strokeStyle = 'rgba(196, 183, 151, 0.035)';
      ctx.strokeRect(x + 3, y + 3, 41, 41);
    }
  }

  ctx.fillStyle = 'rgba(158, 139, 107, 0.1)';
  ctx.fillRect(0, 0, 960, 12);
  ctx.fillRect(0, 588, 960, 12);
  ctx.fillRect(0, 0, 12, 600);
  ctx.fillRect(948, 0, 12, 600);

  nightfallBlocks.forEach((block) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.fillRect(block.x + 7, block.y + 9, block.w, block.h);
    ctx.fillStyle = block.kind === 'pillar' ? '#45483e' : '#51473a';
    ctx.fillRect(block.x, block.y, block.w, block.h);
    ctx.strokeStyle = 'rgba(212, 190, 150, 0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(block.x + 3, block.y + 3, block.w - 6, block.h - 6);
    if (block.kind === 'crate') {
      ctx.strokeStyle = 'rgba(18, 20, 17, 0.42)';
      ctx.beginPath();
      ctx.moveTo(block.x + 8, block.y + 8);
      ctx.lineTo(block.x + block.w - 8, block.y + block.h - 8);
      ctx.moveTo(block.x + block.w - 8, block.y + 8);
      ctx.lineTo(block.x + 8, block.y + block.h - 8);
      ctx.stroke();
    }
  });

  nightfallDrops.forEach((drop) => {
    const pulse = 1 + Math.sin(drop.pulse) * 0.12;
    ctx.save();
    ctx.translate(drop.x, drop.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = drop.type === 'scrap' ? '#e4bd60' : drop.type === 'ammo' ? '#d7b16a' : '#d27a69';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 15;
    if (drop.type === 'scrap') {
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#382d17';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0);
    } else {
      ctx.fillRect(-10, -10, 20, 20);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#211e19';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', 0, 0);
    }
    ctx.restore();
  });

  nightfallEnemies.forEach((enemy) => {
    ctx.save();
    ctx.translate(enemy.x, enemy.y + Math.sin(enemy.wobble) * 1.6);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(2, enemy.radius * 0.72, enemy.radius * (enemy.boss ? 1.2 : 1.05), enemy.radius * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = enemy.boss ? '#493c3a' : enemy.brute ? '#64594a' : '#536050';
    if (enemy.boss) {
      ctx.shadowColor = '#8e3e36';
      ctx.shadowBlur = 18;
    }
    ctx.beginPath();
    ctx.arc(0, 2, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = enemy.boss ? '#72504a' : enemy.brute ? '#7b634e' : '#81735b';
    ctx.beginPath();
    ctx.arc(0, -enemy.radius * 0.48, enemy.radius * (enemy.boss ? 0.68 : 0.64), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = enemy.boss ? '#ff694e' : '#d75d47';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = enemy.boss ? 16 : 9;
    ctx.fillRect(-enemy.radius * 0.3, -enemy.radius * 0.56, enemy.boss ? 6 : 3, enemy.boss ? 4 : 2);
    ctx.fillRect(enemy.radius * 0.13, -enemy.radius * 0.56, enemy.boss ? 6 : 3, enemy.boss ? 4 : 2);
    ctx.shadowBlur = 0;
    if (enemy.boss) {
      ctx.fillStyle = 'rgba(5, 7, 8, 0.85)';
      ctx.fillRect(-32, -enemy.radius - 21, 64, 7);
      ctx.fillStyle = '#d85d4b';
      ctx.fillRect(-31, -enemy.radius - 20, 62 * Math.max(0, enemy.health / enemy.maxHealth), 5);
      ctx.fillStyle = '#eee0d1';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`THE WARDEN  ${Math.ceil(enemy.health)} HP`, 0, -enemy.radius - 26);
    }
    ctx.restore();
  });

  nightfallBullets.forEach((bullet) => {
    ctx.fillStyle = '#f4d49a';
    ctx.shadowColor = '#e6a65e';
    ctx.shadowBlur = 9;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  nightfallEffects.forEach((effect) => {
    const progress = effect.life / effect.maxLife;
    ctx.globalAlpha = progress;
    ctx.fillStyle = effect.type === 'hit' ? '#b8473c' : effect.type === 'muzzle' ? '#f2d08a' : '#d6a26d';
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.type === 'burst' ? (1 - progress) * 18 + 3 : effect.type === 'hit' ? 15 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  ctx.save();
  ctx.translate(nightfallPlayer.x, nightfallPlayer.y);
  ctx.rotate(nightfallPlayer.angle);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.beginPath();
  ctx.ellipse(2, 13, 17, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#394b45';
  ctx.beginPath();
  ctx.arc(0, 0, nightfallPlayer.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b89c7a';
  ctx.beginPath();
  ctx.arc(7, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#24211c';
  ctx.fillRect(8, -4, 27, 8);
  ctx.fillStyle = '#8a7760';
  ctx.fillRect(30, -2, 9, 4);
  ctx.restore();

  ctx.restore();

  const darkness = ctx.createRadialGradient(nightfallPlayer.x, nightfallPlayer.y, 60, nightfallPlayer.x, nightfallPlayer.y, 390);
  darkness.addColorStop(0, 'rgba(3, 5, 6, 0.05)');
  darkness.addColorStop(0.42, 'rgba(3, 5, 6, 0.25)');
  darkness.addColorStop(1, 'rgba(2, 4, 5, 0.88)');
  ctx.fillStyle = darkness;
  ctx.fillRect(0, 0, 960, 600);

  const flashlight = ctx.createRadialGradient(nightfallPlayer.x, nightfallPlayer.y, 8, nightfallPlayer.x, nightfallPlayer.y, 205);
  flashlight.addColorStop(0, 'rgba(255, 225, 165, 0.12)');
  flashlight.addColorStop(1, 'rgba(255, 225, 165, 0)');
  ctx.fillStyle = flashlight;
  ctx.fillRect(0, 0, 960, 600);

  if (!nightfallRunning) {
    ctx.fillStyle = 'rgba(4, 7, 8, 0.52)';
    ctx.fillRect(0, 0, 960, 600);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e7dfcf';
    ctx.font = '600 34px sans-serif';
    ctx.fillText(nightfallWave > 0 ? 'SIGNAL LOST' : 'NIGHTFALL', 480, 270);
    ctx.fillStyle = '#a9aaa0';
    ctx.font = '15px sans-serif';
    ctx.fillText(nightfallWave > 0 ? 'The infected have overrun the site' : 'Something is moving beyond the light', 480, 302);
  }

  ctx.restore();
}

function nightfallLoop(timestamp) {
  if (!nightfallRunning) {
    nightfallFrame = null;
    return;
  }
  if (!nightfallLastTime) nightfallLastTime = timestamp;
  const delta = Math.min((timestamp - nightfallLastTime) / 1000, 0.035);
  nightfallLastTime = timestamp;
  updateNightfall(delta);
  drawNightfallScene();
  if (nightfallRunning) nightfallFrame = requestAnimationFrame(nightfallLoop);
}

function setNightfallActive(active) {
  if (!active) nightfallIsFiring = false;
  if (!nightfallRunning) return;
  if (active && nightfallFrame === null) {
    nightfallLastTime = 0;
    nightfallFrame = requestAnimationFrame(nightfallLoop);
  } else if (!active && nightfallFrame !== null) {
    cancelAnimationFrame(nightfallFrame);
    nightfallFrame = null;
  }
}

function startNightfallGame() {
  if (nightfallFrame !== null) cancelAnimationFrame(nightfallFrame);
  resetNightfallGame();
  nightfallRunning = true;
  nightfallStartBtn.textContent = 'Restart run';
  startNightfallWave();
  nightfallFrame = requestAnimationFrame(nightfallLoop);
  nightfallCanvas.focus();
}

nightfallCanvas.addEventListener('pointermove', nightfallAimFromPointer);
nightfallCanvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  nightfallCanvas.setPointerCapture(event.pointerId);
  nightfallAimFromPointer(event);
  nightfallIsFiring = true;
  if (!nightfallRunning) startNightfallGame();
});
nightfallCanvas.addEventListener('pointerup', () => { nightfallIsFiring = false; });
nightfallCanvas.addEventListener('pointercancel', () => { nightfallIsFiring = false; });
nightfallCanvas.addEventListener('lostpointercapture', () => { nightfallIsFiring = false; });

document.querySelectorAll('[data-nightfall-key]').forEach((button) => {
  const key = button.dataset.nightfallKey;
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    nightfallKeys.add(key);
  });
  const release = () => nightfallKeys.delete(key);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
});

document.querySelectorAll('[data-nightfall-upgrade]').forEach((button) => {
  button.addEventListener('click', () => buyNightfallUpgrade(button.dataset.nightfallUpgrade));
});

nightfallNextWaveBtn.addEventListener('click', () => {
  if (!nightfallRunning || !nightfallShopOpen) return;
  startNightfallWave();
});

document.addEventListener('keydown', (event) => {
  if (!document.getElementById('nightfall-game').classList.contains('active')) return;
  const key = event.key.toLowerCase();
  if (['w', 'a', 's', 'd'].includes(key)) {
    nightfallKeys.add(key);
    event.preventDefault();
  }
  if (key === 'r') reloadNightfall();
  if (event.code === 'Space') {
    nightfallIsFiring = true;
    event.preventDefault();
  }
});

document.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  nightfallKeys.delete(key);
  if (event.code === 'Space') nightfallIsFiring = false;
});

window.addEventListener('blur', () => {
  nightfallKeys.clear();
  nightfallIsFiring = false;
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    nightfallKeys.clear();
    nightfallIsFiring = false;
  }
});

nightfallStartBtn.addEventListener('click', startNightfallGame);
nightfallBestEl.textContent = String(nightfallBest);
resetNightfallGame();
drawNightfallScene();

const blocksCanvas = document.getElementById('blocksCanvas');
const blocksCtx = blocksCanvas.getContext('2d');
const blocksNextCanvas = document.getElementById('blocksNextCanvas');
const blocksNextCtx = blocksNextCanvas.getContext('2d');
const blocksScoreEl = document.getElementById('blocks-score');
const blocksLinesEl = document.getElementById('blocks-lines');
const blocksLevelEl = document.getElementById('blocks-level');
const blocksBestEl = document.getElementById('blocks-best');
const blocksStatusEl = document.getElementById('blocks-status');
const blocksStartBtn = document.getElementById('blocksStartBtn');
const blocksPauseBtn = document.getElementById('blocksPauseBtn');
const blocksColors = {
  I: '#61c8c1',
  J: '#668ce1',
  L: '#e99d5e',
  O: '#e6c761',
  S: '#77c77a',
  T: '#ad83db',
  Z: '#d86c72',
};
const blocksShapes = {
  I: [[1, 1, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  T: [[0, 1, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]],
};
const blocksWidth = 10;
const blocksHeight = 20;
const blocksCellSize = 30;
const blocksBest = Number(localStorage.getItem('pixel-stackfall-best') || 0);
let blocksBoard = [];
let blocksBag = [];
let blocksCurrent = null;
let blocksNextPiece = null;
let blocksScore = 0;
let blocksLines = 0;
let blocksLevel = 1;
let blocksStarted = false;
let blocksPaused = false;
let blocksGameOver = false;
let blocksActive = false;
let blocksFrame = null;
let blocksLastTime = 0;
let blocksFallTimer = 0;

function updateBlocksHud() {
  blocksScoreEl.textContent = String(blocksScore);
  blocksLinesEl.textContent = String(blocksLines);
  blocksLevelEl.textContent = String(blocksLevel);
}

function createBlocksPiece() {
  if (blocksBag.length === 0) blocksBag = shuffle(Object.keys(blocksShapes));
  const type = blocksBag.pop();
  return {
    type,
    color: blocksColors[type],
    matrix: blocksShapes[type].map((row) => [...row]),
    x: 0,
    y: 0,
  };
}

function blocksCollides(piece, offsetX = 0, offsetY = 0, matrix = piece.matrix) {
  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = 0; col < matrix[row].length; col += 1) {
      if (!matrix[row][col]) continue;
      const x = piece.x + col + offsetX;
      const y = piece.y + row + offsetY;
      if (x < 0 || x >= blocksWidth || y >= blocksHeight) return true;
      if (y >= 0 && blocksBoard[y][x]) return true;
    }
  }
  return false;
}

function drawBlocksCell(ctx, x, y, color, size, ghost = false) {
  ctx.globalAlpha = ghost ? 0.25 : 1;
  ctx.fillStyle = color;
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  if (!ghost) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x * size + 3, y * size + 3, size - 6, 3);
    ctx.strokeStyle = 'rgba(7, 15, 18, 0.52)';
    ctx.strokeRect(x * size + 1.5, y * size + 1.5, size - 3, size - 3);
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x * size + 2, y * size + 2, size - 4, size - 4);
    ctx.lineWidth = 1;
  }
  ctx.globalAlpha = 1;
}

function drawBlocksPiece(ctx, piece, size, offsetX = 0, offsetY = 0, ghost = false) {
  piece.matrix.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell && piece.y + rowIndex >= 0) {
        drawBlocksCell(ctx, piece.x + colIndex + offsetX, piece.y + rowIndex + offsetY, piece.color, size, ghost);
      }
    });
  });
}

function drawBlocksNext() {
  const ctx = blocksNextCtx;
  ctx.clearRect(0, 0, blocksNextCanvas.width, blocksNextCanvas.height);
  ctx.fillStyle = '#0c1419';
  ctx.fillRect(0, 0, blocksNextCanvas.width, blocksNextCanvas.height);
  if (!blocksNextPiece) return;

  const size = 22;
  const shapeWidth = blocksNextPiece.matrix[0].length;
  const shapeHeight = blocksNextPiece.matrix.length;
  const offsetX = Math.floor((blocksNextCanvas.width / size - shapeWidth) / 2);
  const offsetY = Math.floor((blocksNextCanvas.height / size - shapeHeight) / 2);
  drawBlocksPiece(ctx, { ...blocksNextPiece, x: 0, y: 0 }, size, offsetX, offsetY);
}

function drawBlocksGame() {
  const ctx = blocksCtx;
  ctx.clearRect(0, 0, blocksCanvas.width, blocksCanvas.height);
  ctx.fillStyle = '#0c1419';
  ctx.fillRect(0, 0, blocksCanvas.width, blocksCanvas.height);

  for (let y = 0; y < blocksHeight; y += 1) {
    for (let x = 0; x < blocksWidth; x += 1) {
      if (blocksBoard[y][x]) {
        drawBlocksCell(ctx, x, y, blocksBoard[y][x], blocksCellSize);
      } else {
        ctx.strokeStyle = 'rgba(175, 208, 198, 0.08)';
        ctx.strokeRect(x * blocksCellSize, y * blocksCellSize, blocksCellSize, blocksCellSize);
      }
    }
  }

  if (blocksCurrent) {
    const ghostOffset = { x: 0, y: 0 };
    while (!blocksCollides(blocksCurrent, ghostOffset.x, ghostOffset.y + 1)) ghostOffset.y += 1;
    drawBlocksPiece(ctx, blocksCurrent, blocksCellSize, ghostOffset.x, ghostOffset.y, true);
    drawBlocksPiece(ctx, blocksCurrent, blocksCellSize);
  }

  if (!blocksStarted || blocksPaused || blocksGameOver) {
    ctx.fillStyle = 'rgba(3, 8, 11, 0.72)';
    ctx.fillRect(0, 0, blocksCanvas.width, blocksCanvas.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e4f1eb';
    ctx.font = '700 23px sans-serif';
    const title = blocksGameOver ? 'STACK LOCKED' : blocksPaused ? 'PAUSED' : 'STACKFALL';
    ctx.fillText(title, blocksCanvas.width / 2, blocksCanvas.height / 2 - 8);
    ctx.fillStyle = '#9eb4ad';
    ctx.font = '13px sans-serif';
    const subtitle = blocksGameOver ? 'Start a new stack to play again' : blocksPaused ? 'Press P or resume to continue' : 'Clear rows. Keep the stack low.';
    ctx.fillText(subtitle, blocksCanvas.width / 2, blocksCanvas.height / 2 + 18);
  }
}

function spawnBlocksPiece() {
  blocksCurrent = blocksNextPiece || createBlocksPiece();
  blocksCurrent.x = Math.floor((blocksWidth - blocksCurrent.matrix[0].length) / 2);
  blocksCurrent.y = 0;
  blocksNextPiece = createBlocksPiece();
  drawBlocksNext();

  if (blocksCollides(blocksCurrent)) {
    blocksStarted = false;
    blocksGameOver = true;
    blocksPauseBtn.disabled = true;
    blocksStartBtn.textContent = 'Play Again';
    blocksStatusEl.textContent = `Stack locked at ${blocksScore} points.`;
    if (blocksScore > blocksBest) {
      localStorage.setItem('pixel-stackfall-best', String(blocksScore));
      blocksBestEl.textContent = String(blocksScore);
    }
    drawBlocksGame();
  }
}

function clearBlocksLines() {
  let cleared = 0;
  blocksBoard = blocksBoard.filter((row) => {
    if (row.every(Boolean)) {
      cleared += 1;
      return false;
    }
    return true;
  });

  if (cleared > 0) {
    while (blocksBoard.length < blocksHeight) blocksBoard.unshift(Array(blocksWidth).fill(null));
    blocksScore += [0, 100, 300, 500, 800][cleared] * blocksLevel;
    blocksLines += cleared;
    blocksLevel = Math.floor(blocksLines / 10) + 1;
    blocksStatusEl.textContent = cleared === 1 ? 'Row cleared.' : `${cleared} rows cleared.`;
    if (blocksScore > blocksBest) {
      localStorage.setItem('pixel-stackfall-best', String(blocksScore));
      blocksBestEl.textContent = String(blocksScore);
    }
    updateBlocksHud();
  }
}

function lockBlocksPiece() {
  let toppedOut = false;
  blocksCurrent.matrix.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (!cell) return;
      const boardY = blocksCurrent.y + rowIndex;
      if (boardY < 0) {
        toppedOut = true;
      } else {
        blocksBoard[boardY][blocksCurrent.x + colIndex] = blocksCurrent.color;
      }
    });
  });

  if (toppedOut) {
    blocksStarted = false;
    blocksGameOver = true;
    blocksPauseBtn.disabled = true;
    blocksStartBtn.textContent = 'Play Again';
    blocksStatusEl.textContent = `Stack locked at ${blocksScore} points.`;
    if (blocksScore > blocksBest) {
      localStorage.setItem('pixel-stackfall-best', String(blocksScore));
      blocksBestEl.textContent = String(blocksScore);
    }
    drawBlocksGame();
    return;
  }

  clearBlocksLines();
  spawnBlocksPiece();
  updateBlocksHud();
}

function moveBlocksPiece(dx, dy) {
  if (!blocksStarted || blocksPaused || blocksGameOver || !blocksCurrent) return false;
  if (blocksCollides(blocksCurrent, dx, dy)) {
    if (dy > 0) lockBlocksPiece();
    return false;
  }
  blocksCurrent.x += dx;
  blocksCurrent.y += dy;
  if (dy > 0) {
    blocksScore += 1;
    updateBlocksHud();
  }
  drawBlocksGame();
  return true;
}

function rotateBlocksPiece() {
  if (!blocksStarted || blocksPaused || blocksGameOver || !blocksCurrent) return;
  const rotated = blocksCurrent.matrix[0].map((_, index) =>
    blocksCurrent.matrix.map((row) => row[index]).reverse()
  );
  for (const offset of [0, -1, 1, -2, 2]) {
    if (!blocksCollides(blocksCurrent, offset, 0, rotated)) {
      blocksCurrent.matrix = rotated;
      blocksCurrent.x += offset;
      drawBlocksGame();
      return;
    }
  }
}

function hardDropBlocksPiece() {
  if (!blocksStarted || blocksPaused || blocksGameOver || !blocksCurrent) return;
  let distance = 0;
  while (!blocksCollides(blocksCurrent, 0, distance + 1)) distance += 1;
  blocksCurrent.y += distance;
  blocksScore += distance * 2;
  updateBlocksHud();
  lockBlocksPiece();
}

function toggleBlocksPause() {
  if (!blocksStarted || blocksGameOver) return;
  blocksPaused = !blocksPaused;
  blocksPauseBtn.textContent = blocksPaused ? 'Resume' : 'Pause';
  blocksStatusEl.textContent = blocksPaused ? 'Stack paused.' : `Level ${blocksLevel}. Keep stacking.`;
  blocksLastTime = 0;
  if (blocksPaused && blocksFrame !== null) {
    cancelAnimationFrame(blocksFrame);
    blocksFrame = null;
  } else if (!blocksPaused && blocksActive) {
    blocksFrame = requestAnimationFrame(blocksLoop);
  }
  drawBlocksGame();
}

function blocksLoop(timestamp) {
  if (!blocksActive || !blocksStarted || blocksPaused) {
    blocksFrame = null;
    return;
  }
  if (!blocksLastTime) blocksLastTime = timestamp;
  const delta = Math.min(timestamp - blocksLastTime, 50);
  blocksLastTime = timestamp;
  blocksFallTimer += delta;
  const fallInterval = Math.max(90, 780 - (blocksLevel - 1) * 55);
  if (blocksFallTimer >= fallInterval) {
    blocksFallTimer = 0;
    moveBlocksPiece(0, 1);
  }
  drawBlocksGame();
  if (blocksActive && blocksStarted && !blocksPaused) {
    blocksFrame = requestAnimationFrame(blocksLoop);
  } else {
    blocksFrame = null;
  }
}

function setBlocksActive(active) {
  blocksActive = active;
  if (!active && blocksFrame !== null) {
    cancelAnimationFrame(blocksFrame);
    blocksFrame = null;
  } else if (active && blocksStarted && !blocksPaused && blocksFrame === null) {
    blocksLastTime = 0;
    blocksFrame = requestAnimationFrame(blocksLoop);
  }
}

function startBlocksGame() {
  if (blocksFrame !== null) cancelAnimationFrame(blocksFrame);
  blocksBoard = Array.from({ length: blocksHeight }, () => Array(blocksWidth).fill(null));
  blocksBag = [];
  blocksCurrent = null;
  blocksNextPiece = createBlocksPiece();
  blocksScore = 0;
  blocksLines = 0;
  blocksLevel = 1;
  blocksStarted = true;
  blocksPaused = false;
  blocksGameOver = false;
  blocksFallTimer = 0;
  blocksLastTime = 0;
  blocksPauseBtn.disabled = false;
  blocksPauseBtn.textContent = 'Pause';
  blocksStartBtn.textContent = 'Restart';
  blocksStatusEl.textContent = 'Level 1. Keep stacking.';
  updateBlocksHud();
  spawnBlocksPiece();
  drawBlocksGame();
  if (blocksActive && blocksStarted) blocksFrame = requestAnimationFrame(blocksLoop);
}

function handleBlocksAction(action) {
  if (action === 'left') moveBlocksPiece(-1, 0);
  if (action === 'right') moveBlocksPiece(1, 0);
  if (action === 'down') moveBlocksPiece(0, 1);
  if (action === 'rotate') rotateBlocksPiece();
  if (action === 'drop') hardDropBlocksPiece();
}

document.addEventListener('keydown', (event) => {
  if (!blocksActive) return;
  const handledKeys = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'Spacebar', 'p', 'P'];
  if (handledKeys.includes(event.key) || event.code === 'Space') event.preventDefault();
  if (event.key === 'p' || event.key === 'P') {
    if (!event.repeat) toggleBlocksPause();
    return;
  }
  if (!blocksStarted || blocksPaused) return;
  if (event.key === 'ArrowLeft') moveBlocksPiece(-1, 0);
  if (event.key === 'ArrowRight') moveBlocksPiece(1, 0);
  if (event.key === 'ArrowDown') moveBlocksPiece(0, 1);
  if (event.key === 'ArrowUp' && !event.repeat) rotateBlocksPiece();
  if ((event.code === 'Space' || event.key === ' ') && !event.repeat) hardDropBlocksPiece();
});

document.addEventListener('keyup', (event) => {
  if (blocksActive && ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(event.key)) {
    event.preventDefault();
  }
});

document.querySelectorAll('[data-block-action]').forEach((button) => {
  button.addEventListener('click', () => handleBlocksAction(button.dataset.blockAction));
});

blocksStartBtn.addEventListener('click', startBlocksGame);
blocksPauseBtn.addEventListener('click', toggleBlocksPause);
blocksBoard = Array.from({ length: blocksHeight }, () => Array(blocksWidth).fill(null));
blocksBestEl.textContent = String(blocksBest);
blocksNextPiece = createBlocksPiece();
drawBlocksNext();
updateBlocksHud();
drawBlocksGame();
