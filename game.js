// ... existing game code ...
// (All the previous game.js content remains the same)
const canvas = document.getElementById('tetris-canvas');
const context = canvas.getContext('2d');
const previewCanvas = document.getElementById('preview-canvas');
const previewContext = previewCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');

const ROWS = 20;
const COLS = 12;
const BLOCK_SIZE = 20;
const PREVIEW_BLOCK_SIZE = 15;

let score = 0;
let level = 1;
let lines = 0;
let board = [];
let currentPiece;
let nextPiece;
let gameInterval;
let isPaused = false;
let dropTime = 500;

const SHAPES = [
  [[1,1,1,1]],
  [[1,1],[1,1]],
  [[1,1,1],[0,1,0]],
  [[1,1,1],[1,0,0]],
  [[1,1,1],[0,0,1]],
  [[1,1,0],[0,1,1]],
  [[0,1,1],[1,1,0]]
];

const COLORS = [
  '#ff00ff',
  '#00ffff',
  '#ffff00',
  '#ff8000',
  '#0080ff',
  '#00ff80',
  '#ff0080'
];

// PC Speaker Sound Effects
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playTone(frequency, duration) {
  const oscillator = audioContext.createOscillator();
  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  
  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function playMoveSound() {
  playTone(220, 0.05);
}

function playRotateSound() {
  playTone(440, 0.05);
}

function playLockSound() {
  playTone(330, 0.1);
}

function playClearSound() {
  playTone(660, 0.15);
}

function playHardDropSound() {
  playTone(880, 0.1);
}

function playGameOverSound() {
  playTone(110, 0.3);
  setTimeout(() => playTone(82.41, 0.3), 300);
}

function initBoard() {
  for (let r = 0; r < ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < COLS; c++) {
      board[r][c] = 0;
    }
  }
}

function drawBlock(x, y, color, blockSize = BLOCK_SIZE, ctx = context) {
  ctx.fillStyle = color;
  ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
  ctx.strokeStyle = "#fff";
  ctx.strokeRect(x * blockSize, y * blockSize, blockSize, blockSize);
  
  ctx.shadowBlur = 10;
  ctx.shadowColor = color;
  ctx.fillRect(x * blockSize + 2, y * blockSize + 2, blockSize - 4, blockSize - 4);
  ctx.shadowBlur = 0;
}

function drawBoard() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) {
        drawBlock(c, r, COLORS[board[r][c] - 1]);
      }
    }
  }
}

function createPiece() {
  let pieceIndex = Math.floor(Math.random() * SHAPES.length);
  let piece = SHAPES[pieceIndex];
  return {
    shape: piece,
    color: COLORS[pieceIndex],
    x: Math.floor(COLS / 2) - Math.ceil(piece[0].length / 2),
    y: 0
  };
}

function drawPiece() {
  for (let r = 0; r < currentPiece.shape.length; r++) {
    for (let c = 0; c < currentPiece.shape[r].length; c++) {
      if (currentPiece.shape[r][c]) {
        drawBlock(currentPiece.x + c, currentPiece.y + r, currentPiece.color);
      }
    }
  }
}

function drawNextPiece() {
  previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  if (!nextPiece) return;
  
  const shape = nextPiece.shape;
  const color = nextPiece.color;
  const offsetX = Math.floor((4 - shape[0].length) / 2);
  const offsetY = Math.floor((4 - shape.length) / 2);
  
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        drawBlock(
          offsetX + c,
          offsetY + r,
          color,
          PREVIEW_BLOCK_SIZE,
          previewContext
        );
      }
    }
  }
}

function moveDown() {
  if (isPaused) return;
  
  if (!collision(0, 1)) {
    currentPiece.y++;
    playMoveSound();
  } else {
    lockPiece();
    clearLines();
    currentPiece = nextPiece;
    nextPiece = createPiece();
    drawNextPiece();
    if (collision(0, 0)) {
      gameOver();
    }
  }
}

function moveLeft() {
  if (!collision(-1, 0)) {
    currentPiece.x--;
    playMoveSound();
  }
}

function moveRight() {
  if (!collision(1, 0)) {
    currentPiece.x++;
    playMoveSound();
  }
}

function rotate() {
  let newShape = [];
  for (let c = 0; c < currentPiece.shape[0].length; c++) {
    newShape.push([]);
    for (let r = currentPiece.shape.length - 1; r >= 0; r--) {
      newShape[c].push(currentPiece.shape[r][c]);
    }
  }
  
  let previousShape = currentPiece.shape;
  currentPiece.shape = newShape;
  
  if (collision(0, 0)) {
    currentPiece.shape = previousShape;
  } else {
    playRotateSound();
  }
}

function hardDrop() {
  let dropDistance = 0;
  while (!collision(0, dropDistance + 1)) {
    dropDistance++;
  }
  currentPiece.y += dropDistance;
  lockPiece();
  clearLines();
  currentPiece = createPiece();
  if (collision(0, 0)) {
    gameOver();
  }
  playHardDropSound();
}

function collision(x, y) {
  for (let r = 0; r < currentPiece.shape.length; r++) {
    for (let c = 0; c < currentPiece.shape[r].length; c++) {
      if (!currentPiece.shape[r][c]) {
        continue;
      }
      let newX = currentPiece.x + c + x;
      let newY = currentPiece.y + r + y;
      if (newX < 0 || newX >= COLS || newY >= ROWS) {
        return true;
      }
      if (newY < 0) {
        continue;
      }
      if (board[newY][newX]) {
        return true;
      }
    }
  }
  return false;
}

function lockPiece() {
  for (let r = 0; r < currentPiece.shape.length; r++) {
    for (let c = 0; c < currentPiece.shape[r].length; c++) {
      if (currentPiece.shape[r][c]) {
        let pieceColor = COLORS.indexOf(currentPiece.color) + 1;
        board[currentPiece.y + r][currentPiece.x + c] = pieceColor;
      }
    }
  }
  playLockSound();
}

function clearLines() {
  let linesToClear = [];
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(cell => cell !== 0)) {
      linesToClear.push(r);
    }
  }
  
  if (linesToClear.length > 0) {
    playClearSound();
    lines += linesToClear.length;
    score += linesToClear.length * 100 * level;
    scoreElement.textContent = `Score: ${score}`;
    linesElement.textContent = `Lines: ${lines}`;
    updateLevel();
    animateClearLines(linesToClear);
  }
}

function animateClearLines(lines) {
  let animationFrames = 5;
  let frameCount = 0;

  function animate() {
    if (frameCount >= animationFrames) {
      // Animation complete, remove lines and update score
      lines.forEach(line => {
        board.splice(line, 1);
        board.unshift(Array(COLS).fill(0));
      });
      score += lines.length * 100;
      scoreElement.textContent = `Score: ${score}`;
      return;
    }

    // Draw flashing effect
    lines.forEach(line => {
      const color = frameCount % 2 === 0 ? '#ffffff' : '#000000';
      context.fillStyle = color;
      context.fillRect(0, line * BLOCK_SIZE, canvas.width, BLOCK_SIZE);
    });

    frameCount++;
    requestAnimationFrame(animate);
  }

  animate();
}

function updateLevel() {
  level = Math.floor(lines / 10) + 1;
  dropTime = Math.max(100, 500 - (level - 1) * 50);
  levelElement.textContent = `Level: ${level}`;
}

function gameOver() {
  clearInterval(gameInterval);
  context.fillStyle = "rgba(0, 0, 0, 0.7)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ff00de";
  context.font = "20px 'Press Start 2P'";
  context.textAlign = "center";
  context.fillText("Game Over", canvas.width / 2, canvas.height / 2);
  context.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 40);
  startButton.style.display = "inline-block";
  playGameOverSound();
}

function gameLoop() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawBoard();
  drawPiece();
  drawScanlines();
}

function startGame() {
  initBoard();
  score = 0;
  level = 1;
  lines = 0;
  
  scoreElement.textContent = `Score: ${score}`;
  levelElement.textContent = `Level: ${level}`;
  linesElement.textContent = `Lines: ${lines}`;
  
  currentPiece = createPiece();
  nextPiece = createPiece();
  drawNextPiece();
  
  startButton.style.display = "none";
  pauseButton.style.display = "inline-block";
  
  if (gameInterval) {
    clearInterval(gameInterval);
  }
  
  gameInterval = setInterval(() => {
    moveDown();
    gameLoop();
  }, dropTime);
}

function togglePause() {
  isPaused = !isPaused;
  pauseButton.textContent = isPaused ? "Resume" : "Pause";
  
  if (isPaused) {
    clearInterval(gameInterval);
    context.fillStyle = "rgba(0, 0, 0, 0.7)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#00ffff";
    context.font = "20px 'Press Start 2P'";
    context.textAlign = "center";
    context.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
  } else {
    gameInterval = setInterval(() => {
      moveDown();
      gameLoop();
    }, dropTime);
  }
}

document.addEventListener('keydown', event => {
  if (event.keyCode === 80) { // P key for pause
    togglePause();
    return;
  }
  
  if (isPaused) return;
  
  switch(event.keyCode) {
    case 37: // Left arrow
      moveLeft();
      break;
    case 39: // Right arrow
      moveRight();
      break;
    case 40: // Down arrow
      moveDown();
      break;
    case 38: // Up arrow
      rotate();
      break;
    case 32: // Space bar
      hardDrop();
      break;
  }
  gameLoop();
});

startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePause);

// Add some retro scanlines effect
function drawScanlines() {
  context.fillStyle = "rgba(255,255,255,0.1)";
  for(let i = 0; i < canvas.height; i += 4) {
    context.fillRect(0, i, canvas.width, 2);
  }
}