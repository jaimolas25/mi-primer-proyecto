'use strict';
/* =========================================================
   PARTIDA: creación, bucle de actualización y final
   ========================================================= */
function nuevaPartida(ajustes) {
  const modoDef = MODOS[ajustes.modo];
  const nombreMapa = ajustes.mapa && modoDef.mapas.includes(ajustes.mapa) ? ajustes.mapa : elegir(modoDef.mapas);
  const mapa = construirMapa(nombreMapa);
  const tipos = Object.keys(LUCHADORES);
  const nombres = mezclar(NOMBRES_BOT);
  const luchadores = [];
  const nivelJugador = progreso.nivel(ajustes.luchador);
  // Los bots tienen un nivel parecido al del jugador
  const nivelBot = () => limitar(nivelJugador + azarEntero(-1, 1), 1, NIVEL_MAXIMO);

  if (modoDef.equipos) {
    luchadores.push(crearLuchador(ajustes.luchador, 0, ajustes.nombre || 'Tú', true, mapa.apariciones[0][1] || mapa.apariciones[0][0], nivelJugador));
    const aliados = mezclar(tipos.filter(t => t !== ajustes.luchador)).slice(0, 2);
    aliados.forEach((t, i) => luchadores.push(crearLuchador(t, 0, nombres[i], false, mapa.apariciones[0][i === 0 ? 0 : 2], nivelBot())));
    mezclar(tipos).slice(0, 3).forEach((t, i) => luchadores.push(crearLuchador(t, 1, nombres[2 + i], false, mapa.apariciones[1][i], nivelBot())));
    luchadores.forEach((l, i) => { l.ia.rol = i % 3; });
  } else {
    const puntos = mezclar(mapa.aparicionesSupervivencia);
    luchadores.push(crearLuchador(ajustes.luchador, 0, ajustes.nombre || 'Tú', true, puntos[0], nivelJugador));
    const rivales = mezclar(tipos.concat(mezclar(tipos))).slice(0, modoDef.jugadores - 1);
    rivales.forEach((t, i) => luchadores.push(crearLuchador(t, i + 1, nombres[i], false, puntos[(i + 1) % puntos.length], nivelBot())));
    luchadores.forEach(l => { l.invulnerable = 3; });
  }

  partida = {
    modo: ajustes.modo, modoDef, mapa, luchadores,
    balas: [], cristales: [], cubos: [], particulas: [], textos: [], avisos: [], rayos: [],
    tiempo: 0, fase: 'intro', introRestante: 3.6, finRestante: 0,
    ganador: null, motivo: '', puestoJugador: 0, estrella: null,
    temblor: 0, camara: { x: 0, y: 0, iniciada: false },
    dificultad: DIFICULTADES[ajustes.dificultad],
    terminada: false, recompensas: null, balon: null, goles: [0, 0], pausaGol: 0, gas: { anillo: 0, proximo: 1e9 },
  };
  prepararModo(partida);
  return partida;
}

function actualizar(dt) {
  const p = partida;
  const mapa = p.mapa;
  p.temblor = Math.max(0, p.temblor - dt * 30);

  if (p.fase === 'intro') {
    const antes = Math.ceil(p.introRestante);
    p.introRestante -= dt;
    const ahora = Math.ceil(p.introRestante);
    if (ahora !== antes && ahora > 0 && ahora <= 3) sonido.cuenta();
    if (p.introRestante <= 0) { p.fase = 'jugando'; sonido.inicio(); aviso(mensajeInicio(p.modo), 3); sonido.cambiarTema('combate'); }
    actualizarCamara(dt);
    return;
  }
  if (p.fase === 'fin') {
    p.finRestante -= dt;
    const lento = dt * 0.3;
    actualizarEfectos(lento);
    if (p.finRestante <= 0 && !p.terminada) { p.terminada = true; mostrarResultados(); }
    return;
  }

  p.tiempo += dt;
  actualizarMapa(mapa, dt);
  actualizarModo(p, dt);
  if (p.fase !== 'jugando') return;

  for (const l of p.luchadores) {
    if (l.muerto) {
      l.reaparicion -= dt;
      if (l.reaparicion <= 0) reaparecer(l);
      continue;
    }
    l.invulnerable = Math.max(0, l.invulnerable - dt);
    l.enfriamiento = Math.max(0, l.enfriamiento - dt);
    l.enfriamientoGadget = Math.max(0, l.enfriamientoGadget - dt);
    l.escudo = Math.max(0, l.escudo - dt);
    l.lento = Math.max(0, l.lento - dt);
    l.rapido = Math.max(0, l.rapido - dt);
    l.golpeado = Math.max(0, l.golpeado - dt);

    if (l.municion < 3) {
      l.recargando += dt;
      if (l.recargando >= l.def.recarga) { l.recargando = 0; l.municion += 1; }
    }
    if (p.tiempo - l.ultimoDano > ESPERA_CURACION && l.vida < l.vidaMax) l.vida = Math.min(l.vidaMax, l.vida + l.vidaMax * 0.13 * dt);

    if (p.modo === 'supervivencia' && enGas(l.x, l.y)) {
      l.vida -= DANO_GAS * dt;
      l.ultimoDano = p.tiempo;
      if (Math.random() < dt * 6) particulas(l.x + azar(-15, 15), l.y + azar(-15, 15), '#8ef05a', 1, 40);
      if (l.vida <= 0) { morir(l, null); continue; }
    }

    for (const d of l.colaDisparos) d.en -= dt;
    while (l.colaDisparos.length && l.colaDisparos[0].en <= 0) {
      const d = l.colaDisparos.shift();
      crearBala(l, l.x + Math.cos(d.angulo) * (l.r + 6), l.y + Math.sin(d.angulo) * (l.r + 6), d.angulo + azar(-0.02, 0.02), d.opciones);
      fogonazo(l);
    }

    const antesX = l.x, antesY = l.y;
    if (l.embestida) {
      const e = l.embestida;
      e.restante -= dt;
      const movio = moverConColision(mapa, l, e.vx * dt, e.vy * dt);
      for (const o of enemigosDe(l)) {
        if (!e.golpeados.has(o) && distancia(l.x, l.y, o.x, o.y) < l.r + o.r + 6) {
          e.golpeados.add(o);
          herir(o, e.dano, l);
          const a = anguloHacia(l.x, l.y, o.x, o.y);
          moverConColision(mapa, o, Math.cos(a) * 40, Math.sin(a) * 40);
        }
      }
      const dirA = Math.atan2(e.vy, e.vx);
      const fx = l.x + Math.cos(dirA) * (l.r + 6), fy = l.y + Math.sin(dirA) * (l.r + 6);
      if (casillaEn(mapa, fx, fy) === 'C') danarCaja(mapa, fx, fy, e.dano * dt * 4, l);
      for (const cf of mapa.cajasFuertes) if (cf.equipo !== l.equipo && !e.golpeados.has(cf) && distancia(l.x, l.y, cf.x, cf.y) < l.r + cf.r + 8) { e.golpeados.add(cf); herirCajaFuerte(cf, e.dano, l); }
      particulas(l.x, l.y, l.def.color, 2, 60);
      if (e.restante <= 0 || !movio) l.embestida = null;
    } else {
      let dx = 0, dy = 0;
      if (l.esJugador) { dx = entrada.movX; dy = entrada.movY; }
      else { pensarBot(l, dt); dx = l.ia.dirX; dy = l.ia.dirY; }
      const n = Math.hypot(dx, dy);
      if (n > 0) {
        dx /= Math.max(1, n); dy /= Math.max(1, n);
        const velocidad = l.def.velocidad * (l.lento > 0 ? 0.5 : 1) * (l.rapido > 0 ? l.def.gadget.factor || 1.4 : 1);
        moverConColision(mapa, l, dx * velocidad * dt, dy * velocidad * dt);
        if (!l.esJugador || !entrada.apuntando) l.angulo = Math.atan2(dy, dx);
      }
      if (l.esJugador) { l.ia.dirX = dx; l.ia.dirY = dy; }
    }
    l.vx = (l.x - antesX) / dt; l.vy = (l.y - antesY) / dt;
    l.moviendose = Math.hypot(l.vx, l.vy) > 5;
    l.animacion += dt * (l.moviendose ? 10 : 3);

    for (let i = p.cristales.length - 1; i >= 0; i--) {
      const c = p.cristales[i];
      if (c.aparicion > 0) continue;
      if (distancia(l.x, l.y, c.x, c.y) < l.r + 12) {
        p.cristales.splice(i, 1);
        l.cristales += 1; l.cristalesRecogidos += 1;
        textoFlotante(l.x, l.y - 34, '+1', '#c77dff');
        if (l.esJugador) sonido.recoger();
      }
    }
    for (let i = p.cubos.length - 1; i >= 0; i--) {
      const c = p.cubos[i];
      if (c.aparicion > 0) continue;
      if (distancia(l.x, l.y, c.x, c.y) < l.r + 12) { p.cubos.splice(i, 1); recogerCubo(l); }
    }
  }

  // Balas
  for (let i = p.balas.length - 1; i >= 0; i--) {
    const b = p.balas[i];
    b.px = b.x; b.py = b.y;
    const paso = Math.hypot(b.vx, b.vy) * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.recorrido += paso;
    let eliminar = false;
    if (b.lanzamiento) {
      if (b.recorrido >= b.alcance) { explotar(b); eliminar = true; }
    } else {
      if (b.recorrido >= b.alcance) eliminar = true;
      else if (esMuro(mapa, b.x, b.y)) {
        if (casillaEn(mapa, b.x, b.y) === 'C') danarCaja(mapa, b.x, b.y, b.dano * b.duenio.multDano, b.duenio);
        else particulas(b.x, b.y, '#cccccc', 4, 70);
        if (!b.perforante) eliminar = true;
      } else {
        for (const o of p.luchadores) {
          if (o.muerto || o.equipo === b.equipo || b.golpeados.has(o)) continue;
          if (distancia(b.x, b.y, o.x, o.y) < b.r + o.r) {
            b.golpeados.add(o);
            herir(o, b.dano, b.duenio);
            if (b.cadena > 0) saltarRayo(b, o);
            if (!b.perforante) { eliminar = true; break; }
          }
        }
        if (!eliminar) for (const cf of mapa.cajasFuertes) {
          if (cf.equipo === b.equipo || cf.vida <= 0 || b.golpeados.has(cf)) continue;
          if (distancia(b.x, b.y, cf.x, cf.y) < b.r + cf.r) { b.golpeados.add(cf); herirCajaFuerte(cf, b.dano, b.duenio); if (!b.perforante) { eliminar = true; break; } }
        }
        if (!eliminar && p.balon && p.pausaGol <= 0 && distancia(b.x, b.y, p.balon.x, p.balon.y) < b.r + p.balon.r) {
          golpearBalon(p.balon, Math.atan2(b.vy, b.vx), b.esSuper ? 760 : 560, b.duenio);
          eliminar = true;
        }
      }
    }
    if (eliminar) p.balas.splice(i, 1);
  }

  for (const c of p.cristales) { c.fase += dt * 3; c.aparicion = Math.max(0, c.aparicion - dt); }
  for (const c of p.cubos) { c.fase += dt * 3; c.aparicion = Math.max(0, c.aparicion - dt); }
  actualizarEfectos(dt);
  actualizarCamara(dt);
}

function actualizarEfectos(dt) {
  const p = partida;
  for (let i = p.particulas.length - 1; i >= 0; i--) {
    const q = p.particulas[i];
    q.vida -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.9; q.vy *= 0.9;
    if (q.vida <= 0) p.particulas.splice(i, 1);
  }
  for (let i = p.rayos.length - 1; i >= 0; i--) { p.rayos[i].vida -= dt; if (p.rayos[i].vida <= 0) p.rayos.splice(i, 1); }
  for (let i = p.textos.length - 1; i >= 0; i--) {
    const t = p.textos[i];
    t.vida -= dt; t.y -= 40 * dt;
    if (t.vida <= 0) p.textos.splice(i, 1);
  }
  for (let i = p.avisos.length - 1; i >= 0; i--) {
    p.avisos[i].restante -= dt;
    if (p.avisos[i].restante <= 0) p.avisos.splice(i, 1);
  }
}

function actualizarCamara(dt) {
  const p = partida, mapa = p.mapa, j = jugador();
  const objetivoX = mapa.ancho <= W ? (mapa.ancho - W) / 2 : limitar(j.x - W / 2, 0, mapa.ancho - W);
  const objetivoY = mapa.alto <= H ? (mapa.alto - H) / 2 : limitar(j.y - H / 2, 0, mapa.alto - H);
  if (!p.camara.iniciada) { p.camara.x = objetivoX; p.camara.y = objetivoY; p.camara.iniciada = true; return; }
  const f = 1 - Math.pow(0.001, dt);
  p.camara.x += (objetivoX - p.camara.x) * f;
  p.camara.y += (objetivoY - p.camara.y) * f;
}

// ganador: 0 = el jugador o su equipo, 1 = el rival, -1 = empate, -2 = eliminado en supervivencia
function terminar(ganador, motivo) {
  const p = partida;
  if (p.fase === 'fin') return;
  p.fase = 'fin';
  p.finRestante = 2.2;
  p.ganador = ganador;
  p.motivo = motivo;
  const j = jugador();

  // Jugador estrella: el mejor del equipo ganador (o de todos en supervivencia)
  const candidatos = p.modoDef.equipos && ganador >= 0 ? p.luchadores.filter(l => l.equipo === ganador) : p.luchadores;
  p.estrella = candidatos.slice().sort((a, b) => puntuacion(b) - puntuacion(a))[0];

  // Recompensas
  let trofeos = 0, fichas = 0;
  if (p.modo === 'supervivencia') {
    const puesto = limitar(j.puesto || p.luchadores.length, 1, p.luchadores.length);
    p.puestoJugador = puesto;
    trofeos = TROFEOS_PUESTO[puesto - 1];
    fichas = Math.max(5, 25 - 3 * (puesto - 1));
  } else {
    const r = ganador === 0 ? 'victoria' : ganador === 1 ? 'derrota' : 'empate';
    trofeos = TROFEOS_EQUIPO[r]; fichas = FICHAS_EQUIPO[r];
  }
  if (p.estrella === j) { trofeos += 1; fichas += 5; }
  const trofeosAntes = progreso.trofeos(j.tipo);
  const cambioTrofeos = progreso.sumarTrofeos(j.tipo, trofeos);
  const cajasNuevas = progreso.sumarFichas(fichas);
  progreso.datos.partidas += 1;
  if (ganador === 0) progreso.datos.victorias += 1;
  const camino = progreso.cobrarCaminoTrofeos();
  progreso.guardar();
  p.recompensas = { trofeos: cambioTrofeos, trofeosAntes, fichas, cajasNuevas, camino };

  const victoria = ganador === 0 || (p.modo === 'supervivencia' && p.puestoJugador <= 3);
  if (victoria) sonido.victoria(); else if (ganador !== -1) sonido.derrota();
  sonido.cambiarTema('lobby');
}
