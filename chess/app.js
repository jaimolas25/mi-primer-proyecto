import { Chess } from './vendor/chess.js';
import { BOTS, phrase, STYLE_LABEL, levelName, avatarColor, pickOpponent } from './bots.js';
import { bookMoves, bookDepthFor } from './book.js';

const $ = (id) => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const STORAGE_KEY = 'chessemu.v1';

// =============================================================================
// Estado persistente (perfil)
// =============================================================================
function defaultProfile() {
  return {
    name: 'Tú',
    rating: 800,
    startElo: 800,
    peak: 800,
    games: [],
    streak: 0,
    lastBotId: null,
    memberSince: new Date().toISOString(),
    sound: true,
  };
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultProfile(), ...JSON.parse(raw) };
  } catch (e) { /* almacenamiento no disponible */ }
  return defaultProfile();
}
function saveProfile() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch (e) { /* ignorar */ }
}

let profile = loadProfile();

// =============================================================================
// Sonido (sintetizado, sin ficheros)
// =============================================================================
let audioCtx = null;
function sound(kind) {
  if (!profile.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    if (kind === 'move' || kind === 'capture') {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = kind === 'capture' ? 900 : 1800;
      src.connect(filter).connect(gain);
      gain.gain.setValueAtTime(kind === 'capture' ? 0.9 : 0.6, t);
      src.start(t);
    } else {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const notes = kind === 'check' ? [660, 880] : kind === 'win' ? [523, 659, 784, 1047] : kind === 'lose' ? [392, 330, 262] : [440, 440];
      notes.forEach((f, i) => osc.frequency.setValueAtTime(f, t + i * 0.12));
      osc.connect(gain);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + notes.length * 0.12 + 0.2);
      osc.start(t);
      osc.stop(t + notes.length * 0.12 + 0.25);
    }
  } catch (e) { /* sin audio */ }
}

// =============================================================================
// Tablero
// =============================================================================
const boardEl = $('board');
const squaresEl = $('squares');
const piecesEl = $('pieces');
const hlEl = $('highlights');
const dotsEl = $('dots');
let orientation = 'w';
const pieceEls = new Map(); // casilla -> elemento

function sqToXY(sq) {
  const file = sq.charCodeAt(0) - 97;
  const rank = +sq[1] - 1;
  return orientation === 'w' ? [file, 7 - rank] : [7 - file, rank];
}
function xyToSq(x, y) {
  if (x < 0 || x > 7 || y < 0 || y > 7) return null;
  const file = orientation === 'w' ? x : 7 - x;
  const rank = orientation === 'w' ? 7 - y : y;
  return String.fromCharCode(97 + file) + (rank + 1);
}
function place(el, sq) {
  const [x, y] = sqToXY(sq);
  el.style.transform = `translate(${x * 100}%, ${y * 100}%)`;
}

function buildSquares() {
  squaresEl.innerHTML = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const d = document.createElement('div');
    const dark = (x + y) % 2 === 1;
    d.className = 'sq' + (dark ? ' dark' : '');
    squaresEl.appendChild(d);
  }
  // Letras en la fila inferior y números en la columna izquierda, en el color contrario al de la casilla.
  const files = orientation === 'w' ? 'abcdefgh' : 'hgfedcba';
  // La casilla inferior izquierda (a1 o h8) siempre es oscura.
  $('coordFiles').innerHTML = [...files].map((f, i) => `<span class="${i % 2 ? 'on-light' : 'on-dark'}">${f}</span>`).join('');
  const ranks = orientation === 'w' ? '87654321' : '12345678';
  $('coordRanks').innerHTML = [...ranks].map((r, i) => `<span class="${i % 2 ? 'on-dark' : 'on-light'}">${r}</span>`).join('');
}

// Dibuja la posición reutilizando elementos para animar las piezas que se mueven.
function renderPosition(chess, animate = true) {
  const target = new Map();
  chess.board().forEach((row, r) => row.forEach((sq, f) => {
    if (sq) target.set(String.fromCharCode(97 + f) + (8 - r), sq.color + sq.type);
  }));
  const unused = [];
  for (const [sq, el] of [...pieceEls]) {
    if (target.get(sq) === el.dataset.code) target.delete(sq);
    else { pieceEls.delete(sq); unused.push(el); }
  }
  for (const [sq, code] of target) {
    let el = null;
    const idx = unused.findIndex((e) => e.dataset.code === code);
    if (idx >= 0) {
      el = unused.splice(idx, 1)[0];
      el.classList.toggle('anim', animate);
    } else {
      el = document.createElement('div');
      el.className = 'piece ' + code;
      el.dataset.code = code;
      el.classList.remove('anim');
      piecesEl.appendChild(el);
    }
    el.classList.remove('dragging');
    el.dataset.sq = sq;
    place(el, sq);
    pieceEls.set(sq, el);
  }
  for (const el of unused) el.remove();
}

function renderHighlights(chess, lastMove, selected) {
  hlEl.innerHTML = '';
  const add = (sq, cls) => {
    const d = document.createElement('div');
    d.className = 'hl ' + cls;
    const [x, y] = sqToXY(sq);
    d.style.transform = `translate(${x * 100}%, ${y * 100}%)`;
    hlEl.appendChild(d);
  };
  if (lastMove) { add(lastMove.from, 'last'); add(lastMove.to, 'last'); }
  if (selected) add(selected, 'sel');
  if (chess.inCheck()) {
    const turn = chess.turn();
    chess.board().forEach((row, r) => row.forEach((sq, f) => {
      if (sq && sq.type === 'k' && sq.color === turn) add(String.fromCharCode(97 + f) + (8 - r), 'check');
    }));
  }
}

function renderDots(moves) {
  dotsEl.innerHTML = '';
  for (const m of moves) {
    const d = document.createElement('div');
    d.className = 'dot' + (m.captured ? ' capture' : '');
    const [x, y] = sqToXY(m.to);
    d.style.transform = `translate(${x * 100}%, ${y * 100}%)`;
    dotsEl.appendChild(d);
  }
}

// =============================================================================
// Estado de la partida
// =============================================================================
let game = null;        // partida actual
let worker = null;      // motor
let workerReqId = 0;
let clockTimer = null;
let selected = null;    // casilla seleccionada por el jugador
let drag = null;        // estado de arrastre
let pendingPromotion = null;

function newWorker() {
  if (worker) worker.terminate();
  worker = new Worker('./engine.worker.js', { type: 'module' });
  worker.onmessage = onEngineMessage;
}

function parseTc(str) {
  const [base, inc] = str.split('+').map(Number);
  return { base: base * 1000, inc: inc * 1000, label: tcLabel(base, inc) };
}
function tcLabel(base, inc) {
  if (!base) return 'Sin reloj';
  const m = base / 60;
  return inc ? `${m} | ${inc}` : `${m} min`;
}
function fmtClock(ms) {
  if (ms == null) return '--:--';
  ms = Math.max(0, ms);
  const s = Math.ceil(ms / 1000);
  if (ms < 20000) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}.${Math.floor((ms % 1000) / 100)}`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function positionKey(chess) {
  return chess.fen().split(' ').slice(0, 3).join(' ');
}

// ---------------------------------------------------------------- comenzar
function startGame(bot, playerColor, tc) {
  stopClock();
  pendingPromotion = null;
  $('promo').classList.add('hidden');
  const chess = new Chess();
  game = {
    chess, bot, playerColor, tc,
    botColor: playerColor === 'w' ? 'b' : 'w',
    clocks: { w: tc.base || null, b: tc.base || null },
    status: 'playing',
    result: null, reason: null,
    sans: [], fens: [chess.fen()], lastMoves: [null],
    viewPly: 0,
    keys: [positionKey(chess)],
    botBookDepth: bookDepthFor(bot.shownRating),
    botEvals: [],          // evaluación del bot tras cada una de sus jugadas (su perspectiva)
    lastBotLoss: 0,
    botLowEvalCount: 0,
    drawOffers: 0,
    lastTick: null,
    botTimer: null,
    startedAt: Date.now(),
    seed: Math.floor(Math.random() * 2 ** 31),
  };
  profile.lastBotId = bot.id;
  saveProfile();
  orientation = playerColor;
  buildSquares();
  pieceEls.forEach((el) => el.remove());
  pieceEls.clear();
  renderPosition(chess, false);
  renderHighlights(chess, null, null);
  renderDots([]);
  boardEl.classList.remove('viewing');
  selected = null;

  $('lobby').classList.add('hidden');
  $('gamePanel').classList.remove('hidden');
  $('gameActions').classList.remove('hidden');
  $('postActions').classList.add('hidden');
  $('chatLog').innerHTML = '';
  $('drawBtn').disabled = false;
  $('resignBtn').disabled = false;
  renderCards();
  renderMoves();
  addChat('sys', `Partida ${tc.label} vs ${bot.name} (${bot.shownRating}). ¡Suerte!`);

  newWorker();
  // Saludo del rival.
  if (Math.random() < bot.chat * 0.9 + 0.05) {
    setTimeout(() => { if (game && game.bot === bot && game.status === 'playing') addChat('opp', phrase(bot, 'hello')); }, rnd(1200, 4500));
  }
  if (game.botColor === 'w') scheduleBotMove();
  else startClockIfNeeded();
}

// ---------------------------------------------------------------- reloj
function startClockIfNeeded() {
  if (!game || !game.tc.base || clockTimer) return;
  game.lastTick = performance.now();
  clockTimer = setInterval(tickClock, 100);
}
function stopClock() {
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = null;
}
function tickClock() {
  if (!game || game.status !== 'playing') { stopClock(); return; }
  const now = performance.now();
  const dt = now - game.lastTick;
  game.lastTick = now;
  // El reloj empieza a correr cuando ya se ha hecho la primera jugada.
  if (game.sans.length === 0) return;
  const side = game.chess.turn();
  game.clocks[side] -= dt;
  if (game.clocks[side] <= 0) {
    game.clocks[side] = 0;
    renderClocks();
    const winner = side === 'w' ? 'b' : 'w';
    // Sin material para dar mate → tablas.
    if (!hasMatingMaterial(game.chess, winner)) endGame('draw', 'tiempo agotado sin material suficiente');
    else endGame(winner, 'tiempo agotado');
    return;
  }
  renderClocks();
}
function hasMatingMaterial(chess, color) {
  let minors = 0;
  for (const row of chess.board()) for (const sq of row) {
    if (!sq || sq.color !== color) continue;
    if (sq.type === 'p' || sq.type === 'r' || sq.type === 'q') return true;
    if (sq.type === 'n' || sq.type === 'b') minors++;
  }
  return minors >= 2;
}
function renderClocks() {
  if (!game) return;
  const topColor = game.botColor, botColor = game.playerColor;
  const turn = game.chess.turn();
  for (const [el, color] of [[$('clockTop'), topColor], [$('clockBottom'), botColor]]) {
    const ms = game.clocks[color];
    el.textContent = game.tc.base ? fmtClock(ms) : '∞';
    el.classList.toggle('off', !game.tc.base);
    el.classList.toggle('active', game.status === 'playing' && turn === color && !!game.tc.base);
    el.classList.toggle('low', !!game.tc.base && ms != null && ms < 20000);
  }
}

// ---------------------------------------------------------------- jugadas
function applyMove(moveObj, byBot) {
  const chess = game.chess;
  let mv;
  try { mv = chess.move(moveObj); } catch (e) { return null; }
  const mover = mv.color;
  if (game.tc.base && game.sans.length > 0) game.clocks[mover] += game.tc.inc;
  game.sans.push(mv.san);
  game.fens.push(chess.fen());
  game.lastMoves.push({ from: mv.from, to: mv.to });
  game.keys.push(positionKey(chess));
  game.viewPly = game.sans.length;
  selected = null;
  renderPosition(chess, true);
  renderHighlights(chess, { from: mv.from, to: mv.to }, null);
  renderDots([]);
  renderMoves();
  renderCards();
  renderClocks();
  if (chess.inCheck()) sound('check');
  else sound(mv.captured ? 'capture' : 'move');
  startClockIfNeeded();
  if (game.tc.base) game.lastTick = performance.now();

  if (checkGameOver()) return mv;
  if (!byBot) {
    reactToPlayerMove(mv);
    scheduleBotMove();
  }
  return mv;
}

function checkGameOver() {
  const chess = game.chess;
  if (chess.isCheckmate()) { endGame(chess.turn() === 'w' ? 'b' : 'w', 'jaque mate'); return true; }
  if (chess.isStalemate()) { endGame('draw', 'rey ahogado'); return true; }
  if (chess.isThreefoldRepetition()) { endGame('draw', 'repetición'); return true; }
  if (chess.isInsufficientMaterial()) { endGame('draw', 'material insuficiente'); return true; }
  if (chess.isDraw()) { endGame('draw', 'regla de los 50 movimientos'); return true; }
  return false;
}

// ---------------------------------------------------------------- el bot
function botThinkTime(ctx) {
  const { bot, tc } = game;
  const elo = bot.shownRating;
  const remaining = game.clocks[game.botColor] ?? 600000;
  const total = tc.base || 600000;
  // Tiempo "medio" por jugada en función del control.
  let t = total / 38;
  // Variación humana: log-normal.
  t *= Math.exp(rnd(-0.7, 0.7));
  if (elo < 800) t *= 0.55; else if (elo < 1200) t *= 0.75; else if (elo > 2000) t *= 1.1;
  if (ctx.inBook) t = rnd(500, 1800);
  else if (ctx.forced) t = rnd(400, 1300);
  else if (ctx.recapture) t = rnd(500, 1600);
  else if (ctx.ply < 6) t = Math.min(t, rnd(800, 2500));
  else {
    if (ctx.legalCount > 35) t *= 1.3;
    if (ctx.captureAvailable) t *= 1.2;
    if (ctx.inCheck) t *= 0.8;
    if (Math.random() < 0.07) t *= rnd(2.5, 4.5); // pensada larga ocasional
  }
  if (tc.base) {
    if (remaining < total * 0.2) t *= 0.45;
    if (remaining < 15000) t = Math.min(t, rnd(600, 1500));
    if (remaining < 5000) t = Math.min(t, rnd(200, 500));
    t = Math.min(t, remaining * 0.12 + 200);
  } else {
    t = Math.min(t, 12000);
  }
  return clamp(t, 250, 45000);
}

function scheduleBotMove() {
  if (!game || game.status !== 'playing' || game.chess.turn() !== game.botColor) return;
  const chess = game.chess;
  const legal = chess.moves({ verbose: true });
  if (!legal.length) return;
  const ply = game.sans.length;
  const last = chess.history({ verbose: true }).slice(-1)[0];
  const recapture = !!(last && last.captured && legal.some((m) => m.to === last.to && m.captured));
  const ctx = {
    ply, legalCount: legal.length, forced: legal.length === 1, recapture,
    captureAvailable: legal.some((m) => m.captured), inCheck: chess.inCheck(), inBook: false,
  };

  // Libro de aperturas.
  let bookChoice = null;
  if (ply < game.botBookDepth) {
    const options = bookMoves(game.sans);
    if (options.length) {
      const total = options.reduce((a, o) => a + o.weight, 0);
      let x = Math.random() * total;
      for (const o of options) { x -= o.weight; if (x <= 0) { bookChoice = o.san; break; } }
      bookChoice = bookChoice || options[0].san;
      ctx.inBook = true;
    }
  }
  const thinkMs = botThinkTime(ctx);
  const startedAt = Date.now();
  const myId = ++workerReqId;

  if (bookChoice) {
    game.botTimer = setTimeout(() => {
      if (!game || game.status !== 'playing' || workerReqId !== myId) return;
      const mv = applyMove(bookChoice, true);
      if (mv) afterBotMove(null);
    }, thinkMs);
    return;
  }

  const elo = game.bot.shownRating;
  const searchBudget = clamp(thinkMs * 0.6, 80, elo > 2200 ? 4000 : elo > 1800 ? 2500 : elo > 1300 ? 1200 : 400);
  // Claves de posición ya vistas (para evitar repeticiones tontas).
  const seen = [...new Set(game.keys)];
  game.pending = { id: myId, thinkMs, startedAt };
  worker.postMessage({
    type: 'go', id: myId, fen: chess.fen(), elo, style: game.bot.style,
    timeMs: searchBudget, seed: game.seed + ply, repeatedKeys: seen,
  });
}

function onEngineMessage(e) {
  const msg = e.data;
  if (!game || game.status !== 'playing' || !game.pending || msg.id !== game.pending.id) return;
  const { thinkMs, startedAt } = game.pending;
  const myId = game.pending.id;
  const remaining = Math.max(0, thinkMs - (Date.now() - startedAt));
  const clockLeft = game.clocks[game.botColor];
  const wait = clockLeft != null ? Math.min(remaining, Math.max(0, clockLeft - 400)) : remaining;
  game.botTimer = setTimeout(() => {
    if (!game || game.status !== 'playing' || workerReqId !== myId) return;
    game.pending = null;
    const mv = applyMove({ from: msg.move.from, to: msg.move.to, promotion: msg.move.promotion }, true);
    if (mv) afterBotMove(msg);
  }, wait);
}

function afterBotMove(info) {
  if (!game || game.status !== 'playing') return;
  const bot = game.bot;
  if (info) {
    game.botEvals.push(info.eval);
    game.lastBotLoss = info.lossCp;
    // ¿Se rinde? Solo bots con cierto nivel y cuando la cosa está clara.
    const elo = bot.shownRating;
    if (info.bestEval <= -900) game.botLowEvalCount++; else game.botLowEvalCount = 0;
    const ply = game.sans.length;
    if (elo >= 1100 && ply >= 30 && game.botLowEvalCount >= 2) {
      const p = info.bestEval <= -1800 ? 0.6 : 0.3;
      if (Math.random() < p * (elo >= 1800 ? 1.3 : 1)) {
        setTimeout(() => {
          if (!game || game.status !== 'playing') return;
          addChat('opp', phrase(bot, 'resign'));
          endGame(game.playerColor, 'abandono del rival');
        }, rnd(1500, 4000));
        return;
      }
    }
  }
}

// Reacciones de chat del bot a las jugadas del jugador.
function reactToPlayerMove(mv) {
  const bot = game.bot;
  if (!bot.chat) return;
  // El jugador captura una pieza grande justo después de un error del bot.
  if (mv.captured && PIECE_VALUE[mv.captured] >= 3 && game.lastBotLoss >= 200 && Math.random() < bot.chat * 0.6) {
    setTimeout(() => game && game.status === 'playing' && addChat('opp', phrase(bot, 'blunder')), rnd(800, 2500));
    game.lastBotLoss = 0;
  }
}

// =============================================================================
// Fin de partida y Elo
// =============================================================================
function expectedScore(a, b) { return 1 / (1 + Math.pow(10, (b - a) / 400)); }
function kFactor(n) { return n < 10 ? 40 : n < 30 ? 24 : 16; }

function endGame(winner, reason) {
  if (!game || game.status !== 'playing') return;
  game.status = 'over';
  stopClock();
  clearTimeout(game.botTimer);
  game.pending = null;
  workerReqId++;
  const bot = game.bot;
  const score = winner === 'draw' ? 0.5 : winner === game.playerColor ? 1 : 0;
  const result = score === 1 ? 'w' : score === 0 ? 'l' : 'd';
  const before = profile.rating;
  const delta = Math.round(kFactor(profile.games.length) * (score - expectedScore(before, bot.shownRating)));
  profile.rating = Math.max(100, before + delta);
  profile.peak = Math.max(profile.peak, profile.rating);
  profile.streak = result === 'w' ? Math.max(1, profile.streak + 1) : result === 'l' ? Math.min(-1, profile.streak - 1) : 0;
  profile.games.push({
    botId: bot.id, botName: bot.name, botRating: bot.shownRating, botFlag: bot.flag,
    color: game.playerColor, result, reason, delta, ratingAfter: profile.rating,
    date: new Date().toISOString(), moves: game.sans.length, pgn: game.chess.pgn(),
  });
  saveProfile();
  game.result = { winner, reason, delta, before, after: profile.rating, result };

  renderClocks();
  renderCards();
  renderProfile();
  $('gameActions').classList.add('hidden');
  $('postActions').classList.remove('hidden');
  const txt = result === 'w' ? 'Has ganado' : result === 'l' ? 'Has perdido' : 'Tablas';
  addChat('sys', `${txt} (${reason}). Elo: ${before} → ${profile.rating} (${delta >= 0 ? '+' : ''}${delta}).`);
  sound(result === 'w' ? 'win' : result === 'l' ? 'lose' : 'draw');

  // Chat de despedida del rival.
  if (reason !== 'abandono del rival' && Math.random() < Math.max(bot.chat, 0.35) + 0.3) {
    setTimeout(() => addChat('opp', phrase(bot, result === 'w' ? 'gg_lost' : 'gg_won')), rnd(700, 2500));
  }
  setTimeout(() => showResultModal(), 900);
}

function showResultModal() {
  if (!game || !game.result) return;
  const { result, reason, delta, after } = game.result;
  const bot = game.bot;
  $('resultTitle').textContent = result === 'w' ? '¡Victoria!' : result === 'l' ? 'Derrota' : 'Tablas';
  $('resultTitle').style.color = result === 'w' ? 'var(--green)' : result === 'l' ? '#e57373' : 'var(--text)';
  $('resultSub').textContent = 'por ' + reason;
  $('resNameMe').textContent = profile.name;
  $('resAvatarMe').textContent = initial(profile.name);
  $('resRatingMe').textContent = after;
  setDelta($('resDeltaMe'), delta);
  $('resNameOpp').textContent = bot.name;
  const av = $('resAvatarOpp');
  av.textContent = initial(bot.name);
  av.style.background = avatarColor(bot.id);
  $('resRatingOpp').textContent = bot.shownRating - delta;
  setDelta($('resDeltaOpp'), -delta);
  const nextLevel = levelName(after);
  $('resultInsights').textContent = `${game.sans.length} jugadas · Nivel: ${nextLevel} · ` +
    (result === 'w' ? 'Tu próximo rival será algo más fuerte.' : result === 'l' ? 'Tu próximo rival será algo más asequible.' : 'Tu próximo rival tendrá un nivel parecido.');
  $('resultModal').classList.remove('hidden');
}
function setDelta(el, d) {
  el.textContent = (d >= 0 ? '+' : '') + d;
  el.className = 'delta ' + (d > 0 ? 'pos' : d < 0 ? 'neg' : '');
}

// =============================================================================
// Interacción con el tablero
// =============================================================================
function playerCanMove() {
  return game && game.status === 'playing' && game.chess.turn() === game.playerColor && game.viewPly === game.sans.length && !pendingPromotion;
}
function pointerSquare(ev) {
  const r = boardEl.getBoundingClientRect();
  const x = Math.floor(((ev.clientX - r.left) / r.width) * 8);
  const y = Math.floor(((ev.clientY - r.top) / r.height) * 8);
  return xyToSq(x, y);
}
function legalFrom(sq) {
  return game.chess.moves({ square: sq, verbose: true });
}
function select(sq) {
  selected = sq;
  renderHighlights(game.chess, game.lastMoves[game.viewPly], sq);
  renderDots(sq ? legalFrom(sq) : []);
}
function tryPlayerMove(from, to) {
  const moves = legalFrom(from).filter((m) => m.to === to);
  if (!moves.length) return false;
  if (moves[0].promotion) { askPromotion(from, to); return true; }
  applyMove({ from, to }, false);
  return true;
}
function askPromotion(from, to) {
  pendingPromotion = { from, to };
  const promo = $('promo');
  promo.innerHTML = '';
  const color = game.playerColor;
  const [x] = sqToXY(to);
  promo.style.left = `${x * 12.5}%`;
  promo.style.top = '0';
  for (const p of ['q', 'r', 'b', 'n']) {
    const d = document.createElement('div');
    d.className = `piece ${color}${p}`;
    d.onclick = () => {
      promo.classList.add('hidden');
      pendingPromotion = null;
      applyMove({ from, to, promotion: p }, false);
    };
    promo.appendChild(d);
  }
  promo.classList.remove('hidden');
  renderDots([]);
}

boardEl.addEventListener('pointerdown', (ev) => {
  if (ev.button !== 0 || !game) return;
  if (!playerCanMove()) { if (game.viewPly !== game.sans.length) goToPly(game.sans.length); return; }
  const sq = pointerSquare(ev);
  if (!sq) return;
  const piece = game.chess.get(sq);
  const own = piece && piece.color === game.playerColor;
  if (selected && !own) {
    if (tryPlayerMove(selected, sq)) return;
    select(null);
    return;
  }
  if (own) {
    const el = pieceEls.get(sq);
    const wasSelected = selected === sq;
    select(sq);
    drag = { from: sq, el, moved: false, wasSelected, startX: ev.clientX, startY: ev.clientY };
    el.classList.add('dragging');
    el.classList.remove('anim');
    boardEl.setPointerCapture(ev.pointerId);
    moveDragTo(ev);
  }
});
function moveDragTo(ev) {
  const r = boardEl.getBoundingClientRect();
  const size = r.width / 8;
  const px = ev.clientX - r.left - size / 2;
  const py = ev.clientY - r.top - size / 2;
  drag.el.style.transform = `translate(${clamp(px, -size / 2, r.width - size / 2)}px, ${clamp(py, -size / 2, r.height - size / 2)}px)`;
  const hover = pointerSquare(ev);
  hlEl.querySelectorAll('.hl.hover').forEach((h) => h.remove());
  if (hover && hover !== drag.from) {
    const d = document.createElement('div');
    d.className = 'hl hover';
    const [x, y] = sqToXY(hover);
    d.style.transform = `translate(${x * 100}%, ${y * 100}%)`;
    hlEl.appendChild(d);
  }
}
boardEl.addEventListener('pointermove', (ev) => {
  if (!drag) return;
  if (Math.abs(ev.clientX - drag.startX) + Math.abs(ev.clientY - drag.startY) > 3) drag.moved = true;
  moveDragTo(ev);
});
function endDrag(ev) {
  if (!drag) return;
  const d = drag;
  drag = null;
  hlEl.querySelectorAll('.hl.hover').forEach((h) => h.remove());
  d.el.classList.remove('dragging');
  const target = ev ? pointerSquare(ev) : null;
  if (target && target !== d.from && d.moved) {
    if (tryPlayerMove(d.from, target)) return;
  }
  // Volver a su sitio.
  if (game) { place(d.el, d.from); }
  if (target === d.from && d.wasSelected && !d.moved) select(null);
}
boardEl.addEventListener('pointerup', (ev) => endDrag(ev));
boardEl.addEventListener('pointercancel', () => endDrag(null));

// =============================================================================
// Paneles: tarjetas, jugadas, chat, navegación
// =============================================================================
function initial(name) { return (name || '?').trim()[0]?.toUpperCase() || '?'; }

function renderCards() {
  const meAv = initial(profile.name);
  ['meAvatarTop', 'avatarBottom', 'avatarProfile'].forEach((id) => { $(id).textContent = meAv; });
  $('meNameTop').textContent = profile.name;
  $('meRatingTop').textContent = profile.rating;
  $('nameBottom').textContent = profile.name;
  $('ratingBottom').textContent = `(${profile.rating})`;
  if (!game) {
    $('nameTop').textContent = 'Rival';
    $('ratingTop').textContent = '';
    $('flagTop').textContent = '';
    $('titleTop').textContent = '';
    $('avatarTop').textContent = '?';
    $('avatarTop').style.background = '';
    $('capturedTop').innerHTML = '';
    $('capturedBottom').innerHTML = '';
    $('clockTop').textContent = '10:00';
    $('clockBottom').textContent = '10:00';
    return;
  }
  const bot = game.bot;
  $('nameTop').textContent = bot.name;
  $('ratingTop').textContent = `(${bot.shownRating})`;
  $('flagTop').textContent = bot.flag;
  $('titleTop').textContent = bot.title || '';
  const av = $('avatarTop');
  av.textContent = initial(bot.name);
  av.style.background = avatarColor(bot.id);
  renderCaptured();
  $('oppSummary').innerHTML = `<span class="online"></span><b>${bot.name}</b> ${bot.flag} · ${STYLE_LABEL[bot.style]} · ${game.tc.label}`;
}

function renderCaptured() {
  // Piezas capturadas por cada bando (diferencia respecto a la posición inicial).
  const counts = { w: { p: 8, n: 2, b: 2, r: 2, q: 1 }, b: { p: 8, n: 2, b: 2, r: 2, q: 1 } };
  const fen = game.fens[game.viewPly];
  const tmp = new Chess(fen);
  for (const row of tmp.board()) for (const sq of row) if (sq && sq.type !== 'k') counts[sq.color][sq.type]--;
  let mat = { w: 0, b: 0 };
  const html = (color) => { // piezas de `color` capturadas (las muestra el rival)
    let s = '';
    for (const t of ['p', 'n', 'b', 'r', 'q']) {
      const n = Math.max(0, counts[color][t]);
      mat[color === 'w' ? 'b' : 'w'] += n * PIECE_VALUE[t];
      for (let i = 0; i < n; i++) s += `<span class="cap ${color}${t}${i === 0 ? ' gap' : ''}"></span>`;
    }
    return s;
  };
  const capByPlayer = html(game.botColor);
  const capByBot = html(game.playerColor);
  const diffPlayer = mat[game.playerColor] - mat[game.botColor];
  $('capturedBottom').innerHTML = capByPlayer + (diffPlayer > 0 ? `<span class="diff">+${diffPlayer}</span>` : '');
  $('capturedTop').innerHTML = capByBot + (diffPlayer < 0 ? `<span class="diff">+${-diffPlayer}</span>` : '');
}

function renderMoves() {
  const el = $('moves');
  el.innerHTML = '';
  for (let i = 0; i < game.sans.length; i += 2) {
    const row = document.createElement('div');
    row.className = 'mrow';
    const num = document.createElement('span');
    num.className = 'mnum';
    num.textContent = `${i / 2 + 1}.`;
    row.appendChild(num);
    for (const j of [i, i + 1]) {
      const m = document.createElement('span');
      if (j < game.sans.length) {
        m.className = 'mv' + (game.viewPly === j + 1 ? ' cur' : '');
        m.textContent = game.sans[j];
        m.onclick = () => goToPly(j + 1);
      }
      row.appendChild(m);
    }
    el.appendChild(row);
  }
  const cur = el.querySelector('.mv.cur');
  if (cur) cur.scrollIntoView({ block: 'nearest' });
}

function goToPly(ply) {
  if (!game) return;
  ply = clamp(ply, 0, game.sans.length);
  game.viewPly = ply;
  const tmp = new Chess(game.fens[ply]);
  selected = null;
  renderPosition(tmp, true);
  renderHighlights(tmp, game.lastMoves[ply], null);
  renderDots([]);
  renderMoves();
  renderCaptured();
  boardEl.classList.toggle('viewing', ply !== game.sans.length);
}

function addChat(who, text) {
  if (!text) return;
  const log = $('chatLog');
  const d = document.createElement('div');
  d.className = 'msg ' + (who === 'me' ? 'me' : who === 'sys' ? 'sys' : '');
  if (who === 'sys') d.textContent = text;
  else d.innerHTML = `<b>${who === 'me' ? escapeHtml(profile.name) : escapeHtml(game.bot.name)}:</b>${escapeHtml(text)}`;
  log.appendChild(d);
  log.scrollTop = log.scrollHeight;
}
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// =============================================================================
// Lobby / emparejamiento
// =============================================================================
let selectedTc = '600+0';
let selectedColor = 'random';

function findOpponentAndStart(opts = {}) {
  const tc = parseTc(selectedTc);
  const color = opts.color || (selectedColor === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : selectedColor);
  const bot = opts.bot || pickOpponent(profile.rating, profile.streak, profile.lastBotId);
  $('playBtn').disabled = true;
  $('searching').classList.remove('hidden');
  $('searchElo').textContent = `(~${profile.rating} Elo)`;
  setTimeout(() => {
    $('playBtn').disabled = false;
    $('searching').classList.add('hidden');
    startGame(bot, color, tc);
  }, opts.fast ? 600 : rnd(1500, 3500));
}

$('playBtn').onclick = () => findOpponentAndStart();
$('tcGrid').onclick = (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  selectedTc = b.dataset.tc;
  $('tcGrid').querySelectorAll('button').forEach((x) => x.classList.toggle('selected', x === b));
};
$('colorPick').onclick = (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  selectedColor = b.dataset.color;
  $('colorPick').querySelectorAll('button').forEach((x) => x.classList.toggle('selected', x === b));
};

function backToLobby() {
  if (game && game.status === 'playing') {
    if (!confirm('¿Abandonar la partida? Contará como derrota.')) return;
    endGame(game.botColor, 'abandono');
  }
  $('resultModal').classList.add('hidden');
  $('gamePanel').classList.add('hidden');
  $('lobby').classList.remove('hidden');
  renderLobby();
}

function rematch() {
  if (!game) return;
  $('resultModal').classList.add('hidden');
  const bot = { ...game.bot, shownRating: game.bot.shownRating - (game.result ? game.result.delta : 0) };
  const color = game.playerColor === 'w' ? 'b' : 'w';
  $('gamePanel').classList.add('hidden');
  $('lobby').classList.remove('hidden');
  findOpponentAndStart({ bot, color, fast: true });
}
function nextOpponent() {
  $('resultModal').classList.add('hidden');
  $('gamePanel').classList.add('hidden');
  $('lobby').classList.remove('hidden');
  findOpponentAndStart();
}

$('rematchBtn').onclick = rematch;
$('modalRematch').onclick = rematch;
$('nextBtn').onclick = nextOpponent;
$('modalNext').onclick = nextOpponent;
$('backLobbyBtn').onclick = backToLobby;
$('modalClose').onclick = () => $('resultModal').classList.add('hidden');

$('resignBtn').onclick = () => {
  if (!game || game.status !== 'playing') return;
  if (game.sans.length < 2 && !confirm('¿Rendirte ya? Contará como derrota.')) return;
  if (game.sans.length >= 2 && !confirm('¿Seguro que quieres rendirte?')) return;
  endGame(game.botColor, 'abandono');
};
$('drawBtn').onclick = () => {
  if (!game || game.status !== 'playing') return;
  const bot = game.bot;
  addChat('sys', 'Has ofrecido tablas.');
  $('drawBtn').disabled = true;
  game.drawOffers++;
  const lastEval = game.botEvals.length ? game.botEvals[game.botEvals.length - 1] : 0;
  const ply = game.sans.length;
  // Acepta si no está mejor (o si va peor), y hay algo de partida jugada.
  const accept = (lastEval <= 30 && ply >= 30) || lastEval <= -150 || (ply >= 80 && lastEval <= 120);
  setTimeout(() => {
    if (!game || game.status !== 'playing') return;
    if (accept) { addChat('opp', phrase(bot, 'draw_accept')); endGame('draw', 'acuerdo'); }
    else {
      addChat('sys', 'El rival ha rechazado las tablas.');
      if (Math.random() < bot.chat) addChat('opp', phrase(bot, 'draw_decline'));
      setTimeout(() => { if (game && game.status === 'playing') $('drawBtn').disabled = false; }, 20000);
    }
  }, rnd(1500, 4000));
};
$('flipBtn').onclick = () => {
  orientation = orientation === 'w' ? 'b' : 'w';
  buildSquares();
  if (game) { goToPly(game.viewPly); }
};
$('navStart').onclick = () => goToPly(0);
$('navPrev').onclick = () => game && goToPly(game.viewPly - 1);
$('navNext').onclick = () => game && goToPly(game.viewPly + 1);
$('navEnd').onclick = () => game && goToPly(game.sans.length);
document.addEventListener('keydown', (e) => {
  if (!game || e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowLeft') goToPly(game.viewPly - 1);
  if (e.key === 'ArrowRight') goToPly(game.viewPly + 1);
});

// Chat rápido del jugador y respuesta del bot.
document.querySelector('.chat-quick').onclick = (e) => {
  const b = e.target.closest('button');
  if (!b || !game) return;
  const key = b.dataset.say;
  const text = { hello: 'Hola', gg: 'Buena partida', thanks: 'Gracias', oops: 'Uy' }[key];
  addChat('me', text);
  const bot = game.bot;
  const replyKey = { hello: 'reply_hello', gg: 'reply_gg', thanks: 'thanks', oops: null }[key];
  const p = key === 'oops' ? bot.chat * 0.3 : Math.max(bot.chat, 0.3) + 0.3;
  if (Math.random() < p) {
    setTimeout(() => game && game.bot === bot && addChat('opp', replyKey ? phrase(bot, replyKey) : '🙂'), rnd(1000, 3500));
  }
};

// =============================================================================
// Perfil, ranking, pestañas
// =============================================================================
function renderLobby() {
  $('lobbyRating').textContent = profile.rating;
  $('lobbyLevel').textContent = levelName(profile.rating);
}

function renderProfile() {
  renderCards();
  renderLobby();
  $('nameInput').value = profile.name;
  $('memberSince').textContent = new Date(profile.memberSince).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  $('statRating').textContent = profile.rating;
  $('statPeak').textContent = profile.peak;
  $('statGames').textContent = profile.games.length;
  const w = profile.games.filter((g) => g.result === 'w').length;
  const d = profile.games.filter((g) => g.result === 'd').length;
  const l = profile.games.filter((g) => g.result === 'l').length;
  $('statRecord').textContent = `${w}-${d}-${l}`;
  $('startElo').querySelectorAll('button').forEach((b) => {
    b.classList.toggle('selected', +b.dataset.elo === profile.startElo);
    b.disabled = profile.games.length > 0;
  });
  renderChart();
  renderHistory();
}

function renderChart() {
  const svg = $('ratingChart');
  const series = [profile.startElo, ...profile.games.map((g) => g.ratingAfter)];
  const W = 320, H = 120, pad = 10;
  let min = Math.min(...series), max = Math.max(...series);
  if (max - min < 100) { const mid = (max + min) / 2; min = mid - 50; max = mid + 50; }
  const x = (i) => pad + (series.length === 1 ? (W - 2 * pad) / 2 : (i / (series.length - 1)) * (W - 2 * pad));
  const y = (v) => H - pad - ((v - min) / (max - min)) * (H - 2 * pad);
  const pts = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = series[series.length - 1];
  svg.innerHTML = `
    <line x1="${pad}" y1="${y(min).toFixed(1)}" x2="${W - pad}" y2="${y(min).toFixed(1)}" stroke="#3c3a37" stroke-width="1"/>
    <line x1="${pad}" y1="${y(max).toFixed(1)}" x2="${W - pad}" y2="${y(max).toFixed(1)}" stroke="#3c3a37" stroke-width="1"/>
    <text x="${pad}" y="${y(max) + 10}" fill="#9e9c99" font-size="9">${Math.round(max)}</text>
    <text x="${pad}" y="${y(min) - 3}" fill="#9e9c99" font-size="9">${Math.round(min)}</text>
    <polyline fill="none" stroke="#81b64c" stroke-width="2" stroke-linejoin="round" points="${pts}" vector-effect="non-scaling-stroke"/>
    <circle cx="${x(series.length - 1).toFixed(1)}" cy="${y(last).toFixed(1)}" r="3" fill="#81b64c"/>`;
}

function renderHistory() {
  const el = $('history');
  if (!profile.games.length) { el.innerHTML = '<div class="muted">Aún no has jugado ninguna partida.</div>'; return; }
  el.innerHTML = [...profile.games].reverse().map((g) => {
    const r = g.result === 'w' ? 'G' : g.result === 'l' ? 'P' : 'T';
    return `<div class="hrow"><span class="res ${g.result}">${r}</span>
      <span><b>${escapeHtml(g.botName)}</b> ${g.botFlag || ''} <span class="muted">(${g.botRating})</span><div class="muted">${g.reason} · ${g.moves} jug. · ${g.color === 'w' ? 'blancas' : 'negras'}</div></span>
      <span class="hdelta ${g.delta > 0 ? 'pos' : g.delta < 0 ? 'neg' : ''}">${g.delta >= 0 ? '+' : ''}${g.delta}</span>
      <span class="muted">${g.ratingAfter}</span></div>`;
  }).join('');
}

function renderBotList() {
  const el = $('botList');
  const seed = Math.floor(Date.now() / 600000);
  el.innerHTML = [...BOTS].sort((a, b) => b.rating - a.rating).map((b, i) => {
    const online = ((seed * 7 + i * 13) % 10) < 7;
    return `<div class="brow"><div class="avatar" style="background:${avatarColor(b.id)}">${initial(b.name)}</div>
      <div><div>${b.title ? `<span class="title">${b.title}</span> ` : ''}<b>${escapeHtml(b.name)}</b> ${b.flag}</div>
      <div class="sub">${online ? '<span class="online"></span>en línea' : 'desconectado'} · ${STYLE_LABEL[b.style]}</div></div>
      <div><b>${b.rating}</b></div></div>`;
  }).join('');
}

document.querySelector('.topnav').onclick = (e) => {
  const b = e.target.closest('.navbtn');
  if (!b) return;
  document.querySelectorAll('.navbtn').forEach((x) => x.classList.toggle('active', x === b));
  ['play', 'profile', 'ranking'].forEach((t) => $('tab-' + t).classList.toggle('hidden', t !== b.dataset.tab));
  if (b.dataset.tab === 'profile') renderProfile();
  if (b.dataset.tab === 'ranking') renderBotList();
};

$('nameInput').onchange = (e) => {
  profile.name = e.target.value.trim() || 'Tú';
  saveProfile();
  renderProfile();
};
$('startElo').onclick = (e) => {
  const b = e.target.closest('button');
  if (!b || profile.games.length) return;
  profile.startElo = profile.rating = profile.peak = +b.dataset.elo;
  saveProfile();
  renderProfile();
};
$('resetBtn').onclick = () => {
  if (!confirm('Esto borra tu Elo y tu historial. ¿Continuar?')) return;
  const name = profile.name, sound = profile.sound;
  profile = { ...defaultProfile(), name, sound };
  saveProfile();
  renderProfile();
};
$('soundBtn').onclick = () => {
  profile.sound = !profile.sound;
  saveProfile();
  $('soundBtn').textContent = profile.sound ? '🔊' : '🔇';
};

// =============================================================================
// Arranque
// =============================================================================
buildSquares();
renderPosition(new Chess(), false);
renderCards();
renderProfile();
$('soundBtn').textContent = profile.sound ? '🔊' : '🔇';

// Pequeño gancho para pruebas automatizadas.
window.__emu = {
  get game() { return game; },
  get profile() { return profile; },
  playerMove: (m) => playerCanMove() && applyMove(m, false),
};
