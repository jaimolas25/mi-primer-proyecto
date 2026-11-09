'use strict';
/* =========================================================
   APP: arranque, cambio de pantallas, bucle principal y PWA
   ========================================================= */
const app = {
  pantalla: 'lobby',
  ultimoTiempo: 0,

  iniciar() {
    progreso.cargar();
    iniciarLienzo();
    lobby.iniciar();
    this.mostrarPantalla('lobby');
    this.iniciarPWA();
    document.addEventListener('pointerdown', () => sonido.iniciar(), { once: false });
    requestAnimationFrame(t => { this.ultimoTiempo = t; this.bucle(t); });
  },

  mostrarPantalla(nombre) {
    this.pantalla = nombre;
    document.querySelectorAll('.pantalla').forEach(p => p.classList.toggle('oculta', p.dataset.pantalla !== nombre));
    if (nombre === 'lobby') { lobby.actualizarLobby(); sonido.cambiarTema('lobby'); }
  },

  empezarPartida() {
    sonido.iniciar();
    const d = progreso.datos;
    nuevaPartida({ modo: d.ajustes.modo, mapa: d.ajustes.mapa, luchador: d.ajustes.luchador, nombre: d.nombre, dificultad: d.ajustes.dificultad });
    this.mostrarPantalla('juego');
    this.ultimoTiempo = performance.now();
    if (entrada.esTactil && document.documentElement.requestFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  },

  bucle(ahora) {
    const dt = Math.min(0.05, (ahora - this.ultimoTiempo) / 1000);
    this.ultimoTiempo = ahora;
    if (this.pantalla === 'juego' && partida) {
      leerEntrada();
      actualizar(dt);
      dibujar(ctx);
    }
    requestAnimationFrame(t => this.bucle(t));
  },

  /* ---------- App instalable ---------- */
  iniciarPWA() {
    const botonInstalar = document.getElementById('boton-instalar');
    const info = document.getElementById('instalar-info');
    const esStandalone = window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || window.navigator.standalone === true;
    const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    let eventoInstalacion = null;

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      eventoInstalacion = e;
      if (!esStandalone) botonInstalar.classList.remove('oculta');
    });
    window.addEventListener('appinstalled', () => {
      botonInstalar.classList.add('oculta');
      lobby.avisoFlotante('✅ App instalada. Búscala en tu pantalla de inicio.');
    });
    if (esIOS && !esStandalone) botonInstalar.classList.remove('oculta');
    if (esStandalone) { const v = document.getElementById('volver-catalogo'); if (v) v.style.display = 'none'; }

    botonInstalar.addEventListener('click', async () => {
      sonido.clic();
      if (eventoInstalacion) {
        eventoInstalacion.prompt();
        const r = await eventoInstalacion.userChoice.catch(() => null);
        if (r && r.outcome === 'accepted') botonInstalar.classList.add('oculta');
        eventoInstalacion = null;
        return;
      }
      info.innerHTML = esIOS
        ? '<b>En iPhone o iPad (Safari):</b> toca el botón <b>Compartir</b> (el cuadrado con la flecha hacia arriba) y elige <b>«Añadir a pantalla de inicio»</b>. Aparecerá el icono de Arena Brawl como una app más.'
        : '<b>En Android (Chrome):</b> abre el menú ⋮ y toca <b>«Instalar aplicación»</b> o <b>«Añadir a pantalla de inicio»</b>.<br><b>En ordenador (Chrome o Edge):</b> pulsa el icono de instalar que aparece a la derecha de la barra de direcciones.';
      info.classList.toggle('oculta');
    });
  },
};

window.addEventListener('DOMContentLoaded', () => app.iniciar());
