// Motor de ajedrez con "modelo humano".
// - Generador de jugadas propio (tablero 0x88) para que la búsqueda sea rápida.
// - Búsqueda negamax alfa-beta con quiescencia y profundización iterativa.
// - Después, un modelo de error dependiente del Elo elige la jugada que
//   "jugaría una persona" de ese nivel (no siempre la mejor).
// Se ejecuta en un Web Worker para no bloquear la interfaz.

// ---- Representación ----------------------------------------------------------
const EMPTY = 0;
const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
const WHITE = 0, BLACK = 8; // color se guarda en el bit 3
const TYPE = (pc) => pc & 7;
const COLOR = (pc) => pc & 8;

const MATE = 100000;
const VAL = [0, 100, 320, 330, 500, 900, 0, 0];

const KNIGHT_D = [-33, -31, -18, -14, 14, 18, 31, 33];
const BISHOP_D = [-17, -15, 15, 17];
const ROOK_D = [-16, -1, 1, 16];
const KING_D = [-17, -16, -15, -1, 1, 15, 16, 17];

// Derechos de enroque: 1=K blanco, 2=Q blanco, 4=k negro, 8=q negro
const CASTLE_MASK = new Array(128).fill(15);
CASTLE_MASK[0x00] = 13; CASTLE_MASK[0x04] = 12; CASTLE_MASK[0x07] = 14;
CASTLE_MASK[0x70] = 7; CASTLE_MASK[0x74] = 3; CASTLE_MASK[0x77] = 11;

// Tablas de piezas-casilla (perspectiva blanca, fila 8 primero) — Michniewski.
const PST = [
  null,
  [ // peón
    0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
  [ // caballo
    -50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  [ // alfil
    -20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  [ // torre
    0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0,
  ],
  [ // dama
    -20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  [ // rey (medio juego)
    -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20,
  ],
  [ // rey (final)
    -50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50,
  ],
];

const board = new Int8Array(128);
let side = WHITE;
let castling = 0;
let ep = -1; // casilla 0x88 o -1
let kingSq = [0, 0]; // [blancas, negras] índice = color >> 3
const history = []; // pila de estados para deshacer

const FILES = 'abcdefgh';
const sqName = (sq) => FILES[sq & 7] + ((sq >> 4) + 1);
const sqFromName = (s) => (s.charCodeAt(1) - 49) * 16 + (s.charCodeAt(0) - 97);
const PIECE_CHARS = { p: P, n: N, b: B, r: R, q: Q, k: K };
const CHAR_OF = ['', 'p', 'n', 'b', 'r', 'q', 'k'];

function loadFen(fen) {
  board.fill(EMPTY);
  const parts = fen.trim().split(/\s+/);
  let rank = 7, file = 0;
  for (const ch of parts[0]) {
    if (ch === '/') { rank--; file = 0; continue; }
    if (ch >= '1' && ch <= '8') { file += +ch; continue; }
    const type = PIECE_CHARS[ch.toLowerCase()];
    const color = ch === ch.toUpperCase() ? WHITE : BLACK;
    const sq = rank * 16 + file;
    board[sq] = color | type;
    if (type === K) kingSq[color >> 3] = sq;
    file++;
  }
  side = parts[1] === 'b' ? BLACK : WHITE;
  castling = 0;
  if (parts[2] && parts[2] !== '-') {
    if (parts[2].includes('K')) castling |= 1;
    if (parts[2].includes('Q')) castling |= 2;
    if (parts[2].includes('k')) castling |= 4;
    if (parts[2].includes('q')) castling |= 8;
  }
  ep = parts[3] && parts[3] !== '-' ? sqFromName(parts[3]) : -1;
  history.length = 0;
}

// Clave de posición compatible con la del hilo principal (tablero + turno + enroques).
function positionKey() {
  let s = '';
  for (let r = 7; r >= 0; r--) {
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const pc = board[r * 16 + f];
      if (!pc) { empty++; continue; }
      if (empty) { s += empty; empty = 0; }
      const c = CHAR_OF[TYPE(pc)];
      s += COLOR(pc) === WHITE ? c.toUpperCase() : c;
    }
    if (empty) s += empty;
    if (r) s += '/';
  }
  s += side === WHITE ? ' w ' : ' b ';
  let cs = '';
  if (castling & 1) cs += 'K';
  if (castling & 2) cs += 'Q';
  if (castling & 4) cs += 'k';
  if (castling & 8) cs += 'q';
  return s + (cs || '-');
}

// ¿Está la casilla atacada por el color dado?
function isAttacked(sq, byColor) {
  // Peones
  if (byColor === WHITE) {
    for (const d of [-15, -17]) { const s = sq + d; if (!(s & 0x88) && board[s] === (WHITE | P)) return true; }
  } else {
    for (const d of [15, 17]) { const s = sq + d; if (!(s & 0x88) && board[s] === (BLACK | P)) return true; }
  }
  for (const d of KNIGHT_D) { const s = sq + d; if (!(s & 0x88) && board[s] === (byColor | N)) return true; }
  for (const d of KING_D) { const s = sq + d; if (!(s & 0x88) && board[s] === (byColor | K)) return true; }
  for (const d of BISHOP_D) {
    let s = sq + d;
    while (!(s & 0x88)) {
      const pc = board[s];
      if (pc) { if (COLOR(pc) === byColor && (TYPE(pc) === B || TYPE(pc) === Q)) return true; break; }
      s += d;
    }
  }
  for (const d of ROOK_D) {
    let s = sq + d;
    while (!(s & 0x88)) {
      const pc = board[s];
      if (pc) { if (COLOR(pc) === byColor && (TYPE(pc) === R || TYPE(pc) === Q)) return true; break; }
      s += d;
    }
  }
  return false;
}

const inCheck = () => isAttacked(kingSq[side >> 3], side ^ 8);

// Codificación de jugada: from | to<<7 | promo<<14 | flags<<17
// flags: 1 = captura, 2 = al paso, 4 = doble paso de peón, 8 = enroque
const mkMove = (from, to, promo, flags) => from | (to << 7) | (promo << 14) | (flags << 17);
const mFrom = (m) => m & 127;
const mTo = (m) => (m >> 7) & 127;
const mPromo = (m) => (m >> 14) & 7;
const mFlags = (m) => m >> 17;

function generatePseudo(capturesOnly) {
  const moves = [];
  const us = side, them = side ^ 8;
  const fwd = us === WHITE ? 16 : -16;
  const startRank = us === WHITE ? 1 : 6;
  const promoRank = us === WHITE ? 7 : 0;
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const pc = board[sq];
    if (!pc || COLOR(pc) !== us) continue;
    const t = TYPE(pc);
    if (t === P) {
      const to = sq + fwd;
      if (!(to & 0x88) && !board[to]) {
        if ((to >> 4) === promoRank) {
          for (const pr of [Q, R, B, N]) moves.push(mkMove(sq, to, pr, 0));
        } else if (!capturesOnly) {
          moves.push(mkMove(sq, to, 0, 0));
          const to2 = to + fwd;
          if ((sq >> 4) === startRank && !board[to2]) moves.push(mkMove(sq, to2, 0, 4));
        }
      }
      for (const d of [fwd - 1, fwd + 1]) {
        const c = sq + d;
        if (c & 0x88) continue;
        if (board[c] && COLOR(board[c]) === them) {
          if ((c >> 4) === promoRank) for (const pr of [Q, R, B, N]) moves.push(mkMove(sq, c, pr, 1));
          else moves.push(mkMove(sq, c, 0, 1));
        } else if (c === ep) {
          moves.push(mkMove(sq, c, 0, 3));
        }
      }
    } else if (t === N || t === K) {
      for (const d of t === N ? KNIGHT_D : KING_D) {
        const to = sq + d;
        if (to & 0x88) continue;
        const target = board[to];
        if (!target) { if (!capturesOnly) moves.push(mkMove(sq, to, 0, 0)); }
        else if (COLOR(target) === them) moves.push(mkMove(sq, to, 0, 1));
      }
      if (t === K && !capturesOnly) {
        if (us === WHITE) {
          if ((castling & 1) && !board[0x05] && !board[0x06] && board[0x07] === (WHITE | R) &&
            !isAttacked(0x04, them) && !isAttacked(0x05, them) && !isAttacked(0x06, them)) moves.push(mkMove(0x04, 0x06, 0, 8));
          if ((castling & 2) && !board[0x03] && !board[0x02] && !board[0x01] && board[0x00] === (WHITE | R) &&
            !isAttacked(0x04, them) && !isAttacked(0x03, them) && !isAttacked(0x02, them)) moves.push(mkMove(0x04, 0x02, 0, 8));
        } else {
          if ((castling & 4) && !board[0x75] && !board[0x76] && board[0x77] === (BLACK | R) &&
            !isAttacked(0x74, them) && !isAttacked(0x75, them) && !isAttacked(0x76, them)) moves.push(mkMove(0x74, 0x76, 0, 8));
          if ((castling & 8) && !board[0x73] && !board[0x72] && !board[0x71] && board[0x70] === (BLACK | R) &&
            !isAttacked(0x74, them) && !isAttacked(0x73, them) && !isAttacked(0x72, them)) moves.push(mkMove(0x74, 0x72, 0, 8));
        }
      }
    } else {
      const dirs = t === B ? BISHOP_D : t === R ? ROOK_D : KING_D;
      for (const d of dirs) {
        let to = sq + d;
        while (!(to & 0x88)) {
          const target = board[to];
          if (!target) { if (!capturesOnly) moves.push(mkMove(sq, to, 0, 0)); }
          else { if (COLOR(target) === them) moves.push(mkMove(sq, to, 0, 1)); break; }
          to += d;
        }
      }
    }
  }
  return moves;
}

// Hace la jugada. Devuelve false (y la deshace) si deja al propio rey en jaque.
function makeMove(m) {
  const from = mFrom(m), to = mTo(m), promo = mPromo(m), flags = mFlags(m);
  const pc = board[from];
  const us = side;
  let captured = board[to];
  history.push([castling, ep, captured, kingSq[0], kingSq[1]]);
  board[to] = pc;
  board[from] = EMPTY;
  if (flags & 2) { // al paso
    const capSq = to + (us === WHITE ? -16 : 16);
    captured = board[capSq];
    board[capSq] = EMPTY;
    history[history.length - 1][2] = captured;
  }
  if (promo) board[to] = us | promo;
  if (flags & 8) { // enroque: mover la torre
    if (to === 0x06) { board[0x05] = board[0x07]; board[0x07] = EMPTY; }
    else if (to === 0x02) { board[0x03] = board[0x00]; board[0x00] = EMPTY; }
    else if (to === 0x76) { board[0x75] = board[0x77]; board[0x77] = EMPTY; }
    else if (to === 0x72) { board[0x73] = board[0x70]; board[0x70] = EMPTY; }
  }
  if (TYPE(pc) === K) kingSq[us >> 3] = to;
  castling &= CASTLE_MASK[from] & CASTLE_MASK[to];
  ep = (flags & 4) ? (from + to) / 2 : -1;
  side ^= 8;
  if (isAttacked(kingSq[us >> 3], side)) { undoMove(m); return false; }
  return true;
}

function undoMove(m) {
  const from = mFrom(m), to = mTo(m), promo = mPromo(m), flags = mFlags(m);
  side ^= 8;
  const us = side;
  const st = history.pop();
  castling = st[0]; ep = st[1]; kingSq[0] = st[3]; kingSq[1] = st[4];
  const captured = st[2];
  board[from] = promo ? (us | P) : board[to];
  board[to] = EMPTY;
  if (flags & 2) board[to + (us === WHITE ? -16 : 16)] = captured;
  else if (captured) board[to] = captured;
  if (flags & 8) {
    if (to === 0x06) { board[0x07] = board[0x05]; board[0x05] = EMPTY; }
    else if (to === 0x02) { board[0x00] = board[0x03]; board[0x03] = EMPTY; }
    else if (to === 0x76) { board[0x77] = board[0x75]; board[0x75] = EMPTY; }
    else if (to === 0x72) { board[0x70] = board[0x73]; board[0x73] = EMPTY; }
  }
}

function legalMoves() {
  const out = [];
  for (const m of generatePseudo(false)) if (makeMove(m)) { undoMove(m); out.push(m); }
  return out;
}

// ---- Evaluación -------------------------------------------------------------
const CENTER_DIST = new Int8Array(128);
for (let sq = 0; sq < 128; sq++) {
  if (sq & 0x88) continue;
  const r = sq >> 4, f = sq & 7;
  CENTER_DIST[sq] = Math.max(Math.abs(r - 3.5), Math.abs(f - 3.5)) * 2 - 1; // 0..6
}
const kingDist = (a, b) => Math.max(Math.abs((a >> 4) - (b >> 4)), Math.abs((a & 7) - (b & 7)));

function evaluate() {
  let score = 0, nonPawn = 0;
  const material = [0, 0]; // material (sin rey) de blancas y negras
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const pc = board[sq];
    if (!pc) continue;
    const t = TYPE(pc);
    if (t !== K) material[COLOR(pc) >> 3] += VAL[t];
    if (t !== P && t !== K) nonPawn += VAL[t];
  }
  const endgame = nonPawn <= 1300;
  // "Mop-up": contra un rey solo, arrinconarlo y acercar nuestro rey.
  for (const c of [0, 1]) {
    const them = 1 - c;
    if (material[them] === 0 && material[c] >= 400) {
      const bonus = 20 * CENTER_DIST[kingSq[them]] + 10 * (7 - kingDist(kingSq[c], kingSq[them]));
      score += c === 0 ? bonus : -bonus;
    }
  }
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const pc = board[sq];
    if (!pc) continue;
    const t = TYPE(pc);
    const r = sq >> 4, f = sq & 7;
    const table = (t === K && endgame) ? PST[7] : PST[t];
    const v = VAL[t] + (COLOR(pc) === WHITE ? table[(7 - r) * 8 + f] : table[r * 8 + f]);
    score += COLOR(pc) === WHITE ? v : -v;
  }
  return side === WHITE ? score : -score;
}

function insufficientMaterial() {
  let minors = 0;
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const t = TYPE(board[sq]);
    if (t === P || t === R || t === Q) return false;
    if (t === N || t === B) minors++;
  }
  return minors <= 1;
}

// ---- Búsqueda ---------------------------------------------------------------
let nodes = 0, deadline = 0, aborted = false;

function moveScore(m) {
  const flags = mFlags(m);
  let s = 0;
  if (flags & 1) {
    const victim = (flags & 2) ? P : TYPE(board[mTo(m)]);
    s += 10 * VAL[victim] - VAL[TYPE(board[mFrom(m)])] + 1000;
  }
  if (mPromo(m)) s += VAL[mPromo(m)];
  return s;
}

function sortMoves(moves) {
  const scored = moves.map((m) => [moveScore(m), m]);
  scored.sort((a, b) => b[0] - a[0]);
  return scored.map((x) => x[1]);
}

function tick() {
  nodes++;
  if ((nodes & 2047) === 0 && Date.now() > deadline) aborted = true;
}

function quiesce(alpha, beta, qdepth) {
  tick();
  if (aborted) return 0;
  const stand = evaluate();
  if (stand >= beta) return beta;
  if (alpha < stand) alpha = stand;
  if (qdepth <= 0) return alpha;
  for (const m of sortMoves(generatePseudo(true))) {
    const flags = mFlags(m);
    if (!mPromo(m) && (flags & 1)) {
      const victim = (flags & 2) ? P : TYPE(board[mTo(m)]);
      if (stand + VAL[victim] + 200 < alpha) continue; // poda delta
    }
    if (!makeMove(m)) continue;
    const score = -quiesce(-beta, -alpha, qdepth - 1);
    undoMove(m);
    if (aborted) return 0;
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function search(depth, alpha, beta, ply) {
  tick();
  if (aborted) return 0;
  if (insufficientMaterial()) return 0;
  if (depth <= 0) return quiesce(alpha, beta, 8);
  const check = inCheck();
  if (check) depth++; // extensión de jaque
  let legal = 0, best = -Infinity;
  for (const m of sortMoves(generatePseudo(false))) {
    if (!makeMove(m)) continue;
    legal++;
    const score = -search(depth - 1, -beta, -alpha, ply + 1);
    undoMove(m);
    if (aborted) return 0;
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  if (legal === 0) return check ? -MATE + ply : 0;
  return best;
}

// Puntúa TODAS las jugadas raíz (necesario para el modelo humano).
function searchRoot(depth, prev) {
  let moves = legalMoves();
  if (prev) {
    const order = new Map(prev.map((r, i) => [r.m, i]));
    moves.sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
  } else {
    moves = sortMoves(moves);
  }
  const results = [];
  for (const m of moves) {
    makeMove(m);
    // Mate/ahogado inmediato detectado siempre, incluso a profundidad 1.
    const replies = legalMoves().length;
    const score = replies === 0 ? (inCheck() ? MATE - 1 : 0) : -search(depth - 1, -Infinity, Infinity, 1);
    const key = positionKey();
    undoMove(m);
    if (aborted) return null;
    results.push({ m, score, key, captured: !!(mFlags(m) & 1), promotion: mPromo(m) });
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}

// ---- Modelo humano ----------------------------------------------------------
function eloParams(elo) {
  const t = Math.max(0, Math.min(1, (elo - 300) / 2300)); // 0 → 300 Elo, 1 → 2600 Elo
  // Probabilidad de error grave: alta en principiantes, casi nula a partir de ~1800.
  let blunderRate = 0.30 * Math.pow(1 - t, 2.2) + 0.004;
  if (elo >= 1500) blunderRate = Math.max(0.002, 0.03 - 0.026 * Math.min(1, (elo - 1500) / 500));
  return {
    maxDepth: elo < 700 ? 1 : elo < 1000 ? 2 : elo < 1400 ? 3 : elo < 1900 ? 4 : elo < 2300 ? 6 : 8,
    temperature: 260 * Math.pow(1 - t, 1.6) + 8,     // cuánto se aleja de la mejor jugada
    blunderRate,
    window: 60 + 500 * Math.pow(1 - t, 1.8),          // pérdida máxima "normal" en centipeones
    // Tope absoluto de pérdida por jugada: los jugadores buenos pueden ser
    // imprecisos, pero no regalan piezas enteras.
    maxLoss: elo < 1200 ? 2000 : elo < 1500 ? 450 : elo < 1800 ? 220 : elo < 2100 ? 110 : elo < 2400 ? 70 : 40,
  };
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function givesCheck(m) {
  makeMove(m);
  const c = inCheck();
  undoMove(m);
  return c;
}

// ¿Tiene el rival solo el rey? (final de "mate técnico")
function opponentHasLoneKing() {
  const them = side ^ 8;
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const pc = board[sq];
    if (pc && COLOR(pc) === them && TYPE(pc) !== K) return false;
  }
  return true;
}

function pickHuman(results, elo, style, rng, repeatedKeys) {
  const p = eloParams(elo);
  const technical = opponentHasLoneKing();
  // Penaliza repetir posición cuando no vamos peor (evita tablas tontas).
  if (repeatedKeys && repeatedKeys.length) {
    const best0 = results[0].score;
    for (const r of results) if (repeatedKeys.includes(r.key) && best0 > -50) r.score -= 60;
    results.sort((a, b) => b.score - a.score);
  }
  const best = results[0].score;
  if (best > MATE - 50 && elo >= 900) return results[0]; // mate a la vista: no fallar

  for (const r of results) {
    r.adj = r.score;
    const check = (style === 'aggressive' || style === 'tricky') ? givesCheck(r.m) : false;
    if (style === 'aggressive') { if (r.captured) r.adj += 25; if (check) r.adj += 30; }
    else if (style === 'solid') { if (r.captured) r.adj -= 10; }
    else if (style === 'tricky') { if (check) r.adj += 15; if (r.promotion) r.adj += 20; }
  }

  // En posiciones decididas (mucha ventaja o mucha desventaja) la gente juega
  // con más "sentido común": menos ruido, menos errores graves. Así los bots
  // flojos también saben rematar un final ganado.
  const decisive = Math.min(1, Math.max(0, (Math.abs(best) - 300) / 700));
  const blunder = rng() < p.blunderRate * (1 - 0.7 * decisive);
  let window = blunder ? Math.min(p.window * 3 + 300, p.maxLoss * 1.6) : Math.min(p.window, p.maxLoss);
  let temperature = blunder ? p.temperature * 2.5 : p.temperature;
  window *= 1 - 0.6 * decisive;
  temperature *= 1 - 0.75 * decisive;
  // Con pocas piezas, premia acercar el rey y arrinconar al contrario (profundidad extra ya lo hace).
  if (results.length <= 12 && best > 500) temperature *= 0.6;
  // Mate técnico (rey solo enfrente): casi todo el mundo sabe rematar; apenas hay ruido.
  if (technical && best > 300) { temperature = Math.min(temperature, 12); window = Math.min(window, 40); }

  const candidates = results.filter((r) => best - r.score <= window);
  // No entregar mate inmediato salvo Elo muy bajo.
  const safe = candidates.filter((r) => r.score > -MATE + 50 || elo < 600);
  const pool = safe.length ? safe : candidates.length ? candidates : results.slice(0, 1);

  const topAdj = Math.max(...pool.map((r) => r.adj));
  const weights = pool.map((r) => Math.exp((r.adj - topAdj) / temperature));
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rng() * total;
  for (let i = 0; i < pool.length; i++) { x -= weights[i]; if (x <= 0) return pool[i]; }
  return pool[pool.length - 1];
}

// ---- Utilidades de prueba ---------------------------------------------------
export function perft(fen, depth) {
  loadFen(fen);
  const rec = (d) => {
    if (d === 0) return 1;
    let n = 0;
    for (const m of generatePseudo(false)) {
      if (!makeMove(m)) continue;
      n += rec(d - 1);
      undoMove(m);
    }
    return n;
  };
  return rec(depth);
}

export function think({ fen, elo, style = 'balanced', timeMs = 1000, seed, repeatedKeys = [] }) {
  loadFen(fen);
  const p = eloParams(elo);
  nodes = 0; aborted = false;
  deadline = Date.now() + Math.max(60, timeMs);
  const rng = mulberry32(seed ?? (Date.now() & 0x7fffffff));

  let results = null, depthReached = 0;
  for (let d = 1; d <= p.maxDepth; d++) {
    const r = searchRoot(d, results);
    if (r === null) break; // se acabó el tiempo: nos quedamos con la iteración anterior
    results = r; depthReached = d;
    if (results[0].score > MATE - 50) break;
  }
  if (!results) { aborted = false; deadline = Infinity; results = searchRoot(1, null); depthReached = 1; }
  if (!results.length) return null;

  const choice = pickHuman(results, elo, style, rng, repeatedKeys);
  const best = results[0];
  const promo = mPromo(choice.m);
  return {
    move: { from: sqName(mFrom(choice.m)), to: sqName(mTo(choice.m)), promotion: promo ? CHAR_OF[promo] : undefined },
    eval: choice.score,
    bestEval: best.score,
    bestMove: { from: sqName(mFrom(best.m)), to: sqName(mTo(best.m)) },
    lossCp: best.score - choice.score,
    depth: depthReached,
    nodes,
    legalCount: results.length,
  };
}

if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.onmessage = (e) => {
    const msg = e.data;
    if (msg.type !== 'go') return;
    const res = think(msg);
    self.postMessage({ type: 'move', id: msg.id, ...res });
  };
}
