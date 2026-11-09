'use strict';
/* =========================================================
   ENTIDADES Y COMBATE: luchadores, balas, súper, gadgets, daño
   ========================================================= */
let partida = null;

function crearLuchador(tipo, equipo, nombre, esJugador, aparicion, nivel = 1) {
  const def = LUCHADORES[tipo];
  const mult = 1 + BONUS_NIVEL * (nivel - 1);
  const vida = Math.round(def.vida * mult);
  return {
    tipo, def, equipo, nombre, esJugador, nivel, multDano: mult,
    x: aparicion.x, y: aparicion.y, r: 20, aparicion,
    vida, vidaMax: vida, vidaBase: vida,
    angulo: equipo === 0 ? Math.PI / 2 : -Math.PI / 2,
    municion: 3, recargando: 0, enfriamiento: 0,
    cargaSuper: 0, gadgets: USOS_GADGET, enfriamientoGadget: 0,
    cristales: 0, cubos: 0,
    muerto: false, reaparicion: 0, invulnerable: 2,
    escudo: 0, lento: 0, rapido: 0,
    ultimoDano: -99, ultimoDisparo: -99, golpeado: 0,
    colaDisparos: [], embestida: null,
    puesto: 0, animacion: 0, moviendose: false, vx: 0, vy: 0,
    ia: { pensar: 0, dirX: 0, dirY: 0, evitar: 0, anguloEvitar: 0, atascado: 0, ultimaX: 0, ultimaY: 0, deambular: null, esquivando: 0, rol: 0 },
    bajas: 0, muertes: 0, danoHecho: 0, cristalesRecogidos: 0, goles: 0, danoCaja: 0, curado: 0,
  };
}

const jugador = () => partida.luchadores[0];
const enemigosDe = l => partida.luchadores.filter(o => o.equipo !== l.equipo && !o.muerto);
const aliadosDe = l => partida.luchadores.filter(o => o.equipo === l.equipo && !o.muerto);
const vivos = () => partida.luchadores.filter(l => !l.muerto).length;
const esAliadoDelJugador = l => l.equipo === jugador().equipo;

function aviso(texto, duracion = 2, color = '#ffffff') {
  partida.avisos.push({ texto, restante: duracion, total: duracion, color });
}

function textoFlotante(x, y, texto, color, grande = false) {
  partida.textos.push({ x, y, texto, color, vida: 0.9, grande });
}

function particulas(x, y, color, cantidad, fuerza = 120) {
  for (let i = 0; i < cantidad; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = azar(fuerza * 0.3, fuerza);
    partida.particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: azar(0.25, 0.55), color, r: azar(2, 5) });
  }
}

function anillo(x, y, color, radio, vida = 0.35) {
  partida.particulas.push({ x, y, vx: 0, vy: 0, vida, vidaTotal: vida, color, r: radio, anillo: true });
}

function fogonazo(l) {
  const a = l.angulo;
  partida.particulas.push({ x: l.x + Math.cos(a) * (l.r + 12), y: l.y + Math.sin(a) * (l.r + 12), vx: 0, vy: 0, vida: 0.07, color: '#fff3b0', r: 9, destello: true });
}

/* ---------- Balas ---------- */
function crearBala(duenio, x, y, angulo, opciones) {
  const bala = {
    duenio, equipo: duenio.equipo, x, y, px: x, py: y,
    vx: Math.cos(angulo) * opciones.velocidad, vy: Math.sin(angulo) * opciones.velocidad,
    dano: opciones.dano, r: opciones.radio, recorrido: 0, alcance: opciones.alcance,
    color: duenio.def.colorBala || duenio.def.color,
    perforante: !!opciones.perforante, lanzamiento: !!opciones.lanzamiento,
    cadena: opciones.cadena || 0, alcanceSalto: opciones.alcanceSalto || 0,
    area: opciones.area || 0, esSuper: !!opciones.esSuper, golpeados: new Set(),
  };
  partida.balas.push(bala);
  return bala;
}

function disparar(l, angulo, distanciaObjetivo) {
  if (l.muerto || l.municion < 1 || l.enfriamiento > 0 || partida.fase !== 'jugando') return false;
  const at = l.def.ataque;
  l.municion -= 1;
  l.enfriamiento = 0.28;
  l.angulo = angulo;
  l.ultimoDisparo = partida.tiempo;
  if (l.esJugador) (at.tipo === 'escopeta' || l.tipo === 'bastion' ? sonido.disparoPesado() : sonido.disparo());
  fogonazo(l);

  const base = { velocidad: at.velocidad, dano: at.dano, radio: at.radio, alcance: l.def.alcance };
  const ox = l.x + Math.cos(angulo) * (l.r + 6), oy = l.y + Math.sin(angulo) * (l.r + 6);

  if (at.tipo === 'escopeta') {
    for (let i = 0; i < at.cantidad; i++) {
      const a = angulo + (i / (at.cantidad - 1) - 0.5) * at.apertura + azar(-0.03, 0.03);
      crearBala(l, ox, oy, a, { ...base, alcance: l.def.alcance * azar(0.85, 1) });
    }
  } else if (at.tipo === 'simple') {
    crearBala(l, ox, oy, angulo, base);
  } else if (at.tipo === 'cadena') {
    crearBala(l, ox, oy, angulo, { ...base, cadena: at.saltos, alcanceSalto: at.alcanceSalto });
  } else if (at.tipo === 'rafaga') {
    for (let i = 0; i < at.cantidad; i++) l.colaDisparos.push({ en: i * at.intervalo, angulo, opciones: base });
  } else if (at.tipo === 'lanzamiento') {
    const alcance = limitar(distanciaObjetivo || l.def.alcance, TILE * 1.5, l.def.alcance);
    crearBala(l, l.x, l.y, angulo, { ...base, alcance, lanzamiento: true, area: at.area });
  }
  return true;
}

function usarSuper(l, angulo, distanciaObjetivo) {
  if (l.muerto || l.cargaSuper < 100 || partida.fase !== 'jugando') return false;
  const sp = l.def.super;
  l.cargaSuper = 0;
  l.angulo = angulo;
  l.ultimoDisparo = partida.tiempo;
  sonido.super();
  particulas(l.x, l.y, '#ffd43b', 18, 160);
  textoFlotante(l.x, l.y - 44, sp.nombre.toUpperCase(), '#ffd43b', true);

  if (sp.tipo === 'embestida') {
    l.embestida = { vx: Math.cos(angulo) * 620, vy: Math.sin(angulo) * 620, restante: 0.42, golpeados: new Set(), dano: sp.dano };
    l.invulnerable = Math.max(l.invulnerable, 0.5);
  } else if (sp.tipo === 'perforante') {
    crearBala(l, l.x, l.y, angulo, { velocidad: sp.velocidad, dano: sp.dano, radio: sp.radio, alcance: l.def.alcance * 1.3, perforante: true, esSuper: true });
  } else if (sp.tipo === 'nova') {
    for (let i = 0; i < sp.cantidad; i++) {
      const a = angulo + (i / sp.cantidad) * Math.PI * 2;
      crearBala(l, l.x, l.y, a, { velocidad: sp.velocidad, dano: sp.dano, radio: sp.radio, alcance: l.def.alcance * 0.9, esSuper: true });
    }
  } else if (sp.tipo === 'lluvia') {
    const alcance = limitar(distanciaObjetivo || l.def.alcance, TILE * 1.5, l.def.alcance);
    for (let i = 0; i < sp.cantidad; i++) {
      const a = angulo + azar(-0.12, 0.12);
      crearBala(l, l.x, l.y, a, { velocidad: sp.velocidad, dano: sp.dano, radio: sp.radio, alcance: alcance * azar(0.85, 1.1), lanzamiento: true, area: sp.area, esSuper: true });
    }
  } else if (sp.tipo === 'curacion') {
    for (const a of aliadosDe(l)) {
      if (distancia(l.x, l.y, a.x, a.y) > sp.radio) continue;
      curar(a, sp.cantidad, l);
      particulas(a.x, a.y, '#7fe3e0', 10, 80);
    }
    anillo(l.x, l.y, '#7fe3e0', sp.radio, 0.45);
  } else if (sp.tipo === 'parpadeo') {
    let destinoX = l.x, destinoY = l.y;
    const pasos = Math.ceil(sp.distancia / 6);
    for (let i = 1; i <= pasos; i++) {
      const px = l.x + Math.cos(angulo) * i * 6, py = l.y + Math.sin(angulo) * i * 6;
      if (circuloChoca(partida.mapa, px, py, l.r)) break;
      destinoX = px; destinoY = py;
    }
    particulas(l.x, l.y, '#d9ccff', 14, 120);
    l.x = destinoX; l.y = destinoY;
    l.invulnerable = Math.max(l.invulnerable, 0.3);
    particulas(l.x, l.y, '#d9ccff', 14, 120);
    for (const o of enemigosDe(l)) if (distancia(l.x, l.y, o.x, o.y) < sp.radio) herir(o, sp.dano, l);
    anillo(l.x, l.y, '#d9ccff', sp.radio, 0.3);
  } else if (sp.tipo === 'tormenta') {
    for (const o of enemigosDe(l)) {
      if (distancia(l.x, l.y, o.x, o.y) > sp.radio) continue;
      herir(o, sp.dano, l);
      o.lento = Math.max(o.lento, sp.lentitud);
      partida.rayos.push({ puntos: [[l.x, l.y], [o.x, o.y]], vida: 0.25 });
    }
    danarCajasEnArea(l.x, l.y, sp.radio, sp.dano, l);
    for (const cf of partida.mapa.cajasFuertes) if (cf.equipo !== l.equipo && distancia(l.x, l.y, cf.x, cf.y) < sp.radio + cf.r) herirCajaFuerte(cf, sp.dano, l);
    anillo(l.x, l.y, '#ffe14d', sp.radio, 0.4);
  } else if (sp.tipo === 'escudo') {
    l.escudo = sp.duracion;
  }
  return true;
}

function usarGadget(l, angulo) {
  if (l.muerto || l.gadgets <= 0 || l.enfriamientoGadget > 0 || partida.fase !== 'jugando') return false;
  const g = l.def.gadget;
  l.gadgets -= 1;
  l.enfriamientoGadget = ENFRIAMIENTO_GADGET;
  if (l.esJugador || esAliadoDelJugador(l)) sonido.gadget();
  textoFlotante(l.x, l.y - 44, g.nombre, '#8ef05a');
  particulas(l.x, l.y, '#8ef05a', 10, 100);

  if (g.tipo === 'recarga') { l.municion = 3; l.recargando = 0; }
  else if (g.tipo === 'curar') curar(l, g.cantidad, l);
  else if (g.tipo === 'retroceso') {
    const a = angulo + Math.PI;
    for (let i = 0; i < 12; i++) moverConColision(partida.mapa, l, Math.cos(a) * g.distancia / 12, Math.sin(a) * g.distancia / 12);
    l.invulnerable = Math.max(l.invulnerable, 0.25);
  }
  else if (g.tipo === 'humo') partida.mapa.humos.push({ x: l.x, y: l.y, r: g.radio, restante: g.duracion, total: g.duracion });
  else if (g.tipo === 'curarAliado') {
    const candidatos = aliadosDe(l).filter(a => distancia(l.x, l.y, a.x, a.y) <= g.radio);
    const objetivo = candidatos.sort((a, b) => (a.vida / a.vidaMax) - (b.vida / b.vidaMax))[0] || l;
    curar(objetivo, g.cantidad, l);
    partida.rayos.push({ puntos: [[l.x, l.y], [objetivo.x, objetivo.y]], vida: 0.3, color: '#7fe3e0' });
  }
  else if (g.tipo === 'velocidad') l.rapido = g.duracion;
  else if (g.tipo === 'empujon') {
    for (const o of enemigosDe(l)) {
      const d = distancia(l.x, l.y, o.x, o.y);
      if (d > g.radio) continue;
      const a = anguloHacia(l.x, l.y, o.x, o.y);
      for (let i = 0; i < 8; i++) moverConColision(partida.mapa, o, Math.cos(a) * g.fuerza / 8, Math.sin(a) * g.fuerza / 8);
      herir(o, 200, l);
    }
    anillo(l.x, l.y, '#ffe14d', g.radio, 0.3);
  }
  else if (g.tipo === 'muro') {
    const fx = l.x + Math.cos(angulo) * TILE * 1.4, fy = l.y + Math.sin(angulo) * TILE * 1.4;
    if (!ponerMuroTemporal(partida.mapa, fx, fy, g.duracion)) { l.gadgets += 1; l.enfriamientoGadget = 0.5; textoFlotante(l.x, l.y - 60, 'Sin sitio', '#ff6b6b'); }
  }
  return true;
}

function curar(objetivo, cantidad, origen) {
  if (objetivo.muerto) return;
  const antes = objetivo.vida;
  objetivo.vida = Math.min(objetivo.vidaMax, objetivo.vida + cantidad);
  const curado = Math.round(objetivo.vida - antes);
  if (curado > 0) {
    textoFlotante(objetivo.x, objetivo.y - 34, '+' + curado, '#8ef05a');
    if (origen && origen !== objetivo) origen.curado += curado;
  }
}

// Rayo en cadena: salta del enemigo golpeado al siguiente más cercano
function saltarRayo(bala, desde) {
  let siguiente = null, dm = Infinity;
  for (const o of partida.luchadores) {
    if (o.muerto || o.equipo === bala.equipo || bala.golpeados.has(o)) continue;
    const d = distancia(desde.x, desde.y, o.x, o.y);
    if (d < bala.alcanceSalto && d < dm) { dm = d; siguiente = o; }
  }
  if (!siguiente) return;
  bala.golpeados.add(siguiente);
  partida.rayos.push({ puntos: [[desde.x, desde.y], [siguiente.x, siguiente.y]], vida: 0.2 });
  herir(siguiente, bala.dano * 0.7, bala.duenio);
  if (bala.cadena > 1) { bala.cadena -= 1; saltarRayo(bala, siguiente); }
}

function herir(objetivo, dano, atacante) {
  if (objetivo.muerto || objetivo.invulnerable > 0 || partida.fase !== 'jugando') return;
  if (atacante) dano *= atacante.multDano * (1 + 0.08 * (atacante.cubos || 0));
  if (objetivo.escudo > 0) dano *= 1 - objetivo.def.super.reduccion;
  // En supervivencia los bots se hacen la mitad de daño entre ellos: la partida dura más y el jugador decide los duelos
  if (partida.modo === 'supervivencia' && atacante && !atacante.esJugador && !objetivo.esJugador) dano *= 0.5;
  dano = Math.round(dano);
  objetivo.vida -= dano;
  objetivo.ultimoDano = partida.tiempo;
  objetivo.golpeado = 0.1;
  if (atacante) {
    atacante.danoHecho += dano;
    atacante.cargaSuper = Math.min(100, atacante.cargaSuper + 100 / atacante.def.superImpactos);
  }
  const esAliado = esAliadoDelJugador(objetivo);
  textoFlotante(objetivo.x + azar(-10, 10), objetivo.y - 30, String(dano), esAliado ? '#ff6b6b' : '#ffffff', dano >= 1000);
  particulas(objetivo.x, objetivo.y, objetivo.def.color, 5, 90);
  if (objetivo.esJugador || (atacante && atacante.esJugador)) sonido.impacto();
  if (objetivo.esJugador) partida.temblor = Math.max(partida.temblor, 6);
  if (objetivo.vida <= 0) morir(objetivo, atacante);
}

function morir(l, asesino) {
  l.vida = 0;
  l.muerto = true;
  l.muertes += 1;
  l.embestida = null;
  l.colaDisparos = [];
  l.escudo = 0;
  if (asesino && asesino !== l) asesino.bajas += 1;
  particulas(l.x, l.y, l.def.color, 26, 200);
  anillo(l.x, l.y, l.def.color, 40, 0.4);
  sonido.muerte();

  const soltar = (lista, cantidad) => {
    for (let i = 0; i < cantidad; i++) {
      const p = puntoLibreCerca(partida.mapa, l.x + azar(-40, 40), l.y + azar(-40, 40), 10);
      lista.push({ x: p.x, y: p.y, fase: Math.random() * 6, aparicion: 0.5 });
    }
  };
  soltar(partida.cristales, l.cristales); l.cristales = 0;

  if (partida.modo === 'supervivencia') {
    soltar(partida.cubos, l.cubos); l.cubos = 0;
    partida.eliminados += 1;
    l.puesto = partida.luchadores.length - partida.eliminados + 1;
    l.reaparicion = Infinity;
    if (!l.esJugador) aviso(l.nombre + ' ha caído · quedan ' + vivos(), 1.6, asesino && asesino.esJugador ? '#ffd43b' : '#cfd3ff');
  } else {
    l.reaparicion = TIEMPO_REAPARICION;
    if (asesino && asesino.esJugador) aviso('¡Has eliminado a ' + l.nombre + '!', 1.6, '#ffd43b');
    else if (l.esJugador) aviso((asesino ? asesino.nombre : 'El gas') + ' te ha eliminado', 1.6, '#ff6b6b');
  }
}

function reaparecer(l) {
  l.muerto = false;
  l.vida = l.vidaMax;
  l.x = l.aparicion.x;
  l.y = l.aparicion.y;
  l.municion = 3;
  l.invulnerable = 2;
  l.lento = 0;
  particulas(l.x, l.y, '#ffffff', 14, 120);
  anillo(l.x, l.y, '#ffffff', 30, 0.4);
}

function recogerCubo(l) {
  l.cubos += 1;
  l.vidaMax = l.vidaBase + 300 * l.cubos;
  l.vida = Math.min(l.vidaMax, l.vida + 300);
  textoFlotante(l.x, l.y - 34, '+1 cubo', '#8ef05a');
  if (l.esJugador) sonido.cubo();
}

/* ---------- Cajas (supervivencia) y cajas fuertes (atraco) ---------- */
function danarCaja(mapa, x, y, dano, atacante) {
  const c = Math.floor(x / TILE), f = Math.floor(y / TILE);
  const clave = f + ',' + c;
  if (!(clave in mapa.cajas)) return false;
  mapa.cajas[clave] -= dano;
  particulas(c * TILE + TILE / 2, f * TILE + TILE / 2, '#c9a24a', 5, 90);
  if (atacante && atacante.esJugador) sonido.caja();
  if (mapa.cajas[clave] <= 0) {
    delete mapa.cajas[clave];
    mapa.casillas[f][c] = '.';
    particulas(c * TILE + TILE / 2, f * TILE + TILE / 2, '#c9a24a', 18, 160);
    partida.cubos.push({ x: c * TILE + TILE / 2, y: f * TILE + TILE / 2, fase: Math.random() * 6, aparicion: 0.4 });
  }
  return true;
}

function danarCajasEnArea(x, y, radio, dano, atacante) {
  for (const clave of Object.keys(partida.mapa.cajas)) {
    const [f, c] = clave.split(',').map(Number);
    const cx = c * TILE + TILE / 2, cy = f * TILE + TILE / 2;
    if (distancia(x, y, cx, cy) < radio + TILE * 0.5) danarCaja(partida.mapa, cx, cy, dano, atacante);
  }
}

function herirCajaFuerte(cf, dano, atacante) {
  if (cf.vida <= 0 || partida.fase !== 'jugando') return;
  if (atacante) dano *= atacante.multDano;
  dano = Math.round(dano);
  cf.vida = Math.max(0, cf.vida - dano);
  cf.ultimoDano = partida.tiempo;
  if (atacante) { atacante.danoCaja += dano; atacante.cargaSuper = Math.min(100, atacante.cargaSuper + 50 / atacante.def.superImpactos); }
  textoFlotante(cf.x + azar(-10, 10), cf.y - 40, String(dano), cf.equipo === jugador().equipo ? '#ff6b6b' : '#ffd43b');
  particulas(cf.x, cf.y, '#c9a24a', 4, 80);
  if (cf.vida <= 0) { particulas(cf.x, cf.y, '#ffd43b', 40, 240); anillo(cf.x, cf.y, '#ffd43b', 80, 0.6); sonido.explosion(); }
}

function explotar(b) {
  particulas(b.x, b.y, b.color, 16, 180);
  anillo(b.x, b.y, b.color, b.area, 0.3);
  partida.temblor = Math.max(partida.temblor, 4);
  if (b.duenio.esJugador) sonido.explosion();
  for (const o of partida.luchadores) {
    if (o.muerto || o.equipo === b.equipo) continue;
    if (distancia(b.x, b.y, o.x, o.y) < b.area + o.r) herir(o, b.dano, b.duenio);
  }
  danarCajasEnArea(b.x, b.y, b.area, b.dano, b.duenio);
  for (const cf of partida.mapa.cajasFuertes) if (cf.equipo !== b.equipo && distancia(b.x, b.y, cf.x, cf.y) < b.area + cf.r) herirCajaFuerte(cf, b.dano, b.duenio);
  if (partida.balon && distancia(b.x, b.y, partida.balon.x, partida.balon.y) < b.area + partida.balon.r) golpearBalon(partida.balon, anguloHacia(b.x, b.y, partida.balon.x, partida.balon.y), 520, b.duenio);
}

/* ---------- Balón ---------- */
function golpearBalon(balon, angulo, fuerza, quien) {
  balon.quieto = 0;
  balon.vx = Math.cos(angulo) * fuerza;
  balon.vy = Math.sin(angulo) * fuerza;
  balon.ultimoToque = quien || balon.ultimoToque;
  particulas(balon.x, balon.y, '#ffffff', 5, 80);
}

function actualizarBalon(dt) {
  const b = partida.balon, mapa = partida.mapa;
  if (!b || partida.pausaGol > 0) return;
  b.quieto = (b.quieto || 0) + dt;
  if (Math.hypot(b.vx, b.vy) > 30) b.quieto = 0;
  if (b.quieto > 12) { b.quieto = 0; b.x = mapa.balon.x; b.y = mapa.balon.y; b.vx = 0; b.vy = 0; particulas(b.x, b.y, '#ffffff', 16, 120); aviso('El balón vuelve al centro', 1.5); }
  // Toques de los luchadores: empujan el balón hacia donde van
  for (const l of partida.luchadores) {
    if (l.muerto) continue;
    const d = distancia(l.x, l.y, b.x, b.y);
    if (d < l.r + b.r) {
      const mov = Math.hypot(l.vx, l.vy);
      const a = mov > 10 ? Math.atan2(l.vy, l.vx) : anguloHacia(l.x, l.y, b.x, b.y);
      golpearBalon(b, a, 380 + mov * 0.7, l);
      // Separar el balón del luchador sin meterlo en un muro
      const sep = anguloHacia(l.x, l.y, b.x, b.y);
      const nx = l.x + Math.cos(sep) * (l.r + b.r + 1), ny = l.y + Math.sin(sep) * (l.r + b.r + 1);
      if (!circuloChoca(mapa, nx, ny, b.r, bloqueaBalon)) { b.x = nx; b.y = ny; }
      else { b.vx = Math.cos(sep + Math.PI) * 200; b.vy = Math.sin(sep + Math.PI) * 200; }
    }
  }
  // Si por lo que sea ha quedado dentro de un obstáculo, sacarlo
  if (circuloChoca(mapa, b.x, b.y, b.r * 0.5, bloqueaBalon)) {
    const libre = puntoLibreCerca(mapa, b.x, b.y, b.r + 2, 16, 70);
    b.x = libre.x; b.y = libre.y;
  }
  // Movimiento con rebotes
  const pasos = Math.ceil(Math.hypot(b.vx, b.vy) * dt / 6) || 1;
  for (let i = 0; i < pasos; i++) {
    const nx = b.x + b.vx * dt / pasos;
    if (circuloChoca(mapa, nx, b.y, b.r, bloqueaBalon)) b.vx *= -0.7; else b.x = nx;
    const ny = b.y + b.vy * dt / pasos;
    if (circuloChoca(mapa, b.x, ny, b.r, bloqueaBalon)) b.vy *= -0.7; else b.y = ny;
  }
  const friccion = Math.max(0, 1 - 1.6 * dt);
  b.vx *= friccion; b.vy *= friccion;
  b.giro += Math.hypot(b.vx, b.vy) * dt / b.r;
  // Gol
  const ch = casillaEn(mapa, b.x, b.y);
  if (ch === 'G') {
    const porteria = mapa.porterias.find(p => p.f === Math.floor(b.y / TILE) && p.c === Math.floor(b.x / TILE));
    if (porteria) marcarGol(1 - porteria.equipo, b.ultimoToque);
  }
}
