'use strict';
/* =========================================================
   MODOS DE JUEGO: preparación, reglas, fin de partida
   ========================================================= */
const cristalesEquipo = equipo => partida.luchadores.filter(l => l.equipo === equipo && !l.muerto).reduce((s, l) => s + l.cristales, 0);

function enGas(x, y) {
  if (partida.modo !== 'supervivencia') return false;
  const a = partida.gas.anillo;
  const c = x / TILE, f = y / TILE;
  return c < a || f < a || c > partida.mapa.columnas - a || f > partida.mapa.filas - a;
}

function prepararModo(p) {
  if (p.modo === 'cristales') { p.temporizadorCristal = 2.5; p.cuentaAtras = { equipo: -1, restante: 0 }; }
  if (p.modo === 'supervivencia') { p.gas = { anillo: 0, proximo: 30, aviso: false }; p.eliminados = 0; }
  if (p.modo === 'balon') { p.balon = { x: p.mapa.balon.x, y: p.mapa.balon.y, vx: 0, vy: 0, r: 13, giro: 0, ultimoToque: null }; p.goles = [0, 0]; p.pausaGol = 0; }
  if (p.modo === 'atraco') { /* las cajas fuertes vienen con el mapa */ }
}

function mensajeInicio(modo) {
  return {
    cristales: '¡Reúne 10 cristales y aguanta 15 s!',
    supervivencia: '¡Rompe cajas, coge cubos y sé el último en pie!',
    atraco: '¡Destruye la caja fuerte rival y defiende la tuya!',
    balon: '¡Marca dos goles para ganar!',
  }[modo];
}

function actualizarModo(p, dt) {
  const mapa = p.mapa;
  if (p.modo === 'cristales') {
    const total = p.cristales.length + p.luchadores.reduce((s, l) => s + l.cristales, 0);
    p.temporizadorCristal -= dt;
    if (p.temporizadorCristal <= 0) {
      p.temporizadorCristal = 5;
      if (total < 24) {
        p.cristales.push({ x: mapa.mina.x + azar(-30, 30), y: mapa.mina.y + azar(-30, 30), fase: Math.random() * 6, aparicion: 0.5 });
        particulas(mapa.mina.x, mapa.mina.y, '#c77dff', 8, 60);
      }
    }
    const c0 = cristalesEquipo(0), c1 = cristalesEquipo(1);
    let lider = -1;
    if (c0 >= 10 && c1 < 10) lider = 0;
    if (c1 >= 10 && c0 < 10) lider = 1;
    if (lider !== p.cuentaAtras.equipo) {
      if (p.cuentaAtras.equipo !== -1 && lider === -1) aviso('¡Cuenta atrás cancelada!', 1.5, '#ffd43b');
      p.cuentaAtras.equipo = lider;
      p.cuentaAtras.restante = 15;
      if (lider === 0) aviso('¡Tu equipo tiene 10 cristales! ¡Aguantad!', 2, '#8ef05a');
      if (lider === 1) aviso('¡El rival tiene 10 cristales! ¡A por ellos!', 2, '#ff6b6b');
    }
    if (p.cuentaAtras.equipo !== -1) {
      p.cuentaAtras.restante -= dt;
      if (p.cuentaAtras.restante <= 0) terminar(p.cuentaAtras.equipo, 'Un equipo ha conservado 10 cristales durante 15 segundos.');
    }
    if (p.tiempo >= MODOS.cristales.duracion) {
      if (c0 > c1) terminar(0, 'Se acabó el tiempo: tu equipo tenía más cristales.');
      else if (c1 > c0) terminar(1, 'Se acabó el tiempo: el rival tenía más cristales.');
      else terminar(-1, 'Se acabó el tiempo con los mismos cristales.');
    }
  }

  if (p.modo === 'supervivencia') {
    if (p.tiempo > p.gas.proximo - 5 && !p.gas.aviso) { p.gas.aviso = true; aviso('¡El gas avanza en 5 segundos!', 2, '#8ef05a'); }
    if (p.tiempo > p.gas.proximo) {
      p.gas.anillo = Math.min(p.gas.anillo + 1, Math.floor(Math.min(mapa.columnas, mapa.filas) / 2) - 3);
      p.gas.proximo = p.tiempo + 12;
      p.gas.aviso = false;
    }
    const j = jugador();
    if (j.muerto) terminar(-2, 'Has quedado en el puesto ' + j.puesto + ' de ' + p.luchadores.length + '.');
    else if (vivos() === 1) { j.puesto = 1; terminar(0, '¡Eres el último en pie!'); }
  }

  if (p.modo === 'atraco') {
    const propia = mapa.cajasFuertes.find(c => c.equipo === 0), rival = mapa.cajasFuertes.find(c => c.equipo === 1);
    if (rival.vida <= 0) terminar(0, '¡Habéis reventado la caja fuerte rival!');
    else if (propia.vida <= 0) terminar(1, 'El rival ha destruido vuestra caja fuerte.');
    else if (p.tiempo >= MODOS.atraco.duracion) {
      if (propia.vida > rival.vida) terminar(0, 'Se acabó el tiempo: vuestra caja fuerte aguantó mejor.');
      else if (rival.vida > propia.vida) terminar(1, 'Se acabó el tiempo: la caja fuerte rival aguantó mejor.');
      else terminar(-1, 'Se acabó el tiempo con las dos cajas igual de dañadas.');
    }
  }

  if (p.modo === 'balon') {
    if (p.pausaGol > 0) {
      p.pausaGol -= dt;
      if (p.pausaGol <= 0) reiniciarPosiciones();
    } else actualizarBalon(dt);
    if (p.goles[0] >= 2) terminar(0, '¡Dos goles! Victoria por la vía rápida.');
    else if (p.goles[1] >= 2) terminar(1, 'El rival ha marcado dos goles.');
    else if (p.tiempo >= MODOS.balon.duracion) {
      if (p.goles[0] > p.goles[1]) terminar(0, 'Fin del partido: ' + p.goles[0] + ' a ' + p.goles[1] + '.');
      else if (p.goles[1] > p.goles[0]) terminar(1, 'Fin del partido: ' + p.goles[0] + ' a ' + p.goles[1] + '.');
      else terminar(-1, 'Empate a ' + p.goles[0] + '.');
    }
  }
}

function marcarGol(equipo, quien) {
  const p = partida;
  if (p.pausaGol > 0 || p.fase !== 'jugando') return;
  p.goles[equipo] += 1;
  if (quien && quien.equipo === equipo) quien.goles += 1;
  p.pausaGol = 2.5;
  p.balon.vx = 0; p.balon.vy = 0;
  sonido.gol();
  particulas(p.balon.x, p.balon.y, equipo === 0 ? '#4fa3ff' : '#ff4d4d', 40, 220);
  aviso(equipo === jugador().equipo ? '¡GOOOL de tu equipo!' + (quien && quien.esJugador ? ' ¡Lo has marcado tú!' : '') : 'Gol del rival…', 2.4, equipo === jugador().equipo ? '#8ef05a' : '#ff6b6b');
  p.temblor = 8;
}

function reiniciarPosiciones() {
  const p = partida;
  p.balon.x = p.mapa.balon.x; p.balon.y = p.mapa.balon.y; p.balon.vx = 0; p.balon.vy = 0;
  for (const l of p.luchadores) {
    if (l.muerto) continue;
    l.x = l.aparicion.x; l.y = l.aparicion.y; l.invulnerable = 1.2;
    l.angulo = l.equipo === 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  p.balas = [];
}

// Texto del marcador superior según el modo
function marcadorModo(p) {
  if (p.modo === 'cristales') return { tipo: 'equipos', a: cristalesEquipo(0), b: cristalesEquipo(1), icono: 'cristal' };
  if (p.modo === 'balon') return { tipo: 'equipos', a: p.goles[0], b: p.goles[1], icono: 'balon' };
  if (p.modo === 'atraco') {
    const propia = p.mapa.cajasFuertes.find(c => c.equipo === 0), rival = p.mapa.cajasFuertes.find(c => c.equipo === 1);
    return { tipo: 'barras', a: propia.vida / propia.vidaMax, b: rival.vida / rival.vidaMax, textoA: Math.round(propia.vida / propia.vidaMax * 100) + '%', textoB: Math.round(rival.vida / rival.vidaMax * 100) + '%' };
  }
  return { tipo: 'vivos', vivos: vivos(), gasEn: Math.max(0, p.gas.proximo - p.tiempo) };
}

// Puntuación para el jugador estrella
function puntuacion(l) {
  return l.bajas * 2 + l.danoHecho / 1000 + l.cristalesRecogidos * 1.5 + l.goles * 4 + l.danoCaja / 1500 + l.curado / 1200 - l.muertes * 0.5 + (l.puesto ? (9 - l.puesto) : 0);
}
