'use strict';
/* =========================================================
   LOBBY: menú principal, luchadores, modos, cajas, ajustes y resultados
   ========================================================= */
const lobby = {
  animacionRetrato: 0,

  $(id) { return document.getElementById(id); },

  iniciar() {
    this.$('boton-jugar').addEventListener('click', () => { sonido.clic(); app.empezarPartida(); });
    this.$('boton-luchadores').addEventListener('click', () => { sonido.clic(); this.mostrarLuchadores(); });
    this.$('boton-mejorar').addEventListener('click', () => { sonido.clic(); this.mejorar(); });
    this.$('modo-actual').addEventListener('click', () => { sonido.clic(); this.mostrarModos(); });
    this.$('boton-ajustes').addEventListener('click', () => { sonido.clic(); app.mostrarPantalla('ajustes'); });
    this.$('perfil').addEventListener('click', () => { sonido.clic(); app.mostrarPantalla('ajustes'); });
    this.$('boton-cajas').addEventListener('click', () => { sonido.clic(); this.abrirCaja(); });
    this.$('caja-grande').addEventListener('click', () => this.revelarCaja());
    this.$('cerrar-caja').addEventListener('click', () => { this.$('caja-modal').classList.add('oculta'); this.actualizarLobby(); });
    document.querySelectorAll('[data-volver]').forEach(b => b.addEventListener('click', () => { sonido.clic(); app.mostrarPantalla('lobby'); }));
    this.$('resultado-otra').addEventListener('click', () => { sonido.clic(); app.empezarPartida(); });
    this.$('resultado-lobby').addEventListener('click', () => { sonido.clic(); app.mostrarPantalla('lobby'); });

    // Ajustes
    const d = progreso.datos;
    this.$('ajuste-nombre').value = d.nombre;
    this.$('ajuste-dificultad').value = d.ajustes.dificultad;
    this.$('ajuste-sonido').checked = d.ajustes.sonido;
    this.$('ajuste-musica').checked = d.ajustes.musica;
    this.$('ajuste-nombre').addEventListener('change', e => { d.nombre = e.target.value.trim().slice(0, 12) || 'Tú'; progreso.guardar(); this.actualizarLobby(); });
    this.$('ajuste-dificultad').addEventListener('change', e => { d.ajustes.dificultad = e.target.value; progreso.guardar(); });
    this.$('ajuste-sonido').addEventListener('change', e => { d.ajustes.sonido = e.target.checked; sonido.activo = e.target.checked; progreso.guardar(); });
    this.$('ajuste-musica').addEventListener('change', e => { d.ajustes.musica = e.target.checked; sonido.ajustarMusica(e.target.checked); progreso.guardar(); });
    this.$('ajuste-reiniciar').addEventListener('click', () => {
      if (confirm('¿Seguro? Se borrarán trofeos, monedas, niveles y luchadores desbloqueados.')) { progreso.reiniciar(); location.reload(); }
    });
    sonido.activo = d.ajustes.sonido;
    sonido.musicaActiva = d.ajustes.musica;

    this.actualizarLobby();
    const animar = () => {
      if (app.pantalla === 'lobby') { this.animacionRetrato += 0.05; this.dibujarRetratoGrande(); }
      requestAnimationFrame(animar);
    };
    animar();
  },

  actualizarLobby() {
    const d = progreso.datos, tipo = d.ajustes.luchador, def = LUCHADORES[tipo];
    this.$('perfil-nombre').textContent = d.nombre;
    this.$('perfil-avatar').textContent = d.nombre.slice(0, 1).toUpperCase();
    this.$('perfil-partidas').textContent = d.victorias + ' victorias · ' + d.partidas + ' partidas';
    this.$('recurso-trofeos').textContent = progreso.trofeosTotales();
    this.$('recurso-monedas').textContent = d.monedas;
    this.$('recurso-puntos').textContent = Object.values(d.puntos).reduce((s, n) => s + n, 0);

    // Luchador
    this.$('nombre-luchador').textContent = def.nombre;
    this.$('etiqueta-rareza').textContent = RAREZAS[def.rareza].nombre;
    this.$('etiqueta-rareza').className = 'etiqueta rareza-' + def.rareza;
    this.$('etiqueta-rol').textContent = def.rol;
    this.$('etiqueta-trofeos').textContent = '🏆 ' + progreso.trofeos(tipo);
    this.$('etiqueta-nivel').textContent = '⚡ Poder ' + progreso.nivel(tipo);

    // Mejora
    const n = progreso.nivel(tipo);
    this.$('mejora-nivel').textContent = 'Nivel de poder ' + n + (n >= NIVEL_MAXIMO ? ' (máximo)' : '');
    if (n < NIVEL_MAXIMO) {
      const p = progreso.puntos(tipo), coste = COSTE_PUNTOS[n - 1];
      this.$('mejora-barra').style.width = Math.min(100, p / coste * 100) + '%';
      this.$('mejora-texto').textContent = p + ' / ' + coste + ' puntos de poder · ' + COSTE_MONEDAS[n - 1] + ' monedas';
      this.$('boton-mejorar').disabled = !progreso.puedeMejorar(tipo);
      this.$('boton-mejorar').textContent = 'Mejorar (+5 % vida y daño)';
    } else {
      this.$('mejora-barra').style.width = '100%';
      this.$('mejora-texto').textContent = 'Este luchador está al máximo.';
      this.$('boton-mejorar').disabled = true;
      this.$('boton-mejorar').textContent = 'Nivel máximo';
    }

    // Habilidades y estadísticas
    const mult = progreso.multiplicador(tipo);
    this.$('hab-ataque').innerHTML = '<b>' + def.ataque.nombre + '</b><small>' + def.descripcion + ' Daño ' + Math.round(def.ataque.dano * mult) + (def.ataque.cantidad ? ' × ' + def.ataque.cantidad : '') + '.</small>';
    this.$('hab-super').innerHTML = '<b>' + def.super.nombre + '</b><small>' + def.descripcionSuper + '</small>';
    this.$('hab-gadget').innerHTML = '<b>' + def.gadget.nombre + ' <span style="color:#aab0e0">(' + USOS_GADGET + ' usos)</span></b><small>' + def.gadget.descripcion + '</small>';
    this.$('est-vida').textContent = Math.round(def.vida * mult);
    this.$('est-vida-barra').style.width = Math.round(def.vida / 60) + '%';
    const dano = def.ataque.dano * (def.ataque.cantidad || 1) * mult;
    this.$('est-dano').textContent = Math.round(dano);
    this.$('est-dano-barra').style.width = Math.min(100, Math.round(dano / 22)) + '%';
    this.$('est-alcance').textContent = (def.alcance / TILE).toFixed(1) + ' casillas';
    this.$('est-alcance-barra').style.width = Math.round(def.alcance / (9 * TILE) * 100) + '%';
    this.$('est-velocidad').textContent = def.velocidad > 180 ? 'Muy rápida' : def.velocidad > 165 ? 'Rápida' : def.velocidad > 150 ? 'Normal' : 'Lenta';
    this.$('est-velocidad-barra').style.width = limitar(Math.round((def.velocidad - 130) / 60 * 100), 15, 100) + '%';

    // Modo
    const modo = MODOS[d.ajustes.modo];
    this.$('modo-icono').textContent = modo.icono;
    this.$('modo-nombre').textContent = modo.nombre;
    const mapa = modo.mapas.includes(d.ajustes.mapa) ? d.ajustes.mapa : modo.mapas[0];
    this.$('modo-mapa').textContent = mapa + ' · ' + modo.descripcion;
    this.dibujarMapaMini(this.$('mapa-mini'), mapa);

    // Camino de trofeos
    const total = progreso.trofeosTotales();
    const siguiente = progreso.siguienteRecompensa();
    const anterior = CAMINO_TROFEOS.filter(r => r.trofeos <= total).pop();
    const base = anterior ? anterior.trofeos : 0;
    if (siguiente) {
      this.$('camino-barra').style.width = limitar((total - base) / (siguiente.trofeos - base) * 100, 0, 100) + '%';
      this.$('camino-icono').textContent = this.iconoRecompensa(siguiente);
      this.$('camino-texto').innerHTML = '<b>' + this.textoRecompensa(siguiente) + '</b><small>a ' + siguiente.trofeos + ' trofeos · te faltan ' + (siguiente.trofeos - total) + '</small>';
    } else {
      this.$('camino-barra').style.width = '100%';
      this.$('camino-icono').textContent = '👑';
      this.$('camino-texto').innerHTML = '<b>¡Camino completado!</b><small>Has conseguido todas las recompensas.</small>';
    }

    // Cajas
    this.$('cajas-numero').textContent = d.cajas;
    this.$('cajas-fichas').textContent = d.fichas + ' / ' + FICHAS_POR_CAJA + ' fichas para la siguiente';
    this.$('boton-cajas').disabled = d.cajas <= 0;
    this.$('boton-cajas').textContent = d.cajas > 0 ? 'Abrir caja' : 'Sin cajas';

    this.dibujarRetratoGrande();
  },

  iconoRecompensa(r) { return { monedas: '🪙', caja: '🎁', puntos: '⚡', luchador: '🦸' }[r.tipo]; },
  textoRecompensa(r) {
    if (r.tipo === 'monedas') return r.cantidad + ' monedas';
    if (r.tipo === 'caja') return 'Caja de botín';
    if (r.tipo === 'puntos') return r.cantidad + ' puntos de poder' + (r.luchador ? ' para ' + LUCHADORES[r.luchador].nombre : '');
    return 'Nuevo luchador: ' + LUCHADORES[r.luchador].nombre;
  },

  dibujarRetratoGrande() {
    const c = this.$('retrato');
    if (!c) return;
    const tam = 300;
    if (c.width !== tam * 2) { c.width = tam * 2; c.height = tam * 2; }
    const g = c.getContext('2d');
    g.setTransform(2, 0, 0, 2, 0, 0);
    g.clearRect(0, 0, tam, tam);
    // Pedestal
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(tam / 2, tam * 0.78, tam * 0.3, tam * 0.08, 0, 0, Math.PI * 2); g.fill();
    const tipo = progreso.datos.ajustes.luchador;
    const def = LUCHADORES[tipo];
    const falso = { x: tam / 2, y: tam * 0.56, r: tam * 0.2, angulo: -0.35 + Math.sin(this.animacionRetrato * 0.6) * 0.25, def, animacion: this.animacionRetrato, moviendose: false, golpeado: 0, escudo: 0, rapido: 0, lento: 0 };
    dibujarPersonaje(g, falso, {});
  },

  dibujarMapaMini(c, nombre) {
    const def = MAPAS[nombre];
    const mapa = construirMapa(nombre);
    const esc = 6;
    c.width = mapa.columnas * esc; c.height = mapa.filas * esc;
    const g = c.getContext('2d');
    const tema = mapa.tema;
    for (let f = 0; f < mapa.filas; f++) for (let col = 0; col < mapa.columnas; col++) {
      const ch = mapa.casillas[f][col];
      g.fillStyle = tema.suelo[(f + col) % 2];
      if (ch === '#') g.fillStyle = tema.muroTop;
      if (ch === 'b') g.fillStyle = '#3f9c3a';
      if (ch === 'w') g.fillStyle = tema.agua;
      if (ch === 'f') g.fillStyle = '#7a4a1e';
      if (ch === 'C') g.fillStyle = '#c9a24a';
      if (ch === 'G') g.fillStyle = '#ffffff';
      g.fillRect(col * esc, f * esc, esc, esc);
    }
    g.fillStyle = '#c77dff';
    if (def.filas.some(r => r.includes('M'))) g.fillRect(mapa.mina.x / TILE * esc - 4, mapa.mina.y / TILE * esc - 4, 8, 8);
    for (const cf of mapa.cajasFuertes) { g.fillStyle = cf.equipo === 0 ? '#4fa3ff' : '#ff4d4d'; g.fillRect(cf.x / TILE * esc - 5, cf.y / TILE * esc - 5, 10, 10); }
    void def;
  },

  /* ---------- Luchadores ---------- */
  mostrarLuchadores() {
    const cont = this.$('rejilla-luchadores');
    cont.innerHTML = '';
    for (const [clave, def] of Object.entries(LUCHADORES)) {
      const desbloqueado = progreso.desbloqueado(clave);
      const t = document.createElement('div');
      t.className = 'tarjeta-luchador' + (clave === progreso.datos.ajustes.luchador ? ' elegida' : '') + (desbloqueado ? '' : ' bloqueada');
      const lienzo = document.createElement('canvas'); lienzo.width = 160; lienzo.height = 160;
      t.appendChild(lienzo);
      const requisito = CAMINO_TROFEOS.find(r => r.tipo === 'luchador' && r.luchador === clave);
      t.insertAdjacentHTML('beforeend',
        '<span class="trofeos">🏆 ' + progreso.trofeos(clave) + '</span>' +
        '<span class="nivel">⚡' + progreso.nivel(clave) + '</span>' +
        '<b>' + def.nombre + '</b>' +
        '<span class="rareza" style="color:' + RAREZAS[def.rareza].color + '">' + RAREZAS[def.rareza].nombre + ' · ' + def.rol + '</span>' +
        (desbloqueado ? '' : '<div class="candado">🔒<small>' + (requisito ? 'A ' + requisito.trofeos + ' trofeos' : '') + '</small></div>'));
      t.addEventListener('click', () => {
        if (!desbloqueado) { this.avisoFlotante('🔒 Se desbloquea en el camino de trofeos' + (requisito ? ' (' + requisito.trofeos + ' trofeos)' : '')); return; }
        sonido.clic();
        progreso.datos.ajustes.luchador = clave; progreso.guardar();
        this.actualizarLobby();
        app.mostrarPantalla('lobby');
      });
      cont.appendChild(t);
      const g = lienzo.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0);
      dibujarRetrato(g, clave, 80);
    }
    app.mostrarPantalla('luchadores');
  },

  /* ---------- Modos ---------- */
  mostrarModos() {
    const cont = this.$('rejilla-modos');
    cont.innerHTML = '';
    const aj = progreso.datos.ajustes;
    for (const [clave, m] of Object.entries(MODOS)) {
      const t = document.createElement('div');
      t.className = 'tarjeta-modo' + (clave === aj.modo ? ' elegida' : '');
      t.innerHTML = '<div class="cabecera"><span class="icono-modo">' + m.icono + '</span><div><b>' + m.nombre + '</b><small>' + (m.equipos ? '3 contra 3' : m.jugadores + ' jugadores, todos contra todos') + '</small></div></div><small>' + m.descripcion + '</small>';
      const mapas = document.createElement('div'); mapas.className = 'mapas';
      for (const nombre of m.mapas) {
        const o = document.createElement('span');
        o.className = 'mapa-opcion' + (clave === aj.modo && (aj.mapa === nombre || (!m.mapas.includes(aj.mapa) && nombre === m.mapas[0])) ? ' elegida' : '');
        o.textContent = '🗺 ' + nombre + ' · ' + TEMAS[MAPAS[nombre].tema].nombre;
        o.addEventListener('click', e => { e.stopPropagation(); sonido.clic(); aj.modo = clave; aj.mapa = nombre; progreso.guardar(); this.actualizarLobby(); app.mostrarPantalla('lobby'); });
        mapas.appendChild(o);
      }
      t.appendChild(mapas);
      t.addEventListener('click', () => { sonido.clic(); aj.modo = clave; if (!m.mapas.includes(aj.mapa)) aj.mapa = m.mapas[0]; progreso.guardar(); this.actualizarLobby(); app.mostrarPantalla('lobby'); });
      cont.appendChild(t);
    }
    app.mostrarPantalla('modos');
  },

  /* ---------- Mejora ---------- */
  mejorar() {
    const tipo = progreso.datos.ajustes.luchador;
    if (!progreso.mejorar(tipo)) { this.avisoFlotante('Te faltan puntos de poder o monedas'); return; }
    sonido.monedas();
    this.avisoFlotante('⚡ ' + LUCHADORES[tipo].nombre + ' sube a nivel de poder ' + progreso.nivel(tipo));
    this.actualizarLobby();
  },

  /* ---------- Cajas ---------- */
  abrirCaja() {
    if (progreso.datos.cajas <= 0) return;
    this.$('caja-modal').classList.remove('oculta');
    this.$('caja-grande').classList.remove('oculta');
    this.$('caja-grande').classList.remove('abriendo');
    this.$('premios').innerHTML = '';
    this.$('cerrar-caja').classList.add('oculta');
    this.$('caja-titulo').textContent = 'Toca la caja para abrirla';
  },

  revelarCaja() {
    const caja = this.$('caja-grande');
    if (caja.classList.contains('abriendo')) return;
    const premios = progreso.abrirCaja();
    if (!premios) return;
    sonido.abrirCaja();
    caja.classList.add('abriendo');
    setTimeout(() => {
      caja.classList.add('oculta');
      this.$('caja-titulo').textContent = '¡Premios!';
      const cont = this.$('premios');
      premios.forEach((p, i) => {
        const el = document.createElement('div');
        el.className = 'premio'; el.style.animationDelay = (i * 0.25) + 's';
        if (p.tipo === 'monedas') el.innerHTML = '<div class="icono">🪙</div><b>+' + p.cantidad + '</b><small>monedas' + (p.bonus ? ' extra' : '') + '</small>';
        else el.innerHTML = '<div class="icono">⚡</div><b>+' + p.cantidad + '</b><small>puntos de poder para ' + LUCHADORES[p.luchador].nombre + '</small>';
        cont.appendChild(el);
      });
      setTimeout(() => sonido.monedas(), 300);
      this.$('cerrar-caja').classList.remove('oculta');
      this.$('cerrar-caja').textContent = progreso.datos.cajas > 0 ? 'Abrir otra (' + progreso.datos.cajas + ')' : 'Cerrar';
      this.$('cerrar-caja').onclick = () => {
        if (progreso.datos.cajas > 0) this.abrirCaja(); else { this.$('caja-modal').classList.add('oculta'); this.actualizarLobby(); }
      };
    }, 550);
  },

  /* ---------- Resultados ---------- */
  mostrarResultados() {
    const p = partida, j = jugador(), r = p.recompensas;
    const titulo = this.$('resultado-titulo');
    if (p.modo === 'supervivencia') {
      titulo.textContent = p.puestoJugador === 1 ? '¡Victoria!' : 'Puesto ' + p.puestoJugador + '.º';
      titulo.className = p.puestoJugador === 1 ? 'victoria' : p.puestoJugador <= 3 ? 'empate' : 'derrota';
    } else {
      titulo.textContent = p.ganador === 0 ? '¡Victoria!' : p.ganador === 1 ? 'Derrota' : 'Empate';
      titulo.className = p.ganador === 0 ? 'victoria' : p.ganador === 1 ? 'derrota' : 'empate';
    }
    this.$('resultado-motivo').textContent = p.motivo;

    // Jugador estrella
    const e = p.estrella;
    this.$('estrella-nombre').textContent = e.nombre + ' (' + e.def.nombre + ')' + (e === j ? ' · ¡eres tú!' : '');
    const lienzo = this.$('estrella-retrato'); lienzo.width = 128; lienzo.height = 128;
    const g = lienzo.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); dibujarRetrato(g, e.tipo, 64);

    // Trofeos animados
    const cambio = this.$('resultado-cambio');
    cambio.textContent = (r.trofeos >= 0 ? '+' : '') + r.trofeos + (e === j ? ' (incluye +1 de estrella)' : '');
    cambio.className = 'cambio ' + (r.trofeos >= 0 ? 'positivo' : 'negativo');
    const total = this.$('resultado-trofeos');
    const inicio = r.trofeosAntes, fin = r.trofeosAntes + r.trofeos;
    const t0 = performance.now();
    const animar = ahora => {
      const t = Math.min(1, (ahora - t0) / 1200);
      total.textContent = Math.round(interpolar(inicio, fin, 1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(animar);
    };
    requestAnimationFrame(animar);
    this.$('resultado-luchador').textContent = 'Trofeos de ' + j.def.nombre;
    this.$('resultado-fichas').textContent = '+' + r.fichas + ' fichas' + (r.cajasNuevas ? ' · ¡' + r.cajasNuevas + ' caja nueva!' : ' · ' + progreso.datos.fichas + ' / ' + FICHAS_POR_CAJA + ' para la siguiente caja');

    this.$('res-bajas').textContent = j.bajas;
    this.$('res-muertes').textContent = j.muertes;
    this.$('res-dano').textContent = Math.round(j.danoHecho).toLocaleString('es-ES');
    const extra = p.modo === 'supervivencia' ? [j.cubos, 'Cubos'] : p.modo === 'cristales' ? [j.cristalesRecogidos, 'Cristales'] : p.modo === 'balon' ? [j.goles, 'Goles'] : [Math.round(j.danoCaja).toLocaleString('es-ES'), 'Daño a la caja'];
    this.$('res-extra').textContent = extra[0];
    this.$('res-extra-texto').textContent = extra[1];

    const camino = this.$('resultado-camino');
    camino.innerHTML = r.camino.map(x => '🎉 Camino de trofeos: ' + this.textoRecompensa(x)).join('<br>');
    camino.style.display = r.camino.length ? 'block' : 'none';

    app.mostrarPantalla('resultados');
  },

  avisoFlotante(texto) {
    const el = document.createElement('div');
    el.className = 'aviso-flotante'; el.textContent = texto;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  },
};

function mostrarResultados() { lobby.mostrarResultados(); }
