'use strict';
/* =========================================================
   INTELIGENCIA ARTIFICIAL DE LOS BOTS
   ========================================================= */
function pensarBot(l, dt) {
  const ia = l.ia;
  const dif = partida.dificultad;
  const mapa = partida.mapa;
  const modoJuego = partida.modo;
  const supervivencia = modoJuego === 'supervivencia';
  ia.pensar -= dt;
  if (ia.pensar > 0) return;
  ia.pensar = azar(0.12, 0.22);

  const enemigos = enemigosDe(l);
  const distVista = dif.vista * TILE * (supervivencia ? 0.6 : 1);
  const tregua = supervivencia && partida.tiempo < 25 && partida.tiempo - l.ultimoDano > 3;

  // Enemigo visible más cercano (arbustos y humo ocultan salvo de cerca o si acaba de disparar)
  let objetivo = null, distObjetivo = Infinity;
  for (const e of enemigos) {
    const d = distancia(l.x, l.y, e.x, e.y);
    const oculto = estaOculto(mapa, e.x, e.y) && d > 2.5 * TILE && partida.tiempo - e.ultimoDisparo > 1;
    if (tregua) continue;
    if (d < distVista && d < distObjetivo && !oculto) { objetivo = e; distObjetivo = d; }
  }

  const vidaBaja = l.vida < l.vidaMax * (supervivencia ? 0.5 : 0.32);
  const cargaLlena = l.cargaSuper >= 100;
  const centro = { x: mapa.ancho / 2, y: mapa.alto / 2 };

  // Gadgets defensivos
  if (l.gadgets > 0 && l.enfriamientoGadget <= 0) {
    const g = l.def.gadget.tipo;
    if ((g === 'curar' || g === 'curarAliado') && l.vida < l.vidaMax * 0.45) usarGadget(l, l.angulo);
    else if (g === 'recarga' && l.municion === 0 && objetivo) usarGadget(l, l.angulo);
    else if ((g === 'retroceso' || g === 'velocidad' || g === 'humo') && vidaBaja && objetivo && distObjetivo < 4 * TILE) usarGadget(l, objetivo ? anguloHacia(l.x, l.y, objetivo.x, objetivo.y) : l.angulo);
    else if (g === 'empujon' && objetivo && distObjetivo < 2 * TILE) usarGadget(l, l.angulo);
    else if (g === 'muro' && vidaBaja && objetivo && distObjetivo < 5 * TILE) usarGadget(l, anguloHacia(l.x, l.y, objetivo.x, objetivo.y));
  }

  // Decidir hacia dónde ir
  let meta = null, modo = 'avanzar', cajaFuerteObjetivo = null;
  if (supervivencia && enGas(l.x, l.y)) { meta = centro; modo = 'gas'; }
  else if (vidaBaja && (objetivo || partida.tiempo - l.ultimoDano < 2)) {
    meta = supervivencia ? arbustoMasCercano(l, objetivo) || centro : l.aparicion;
    modo = 'huir';
  } else if (supervivencia) {
    const r = metaSupervivencia(l); meta = r.meta; modo = r.modo;
  } else if (modoJuego === 'cristales') {
    const r = metaCristales(l, enemigos); meta = r.meta; modo = r.modo;
    if (r.objetivo) { objetivo = r.objetivo; distObjetivo = distancia(l.x, l.y, objetivo.x, objetivo.y); }
  } else if (modoJuego === 'atraco') {
    const r = metaAtraco(l, enemigos); meta = r.meta; modo = r.modo; cajaFuerteObjetivo = r.cajaFuerte || null;
    if (r.objetivo) { objetivo = r.objetivo; distObjetivo = distancia(l.x, l.y, objetivo.x, objetivo.y); }
  } else if (modoJuego === 'balon') {
    const r = metaBalon(l, enemigos); meta = r.meta; modo = r.modo;
  }

  // Romper la caja a la que se dirige (supervivencia)
  if (modo === 'caja' && meta && distancia(l.x, l.y, meta.x, meta.y) < l.def.alcance * 0.8 && partida.tiempo - l.ultimoDisparo > dif.reaccion && !objetivo) {
    const a = anguloHacia(l.x, l.y, meta.x, meta.y);
    if (l.def.ataque.tipo === 'lanzamiento' || hayVision(mapa, l.x, l.y, meta.x - Math.cos(a) * TILE * 0.6, meta.y - Math.sin(a) * TILE * 0.6)) disparar(l, a, distancia(l.x, l.y, meta.x, meta.y));
  }
  // Atacar la caja fuerte (atraco): dispara si la tiene a tiro y no hay un enemigo encima
  if (modo === 'cajaFuerte' && cajaFuerteObjetivo && (!objetivo || distObjetivo > 3.5 * TILE)) {
    const cf = cajaFuerteObjetivo;
    const d = distancia(l.x, l.y, cf.x, cf.y);
    if (d < l.def.alcance * 0.9 && partida.tiempo - l.ultimoDisparo > dif.reaccion && (l.def.ataque.tipo === 'lanzamiento' || hayVision(mapa, l.x, l.y, cf.x, cf.y))) {
      const a = anguloHacia(l.x, l.y, cf.x, cf.y) + azar(-0.05, 0.05);
      if (cargaLlena && !['curacion', 'escudo', 'parpadeo'].includes(l.def.super.tipo) && d < l.def.alcance * 0.8) usarSuper(l, a, d); else disparar(l, a, d);
    }
  }
  // Los atacantes solo se distraen con enemigos cercanos
  const persigue = !(modo === 'cajaFuerte' && objetivo && distObjetivo > 4.5 * TILE);

  // Combate
  if (objetivo) {
    const alcance = l.def.alcance;
    const esLanzadora = l.def.ataque.tipo === 'lanzamiento';
    const vision = esLanzadora || hayVision(mapa, l.x, l.y, objetivo.x, objetivo.y);
    const esCuerpoACuerpo = l.def.ataque.tipo === 'escopeta' || l.tipo === 'sombra';
    const vaGanando = !supervivencia || (l.vida / l.vidaMax + l.cubos * 0.05) >= (objetivo.vida / objetivo.vidaMax + objetivo.cubos * 0.05) - 0.1;

    if (modo !== 'huir' && modo !== 'defender' && modo !== 'gas' && modo !== 'portero' && modo !== 'balon' && persigue) {
      if ((distObjetivo > alcance * 0.85 || !vision) && vaGanando) meta = objetivo;
      else if (!vaGanando && distObjetivo < alcance) {
        const a = anguloHacia(objetivo.x, objetivo.y, l.x, l.y);
        meta = { x: l.x + Math.cos(a) * 3 * TILE, y: l.y + Math.sin(a) * 3 * TILE };
      } else if (distObjetivo < alcance * 0.45 && !esCuerpoACuerpo) {
        const a = anguloHacia(objetivo.x, objetivo.y, l.x, l.y) + (Math.sin(partida.tiempo * 0.7 + l.x) > 0 ? 0.9 : -0.9);
        meta = { x: l.x + Math.cos(a) * 3 * TILE, y: l.y + Math.sin(a) * 3 * TILE };
      } else {
        const a = anguloHacia(l.x, l.y, objetivo.x, objetivo.y) + (Math.sin(partida.tiempo * 1.3 + l.y) > 0 ? Math.PI / 2 : -Math.PI / 2);
        meta = { x: l.x + Math.cos(a) * 2 * TILE, y: l.y + Math.sin(a) * 2 * TILE };
      }
    }

    if (vision && distObjetivo <= alcance * 1.02 && partida.tiempo - l.ultimoDisparo > dif.reaccion * (supervivencia ? 1.8 : 1)) {
      const velBala = l.def.ataque.velocidad;
      const t = distObjetivo / velBala;
      const factor = objetivo.esJugador ? 0.7 : 1;
      const px = objetivo.x + (objetivo.ia.dirX || 0) * objetivo.def.velocidad * t * factor;
      const py = objetivo.y + (objetivo.ia.dirY || 0) * objetivo.def.velocidad * t * factor;
      const punteria = dif.punteria * (supervivencia ? 1.5 : 1);
      const a = anguloHacia(l.x, l.y, px, py) + azar(-punteria, punteria);
      const distDisparo = distancia(l.x, l.y, px, py) * (esLanzadora ? 1 + azar(-dif.punteria * 2.5, dif.punteria * 2.5) : 1);
      if (cargaLlena && quiereUsarSuper(l, objetivo, distObjetivo)) usarSuper(l, a, distDisparo);
      else disparar(l, a, distDisparo);
    }
  } else if (cargaLlena && l.def.super.tipo === 'curacion' && (l.vida < l.vidaMax * 0.5 || aliadosDe(l).some(a => a !== l && a.vida < a.vidaMax * 0.4 && distancia(l.x, l.y, a.x, a.y) < l.def.super.radio))) {
    usarSuper(l, l.angulo, 0);
  }

  // Esquivar balas que vienen hacia aquí
  const esquiva = esquivarBalas(l, dif);

  // Dirección de movimiento hacia la meta, esquivando muros
  ia.dirX = 0; ia.dirY = 0;
  if (esquiva) { ia.dirX = esquiva.x; ia.dirY = esquiva.y; return; }
  if (meta) {
    let a = anguloHacia(l.x, l.y, meta.x, meta.y);
    const dMeta = distancia(l.x, l.y, meta.x, meta.y);
    if (dMeta < 6 && modo !== 'avanzar') return;
    if (meta.esCaja && dMeta < TILE * 1.6) return;
    if (meta.paradaA && dMeta < meta.paradaA) return;
    if (distancia(l.x, l.y, ia.ultimaX, ia.ultimaY) < 2) ia.atascado += 1; else ia.atascado = 0;
    ia.ultimaX = l.x; ia.ultimaY = l.y;

    if (ia.evitar > 0) { ia.evitar -= 1; a = ia.anguloEvitar; }
    else {
      const sondas = [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8, Math.PI];
      for (const s of sondas) {
        const pa = a + s;
        const sx = l.x + Math.cos(pa) * (l.r + TILE * 0.9);
        const sy = l.y + Math.sin(pa) * (l.r + TILE * 0.9);
        if (!circuloChoca(mapa, sx, sy, l.r * 0.9) && !(supervivencia && enGas(sx, sy) && !enGas(l.x, l.y))) {
          if (s !== 0) { ia.anguloEvitar = pa; ia.evitar = 3; }
          a = pa;
          break;
        }
      }
      if (ia.atascado > 4) { ia.anguloEvitar = a + azar(-2.5, 2.5); ia.evitar = 5; ia.atascado = 0; a = ia.anguloEvitar; }
    }
    ia.dirX = Math.cos(a);
    ia.dirY = Math.sin(a);
  }
}

function esquivarBalas(l, dif) {
  if (Math.random() > dif.esquiva) return null;
  for (const b of partida.balas) {
    if (b.equipo === l.equipo || b.lanzamiento) continue;
    const d = distancia(b.x, b.y, l.x, l.y);
    if (d > 3 * TILE) continue;
    // ¿Va hacia aquí?
    const v = Math.hypot(b.vx, b.vy);
    const haciaX = (l.x - b.x) / d, haciaY = (l.y - b.y) / d;
    const cos = (b.vx * haciaX + b.vy * haciaY) / v;
    if (cos < 0.92) continue;
    // Moverse en perpendicular
    const lado = Math.sign((b.vx * (l.y - b.y) - b.vy * (l.x - b.x))) || 1;
    return { x: -b.vy / v * lado, y: b.vx / v * lado };
  }
  return null;
}

function arbustoMasCercano(l, enemigo) {
  const mapa = partida.mapa;
  let mejor = null, dm = Infinity;
  for (let f = 0; f < mapa.filas; f++) for (let c = 0; c < mapa.columnas; c++) {
    if (mapa.casillas[f][c] !== 'b') continue;
    const bx = c * TILE + TILE / 2, by = f * TILE + TILE / 2;
    if (enGas(bx, by)) continue;
    const d = distancia(l.x, l.y, bx, by) + (enemigo && distancia(enemigo.x, enemigo.y, bx, by) < 3 * TILE ? 5 * TILE : 0);
    if (d < dm) { dm = d; mejor = { x: bx, y: by }; }
  }
  return mejor;
}

function metaSupervivencia(l) {
  const mapa = partida.mapa, ia = l.ia;
  let mejor = null, dm = Infinity;
  for (const c of partida.cubos) {
    const d = distancia(l.x, l.y, c.x, c.y);
    if (!enGas(c.x, c.y) && d < dm) { dm = d; mejor = c; }
  }
  if (mejor && dm < 8 * TILE) return { meta: mejor, modo: 'avanzar' };
  let caja = null; dm = Infinity;
  for (const clave of Object.keys(mapa.cajas)) {
    const [f, c] = clave.split(',').map(Number);
    const bx = c * TILE + TILE / 2, by = f * TILE + TILE / 2;
    const d = distancia(l.x, l.y, bx, by);
    if (!enGas(bx, by) && d < dm) { dm = d; caja = { x: bx, y: by, esCaja: true }; }
  }
  if (caja && dm < 10 * TILE) return { meta: caja, modo: 'caja' };
  if (!ia.deambular || distancia(l.x, l.y, ia.deambular.x, ia.deambular.y) < TILE || enGas(ia.deambular.x, ia.deambular.y)) {
    const margen = (partida.gas.anillo + 2) * TILE;
    ia.deambular = { x: azar(margen, mapa.ancho - margen), y: azar(margen, mapa.alto - margen) };
  }
  return { meta: ia.deambular, modo: 'avanzar' };
}

function metaCristales(l, enemigos) {
  const mapa = partida.mapa, ia = l.ia;
  if (cristalesEquipo(l.equipo) >= 10 && l.cristales > 0) {
    return { meta: { x: (l.aparicion.x + mapa.mina.x) / 2, y: (l.aparicion.y * 2 + mapa.mina.y) / 3 }, modo: 'defender' };
  }
  let mejor = null, dm = Infinity;
  for (const c of partida.cristales) {
    const d = distancia(l.x, l.y, c.x, c.y) + (hayVision(mapa, l.x, l.y, c.x, c.y) ? 0 : 3 * TILE);
    if (d < dm) { dm = d; mejor = c; }
  }
  let meta;
  if (mejor && dm < 9 * TILE) meta = mejor;
  else {
    if (!ia.deambular || distancia(l.x, l.y, ia.deambular.x, ia.deambular.y) < TILE) ia.deambular = { x: mapa.mina.x + azar(-2.5, 2.5) * TILE, y: mapa.mina.y + azar(-2.5, 2.5) * TILE };
    meta = ia.deambular;
  }
  if (cristalesEquipo(1 - l.equipo) >= 8) {
    const portador = enemigos.filter(e => e.cristales > 0).sort((a, b) => distancia(l.x, l.y, a.x, a.y) - distancia(l.x, l.y, b.x, b.y))[0];
    if (portador) return { meta: portador, modo: 'cazar', objetivo: portador };
  }
  return { meta, modo: 'avanzar' };
}

function metaAtraco(l, enemigos) {
  const mapa = partida.mapa;
  const propia = mapa.cajasFuertes.find(c => c.equipo === l.equipo);
  const rival = mapa.cajasFuertes.find(c => c.equipo !== l.equipo);
  const esDefensor = l.ia.rol === 0;
  const intrusos = enemigos.filter(e => propia && distancia(e.x, e.y, propia.x, propia.y) < 6 * TILE);
  if (intrusos.length && (esDefensor || (propia && distancia(l.x, l.y, propia.x, propia.y) < 7 * TILE))) {
    const o = intrusos.sort((a, b) => distancia(l.x, l.y, a.x, a.y) - distancia(l.x, l.y, b.x, b.y))[0];
    return { meta: o, modo: 'cazar', objetivo: o };
  }
  if (esDefensor && propia && partida.tiempo < 15) {
    return { meta: { x: propia.x, y: propia.y + (l.equipo === 0 ? 3 : -3) * TILE }, modo: 'defender' };
  }
  if (rival && rival.vida > 0) {
    const d = distancia(l.x, l.y, rival.x, rival.y);
    const vision = l.def.ataque.tipo === 'lanzamiento' || hayVision(mapa, l.x, l.y, rival.x, rival.y);
    // Si ya la tiene a tiro, se queda donde está y dispara; si no, se acerca por el camino que encuentre
    if (d < l.def.alcance * 0.85 && vision) return { meta: null, modo: 'cajaFuerte', cajaFuerte: rival };
    const a = anguloHacia(rival.x, rival.y, l.x, l.y) + (l.ia.rol - 1) * 0.35;
    const cerca = { x: rival.x + Math.cos(a) * (rival.r + l.r + 20), y: rival.y + Math.sin(a) * (rival.r + l.r + 20), paradaA: 10 };
    return { meta: circuloChoca(mapa, cerca.x, cerca.y, l.r) ? { x: rival.x, y: rival.y, paradaA: rival.r + l.r + 12 } : cerca, modo: 'cajaFuerte', cajaFuerte: rival };
  }
  return { meta: null, modo: 'avanzar' };
}

function metaBalon(l, enemigos) {
  const b = partida.balon, mapa = partida.mapa;
  if (!b) return { meta: null, modo: 'avanzar' };
  const porteriaRival = porteriaCentro(1 - l.equipo), porteriaPropia = porteriaCentro(l.equipo);
  // El compañero más cercano al balón va a por él
  const equipo = aliadosDe(l).sort((p, q) => distancia(p.x, p.y, b.x, b.y) - distancia(q.x, q.y, b.x, b.y));
  const soyElMasCercano = equipo[0] === l;
  if (soyElMasCercano || distancia(l.x, l.y, b.x, b.y) < 2.5 * TILE) {
    // Colocarse detrás del balón respecto a la portería rival y empujarlo
    const a = anguloHacia(porteriaRival.x, porteriaRival.y, b.x, b.y);
    const detras = { x: b.x + Math.cos(a) * (l.r + b.r + 6), y: b.y + Math.sin(a) * (l.r + b.r + 6) };
    const dDetras = distancia(l.x, l.y, detras.x, detras.y);
    const detrasBloqueado = circuloChoca(mapa, detras.x, detras.y, l.r);
    if (dDetras < 14 || detrasBloqueado || distancia(l.x, l.y, b.x, b.y) < l.r + b.r + 8) {
      // Empujar: ir hacia el balón. Si está alineado detrás del balón respecto a la portería, chutar disparándole
      const haciaBalon = anguloHacia(l.x, l.y, b.x, b.y), haciaPorteria = anguloHacia(b.x, b.y, porteriaRival.x, porteriaRival.y);
      const desvio = Math.abs(Math.atan2(Math.sin(haciaBalon - haciaPorteria), Math.cos(haciaBalon - haciaPorteria)));
      if (desvio < 0.45 && distancia(l.x, l.y, b.x, b.y) < l.def.alcance && partida.tiempo - l.ultimoDisparo > 0.4 && l.def.ataque.tipo !== 'lanzamiento') {
        disparar(l, haciaBalon, distancia(l.x, l.y, b.x, b.y));
      }
      return { meta: b, modo: 'balon' };
    }
    return { meta: detras, modo: 'balon' };
  }
  // El segundo defiende, el tercero presiona
  if (l.ia.rol === 0 || equipo[equipo.length - 1] === l) {
    const a = anguloHacia(porteriaPropia.x, porteriaPropia.y, b.x, b.y);
    return { meta: { x: porteriaPropia.x + Math.cos(a) * 3.5 * TILE, y: porteriaPropia.y + Math.sin(a) * 3.5 * TILE }, modo: 'portero' };
  }
  const o = enemigos.sort((p, q) => distancia(p.x, p.y, b.x, b.y) - distancia(q.x, q.y, b.x, b.y))[0];
  return o ? { meta: o, modo: 'cazar' } : { meta: b, modo: 'avanzar' };
}

function porteriaCentro(equipo) {
  const ps = partida.mapa.porterias.filter(p => p.equipo === equipo);
  if (!ps.length) return { x: partida.mapa.ancho / 2, y: equipo === 0 ? 0 : partida.mapa.alto };
  return { x: ps.reduce((s, p) => s + p.c * TILE + TILE / 2, 0) / ps.length, y: ps.reduce((s, p) => s + p.f * TILE + TILE / 2, 0) / ps.length };
}

function quiereUsarSuper(l, objetivo, dist) {
  const tipo = l.def.super.tipo;
  const alcance = l.def.alcance;
  if (tipo === 'embestida' || tipo === 'parpadeo') return dist < 4.5 * TILE;
  if (tipo === 'tormenta') return dist < l.def.super.radio * 0.9;
  if (tipo === 'curacion') return l.vida < l.vidaMax * 0.6 || aliadosDe(l).some(a => a !== l && a.vida < a.vidaMax * 0.5 && distancia(l.x, l.y, a.x, a.y) < l.def.super.radio);
  if (tipo === 'escudo') return l.vida < l.vidaMax * 0.7 && dist < alcance;
  return dist < alcance * 0.9;
}
