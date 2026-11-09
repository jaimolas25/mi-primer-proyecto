'use strict';
/* =========================================================
   PROGRESIÓN: trofeos, monedas, puntos de poder, niveles, cajas y desbloqueos.
   Se guarda en el dispositivo (localStorage).
   ========================================================= */
const progreso = {
  clave: 'arenaBrawl.progreso.v2',
  datos: null,

  porDefecto() {
    return {
      nombre: 'Tú',
      monedas: 0,
      fichas: 0,
      cajas: 1,                       // una caja de bienvenida
      trofeos: {},                    // por luchador
      niveles: {},                    // nivel de poder por luchador (1..9)
      puntos: {},                     // puntos de poder acumulados por luchador
      desbloqueados: LUCHADORES_INICIALES.slice(),
      recompensasCobradas: [],        // índices del camino de trofeos ya entregados
      partidas: 0, victorias: 0,
      ajustes: { sonido: true, musica: true, dificultad: 'normal', modo: 'cristales', luchador: 'pixel' },
    };
  },

  cargar() {
    try {
      const guardado = JSON.parse(localStorage.getItem(this.clave));
      this.datos = Object.assign(this.porDefecto(), guardado || {});
      this.datos.ajustes = Object.assign(this.porDefecto().ajustes, (guardado && guardado.ajustes) || {});
    } catch (e) { this.datos = this.porDefecto(); }
    // Migración desde la primera versión (solo trofeos)
    try {
      const viejo = JSON.parse(localStorage.getItem('arenaBrawl.trofeos'));
      if (viejo && !localStorage.getItem(this.clave)) {
        for (const [k, v] of Object.entries(viejo)) this.datos.trofeos[k] = v;
        for (const k of Object.keys(viejo)) if (!this.datos.desbloqueados.includes(k)) this.datos.desbloqueados.push(k);
      }
    } catch (e) { /* nada */ }
    if (!this.datos.desbloqueados.includes(this.datos.ajustes.luchador)) this.datos.ajustes.luchador = this.datos.desbloqueados[0];
    this.guardar();
    return this.datos;
  },

  guardar() { try { localStorage.setItem(this.clave, JSON.stringify(this.datos)); } catch (e) { /* sin almacenamiento */ } },

  trofeos(tipo) { return this.datos.trofeos[tipo] || 0; },
  trofeosTotales() { return Object.values(this.datos.trofeos).reduce((s, n) => s + n, 0); },
  nivel(tipo) { return this.datos.niveles[tipo] || 1; },
  puntos(tipo) { return this.datos.puntos[tipo] || 0; },
  desbloqueado(tipo) { return this.datos.desbloqueados.includes(tipo); },
  multiplicador(tipo) { return 1 + BONUS_NIVEL * (this.nivel(tipo) - 1); },

  sumarTrofeos(tipo, cantidad) {
    const antes = this.trofeos(tipo);
    this.datos.trofeos[tipo] = Math.max(0, antes + cantidad);
    this.guardar();
    return this.datos.trofeos[tipo] - antes;
  },

  // Devuelve cuántas cajas se han ganado con estas fichas
  sumarFichas(cantidad) {
    this.datos.fichas += cantidad;
    let cajas = 0;
    while (this.datos.fichas >= FICHAS_POR_CAJA) { this.datos.fichas -= FICHAS_POR_CAJA; this.datos.cajas += 1; cajas += 1; }
    this.guardar();
    return cajas;
  },

  puedeMejorar(tipo) {
    const n = this.nivel(tipo);
    if (n >= NIVEL_MAXIMO) return false;
    return this.puntos(tipo) >= COSTE_PUNTOS[n - 1] && this.datos.monedas >= COSTE_MONEDAS[n - 1];
  },

  mejorar(tipo) {
    if (!this.puedeMejorar(tipo)) return false;
    const n = this.nivel(tipo);
    this.datos.puntos[tipo] = this.puntos(tipo) - COSTE_PUNTOS[n - 1];
    this.datos.monedas -= COSTE_MONEDAS[n - 1];
    this.datos.niveles[tipo] = n + 1;
    this.guardar();
    return true;
  },

  // Abre una caja y devuelve la lista de premios
  abrirCaja() {
    if (this.datos.cajas <= 0) return null;
    this.datos.cajas -= 1;
    const premios = [];
    const monedas = azarEntero(20, 50);
    this.datos.monedas += monedas;
    premios.push({ tipo: 'monedas', cantidad: monedas });
    const tipo = elegir(this.datos.desbloqueados);
    const puntos = azarEntero(8, 20);
    this.datos.puntos[tipo] = this.puntos(tipo) + puntos;
    premios.push({ tipo: 'puntos', cantidad: puntos, luchador: tipo });
    if (Math.random() < 0.2) {
      const extra = azarEntero(15, 40);
      this.datos.monedas += extra;
      premios.push({ tipo: 'monedas', cantidad: extra, bonus: true });
    }
    this.guardar();
    return premios;
  },

  // Entrega las recompensas del camino de trofeos que ya se han alcanzado. Devuelve las nuevas.
  cobrarCaminoTrofeos() {
    const total = this.trofeosTotales();
    const nuevas = [];
    CAMINO_TROFEOS.forEach((r, i) => {
      if (total < r.trofeos || this.datos.recompensasCobradas.includes(i)) return;
      this.datos.recompensasCobradas.push(i);
      if (r.tipo === 'monedas') this.datos.monedas += r.cantidad;
      if (r.tipo === 'caja') this.datos.cajas += 1;
      if (r.tipo === 'puntos') {
        const tipo = elegir(this.datos.desbloqueados);
        this.datos.puntos[tipo] = this.puntos(tipo) + r.cantidad;
        r = Object.assign({}, r, { luchador: tipo });
      }
      if (r.tipo === 'luchador' && !this.datos.desbloqueados.includes(r.luchador)) this.datos.desbloqueados.push(r.luchador);
      nuevas.push(r);
    });
    this.guardar();
    return nuevas;
  },

  siguienteRecompensa() {
    const total = this.trofeosTotales();
    return CAMINO_TROFEOS.find((r, i) => !this.datos.recompensasCobradas.includes(i) && r.trofeos > total) || null;
  },

  reiniciar() { this.datos = this.porDefecto(); this.guardar(); },
};
