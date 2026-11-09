'use strict';
/* =========================================================
   ENTRADA: teclado, ratón y táctil
   ========================================================= */
const entrada = {
  teclas: new Set(),
  movX: 0, movY: 0,
  ratonX: 0, ratonY: 0, hayRaton: false,
  apuntando: false,
  toques: { mover: null, apuntar: null, super: null, gadget: null },
  esTactil: false,
  margenSuperior: 0, margenInferior: 0,
};
const RADIO_JOYSTICK = 56;

let canvas, ctx, W = 0, H = 0, DPR = 1;

function iniciarLienzo() {
  canvas = document.getElementById('juego');
  ctx = canvas.getContext('2d');
  redimensionar();
  window.addEventListener('resize', redimensionar);
  const estilo = getComputedStyle(document.documentElement);
  entrada.margenSuperior = parseInt(estilo.getPropertyValue('--sat')) || 0;
  entrada.margenInferior = parseInt(estilo.getPropertyValue('--sab')) || 0;
  registrarEventos();
}

function redimensionar() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

const enJuego = () => partida && partida.fase === 'jugando' && app.pantalla === 'juego';
function posicionMundo(px, py) { return { x: px + partida.camara.x, y: py + partida.camara.y }; }
function botonSuper() { return { x: W - 70, y: H - 150 - (entrada.margenInferior || 0), r: 38 }; }
function botonGadget() { return { x: W - 150, y: H - 92 - (entrada.margenInferior || 0), r: 28 }; }

// Enemigo visible más cercano dentro del alcance (para el disparo automático)
function objetivoAutomatico(l, factorAlcance = 1) {
  let mejor = null, dm = Infinity;
  for (const e of enemigosDe(l)) {
    const d = distancia(l.x, l.y, e.x, e.y);
    if (d > l.def.alcance * factorAlcance) continue;
    if (!enemigoVisibleParaJugador(e)) continue;
    if (l.def.ataque.tipo !== 'lanzamiento' && !hayVision(partida.mapa, l.x, l.y, e.x, e.y)) continue;
    if (d < dm) { dm = d; mejor = e; }
  }
  return mejor;
}

function objetivoSecundario(l) {
  // Cajas, cajas fuertes rivales o balón
  let mejor = null, dm = Infinity;
  for (const clave of Object.keys(partida.mapa.cajas)) {
    const [f, c] = clave.split(',').map(Number);
    const bx = c * TILE + TILE / 2, by = f * TILE + TILE / 2;
    const d = distancia(l.x, l.y, bx, by);
    if (d < l.def.alcance * 0.9 && d < dm) { dm = d; mejor = { x: bx, y: by }; }
  }
  for (const cf of partida.mapa.cajasFuertes) {
    if (cf.equipo === l.equipo || cf.vida <= 0) continue;
    const d = distancia(l.x, l.y, cf.x, cf.y);
    if (d < l.def.alcance && d < dm) { dm = d; mejor = cf; }
  }
  if (partida.balon) {
    const d = distancia(l.x, l.y, partida.balon.x, partida.balon.y);
    if (d < l.def.alcance && d < dm) { dm = d; mejor = partida.balon; }
  }
  return mejor;
}

function dispararJugadorHacia(mx, my) {
  const j = jugador();
  if (j.muerto) return;
  disparar(j, anguloHacia(j.x, j.y, mx, my), distancia(j.x, j.y, mx, my));
}

function dispararJugadorAuto() {
  const j = jugador();
  if (j.muerto) return;
  const o = objetivoAutomatico(j);
  if (o) {
    const t = distancia(j.x, j.y, o.x, o.y) / j.def.ataque.velocidad;
    dispararJugadorHacia(o.x + (o.ia.dirX || 0) * o.def.velocidad * t, o.y + (o.ia.dirY || 0) * o.def.velocidad * t);
    return;
  }
  const s = objetivoSecundario(j);
  if (s) dispararJugadorHacia(s.x, s.y);
  else dispararJugadorHacia(j.x + Math.cos(j.angulo) * 100, j.y + Math.sin(j.angulo) * 100);
}

function superJugadorHacia(mx, my) {
  const j = jugador();
  if (j.muerto) return;
  if (j.cargaSuper < 100) { textoFlotante(j.x, j.y - 40, 'Súper sin cargar', '#ffd43b'); return; }
  usarSuper(j, anguloHacia(j.x, j.y, mx, my), distancia(j.x, j.y, mx, my));
}

function superJugadorAuto() {
  const j = jugador();
  if (j.muerto) return;
  const o = objetivoAutomatico(j, 1.2) || objetivoSecundario(j);
  if (o) superJugadorHacia(o.x, o.y);
  else superJugadorHacia(j.x + Math.cos(j.angulo) * 100, j.y + Math.sin(j.angulo) * 100);
}

function gadgetJugador(angulo) {
  const j = jugador();
  if (j.muerto) return;
  if (j.gadgets <= 0) { textoFlotante(j.x, j.y - 40, 'Sin gadgets', '#ff6b6b'); return; }
  if (j.enfriamientoGadget > 0) { textoFlotante(j.x, j.y - 40, 'Gadget recargando', '#8ef05a'); return; }
  usarGadget(j, angulo === undefined ? j.angulo : angulo);
}

function registrarEventos() {
  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key) && enJuego()) e.preventDefault();
    entrada.teclas.add(e.key.toLowerCase());
    if (!enJuego()) return;
    const k = e.key.toLowerCase();
    if (e.key === ' ') {
      if (entrada.hayRaton) { const m = posicionMundo(entrada.ratonX, entrada.ratonY); dispararJugadorHacia(m.x, m.y); }
      else dispararJugadorAuto();
    }
    if (k === 'e' || e.key === 'Shift') {
      if (entrada.hayRaton) { const m = posicionMundo(entrada.ratonX, entrada.ratonY); superJugadorHacia(m.x, m.y); }
      else superJugadorAuto();
    }
    if (k === 'q') {
      if (entrada.hayRaton) { const m = posicionMundo(entrada.ratonX, entrada.ratonY); gadgetJugador(anguloHacia(jugador().x, jugador().y, m.x, m.y)); }
      else gadgetJugador();
    }
    if (k === 'm') { sonido.activo = !sonido.activo; aviso(sonido.activo ? 'Sonido activado' : 'Sonido silenciado', 1); }
  });
  window.addEventListener('keyup', e => entrada.teclas.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => entrada.teclas.clear());

  canvas.addEventListener('mousemove', e => { entrada.ratonX = e.clientX; entrada.ratonY = e.clientY; entrada.hayRaton = true; });
  canvas.addEventListener('mousedown', e => {
    sonido.iniciar();
    if (!enJuego() || entrada.esTactil) return;
    const m = posicionMundo(e.clientX, e.clientY);
    if (e.button === 0) dispararJugadorHacia(m.x, m.y);
    if (e.button === 2) superJugadorHacia(m.x, m.y);
    if (e.button === 1) { e.preventDefault(); gadgetJugador(anguloHacia(jugador().x, jugador().y, m.x, m.y)); }
  });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    sonido.iniciar();
    entrada.esTactil = true;
    entrada.hayRaton = false;
    if (!enJuego()) return;
    for (const t of e.changedTouches) {
      const bs = botonSuper(), bg = botonGadget();
      const nuevo = { id: t.identifier, ox: t.clientX, oy: t.clientY, x: t.clientX, y: t.clientY, t0: performance.now() };
      if (distancia(t.clientX, t.clientY, bs.x, bs.y) < bs.r + 12 && !entrada.toques.super) entrada.toques.super = nuevo;
      else if (distancia(t.clientX, t.clientY, bg.x, bg.y) < bg.r + 12 && !entrada.toques.gadget) entrada.toques.gadget = nuevo;
      else if (t.clientX < W / 2 && !entrada.toques.mover) entrada.toques.mover = nuevo;
      else if (!entrada.toques.apuntar) entrada.toques.apuntar = nuevo;
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      for (const clave of ['mover', 'apuntar', 'super', 'gadget']) {
        const j = entrada.toques[clave];
        if (j && j.id === t.identifier) { j.x = t.clientX; j.y = t.clientY; }
      }
    }
  }, { passive: false });

  const finToque = e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const tq = entrada.toques;
      if (tq.mover && tq.mover.id === t.identifier) tq.mover = null;
      const soltar = (clave, accionAuto, accionDirigida) => {
        const j = tq[clave];
        if (!j || j.id !== t.identifier) return;
        tq[clave] = null;
        if (!enJuego()) return;
        const dx = j.x - j.ox, dy = j.y - j.oy, d = Math.hypot(dx, dy);
        if (d < 16) { if (clave !== 'apuntar' || performance.now() - j.t0 < 300) accionAuto(); return; }
        const p = jugador();
        const alcance = Math.min(1, d / (RADIO_JOYSTICK * 1.6)) * p.def.alcance;
        accionDirigida(p.x + dx / d * alcance, p.y + dy / d * alcance, Math.atan2(dy, dx));
      };
      soltar('apuntar', dispararJugadorAuto, (x, y) => dispararJugadorHacia(x, y));
      soltar('super', superJugadorAuto, (x, y) => superJugadorHacia(x, y));
      soltar('gadget', () => gadgetJugador(), (x, y, a) => gadgetJugador(a));
    }
  };
  canvas.addEventListener('touchend', finToque, { passive: false });
  canvas.addEventListener('touchcancel', finToque, { passive: false });
}

function leerTeclado() {
  const t = entrada.teclas;
  let x = 0, y = 0;
  if (t.has('a') || t.has('arrowleft')) x -= 1;
  if (t.has('d') || t.has('arrowright')) x += 1;
  if (t.has('w') || t.has('arrowup')) y -= 1;
  if (t.has('s') || t.has('arrowdown')) y += 1;
  return { x, y };
}

function leerEntrada() {
  const j = partida ? jugador() : null;
  let { x, y } = leerTeclado();
  const tm = entrada.toques.mover;
  if (tm) {
    const dx = tm.x - tm.ox, dy = tm.y - tm.oy, d = Math.hypot(dx, dy);
    if (d > 6) { const f = Math.min(1, d / RADIO_JOYSTICK); x = dx / d * f; y = dy / d * f; }
  }
  entrada.movX = x; entrada.movY = y;
  entrada.apuntando = false;
  if (j && !j.muerto) {
    const ta = entrada.toques.apuntar || entrada.toques.super || entrada.toques.gadget;
    if (ta && Math.hypot(ta.x - ta.ox, ta.y - ta.oy) > 16) { j.angulo = Math.atan2(ta.y - ta.oy, ta.x - ta.ox); entrada.apuntando = true; }
    else if (entrada.hayRaton && !entrada.esTactil) { const m = posicionMundo(entrada.ratonX, entrada.ratonY); j.angulo = anguloHacia(j.x, j.y, m.x, m.y); entrada.apuntando = true; }
  }
}
