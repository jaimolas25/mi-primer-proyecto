'use strict';
/* =========================================================
   SONIDO: efectos y música generados con WebAudio (sin archivos)
   ========================================================= */
const sonido = {
  ctx: null, activo: true, musicaActiva: true,
  musica: { sonando: false, siguienteNota: 0, paso: 0, temporizador: null, tema: 'lobby', ganancia: null },

  iniciar() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.musica.ganancia = this.ctx.createGain();
      this.musica.ganancia.gain.value = 0.16;
      this.musica.ganancia.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.musicaActiva && !this.musica.sonando) this.empezarMusica(this.musica.tema);
  },

  tono(frecuencia, duracion, tipo = 'square', volumen = 0.05, frecuenciaFinal = null, destino = null, cuando = null) {
    if (!this.ctx || (!this.activo && !destino)) return;
    const t = cuando || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gan = this.ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(frecuencia, t);
    if (frecuenciaFinal) osc.frequency.exponentialRampToValueAtTime(frecuenciaFinal, t + duracion);
    gan.gain.setValueAtTime(volumen, t);
    gan.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
    osc.connect(gan).connect(destino || this.ctx.destination);
    osc.start(t);
    osc.stop(t + duracion + 0.02);
  },

  ruido(duracion, volumen = 0.05) {
    if (!this.ctx || !this.activo) return;
    const tam = Math.floor(this.ctx.sampleRate * duracion);
    const buffer = this.ctx.createBuffer(1, tam, this.ctx.sampleRate);
    const datos = buffer.getChannelData(0);
    for (let i = 0; i < tam; i++) datos[i] = (Math.random() * 2 - 1) * (1 - i / tam);
    const fuente = this.ctx.createBufferSource();
    fuente.buffer = buffer;
    const gan = this.ctx.createGain();
    gan.gain.value = volumen;
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = 'lowpass'; filtro.frequency.value = 900;
    fuente.connect(filtro).connect(gan).connect(this.ctx.destination);
    fuente.start();
  },

  disparo() { this.tono(420, 0.09, 'square', 0.035, 140); },
  disparoPesado() { this.tono(200, 0.14, 'sawtooth', 0.05, 60); this.ruido(0.08, 0.03); },
  impacto() { this.tono(180, 0.08, 'sawtooth', 0.04, 90); },
  recoger() { this.tono(880, 0.12, 'sine', 0.05, 1320); },
  cubo() { this.tono(660, 0.18, 'triangle', 0.06, 1760); },
  caja() { this.tono(120, 0.15, 'square', 0.05, 60); this.ruido(0.1, 0.04); },
  super() { this.tono(200, 0.35, 'sawtooth', 0.06, 900); },
  gadget() { this.tono(520, 0.12, 'triangle', 0.05, 1040); this.tono(780, 0.12, 'triangle', 0.04, 1560); },
  muerte() { this.tono(140, 0.4, 'triangle', 0.07, 40); this.ruido(0.25, 0.05); },
  explosion() { this.ruido(0.3, 0.08); this.tono(90, 0.3, 'sine', 0.08, 30); },
  gol() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.tono(f, 0.25, 'square', 0.05), i * 90)); },
  cuenta() { this.tono(660, 0.12, 'square', 0.05); },
  inicio() { this.tono(880, 0.4, 'square', 0.06, 1320); },
  victoria() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tono(f, 0.3, 'square', 0.05), i * 130)); },
  derrota() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tono(f, 0.35, 'triangle', 0.06), i * 160)); },
  clic() { this.tono(600, 0.05, 'square', 0.03, 900); },
  monedas() { [1200, 1500, 1800].forEach((f, i) => setTimeout(() => this.tono(f, 0.08, 'sine', 0.04), i * 50)); },
  abrirCaja() { this.tono(300, 0.5, 'sawtooth', 0.05, 1200); },

  /* ---------- Música: secuenciador sencillo de 16 pasos ---------- */
  temas: {
    // bajo y melodía en semitonos relativos a La (220 Hz); null = silencio
    lobby: { bpm: 112, bajo: [0, 0, 7, 7, 5, 5, 3, 3, 0, 0, 7, 7, 10, 10, 12, 12], melodia: [12, null, 15, null, 19, null, 15, 12, 10, null, 12, null, 15, null, null, null] },
    combate: { bpm: 150, bajo: [0, 0, 0, 7, 0, 0, 10, 7, 5, 5, 5, 12, 5, 5, 3, 7], melodia: [12, 15, 19, null, 12, 15, 17, null, 12, 15, 19, 22, null, 19, 17, 15] },
  },

  empezarMusica(tema) {
    if (!this.ctx || !this.musicaActiva) return;
    this.musica.tema = tema;
    if (this.musica.sonando) return;
    this.musica.sonando = true;
    this.musica.paso = 0;
    this.musica.siguienteNota = this.ctx.currentTime + 0.05;
    const programar = () => {
      if (!this.musica.sonando) return;
      const t = this.temas[this.musica.tema];
      const duracionPaso = 60 / t.bpm / 2;
      while (this.musica.siguienteNota < this.ctx.currentTime + 0.25) {
        const i = this.musica.paso % 16;
        const cuando = this.musica.siguienteNota;
        const bajo = t.bajo[i];
        if (bajo !== null) this.tono(110 * Math.pow(2, bajo / 12), duracionPaso * 0.9, 'triangle', 0.5, null, this.musica.ganancia, cuando);
        const mel = t.melodia[i];
        if (mel !== null) this.tono(220 * Math.pow(2, mel / 12), duracionPaso * 0.8, 'square', 0.18, null, this.musica.ganancia, cuando);
        if (i % 4 === 0) this.tono(60, 0.08, 'sine', 0.6, 30, this.musica.ganancia, cuando);  // bombo
        if (i % 4 === 2) this.tono(1800, 0.03, 'square', 0.08, 1200, this.musica.ganancia, cuando);  // charles
        this.musica.siguienteNota += duracionPaso;
        this.musica.paso++;
      }
      this.musica.temporizador = setTimeout(programar, 100);
    };
    programar();
  },

  cambiarTema(tema) {
    if (this.musica.tema === tema) return;
    this.musica.tema = tema;
    this.musica.paso = 0;
  },

  pararMusica() {
    this.musica.sonando = false;
    clearTimeout(this.musica.temporizador);
  },

  ajustarMusica(activa) {
    this.musicaActiva = activa;
    if (!activa) this.pararMusica();
    else if (this.ctx) this.empezarMusica(this.musica.tema);
  },
};
