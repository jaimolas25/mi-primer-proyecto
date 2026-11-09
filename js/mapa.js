'use strict';
/* =========================================================
   MAPA: construcción, colisiones y visión
   ========================================================= */
function construirMapa(nombre) {
  const def = MAPAS[nombre];
  let filas;
  if (def.tipo === 'cuarto') {
    const mitad = def.filas.map(f => f + f.split('').reverse().join(''));
    filas = mitad.concat(mitad.slice().reverse());
  } else {
    filas = def.filas.slice();
    for (let i = def.filas.length - 1; i >= 0; i--) filas.push(def.filas[i].replace(/1/g, '2'));
  }
  const mapa = {
    nombre, tema: TEMAS[def.tema],
    filas: filas.length, columnas: filas[0].length,
    casillas: filas.map(f => f.split('')),
    apariciones: [[], []], aparicionesSupervivencia: [],
    mina: null, cajasFuertes: [], porterias: [], balon: null,
    cajas: {}, murosTemporales: [], humos: [],
  };
  mapa.ancho = mapa.columnas * TILE;
  mapa.alto = mapa.filas * TILE;
  const minas = [], cajasFuertes = [[], []], balones = [];
  for (let f = 0; f < mapa.filas; f++) {
    for (let c = 0; c < mapa.columnas; c++) {
      const ch = mapa.casillas[f][c];
      const cx = c * TILE + TILE / 2, cy = f * TILE + TILE / 2;
      const arriba = f < mapa.filas / 2;
      if (ch === '1') { mapa.apariciones[0].push({ x: cx, y: cy }); mapa.casillas[f][c] = '.'; }
      if (ch === '2') { mapa.apariciones[1].push({ x: cx, y: cy }); mapa.casillas[f][c] = '.'; }
      if (ch === 'S') { mapa.aparicionesSupervivencia.push({ x: cx, y: cy }); mapa.casillas[f][c] = '.'; }
      if (ch === 'M') { minas.push({ x: cx, y: cy }); mapa.casillas[f][c] = '.'; }
      if (ch === 'B') { balones.push({ x: cx, y: cy }); mapa.casillas[f][c] = '.'; }
      if (ch === 'A') { cajasFuertes[arriba ? 0 : 1].push({ x: cx, y: cy }); mapa.casillas[f][c] = '.'; }
      if (ch === 'G') { mapa.porterias.push({ f, c, equipo: arriba ? 0 : 1 }); }   // portería del equipo de ese lado
      if (ch === 'C') mapa.cajas[f + ',' + c] = VIDA_CAJA;
    }
  }
  const centro = lista => lista.length ? { x: lista.reduce((s, p) => s + p.x, 0) / lista.length, y: lista.reduce((s, p) => s + p.y, 0) / lista.length } : null;
  mapa.mina = centro(minas) || { x: mapa.ancho / 2, y: mapa.alto / 2 };
  mapa.balon = centro(balones) || { x: mapa.ancho / 2, y: mapa.alto / 2 };
  for (let eq = 0; eq < 2; eq++) {
    const p = centro(cajasFuertes[eq]);
    if (p) mapa.cajasFuertes.push({ equipo: eq, x: p.x, y: p.y, r: 34, vida: VIDA_CAJA_FUERTE, vidaMax: VIDA_CAJA_FUERTE, ultimoDano: -99 });
  }
  // Aparición en supervivencia: si el mapa no la define, se reparte por el borde
  return mapa;
}

function casillaEn(mapa, x, y) {
  const c = Math.floor(x / TILE), f = Math.floor(y / TILE);
  if (c < 0 || f < 0 || c >= mapa.columnas || f >= mapa.filas) return '#';
  return mapa.casillas[f][c];
}

const bloqueaPaso = ch => ch === '#' || ch === 'C' || ch === 'w' || ch === 'f' || ch === 'T' || ch === 'G';
const bloqueaBala = ch => ch === '#' || ch === 'C' || ch === 'T';
const bloqueaBalon = ch => ch === '#' || ch === 'C' || ch === 'f' || ch === 'T';
const esMuro = (mapa, x, y) => bloqueaBala(casillaEn(mapa, x, y));
const esAgua = (mapa, x, y) => casillaEn(mapa, x, y) === 'w';

// ¿El punto está oculto (arbusto o nube de humo)?
function estaOculto(mapa, x, y) {
  if (casillaEn(mapa, x, y) === 'b') return true;
  return mapa.humos.some(h => distancia(x, y, h.x, h.y) < h.r);
}

// ¿Un círculo choca con algo que bloquee el paso?
function circuloChoca(mapa, x, y, r, prueba = bloqueaPaso) {
  const c0 = Math.floor((x - r) / TILE), c1 = Math.floor((x + r) / TILE);
  const f0 = Math.floor((y - r) / TILE), f1 = Math.floor((y + r) / TILE);
  for (let f = f0; f <= f1; f++) {
    for (let c = c0; c <= c1; c++) {
      if (c < 0 || f < 0 || c >= mapa.columnas || f >= mapa.filas || prueba(mapa.casillas[f][c])) {
        const px = limitar(x, c * TILE, c * TILE + TILE);
        const py = limitar(y, f * TILE, f * TILE + TILE);
        if (distancia(x, y, px, py) < r) return true;
      }
    }
  }
  // Cajas fuertes como obstáculos redondos
  for (const cf of mapa.cajasFuertes) if (cf.vida > 0 && distancia(x, y, cf.x, cf.y) < r + cf.r) return true;
  return false;
}
const circuloChocaMuro = circuloChoca;

// Mueve un círculo intentando cada eje por separado (resbala por los muros)
function moverConColision(mapa, ente, dx, dy) {
  const antesX = ente.x, antesY = ente.y;
  ente.x += dx;
  if (circuloChoca(mapa, ente.x, ente.y, ente.r)) ente.x = antesX;
  ente.y += dy;
  if (circuloChoca(mapa, ente.x, ente.y, ente.r)) ente.y = antesY;
  return ente.x !== antesX || ente.y !== antesY;
}

// ¿Hay línea de visión sin muros entre dos puntos?
function hayVision(mapa, ax, ay, bx, by) {
  const d = distancia(ax, ay, bx, by);
  const pasos = Math.ceil(d / 10);
  for (let i = 1; i < pasos; i++) {
    const t = i / pasos;
    if (esMuro(mapa, ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

// Busca un punto libre cerca de (x, y)
function puntoLibreCerca(mapa, x, y, r, intentos = 10, radioMax = 70) {
  if (!circuloChoca(mapa, x, y, r)) return { x, y };
  for (let i = 0; i < intentos; i++) {
    const a = Math.random() * Math.PI * 2, d = azar(20, radioMax);
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    if (!circuloChoca(mapa, px, py, r)) return { x: px, y: py };
  }
  return { x, y };
}

// Muro temporal (gadget de Bastión)
function ponerMuroTemporal(mapa, x, y, duracion) {
  const c = Math.floor(x / TILE), f = Math.floor(y / TILE);
  if (c < 1 || f < 1 || c >= mapa.columnas - 1 || f >= mapa.filas - 1) return false;
  if (mapa.casillas[f][c] !== '.' && mapa.casillas[f][c] !== 'b') return false;
  // No aplastar a nadie
  if (partida.luchadores.some(l => !l.muerto && circuloCasilla(l, f, c))) return false;
  mapa.murosTemporales.push({ f, c, original: mapa.casillas[f][c], restante: duracion });
  mapa.casillas[f][c] = 'T';
  return true;
}

function circuloCasilla(ente, f, c) {
  const px = limitar(ente.x, c * TILE, c * TILE + TILE), py = limitar(ente.y, f * TILE, f * TILE + TILE);
  return distancia(ente.x, ente.y, px, py) < ente.r;
}

function actualizarMapa(mapa, dt) {
  for (let i = mapa.murosTemporales.length - 1; i >= 0; i--) {
    const m = mapa.murosTemporales[i];
    m.restante -= dt;
    if (m.restante <= 0) { mapa.casillas[m.f][m.c] = m.original; mapa.murosTemporales.splice(i, 1); }
  }
  for (let i = mapa.humos.length - 1; i >= 0; i--) {
    mapa.humos[i].restante -= dt;
    if (mapa.humos[i].restante <= 0) mapa.humos.splice(i, 1);
  }
}
