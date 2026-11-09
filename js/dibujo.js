'use strict';
/* =========================================================
   DIBUJO: personajes, mapa con profundidad, efectos y HUD
   ========================================================= */
const FUENTE = "'Fredoka', 'Nunito', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const ALTO_MURO = 18;

function aclarar(hex, cantidad) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + cantidad), g = Math.min(255, ((n >> 8) & 255) + cantidad), b = Math.min(255, (n & 255) + cantidad);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

/* ---------- Personaje ---------- */
function dibujarPersonaje(g, l, op = {}) {
  const r = l.r, x = l.x, y = l.y, def = l.def;
  const a = l.angulo;
  const anim = l.animacion || 0;
  const moviendose = l.moviendose;
  const bob = moviendose ? Math.abs(Math.sin(anim)) * 3 : Math.sin(anim) * 1.2;
  const mirandoIzq = Math.cos(a) < 0;

  g.save();
  if (op.alfa !== undefined) g.globalAlpha = op.alfa;

  // Sombra
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.beginPath(); g.ellipse(x, y + r * 0.85, r * 0.95, r * 0.38, 0, 0, Math.PI * 2); g.fill();

  // Anillo de equipo en el suelo
  if (op.anillo) {
    g.strokeStyle = op.anillo; g.lineWidth = 3;
    g.beginPath(); g.ellipse(x, y + r * 0.85, r * 1.05, r * 0.45, 0, 0, Math.PI * 2); g.stroke();
  }

  // Piernas
  const paso = moviendose ? Math.sin(anim) * r * 0.25 : 0;
  g.fillStyle = def.colorOscuro;
  for (const lado of [-1, 1]) {
    const px = x + lado * r * 0.38, py = y + r * 0.55 + lado * paso * 0.6;
    g.beginPath(); g.roundRect(px - r * 0.22, py - r * 0.1, r * 0.44, r * 0.42, r * 0.15); g.fill();
  }

  // Cuerpo
  const cy = y - bob;
  g.fillStyle = def.color;
  g.strokeStyle = def.colorOscuro; g.lineWidth = 2.5;
  g.beginPath(); g.roundRect(x - r * 0.72, cy - r * 0.25, r * 1.44, r * 0.95, r * 0.35); g.fill(); g.stroke();
  // Cinturón / detalle
  g.fillStyle = def.acento || def.colorOscuro;
  g.fillRect(x - r * 0.72, cy + r * 0.38, r * 1.44, r * 0.12);

  // Arma (detrás de la cabeza si apunta hacia arriba)
  const armaArriba = Math.sin(a) < -0.3;
  if (armaArriba) dibujarArma(g, l, cy);

  // Cabeza
  const hy = cy - r * 0.7;
  const hr = r * 0.8;
  g.fillStyle = aclarar(def.color, 25);
  g.strokeStyle = def.colorOscuro; g.lineWidth = 2.5;
  g.beginPath(); g.arc(x, hy, hr, 0, Math.PI * 2); g.fill(); g.stroke();

  // Cara: ojos mirando hacia donde apunta
  const ex = x + Math.cos(a) * hr * 0.35, ey = hy + Math.sin(a) * hr * 0.25;
  const sep = hr * 0.36;
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(ex - sep, ey, hr * 0.26, 0, Math.PI * 2); g.arc(ex + sep, ey, hr * 0.26, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1b1f3a';
  const dx = Math.cos(a) * hr * 0.1, dy = Math.sin(a) * hr * 0.1;
  g.beginPath(); g.arc(ex - sep + dx, ey + dy, hr * 0.13, 0, Math.PI * 2); g.arc(ex + sep + dx, ey + dy, hr * 0.13, 0, Math.PI * 2); g.fill();
  // Boca
  g.strokeStyle = def.colorOscuro; g.lineWidth = 1.8;
  g.beginPath(); g.arc(ex, ey + hr * 0.35, hr * 0.2, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();

  dibujarAccesorio(g, l, x, hy, hr, mirandoIzq);
  if (!armaArriba) dibujarArma(g, l, cy);

  // Destello blanco al recibir daño
  if (l.golpeado > 0) {
    g.globalAlpha = Math.min(0.75, l.golpeado * 7);
    g.fillStyle = '#ffffff';
    g.beginPath(); g.roundRect(x - r * 0.72, cy - r * 0.25, r * 1.44, r * 0.95, r * 0.35); g.fill();
    g.beginPath(); g.arc(x, hy, hr, 0, Math.PI * 2); g.fill();
    g.globalAlpha = op.alfa !== undefined ? op.alfa : 1;
  }
  // Escudo
  if (l.escudo > 0) {
    g.strokeStyle = 'rgba(190,210,230,0.95)'; g.lineWidth = 4; g.setLineDash([7, 5]);
    g.beginPath(); g.arc(x, cy, r + 14, (partida ? partida.tiempo : 0) * 2, (partida ? partida.tiempo : 0) * 2 + Math.PI * 2); g.stroke();
    g.setLineDash([]);
    g.fillStyle = 'rgba(190,210,230,0.15)'; g.beginPath(); g.arc(x, cy, r + 14, 0, Math.PI * 2); g.fill();
  }
  if (l.rapido > 0) {
    g.strokeStyle = 'rgba(142,240,90,0.8)'; g.lineWidth = 2;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x - Math.cos(a) * (r + 6 + i * 6), y - 10 + i * 10); g.lineTo(x - Math.cos(a) * (r + 18 + i * 6), y - 10 + i * 10); g.stroke(); }
  }
  g.restore();
}

function dibujarArma(g, l, cy) {
  const r = l.r, a = l.angulo, def = l.def;
  const ox = l.x + Math.cos(a) * r * 0.5, oy = cy + r * 0.1 + Math.sin(a) * r * 0.3;
  g.save();
  g.translate(ox, oy); g.rotate(a);
  g.lineCap = 'round';
  const oscuro = def.acento || def.colorOscuro;
  // Brazo
  g.strokeStyle = def.colorOscuro; g.lineWidth = r * 0.3;
  g.beginPath(); g.moveTo(-r * 0.2, 0); g.lineTo(r * 0.5, 0); g.stroke();
  const arma = def.arma;
  if (arma === 'pistolas') {
    g.fillStyle = oscuro;
    g.fillRect(r * 0.4, -r * 0.3, r * 0.75, r * 0.22);
    g.fillRect(r * 0.4, r * 0.08, r * 0.75, r * 0.22);
    g.fillStyle = aclarar(def.color, 40); g.fillRect(r * 1.0, -r * 0.27, r * 0.15, r * 0.16); g.fillRect(r * 1.0, r * 0.11, r * 0.15, r * 0.16);
  } else if (arma === 'escopeta') {
    g.fillStyle = oscuro; g.fillRect(r * 0.3, -r * 0.2, r * 1.3, r * 0.4);
    g.fillStyle = '#7a4a1e'; g.fillRect(r * 0.55, -r * 0.3, r * 0.45, r * 0.6);
    g.fillStyle = '#333'; g.beginPath(); g.arc(r * 1.6, 0, r * 0.2, 0, Math.PI * 2); g.fill();
  } else if (arma === 'rifle') {
    g.fillStyle = oscuro; g.fillRect(r * 0.3, -r * 0.13, r * 1.8, r * 0.26);
    g.fillStyle = aclarar(def.color, 40); g.fillRect(r * 0.8, -r * 0.4, r * 0.5, r * 0.22);
    g.fillStyle = '#333'; g.beginPath(); g.arc(r * 2.1, 0, r * 0.14, 0, Math.PI * 2); g.fill();
  } else if (arma === 'baston') {
    g.strokeStyle = '#6b3fa0'; g.lineWidth = r * 0.18; g.beginPath(); g.moveTo(r * 0.2, 0); g.lineTo(r * 1.4, 0); g.stroke();
    g.fillStyle = '#e9c6ff'; g.beginPath(); g.arc(r * 1.5, 0, r * 0.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(r * 1.42, -r * 0.1, r * 0.1, 0, Math.PI * 2); g.fill();
  } else if (arma === 'canon') {
    g.fillStyle = oscuro; g.fillRect(r * 0.3, -r * 0.3, r * 1.0, r * 0.6);
    g.fillStyle = '#4fa3ff'; g.beginPath(); g.arc(r * 1.35, 0, r * 0.32, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1b1f3a'; g.beginPath(); g.arc(r * 1.35, 0, r * 0.16, 0, Math.PI * 2); g.fill();
  } else if (arma === 'dagas') {
    g.fillStyle = '#e8e8f5';
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(r * 0.45, s * r * 0.22); g.lineTo(r * 1.35, s * r * 0.1); g.lineTo(r * 0.45, s * r * 0.4); g.closePath(); g.fill(); }
    g.fillStyle = oscuro; g.fillRect(r * 0.35, -r * 0.45, r * 0.15, r * 0.9);
  } else if (arma === 'bobina') {
    g.fillStyle = oscuro; g.fillRect(r * 0.3, -r * 0.2, r * 0.7, r * 0.4);
    g.strokeStyle = '#ffe14d'; g.lineWidth = r * 0.12;
    g.beginPath(); for (let i = 0; i <= 6; i++) g.lineTo(r * 1.0 + i * r * 0.1, (i % 2 ? -1 : 1) * r * 0.25); g.stroke();
    g.fillStyle = '#fff6b0'; g.beginPath(); g.arc(r * 1.7, 0, r * 0.18, 0, Math.PI * 2); g.fill();
  } else if (arma === 'mortero') {
    g.fillStyle = oscuro; g.fillRect(r * 0.2, -r * 0.4, r * 1.4, r * 0.8);
    g.fillStyle = '#2e3238'; g.beginPath(); g.arc(r * 1.6, 0, r * 0.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#9aa5b1'; g.fillRect(r * 0.5, -r * 0.5, r * 0.25, r * 1.0);
  }
  g.restore();
}

function dibujarAccesorio(g, l, x, hy, hr, izq) {
  const def = l.def, c = def.cabeza;
  g.save();
  if (c === 'antena') {
    g.strokeStyle = def.colorOscuro; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(x, hy - hr); g.lineTo(x + hr * 0.3, hy - hr * 1.5); g.stroke();
    g.fillStyle = '#ffd43b'; g.beginPath(); g.arc(x + hr * 0.3, hy - hr * 1.5, hr * 0.2, 0, Math.PI * 2); g.fill();
  } else if (c === 'casco') {
    g.fillStyle = def.colorOscuro;
    g.beginPath(); g.arc(x, hy - hr * 0.1, hr * 1.02, Math.PI, 0); g.fill();
    g.fillStyle = aclarar(def.colorOscuro, 50); g.fillRect(x - hr * 0.9, hy - hr * 0.25, hr * 1.8, hr * 0.14);
  } else if (c === 'visor') {
    g.fillStyle = 'rgba(80,220,255,0.85)';
    g.beginPath(); g.roundRect(x - hr * 0.95, hy - hr * 0.2, hr * 1.9, hr * 0.42, hr * 0.2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x - hr * 0.6, hy - hr * 0.1, hr * 0.5, hr * 0.08);
  } else if (c === 'sombrero') {
    g.fillStyle = '#4b1f7a';
    g.beginPath(); g.ellipse(x, hy - hr * 0.75, hr * 1.25, hr * 0.3, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(x - hr * 0.7, hy - hr * 0.75); g.lineTo(x + hr * 0.1, hy - hr * 2.0); g.lineTo(x + hr * 0.7, hy - hr * 0.75); g.closePath(); g.fill();
    g.fillStyle = '#ffd43b'; g.fillRect(x - hr * 0.62, hy - hr * 1.0, hr * 1.24, hr * 0.14);
  } else if (c === 'nube') {
    g.fillStyle = 'rgba(255,255,255,0.95)';
    for (const [ox, oy, rr] of [[-0.5, -1.35, 0.3], [0, -1.5, 0.38], [0.5, -1.35, 0.3]]) { g.beginPath(); g.arc(x + ox * hr, hy + oy * hr, rr * hr, 0, Math.PI * 2); g.fill(); }
  } else if (c === 'capucha') {
    g.fillStyle = def.acento || def.colorOscuro;
    g.beginPath(); g.arc(x, hy, hr * 1.08, Math.PI * 0.85, Math.PI * 2.15); g.lineTo(x + hr * 0.75, hy + hr * 0.75); g.lineTo(x - hr * 0.75, hy + hr * 0.75); g.closePath(); g.fill();
  } else if (c === 'gafas') {
    g.fillStyle = '#4d4d4d'; g.fillRect(x - hr * 0.95, hy - hr * 0.78, hr * 1.9, hr * 0.16);
    g.fillStyle = '#ffd43b'; g.strokeStyle = '#4d4d4d'; g.lineWidth = 2;
    for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * hr * 0.38, hy - hr * 0.7, hr * 0.26, 0, Math.PI * 2); g.fill(); g.stroke(); }
  } else if (c === 'yelmo') {
    g.fillStyle = def.colorOscuro;
    g.beginPath(); g.arc(x, hy - hr * 0.05, hr * 1.04, Math.PI, 0); g.fill();
    g.fillRect(x - hr * 1.04, hy - hr * 0.05, hr * 2.08, hr * 0.3);
    g.fillStyle = '#ff4d4d'; g.beginPath(); g.moveTo(x, hy - hr * 1.05); g.lineTo(x - hr * 0.1, hy - hr * 1.6); g.lineTo(x + hr * 0.1, hy - hr * 1.6); g.closePath(); g.fill();
  }
  g.restore();
}

/* ---------- Objetos ---------- */
function dibujarCristal(g, x, y, tam, fase) {
  const bob = Math.sin(fase) * 2;
  g.save();
  g.translate(x, y + bob);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath(); g.ellipse(0, tam + 4 - bob, tam * 0.9, tam * 0.35, 0, 0, Math.PI * 2); g.fill();
  const gr = g.createLinearGradient(-tam, -tam, tam, tam);
  gr.addColorStop(0, '#e9c6ff'); gr.addColorStop(0.5, '#b04dff'); gr.addColorStop(1, '#5a1a9c');
  g.fillStyle = gr;
  g.beginPath(); g.moveTo(0, -tam * 1.3); g.lineTo(tam, 0); g.lineTo(0, tam * 1.3); g.lineTo(-tam, 0); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.beginPath(); g.moveTo(-tam * 0.3, -tam * 0.6); g.lineTo(0, -tam * 1.0); g.lineTo(tam * 0.3, -tam * 0.4); g.closePath(); g.fill();
  g.restore();
}

function dibujarCubo(g, x, y, tam, fase) {
  const bob = Math.sin(fase) * 2;
  g.save();
  g.translate(x, y + bob);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.beginPath(); g.ellipse(0, tam + 4 - bob, tam, tam * 0.4, 0, 0, Math.PI * 2); g.fill();
  g.rotate(fase * 0.3);
  const gr = g.createLinearGradient(-tam, -tam, tam, tam);
  gr.addColorStop(0, '#c8ffb0'); gr.addColorStop(0.5, '#6fd84a'); gr.addColorStop(1, '#2f7d2d');
  g.fillStyle = gr;
  g.beginPath(); g.roundRect(-tam, -tam, tam * 2, tam * 2, 3); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.5; g.stroke();
  g.restore();
}

function dibujarBalon(g, b) {
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(b.x, b.y + b.r * 0.6, b.r, b.r * 0.4, 0, 0, Math.PI * 2); g.fill();
  g.translate(b.x, b.y - 4); g.rotate(b.giro);
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, b.r, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1b1f3a';
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.beginPath(); g.arc(Math.cos(a) * b.r * 0.55, Math.sin(a) * b.r * 0.55, b.r * 0.22, 0, Math.PI * 2); g.fill(); }
  g.beginPath(); g.arc(0, 0, b.r * 0.2, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#1b1f3a'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, b.r, 0, Math.PI * 2); g.stroke();
  g.restore();
}

function dibujarCajaFuerte(g, cf) {
  const x = cf.x, y = cf.y, r = cf.r;
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x, y + r * 0.8, r * 1.1, r * 0.45, 0, 0, Math.PI * 2); g.fill();
  const destruida = cf.vida <= 0;
  const color = cf.equipo === 0 ? '#4fa3ff' : '#ff4d4d';
  g.fillStyle = destruida ? '#4a4a4a' : '#6a7380';
  g.beginPath(); g.roundRect(x - r, y - r * 0.6, r * 2, r * 1.5, 8); g.fill();
  g.fillStyle = destruida ? '#666' : '#8c97a6';
  g.beginPath(); g.roundRect(x - r, y - r * 1.1, r * 2, r * 0.9, 8); g.fill();
  g.strokeStyle = '#2e333a'; g.lineWidth = 3; g.beginPath(); g.roundRect(x - r, y - r * 1.1, r * 2, r * 2, 8); g.stroke();
  // Puerta con rueda
  g.fillStyle = color; g.beginPath(); g.roundRect(x - r * 0.7, y - r * 0.8, r * 1.4, r * 1.4, 6); g.fill();
  g.strokeStyle = '#ffd43b'; g.lineWidth = 4; g.beginPath(); g.arc(x, y - r * 0.1, r * 0.4, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + (partida ? partida.tiempo * 0.5 : 0); g.beginPath(); g.moveTo(x, y - r * 0.1); g.lineTo(x + Math.cos(a) * r * 0.4, y - r * 0.1 + Math.sin(a) * r * 0.4); g.stroke(); }
  if (cf.ultimoDano > (partida ? partida.tiempo : 0) - 0.1) { g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.roundRect(x - r, y - r * 1.1, r * 2, r * 2, 8); g.fill(); }
  // Barra de vida
  const ancho = 90, alto = 10, bx = x - ancho / 2, by = y - r * 1.5 - 14;
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.roundRect(bx - 2, by - 2, ancho + 4, alto + 4, 5); g.fill();
  g.fillStyle = color; g.fillRect(bx, by, ancho * limitar(cf.vida / cf.vidaMax, 0, 1), alto);
  g.font = 'bold 12px ' + FUENTE; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 3;
  const t = (cf.equipo === jugador().equipo ? 'Vuestra caja' : 'Caja rival') + ' · ' + Math.round(cf.vida);
  g.strokeText(t, x, by - 3); g.fillText(t, x, by - 3);
  g.restore();
}

/* ---------- Mapa ---------- */
function dibujarSuelo(g, mapa, c0, c1, f0, f1) {
  const tema = mapa.tema;
  for (let f = f0; f <= f1; f++) {
    for (let c = c0; c <= c1; c++) {
      const x = c * TILE, y = f * TILE;
      const ch = mapa.casillas[f][c];
      const ladoA = f < mapa.filas / 2;
      const paleta = ladoA ? tema.suelo : tema.sueloB;
      g.fillStyle = paleta[(c + f) % 2];
      g.fillRect(x, y, TILE, TILE);
      // Detalles deterministas: piedrecitas y hierba
      const n = ruido(c, f);
      if (ch === '.' && n > 0.72) {
        g.fillStyle = 'rgba(0,0,0,0.08)';
        g.beginPath(); g.ellipse(x + 10 + n * 28, y + 12 + ruido(f, c) * 24, 4, 2.5, 0, 0, Math.PI * 2); g.fill();
      } else if (ch === '.' && n < 0.12) {
        g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1.5;
        const gx = x + 8 + n * 200, gy = y + 30 + ruido(f, c) * 10;
        g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx - 3, gy - 7); g.moveTo(gx, gy); g.lineTo(gx + 3, gy - 8); g.stroke();
      }
      if (ch === 'w') dibujarAgua(g, mapa, c, f);
      if (ch === 'G') {
        const porteria = mapa.porterias.find(p => p.f === f && p.c === c);
        g.fillStyle = porteria && porteria.equipo === 0 ? 'rgba(79,163,255,0.35)' : 'rgba(255,77,77,0.35)';
        g.fillRect(x, y, TILE, TILE);
        g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5;
        for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(x + i * 12, y); g.lineTo(x + i * 12, y + TILE); g.moveTo(x, y + i * 12); g.lineTo(x + TILE, y + i * 12); g.stroke(); }
      }
    }
  }
}

function dibujarAgua(g, mapa, c, f) {
  const x = c * TILE, y = f * TILE, t = partida ? partida.tiempo : 0;
  g.fillStyle = mapa.tema.agua;
  g.fillRect(x, y, TILE, TILE);
  g.fillStyle = 'rgba(255,255,255,0.22)';
  for (let i = 0; i < 2; i++) {
    const oy = ((t * 12 + i * 20 + c * 7) % TILE);
    g.beginPath(); g.ellipse(x + TILE / 2 + Math.sin(t + f + i) * 8, y + oy, 12, 3, 0, 0, Math.PI * 2); g.fill();
  }
  // Orilla
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
  const vecino = (dc, df) => casillaEn(mapa, (c + dc) * TILE + TILE / 2, (f + df) * TILE + TILE / 2) !== 'w';
  g.beginPath();
  if (vecino(0, -1)) { g.moveTo(x, y + 1); g.lineTo(x + TILE, y + 1); }
  if (vecino(0, 1)) { g.moveTo(x, y + TILE - 1); g.lineTo(x + TILE, y + TILE - 1); }
  if (vecino(-1, 0)) { g.moveTo(x + 1, y); g.lineTo(x + 1, y + TILE); }
  if (vecino(1, 0)) { g.moveTo(x + TILE - 1, y); g.lineTo(x + TILE - 1, y + TILE); }
  g.stroke();
}

function dibujarMuro(g, mapa, c, f, temporal) {
  const x = c * TILE, y = f * TILE, h = ALTO_MURO, tema = mapa.tema;
  const top = temporal ? '#b9d7e8' : tema.muroTop, frente = temporal ? '#6f94ad' : tema.muroFrente;
  g.fillStyle = frente; g.fillRect(x, y + TILE - h, TILE, h);
  g.fillStyle = top; g.fillRect(x, y - h, TILE, TILE);
  g.strokeStyle = tema.muroLinea; g.lineWidth = 1;
  g.strokeRect(x + 0.5, y - h + 0.5, TILE - 1, TILE - 1);
  // Grietas / ladrillos en la cara frontal
  g.fillStyle = 'rgba(0,0,0,0.15)';
  g.fillRect(x + 6, y + TILE - h + 6, 14, 3); g.fillRect(x + 26, y + TILE - h + 10, 16, 3);
  if (temporal) { g.strokeStyle = 'rgba(255,255,255,0.6)'; g.setLineDash([4, 4]); g.strokeRect(x + 3, y - h + 3, TILE - 6, TILE - 6); g.setLineDash([]); }
}

function dibujarCaja(g, mapa, c, f) {
  const x = c * TILE, y = f * TILE;
  const vida = (mapa.cajas[f + ',' + c] || 0) / VIDA_CAJA;
  g.fillStyle = '#8a5a2b'; g.fillRect(x + 4, y + 8, TILE - 8, TILE - 10);
  g.fillStyle = '#c9a24a'; g.fillRect(x + 4, y - 4, TILE - 8, TILE - 10);
  g.strokeStyle = '#6b4320'; g.lineWidth = 2;
  g.strokeRect(x + 5, y - 3, TILE - 10, TILE - 12);
  g.beginPath(); g.moveTo(x + 5, y - 3); g.lineTo(x + TILE - 5, y + TILE - 15); g.moveTo(x + TILE - 5, y - 3); g.lineTo(x + 5, y + TILE - 15); g.stroke();
  if (vida < 1) {
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + 6, y + TILE - 6, TILE - 12, 4);
    g.fillStyle = '#ff9f1c'; g.fillRect(x + 6, y + TILE - 6, (TILE - 12) * vida, 4);
  }
}

function dibujarValla(g, c, f) {
  const x = c * TILE, y = f * TILE;
  g.fillStyle = '#7a4a1e';
  g.fillRect(x + 6, y + 10, 6, 32); g.fillRect(x + TILE - 12, y + 10, 6, 32);
  g.fillRect(x, y + 16, TILE, 5); g.fillRect(x, y + 30, TILE, 5);
  g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x, y + 40, TILE, 4);
}

function dibujarArbusto(g, c, f, alfa) {
  const x = c * TILE + TILE / 2, y = f * TILE + TILE / 2;
  const t = partida ? partida.tiempo : 0;
  const mece = Math.sin(t * 1.5 + c * 1.7 + f * 0.9) * 1.5;
  g.save();
  g.globalAlpha = alfa;
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(x, y + 14, 22, 9, 0, 0, Math.PI * 2); g.fill();
  const blobs = [[-12, 4, 15, '#2f7d2d'], [12, 4, 15, '#2f7d2d'], [-9, -8, 14, '#3f9c3a'], [9, -8, 14, '#3f9c3a'], [0, -2, 16, '#4fb84a'], [0, -14, 11, '#63c95c']];
  for (const [ox, oy, rr, col] of blobs) { g.fillStyle = col; g.beginPath(); g.arc(x + ox + mece, y + oy - 6, rr, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.15)'; g.beginPath(); g.arc(x - 4 + mece, y - 18, 6, 0, Math.PI * 2); g.fill();
  g.restore();
}

function dibujarHumo(g, h) {
  const alfa = Math.min(1, h.restante / 1.2) * 0.85;
  g.save(); g.globalAlpha = alfa;
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + (partida ? partida.tiempo : 0) * 0.4;
    g.fillStyle = i % 2 ? '#a9a2c9' : '#8f88b3';
    g.beginPath(); g.arc(h.x + Math.cos(a) * h.r * 0.5, h.y + Math.sin(a) * h.r * 0.5, h.r * 0.55, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

function dibujarMina(g, mapa) {
  g.save();
  g.translate(mapa.mina.x, mapa.mina.y);
  g.fillStyle = '#6b5a4a'; g.beginPath(); g.ellipse(0, 0, TILE * 1.1, TILE * 0.8, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3d3128'; g.beginPath(); g.ellipse(0, 0, TILE * 0.8, TILE * 0.55, 0, 0, Math.PI * 2); g.fill();
  const pulso = 0.5 + 0.5 * Math.sin(partida.tiempo * 3);
  g.fillStyle = 'rgba(199,125,255,' + (0.25 + pulso * 0.35) + ')';
  g.beginPath(); g.ellipse(0, 0, TILE * 0.5, TILE * 0.33, 0, 0, Math.PI * 2); g.fill();
  g.restore();
}

/* ---------- Mundo con orden de profundidad ---------- */
function dibujarMundo(g) {
  const p = partida, mapa = p.mapa, cam = p.camara;
  const c0 = Math.max(0, Math.floor(cam.x / TILE)), c1 = Math.min(mapa.columnas - 1, Math.ceil((cam.x + W) / TILE));
  const f0 = Math.max(0, Math.floor(cam.y / TILE) - 1), f1 = Math.min(mapa.filas - 1, Math.ceil((cam.y + H) / TILE) + 1);
  const j = jugador();

  dibujarSuelo(g, mapa, c0, c1, f0, f1);

  if (p.modo === 'cristales') {
    for (let eq = 0; eq < 2; eq++) {
      g.fillStyle = eq === 0 ? 'rgba(79,163,255,0.22)' : 'rgba(255,77,77,0.22)';
      for (const a of mapa.apariciones[eq]) { g.beginPath(); g.ellipse(a.x, a.y + 10, TILE * 0.5, TILE * 0.28, 0, 0, Math.PI * 2); g.fill(); }
    }
    dibujarMina(g, mapa);
  }
  if (p.modo === 'supervivencia') dibujarGas(g);

  // Lista de cosas que se dibujan ordenadas por su base (profundidad)
  const lista = [];
  for (let f = f0; f <= f1; f++) {
    for (let c = c0; c <= c1; c++) {
      const ch = mapa.casillas[f][c];
      const base = (f + 1) * TILE;
      if (ch === '#') lista.push({ y: base, dibujar: () => dibujarMuro(g, mapa, c, f, false) });
      else if (ch === 'T') lista.push({ y: base, dibujar: () => dibujarMuro(g, mapa, c, f, true) });
      else if (ch === 'C') lista.push({ y: base, dibujar: () => dibujarCaja(g, mapa, c, f) });
      else if (ch === 'f') lista.push({ y: base, dibujar: () => dibujarValla(g, c, f) });
      else if (ch === 'b') {
        const jugadorDentro = !j.muerto && Math.floor(j.x / TILE) === c && Math.floor(j.y / TILE) === f;
        lista.push({ y: base, dibujar: () => dibujarArbusto(g, c, f, jugadorDentro ? 0.55 : 1) });
      }
    }
  }
  for (const c of p.cristales) lista.push({ y: c.y + 8, dibujar: () => dibujarCristal(g, c.x, c.y, 9 * limitar(1 - c.aparicion / 0.5, 0.05, 1), c.fase) });
  for (const c of p.cubos) lista.push({ y: c.y + 8, dibujar: () => dibujarCubo(g, c.x, c.y, 8 * limitar(1 - c.aparicion / 0.5, 0.05, 1), c.fase) });
  for (const cf of mapa.cajasFuertes) lista.push({ y: cf.y + cf.r * 0.9, dibujar: () => dibujarCajaFuerte(g, cf) });
  if (p.balon) lista.push({ y: p.balon.y + 8, dibujar: () => dibujarBalon(g, p.balon) });
  const miEquipo = j.equipo;
  for (const l of p.luchadores) {
    if (l.muerto) continue;
    if (l.equipo !== miEquipo && !enemigoVisibleParaJugador(l)) continue;
    lista.push({ y: l.y + l.r * 0.85, dibujar: () => dibujarLuchadorEnJuego(g, l) });
  }
  lista.sort((a, b) => a.y - b.y);
  for (const item of lista) item.dibujar();

  for (const h of mapa.humos) dibujarHumo(g, h);
  for (const b of p.balas) dibujarBala(g, b);
  for (const r of p.rayos) dibujarRayo(g, r);
  dibujarParticulas(g);
  dibujarTextos(g);
}

function enemigoVisibleParaJugador(e) {
  const j = jugador();
  if (!estaOculto(partida.mapa, e.x, e.y)) return true;
  if (distancia(j.x, j.y, e.x, e.y) < 2.5 * TILE) return true;
  if (partida.tiempo - e.ultimoDisparo < 1) return true;
  if (partida.tiempo - e.ultimoDano < 0.6) return true;
  return false;
}

function dibujarLuchadorEnJuego(g, l) {
  const esAliado = esAliadoDelJugador(l);
  const parpadeo = l.invulnerable > 0 && Math.floor(partida.tiempo * 12) % 2 === 0;
  const oculto = estaOculto(partida.mapa, l.x, l.y);
  let alfa = 1;
  if (parpadeo) alfa = 0.55;
  if (oculto && esAliado) alfa *= 0.7;
  dibujarPersonaje(g, l, { alfa, anillo: l.esJugador ? '#ffd43b' : esAliado ? '#4fa3ff' : '#ff4d4d' });

  // Nombre y barra de vida
  const ancho = 56, alto = 8, bx = l.x - ancho / 2, by = l.y - l.r * 2.1 - 22;
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.beginPath(); g.roundRect(bx - 2, by - 2, ancho + 4, alto + 4, 4); g.fill();
  g.fillStyle = esAliado ? (l.esJugador ? '#8ef05a' : '#4fa3ff') : '#ff4d4d';
  g.fillRect(bx, by, ancho * limitar(l.vida / l.vidaMax, 0, 1), alto);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  for (let v = 1000; v < l.vidaMax; v += 1000) g.fillRect(bx + ancho * v / l.vidaMax - 0.5, by, 1, alto);
  g.font = 'bold 12px ' + FUENTE; g.textAlign = 'center'; g.textBaseline = 'bottom';
  g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.7)'; g.fillStyle = l.esJugador ? '#ffd43b' : '#ffffff';
  g.strokeText(l.nombre, l.x, by - 3); g.fillText(l.nombre, l.x, by - 3);
  // Nivel de poder
  g.font = 'bold 10px ' + FUENTE; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillStyle = '#c77dff'; g.strokeText('⚡' + l.nivel, bx - 18, by + alto / 2); g.fillText('⚡' + l.nivel, bx - 18, by + alto / 2);
  if (l.cristales > 0 || l.cubos > 0) {
    const gx = l.x + ancho / 2 + 10, gy = by + alto / 2;
    if (l.cristales > 0) dibujarCristal(g, gx, gy, 7, 0); else dibujarCubo(g, gx, gy, 6, 0);
    g.font = 'bold 11px ' + FUENTE; g.textAlign = 'left'; g.fillStyle = '#ffffff';
    const n = String(l.cristales || l.cubos);
    g.strokeText(n, gx + 9, gy); g.fillText(n, gx + 9, gy);
  }
  if (l.cargaSuper >= 100 && !l.esJugador) {
    g.fillStyle = '#ffd43b'; g.font = 'bold 12px ' + FUENTE; g.textAlign = 'center';
    g.fillText('★', l.x - ancho / 2 - 26, by + alto / 2);
  }
  if (l.lento > 0) { g.font = 'bold 14px ' + FUENTE; g.textAlign = 'center'; g.fillStyle = '#ffe14d'; g.fillText('⚡', l.x, by - 16); }
}

function dibujarBala(g, b) {
  if (b.lanzamiento) {
    const t = limitar(b.recorrido / b.alcance, 0, 1);
    const altura = Math.sin(t * Math.PI) * 70;
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.beginPath(); g.ellipse(b.x, b.y, b.r, b.r * 0.6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = b.color;
    g.beginPath(); g.arc(b.x, b.y - altura, b.r * (1 + 0.4 * Math.sin(t * Math.PI)), 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 2; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(b.x - 2, b.y - altura - 3, b.r * 0.35, 0, Math.PI * 2); g.fill();
    return;
  }
  g.save();
  // Estela
  g.strokeStyle = b.esSuper ? 'rgba(255,230,128,0.5)' : b.color; g.globalAlpha = 0.45; g.lineWidth = b.r * 1.4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(b.px, b.py); g.lineTo(b.x, b.y); g.stroke();
  g.globalAlpha = 1;
  if (b.esSuper || b.cadena) { g.shadowColor = b.esSuper ? '#ffd43b' : b.color; g.shadowBlur = 14; }
  g.fillStyle = b.esSuper ? '#ffe680' : b.color;
  g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.5; g.stroke();
  g.restore();
}

function dibujarRayo(g, r) {
  const [[ax, ay], [bx, by]] = r.puntos;
  g.save();
  g.globalAlpha = limitar(r.vida / 0.2, 0, 1);
  g.strokeStyle = r.color || '#ffe14d'; g.lineWidth = 3; g.shadowColor = r.color || '#ffe14d'; g.shadowBlur = 10;
  g.beginPath(); g.moveTo(ax, ay);
  for (let i = 1; i < 5; i++) { const t = i / 5; g.lineTo(ax + (bx - ax) * t + azar(-8, 8), ay + (by - ay) * t + azar(-8, 8)); }
  g.lineTo(bx, by); g.stroke();
  g.restore();
}

function dibujarParticulas(g) {
  for (const q of partida.particulas) {
    if (q.destello) {
      g.globalAlpha = Math.min(1, q.vida / 0.07);
      g.fillStyle = q.color; g.beginPath();
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, rr = i % 2 ? q.r : q.r * 0.4; g.lineTo(q.x + Math.cos(a) * rr, q.y + Math.sin(a) * rr); }
      g.closePath(); g.fill();
      continue;
    }
    g.globalAlpha = limitar(q.vida / 0.4, 0, 1);
    if (q.anillo) {
      const t = 1 - q.vida / (q.vidaTotal || 0.35);
      g.strokeStyle = q.color; g.lineWidth = 5 * (1 - t) + 1;
      g.beginPath(); g.arc(q.x, q.y, q.r * (0.3 + 0.9 * t), 0, Math.PI * 2); g.stroke();
    } else {
      g.fillStyle = q.color;
      g.beginPath(); g.arc(q.x, q.y, q.r, 0, Math.PI * 2); g.fill();
    }
  }
  g.globalAlpha = 1;
}

function dibujarTextos(g) {
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const t of partida.textos) {
    const pop = t.vida > 0.75 ? 1 + (t.vida - 0.75) * 4 : 1;
    g.font = 'bold ' + Math.round((t.grande ? 22 : 15) * pop) + 'px ' + FUENTE;
    g.globalAlpha = limitar(t.vida / 0.3, 0, 1);
    g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.fillStyle = t.color;
    g.strokeText(t.texto, t.x, t.y); g.fillText(t.texto, t.x, t.y);
  }
  g.globalAlpha = 1;
}

function dibujarGas(g) {
  const p = partida;
  if (p.gas.anillo <= 0) return;
  const m = p.mapa, a = p.gas.anillo * TILE;
  g.fillStyle = 'rgba(120,220,80,0.45)';
  g.fillRect(0, 0, m.ancho, a);
  g.fillRect(0, m.alto - a, m.ancho, a);
  g.fillRect(0, a, a, m.alto - 2 * a);
  g.fillRect(m.ancho - a, a, a, m.alto - 2 * a);
  g.strokeStyle = 'rgba(142,240,90,0.9)'; g.lineWidth = 3; g.setLineDash([10, 6]);
  g.strokeRect(a, a, m.ancho - 2 * a, m.alto - 2 * a);
  g.setLineDash([]);
}

/* ---------- HUD ---------- */
function dibujarHUD(g) {
  const p = partida, j = jugador();
  const cx = W / 2;
  const marcador = marcadorModo(p);
  const arriba = 8 + (entrada.margenSuperior || 0);

  // Marcador superior
  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.beginPath(); g.roundRect(cx - 130, arriba, 260, 54, 14); g.fill();
  g.textBaseline = 'middle';
  if (marcador.tipo === 'equipos') {
    g.font = 'bold 30px ' + FUENTE;
    g.textAlign = 'right'; g.fillStyle = '#4fa3ff'; g.fillText(String(marcador.a), cx - 26, arriba + 27);
    g.textAlign = 'left'; g.fillStyle = '#ff4d4d'; g.fillText(String(marcador.b), cx + 26, arriba + 27);
    if (marcador.icono === 'cristal') dibujarCristal(g, cx, arriba + 27, 10, p.tiempo * 3);
    else dibujarBalon(g, { x: cx, y: arriba + 30, r: 11, giro: p.tiempo });
  } else if (marcador.tipo === 'barras') {
    g.font = 'bold 13px ' + FUENTE; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText('CAJAS FUERTES', cx, arriba + 12);
    for (const [i, frac, color, texto] of [[0, marcador.a, '#4fa3ff', marcador.textoA], [1, marcador.b, '#ff4d4d', marcador.textoB]]) {
      const bx = i === 0 ? cx - 120 : cx + 8, by = arriba + 26;
      g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(bx, by, 112, 14);
      g.fillStyle = color; g.fillRect(bx, by, 112 * limitar(frac, 0, 1), 14);
      g.font = 'bold 11px ' + FUENTE; g.fillStyle = '#fff'; g.fillText(texto, bx + 56, by + 7);
    }
  } else {
    g.font = 'bold 22px ' + FUENTE; g.textAlign = 'center'; g.fillStyle = '#fff';
    g.fillText('☠ ' + marcador.vivos + ' en pie', cx, arriba + 20);
    g.font = 'bold 13px ' + FUENTE; g.fillStyle = marcador.gasEn < 5 ? '#8ef05a' : 'rgba(255,255,255,0.8)';
    g.fillText('Gas en ' + Math.ceil(marcador.gasEn) + ' s', cx, arriba + 42);
  }
  g.textAlign = 'center';
  if (p.modo === 'cristales' && p.cuentaAtras.equipo !== -1 && p.fase === 'jugando') {
    const s = Math.max(0, Math.ceil(p.cuentaAtras.restante));
    g.font = 'bold 46px ' + FUENTE;
    g.fillStyle = p.cuentaAtras.equipo === 0 ? '#8ef05a' : '#ff6b6b';
    g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 5;
    g.strokeText(String(s), cx, arriba + 92); g.fillText(String(s), cx, arriba + 92);
  } else if (p.modoDef.duracion) {
    g.font = 'bold 14px ' + FUENTE; g.fillStyle = 'rgba(255,255,255,0.85)';
    g.fillText(formatearTiempo(Math.max(0, p.modoDef.duracion - p.tiempo)), cx, arriba + 68);
  }

  // Avisos
  let ay = H * 0.28;
  for (const a of p.avisos) {
    g.globalAlpha = Math.min(1, a.restante / 0.4);
    g.font = 'bold ' + Math.round(limitar(W / 24, 14, 22)) + 'px ' + FUENTE; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.strokeStyle = 'rgba(0,0,0,0.8)'; g.lineWidth = 5; g.fillStyle = a.color;
    g.strokeText(a.texto, W / 2, ay, W - 24); g.fillText(a.texto, W / 2, ay, W - 24);
    g.globalAlpha = 1;
    ay += 30;
  }
  if (p.modo === 'supervivencia' && !j.muerto && enGas(j.x, j.y) && Math.floor(p.tiempo * 3) % 2 === 0) {
    g.font = 'bold 22px ' + FUENTE; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.strokeStyle = 'rgba(0,0,0,0.8)'; g.lineWidth = 5; g.fillStyle = '#8ef05a';
    g.strokeText('¡ESTÁS EN EL GAS!', W / 2, H * 0.2); g.fillText('¡ESTÁS EN EL GAS!', W / 2, H * 0.2);
  }

  // Panel del jugador
  const abajo = H - 74 - (entrada.margenInferior || 0);
  const px = 12, py = abajo;
  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.beginPath(); g.roundRect(px, py, 190, 60, 12); g.fill();
  g.font = 'bold 13px ' + FUENTE; g.textAlign = 'left'; g.textBaseline = 'top';
  g.fillStyle = '#ffd43b'; g.fillText(j.def.nombre + ' ⚡' + j.nivel + (j.cubos ? ' · ' + j.cubos + ' cubos' : ''), px + 10, py + 6);
  g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(px + 10, py + 26, 170, 10);
  g.fillStyle = '#8ef05a'; g.fillRect(px + 10, py + 26, 170 * limitar(j.vida / j.vidaMax, 0, 1), 10);
  g.font = 'bold 10px ' + FUENTE; g.fillStyle = '#ffffff'; g.textAlign = 'center';
  g.fillText(Math.max(0, Math.round(j.vida)) + ' / ' + j.vidaMax, px + 95, py + 25);
  for (let i = 0; i < 3; i++) {
    const lleno = i < j.municion;
    const parcial = i === j.municion ? j.recargando / j.def.recarga : 0;
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(px + 10 + i * 58, py + 42, 54, 9);
    g.fillStyle = '#ff9f1c'; g.fillRect(px + 10 + i * 58, py + 42, 54 * (lleno ? 1 : parcial), 9);
  }

  // Botones de súper y gadget
  const bs = botonSuper(), bg = botonGadget();
  dibujarBotonHabilidad(g, bs, j.cargaSuper / 100, '★', '#ffd43b', j.cargaSuper >= 100, entrada.esTactil ? '' : 'E');
  const gadgetListo = j.gadgets > 0 && j.enfriamientoGadget <= 0;
  dibujarBotonHabilidad(g, bg, j.gadgets > 0 ? 1 - j.enfriamientoGadget / ENFRIAMIENTO_GADGET : 0, String(j.gadgets), '#8ef05a', gadgetListo, entrada.esTactil ? '' : 'Q');

  // Joysticks táctiles
  for (const clave of ['mover', 'apuntar']) {
    const t = entrada.toques[clave];
    if (!t) continue;
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3;
    g.beginPath(); g.arc(t.ox, t.oy, RADIO_JOYSTICK, 0, Math.PI * 2); g.stroke();
    const dx = t.x - t.ox, dy = t.y - t.oy, d = Math.hypot(dx, dy);
    const f = Math.min(1, d / RADIO_JOYSTICK);
    const kx = t.ox + (d ? dx / d : 0) * f * RADIO_JOYSTICK, ky = t.oy + (d ? dy / d : 0) * f * RADIO_JOYSTICK;
    g.fillStyle = clave === 'mover' ? 'rgba(255,255,255,0.6)' : 'rgba(255,100,100,0.7)';
    g.beginPath(); g.arc(kx, ky, 24, 0, Math.PI * 2); g.fill();
  }
  const ta = entrada.toques.apuntar || entrada.toques.super || entrada.toques.gadget;
  if (ta && Math.hypot(ta.x - ta.ox, ta.y - ta.oy) > 16 && !j.muerto) {
    const sx = j.x - p.camara.x, sy = j.y - p.camara.y;
    const d = Math.hypot(ta.x - ta.ox, ta.y - ta.oy);
    const alcance = Math.min(1, d / (RADIO_JOYSTICK * 1.6)) * j.def.alcance;
    g.save();
    g.strokeStyle = entrada.toques.super ? 'rgba(255,212,59,0.8)' : entrada.toques.gadget ? 'rgba(142,240,90,0.8)' : 'rgba(255,255,255,0.6)'; g.lineWidth = 3; g.setLineDash([8, 8]);
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(j.angulo) * alcance, sy + Math.sin(j.angulo) * alcance); g.stroke();
    g.restore();
  }

  if (j.muerto && p.modo !== 'supervivencia' && p.fase === 'jugando') {
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 0, W, H);
    g.font = 'bold 30px ' + FUENTE; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff';
    g.fillText('Reapareces en ' + Math.ceil(j.reaparicion) + '…', W / 2, H / 2);
  }

  if (p.fase === 'intro') dibujarIntro(g);
  if (p.fase === 'fin') {
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, H / 2 - 56, W, 112);
    g.font = 'bold 52px ' + FUENTE; g.textAlign = 'center'; g.textBaseline = 'middle';
    let texto, color;
    if (p.modo === 'supervivencia') { texto = p.puestoJugador === 1 ? '¡VICTORIA!' : 'PUESTO ' + p.puestoJugador + '.º'; color = p.puestoJugador <= 3 ? '#ffd43b' : '#ff6b6b'; }
    else { texto = p.ganador === 0 ? '¡VICTORIA!' : p.ganador === 1 ? 'DERROTA' : 'EMPATE'; color = p.ganador === 0 ? '#ffd43b' : p.ganador === 1 ? '#ff6b6b' : '#ffffff'; }
    g.strokeStyle = 'rgba(0,0,0,0.8)'; g.lineWidth = 6; g.strokeText(texto, W / 2, H / 2); g.fillStyle = color; g.fillText(texto, W / 2, H / 2);
  }
}

function dibujarBotonHabilidad(g, b, frac, simbolo, color, listo, tecla) {
  g.save();
  g.fillStyle = listo ? color : 'rgba(0,0,0,0.55)';
  g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = color; g.lineWidth = 4;
  g.beginPath(); g.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * limitar(frac, 0, 1)); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1; g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.stroke();
  g.font = 'bold ' + Math.round(b.r * 0.65) + 'px ' + FUENTE; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = listo ? '#1b1f3a' : color; g.fillText(simbolo, b.x, b.y + 1);
  if (listo && Math.floor(partida.tiempo * 4) % 2 === 0) { g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3; g.beginPath(); g.arc(b.x, b.y, b.r + 7, 0, Math.PI * 2); g.stroke(); }
  if (tecla) { g.font = 'bold 11px ' + FUENTE; g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillText(tecla, b.x, b.y + b.r + 12); }
  g.restore();
}

function dibujarIntro(g) {
  const p = partida, t = p.introRestante;
  g.fillStyle = 'rgba(0,0,0,' + limitar(t / 3.6, 0, 0.55) + ')'; g.fillRect(0, 0, W, H);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 20px ' + FUENTE; g.fillStyle = '#cfd3ff';
  g.fillText(p.modoDef.icono + ' ' + p.modoDef.nombre + ' · ' + p.mapa.nombre, W / 2, H / 2 - 90);
  const n = Math.ceil(t);
  const texto = n > 3 ? '¡PREPARADOS!' : n > 0 ? String(n) : '¡A LUCHAR!';
  const frac = t - Math.floor(t);
  const escala = n > 3 ? 1 : 1 + frac * 0.5;
  g.font = 'bold ' + Math.round(80 * escala) + 'px ' + FUENTE;
  g.strokeStyle = 'rgba(0,0,0,0.8)'; g.lineWidth = 8; g.strokeText(texto, W / 2, H / 2);
  g.fillStyle = n > 0 && n <= 3 ? '#ffd43b' : '#ffffff'; g.fillText(texto, W / 2, H / 2);
  g.font = 'bold 15px ' + FUENTE; g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillText(p.modoDef.descripcion, W / 2, H / 2 + 70, W - 40);
}

/* ---------- Fotograma completo ---------- */
function dibujar(g) {
  const p = partida;
  g.fillStyle = p ? p.mapa.tema.fondo : '#1b1f3a';
  g.fillRect(0, 0, W, H);
  if (!p) return;
  g.save();
  const tx = p.temblor ? azar(-p.temblor, p.temblor) : 0, ty = p.temblor ? azar(-p.temblor, p.temblor) : 0;
  g.translate(-Math.round(p.camara.x + tx), -Math.round(p.camara.y + ty));
  dibujarMundo(g);
  g.restore();
  // Viñeta
  const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  dibujarHUD(g);
}

// Retrato para el lobby: dibuja un luchador grande en un lienzo propio
function dibujarRetrato(g, tipo, tam, angulo = -0.45, anim = 0) {
  const def = LUCHADORES[tipo];
  const falso = { x: tam / 2, y: tam * 0.6, r: tam * 0.22, angulo, def, animacion: anim, moviendose: false, golpeado: 0, escudo: 0, rapido: 0, lento: 0 };
  dibujarPersonaje(g, falso, {});
}
