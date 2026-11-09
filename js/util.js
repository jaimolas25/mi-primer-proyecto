'use strict';
/* Utilidades generales */
const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
const azar = (a, b) => a + Math.random() * (b - a);
const azarEntero = (a, b) => Math.floor(azar(a, b + 1));
const elegir = lista => lista[Math.floor(Math.random() * lista.length)];
const distancia = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const anguloHacia = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
const mezclar = lista => lista.map(v => [Math.random(), v]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
const interpolar = (a, b, t) => a + (b - a) * t;
const formatearTiempo = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

// Ruido determinista sencillo (para detalles del suelo que no cambien entre fotogramas)
function ruido(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

// Navegadores antiguos sin roundRect
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath();
    return this;
  };
}
