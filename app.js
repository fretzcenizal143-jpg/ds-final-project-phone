// ---------- TABS ----------
const tabSnake = document.getElementById("tab-snake");
const tabZipper = document.getElementById("tab-zipper");
const snakeSection = document.getElementById("snake-section");
const zipperSection = document.getElementById("zipper-section");

tabSnake.addEventListener("click", () => {
  snakeSection.classList.remove("hidden");
  zipperSection.classList.add("hidden");
  tabSnake.classList.add("active");
  tabZipper.classList.remove("active");
});

tabZipper.addEventListener("click", () => {
  zipperSection.classList.remove("hidden");
  snakeSection.classList.add("hidden");
  tabZipper.classList.add("active");
  tabSnake.classList.remove("active");
  if (running && !paused) togglePause(); // auto-pause when leaving Snake
});

// ---------- SNAKE: DATA STRUCTURES ----------
class DequeNode {
  constructor(value) {
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

// Doubly linked list: O(1) addFront, O(1) removeBack
class Deque {
  constructor() {
    this.head = null;
    this.tail = null;
    this.size = 0;
  }

  addFront(value) {
    const node = new DequeNode(value);
    if (this.head === null) {
      this.head = node;
      this.tail = node;
    } else {
      node.next = this.head;
      this.head.prev = node;
      this.head = node;
    }
    this.size++;
  }

  removeBack() {
    if (this.tail === null) return null;
    const value = this.tail.value;
    this.tail = this.tail.prev;
    if (this.tail === null) {
      this.head = null;
    } else {
      this.tail.next = null;
    }
    this.size--;
    return value;
  }

  toArray() {
    const result = [];
    let current = this.head;
    while (current !== null) {
      result.push(current.value);
      current = current.next;
    }
    return result;
  }
}

// Queue for buffering key presses: O(1) enqueue and dequeue
class Queue {
  constructor() {
    this.items = [];
    this.head = 0;
  }

  enqueue(value) {
    this.items.push(value);
  }

  dequeue() {
    if (this.isEmpty()) return null;
    const value = this.items[this.head];
    this.head++;
    return value;
  }

  isEmpty() {
    return this.head >= this.items.length;
  }

  size() {
    return this.items.length - this.head;
  }
}

// ---------- SNAKE: GAME ----------
const CELL = 20;
const COLS = 20;
const ROWS = 20;
const TICK_MS = 150;

const canvas = document.getElementById("snake-canvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("high-score");
const btnStart = document.getElementById("btn-start");
const btnPause = document.getElementById("btn-pause");

let snake, occupied, inputQueue, direction, lastQueued, food;
let score = 0;
let highScore = 0;
let gameOver = false;
let paused = false;
let running = false;
let timer = null;

try {
  highScore = parseInt(localStorage.getItem("snakeHighScore")) || 0;
} catch (e) {}
highScoreEl.textContent = highScore;

const cellKey = (x, y) => x + "," + y;

const KEYS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

function resetGame() {
  snake = new Deque();
  occupied = new Set(); // hash set for O(1) self-collision lookup
  inputQueue = new Queue();
  direction = { x: 1, y: 0 };
  lastQueued = direction;
  score = 0;
  gameOver = false;
  paused = false;
  btnPause.textContent = "Pause";
  scoreEl.textContent = 0;

  const start = [{ x: 8, y: 10 }, { x: 9, y: 10 }, { x: 10, y: 10 }];
  for (const p of start) {
    snake.addFront(p);
    occupied.add(cellKey(p.x, p.y));
  }
  spawnFood();
  draw();
}

function startGame() {
  clearInterval(timer);
  resetGame();
  running = true;
  timer = setInterval(tick, TICK_MS);
}

function spawnFood() {
  const empty = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!occupied.has(cellKey(x, y))) empty.push({ x, y });
    }
  }
  food = empty.length === 0 ? null : empty[Math.floor(Math.random() * empty.length)];
}

function drawOverlay(text) {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  ctx.textAlign = "start";
}

// Replace your whole old draw() function in app.js with everything below.

function pathRounded(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawApple(cx, cy) {
  // body (two lobes) with a soft red glow
  ctx.save();
  ctx.shadowColor = "rgba(255, 70, 70, 0.7)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#e53935";
  ctx.beginPath();
  ctx.arc(cx - 3, cy + 1, 6.5, 0, Math.PI * 2);
  ctx.arc(cx + 3, cy + 1, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // stem
  ctx.strokeStyle = "#6d4c2f";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy - 4);
  ctx.lineTo(cx + 1, cy - 9);
  ctx.stroke();

  // leaf
  ctx.fillStyle = "#5be37d";
  ctx.beginPath();
  ctx.ellipse(cx + 4.5, cy - 7, 4, 2, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // shine
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.beginPath();
  ctx.arc(cx - 4, cy - 1, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawHead(part) {
  const px = part.x * CELL;
  const py = part.y * CELL;
  const cx = px + CELL / 2;
  const cy = py + CELL / 2;
  const d = direction;

  // tongue (drawn first so the head covers its base)
  ctx.strokeStyle = "#ff5a6e";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx + d.x * 8, cy + d.y * 8);
  ctx.lineTo(cx + d.x * 14, cy + d.y * 14);
  ctx.stroke();

  // head
  ctx.fillStyle = "#9dffb0";
  pathRounded(px, py, CELL, CELL, 8);
  ctx.fill();

  // eyes, placed toward the direction of travel
  const fx = d.x * 3.5;
  const fy = d.y * 3.5;
  const sx = -d.y * 4.5;
  const sy = d.x * 4.5;
  for (const side of [1, -1]) {
    const ex = cx + fx + sx * side;
    const ey = cy + fy + sy * side;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(ex, ey, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#101418";
    ctx.beginPath();
    ctx.arc(ex + d.x * 1.2, ey + d.y * 1.2, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function draw() {
  // checkerboard floor
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#1b1d22" : "#16181c";
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }

  if (food) drawApple(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2);

  // body: drawn tail to head, brighter near the head
  const parts = snake.toArray();
  const last = Math.max(parts.length - 1, 1);
  for (let i = parts.length - 1; i >= 1; i--) {
    const lightness = 50 - (i / last) * 16;
    ctx.fillStyle = "hsl(135, 62%, " + lightness + "%)";
    pathRounded(parts[i].x * CELL + 1, parts[i].y * CELL + 1, CELL - 2, CELL - 2, 6);
    ctx.fill();
  }

  drawHead(parts[0]);
}

function endGame(message) {
  gameOver = true;
  running = false;
  clearInterval(timer);
  if (score > highScore) {
    highScore = score;
    highScoreEl.textContent = highScore;
    try {
      localStorage.setItem("snakeHighScore", highScore);
    } catch (e) {}
  }
  draw();
  drawOverlay(message);
}

function togglePause() {
  if (!running || gameOver) return;
  paused = !paused;
  btnPause.textContent = paused ? "Resume" : "Pause";
  draw();
  if (paused) drawOverlay("Paused");
}

function tick() {
  if (gameOver || paused) return;

  if (!inputQueue.isEmpty()) {
    direction = inputQueue.dequeue();
  }

  const head = snake.head.value;
  const newHead = { x: head.x + direction.x, y: head.y + direction.y };

  // wall collision
  if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
    endGame("Game Over");
    return;
  }

  const ate = food && newHead.x === food.x && newHead.y === food.y;

  // if not eating, the tail moves away first
  if (!ate) {
    const tail = snake.removeBack();
    occupied.delete(cellKey(tail.x, tail.y));
  }

  // self collision
  if (occupied.has(cellKey(newHead.x, newHead.y))) {
    endGame("Game Over");
    return;
  }

  snake.addFront(newHead);
  occupied.add(cellKey(newHead.x, newHead.y));

  if (ate) {
    score++;
    scoreEl.textContent = score;
    if (snake.size === COLS * ROWS) {
      endGame("You Win!");
      return;
    }
    spawnFood();
  }

  draw();
}

// ---------- SNAKE: INPUT ----------
document.addEventListener("keydown", (e) => {
  if (e.key === " ") {
    if (running) {
      e.preventDefault();
      togglePause();
    }
    return;
  }

  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
const dir = KEYS[key];
  if (!dir || !running) return;
  e.preventDefault();

  // ignore 180-degree reversal, repeats, and limit the buffer size
  const isReverse = dir.x === -lastQueued.x && dir.y === -lastQueued.y;
  const isSame = dir.x === lastQueued.x && dir.y === lastQueued.y;
  if (isReverse || isSame || inputQueue.size() >= 3) return;

  inputQueue.enqueue(dir);
  lastQueued = dir;
});

btnStart.addEventListener("click", () => {
  btnStart.blur();
  startGame();
});

btnPause.addEventListener("click", () => {
  btnPause.blur();
  togglePause();
});

// initial screen
resetGame();
drawOverlay("Press Start");
// ---------- ZIPPER: DATA STRUCTURES ----------
class HuffNode {
  constructor(symbol, freq, left, right, id) {
    this.symbol = symbol; // 0-255 for leaves, -1 for internal nodes
    this.freq = freq;
    this.left = left;
    this.right = right;
    this.id = id; // tie-breaker so the tree is rebuilt identically
  }

  isLeaf() {
    return this.left === null && this.right === null;
  }
}

// Binary min-heap (priority queue): O(log k) push and pop
class MinHeap {
  constructor() {
    this.data = [];
  }

  size() {
    return this.data.length;
  }

  less(a, b) {
    return a.freq < b.freq || (a.freq === b.freq && a.id < b.id);
  }

  push(node) {
    this.data.push(node);
    let i = this.data.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.less(this.data[i], this.data[parent])) {
        [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
        i = parent;
      } else break;
    }
  }

  pop() {
    if (this.data.length === 0) return null;
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      let i = 0;
      const n = this.data.length;
      while (true) {
        let smallest = i;
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        if (l < n && this.less(this.data[l], this.data[smallest])) smallest = l;
        if (r < n && this.less(this.data[r], this.data[smallest])) smallest = r;
        if (smallest === i) break;
        [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
        i = smallest;
      }
    }
    return top;
  }
}

// ---------- ZIPPER: HUFFMAN LOGIC ----------
const SIGNATURE = [0x48, 0x55, 0x46, 0x31]; // "HUF1"

function countFrequencies(bytes) {
  const freq = new Uint32Array(256);
  for (let i = 0; i < bytes.length; i++) freq[bytes[i]]++;
  return freq;
}

function buildTree(freq) {
  const heap = new MinHeap();
  for (let i = 0; i < 256; i++) {
    if (freq[i] > 0) heap.push(new HuffNode(i, freq[i], null, null, i));
  }
  let nextId = 256;
  while (heap.size() > 1) {
    const a = heap.pop();
    const b = heap.pop();
    heap.push(new HuffNode(-1, a.freq + b.freq, a, b, nextId++));
  }
  return heap.pop(); // null if the file is empty
}

function buildCodes(root) {
  const codes = new Array(256).fill(null);
  if (root === null) return codes;
  if (root.isLeaf()) {
    codes[root.symbol] = [0]; // only one unique byte: give it a 1-bit code
    return codes;
  }
  function walk(node, path) {
    if (node.isLeaf()) {
      codes[node.symbol] = path.slice();
      return;
    }
    path.push(0);
    walk(node.left, path);
    path.pop();
    path.push(1);
    walk(node.right, path);
    path.pop();
  }
  walk(root, []);
  return codes;
}

function compressBytes(bytes) {
  const freq = countFrequencies(bytes);
  const root = buildTree(freq);
  const codes = buildCodes(root);

  let unique = 0;
  let totalBits = 0;
  for (let i = 0; i < 256; i++) {
    if (freq[i] > 0) {
      unique++;
      totalBits += freq[i] * codes[i].length;
    }
  }

  // header: signature(4) + original size(4) + unique count(2) + [byte(1) + freq(4)] * unique + padding(1)
  const headerSize = 4 + 4 + 2 + 5 * unique + 1;
  const dataSize = Math.ceil(totalBits / 8);
  const out = new Uint8Array(headerSize + dataSize);
  const view = new DataView(out.buffer);

  let pos = 0;
  for (const b of SIGNATURE) out[pos++] = b;
  view.setUint32(pos, bytes.length);
  pos += 4;
  view.setUint16(pos, unique);
  pos += 2;
  for (let i = 0; i < 256; i++) {
    if (freq[i] > 0) {
      out[pos++] = i;
      view.setUint32(pos, freq[i]);
      pos += 4;
    }
  }
  out[pos++] = dataSize * 8 - totalBits; // padding bits in the last byte

  // write the codes bit by bit
  let bitPos = 0;
  for (let i = 0; i < bytes.length; i++) {
    const code = codes[bytes[i]];
    for (let j = 0; j < code.length; j++) {
      if (code[j] === 1) {
        out[pos + (bitPos >> 3)] |= 0x80 >> (bitPos & 7);
      }
      bitPos++;
    }
  }
  return out;
}

function decompressBytes(data) {
  if (data.length < 11) throw new Error("File is too small to be a valid archive.");
  for (let i = 0; i < 4; i++) {
    if (data[i] !== SIGNATURE[i]) throw new Error("Invalid archive: wrong signature.");
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const originalSize = view.getUint32(4);
  const unique = view.getUint16(8);
  if (unique > 256) throw new Error("Corrupted archive: bad symbol count.");

  const headerSize = 10 + 5 * unique + 1;
  if (data.length < headerSize) throw new Error("Corrupted archive: header is incomplete.");

  const freq = new Uint32Array(256);
  let pos = 10;
  let sum = 0;
  for (let i = 0; i < unique; i++) {
    const sym = data[pos++];
    const f = view.getUint32(pos);
    pos += 4;
    if (f === 0 || freq[sym] !== 0) throw new Error("Corrupted archive: bad frequency table.");
    freq[sym] = f;
    sum += f;
  }
  if (sum !== originalSize) throw new Error("Corrupted archive: sizes do not match.");
  const padding = data[pos++];
  if (padding > 7) throw new Error("Corrupted archive: bad padding value.");

  const out = new Uint8Array(originalSize);
  if (originalSize === 0) return out;

  const root = buildTree(freq);

  if (root.isLeaf()) {
    out.fill(root.symbol);
    return out;
  }

  const totalBits = (data.length - pos) * 8 - padding;
  let written = 0;
  let node = root;
  for (let bitPos = 0; bitPos < totalBits && written < originalSize; bitPos++) {
    const bit = (data[pos + (bitPos >> 3)] >> (7 - (bitPos & 7))) & 1;
    node = bit === 0 ? node.left : node.right;
    if (node.isLeaf()) {
      out[written++] = node.symbol;
      node = root;
    }
  }
  if (written !== originalSize) throw new Error("Corrupted archive: data ended early.");
  return out;
}

// ---------- ZIPPER: UI ----------
const zipFile = document.getElementById("zip-file");
const zipResult = document.getElementById("zip-result");
const zipDownload = document.getElementById("zip-download");

function formatBytes(n) {
  return n + " bytes";
}

function offerDownload(bytes, filename) {
  const blob = new Blob([bytes]);
  const url = URL.createObjectURL(blob);
  zipDownload.innerHTML = "";
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.textContent = "Download " + filename;
  zipDownload.appendChild(a);
}

function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

async function getSelectedFile() {
  const file = zipFile.files[0];
  if (!file) {
    zipResult.textContent = "Error: no file selected.";
    return null;
  }
  try {
    const buffer = await file.arrayBuffer();
    return { name: file.name, bytes: new Uint8Array(buffer) };
  } catch (e) {
    zipResult.textContent = "Error: could not read the file.";
    return null;
  }
}

document.getElementById("btn-compress").addEventListener("click", async () => {
  zipDownload.innerHTML = "";
  const file = await getSelectedFile();
  if (!file) return;
  zipResult.textContent = "Compressing...";
  await new Promise((r) => setTimeout(r, 20)); // let the message show

  const t0 = performance.now();
  const packed = compressBytes(file.bytes);
  const t1 = performance.now();
  const restored = decompressBytes(packed);
  const t2 = performance.now();
  const ok = sameBytes(file.bytes, restored);

  const original = file.bytes.length;
  const ratio = original === 0 ? "n/a" : ((packed.length / original) * 100).toFixed(2) + "%";
  const saved = original === 0 ? "n/a" : (100 - (packed.length / original) * 100).toFixed(2) + "%";

  zipResult.textContent =
    "Compression done.\n" +
    "File: " + file.name + "\n" +
    "Original size: " + formatBytes(original) + "\n" +
    "Compressed size: " + formatBytes(packed.length) + "\n" +
    "Compressed / original: " + ratio + "\n" +
    "Space saved: " + saved + "\n" +
    "Compress time: " + (t1 - t0).toFixed(2) + " ms\n" +
    "Decompress time (check): " + (t2 - t1).toFixed(2) + " ms\n" +
    "Round trip identical to original: " + (ok ? "YES" : "NO");

  offerDownload(packed, file.name + ".huf");
});

document.getElementById("btn-decompress").addEventListener("click", async () => {
  zipDownload.innerHTML = "";
  const file = await getSelectedFile();
  if (!file) return;
  zipResult.textContent = "Decompressing...";
  await new Promise((r) => setTimeout(r, 20));

  try {
    const t0 = performance.now();
    const restored = decompressBytes(file.bytes);
    const t1 = performance.now();

    zipResult.textContent =
      "Decompression done.\n" +
      "File: " + file.name + "\n" +
      "Archive size: " + formatBytes(file.bytes.length) + "\n" +
      "Restored size: " + formatBytes(restored.length) + "\n" +
      "Time: " + (t1 - t0).toFixed(2) + " ms";

    const outName = file.name.endsWith(".huf")
      ? file.name.slice(0, -4)
      : file.name + ".out";
    offerDownload(restored, outName);
  } catch (e) {
    zipResult.textContent = "Error: " + e.message;
  }
});