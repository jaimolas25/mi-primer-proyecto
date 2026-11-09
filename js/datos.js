'use strict';
/* =========================================================
   DATOS DEL JUEGO: constantes, luchadores, modos, mapas y progresión
   ========================================================= */
const TILE = 48;
const ESPERA_CURACION = 3;     // segundos sin recibir daño para empezar a curarse
const TIEMPO_REAPARICION = 3;  // segundos muerto antes de volver (modos por equipos)
const USOS_GADGET = 3;
const ENFRIAMIENTO_GADGET = 4;
const VIDA_CAJA = 3000;        // cajas de supervivencia
const VIDA_CAJA_FUERTE = 24000;
const DANO_GAS = 700;
const NIVEL_MAXIMO = 9;

// Luchadores originales. Velocidad en píxeles/segundo, alcance en píxeles.
const LUCHADORES = {
  pixel: {
    nombre: 'Píxel', rareza: 'comun', color: '#8ef05a', colorOscuro: '#3f8f1c', acento: '#1b1f3a',
    cabeza: 'antena', arma: 'pistolas', forma: 'circulo',
    vida: 3400, velocidad: 172, alcance: 6.5 * TILE, recarga: 1.1,
    ataque: { nombre: 'Ráfaga doble', tipo: 'rafaga', cantidad: 3, intervalo: 0.08, dano: 360, velocidad: 760, radio: 5 },
    superImpactos: 10, super: { nombre: 'Nova', tipo: 'nova', cantidad: 14, dano: 520, velocidad: 700, radio: 6 },
    gadget: { nombre: 'Recarga exprés', tipo: 'recarga', descripcion: 'Rellena al instante las tres cargas de munición.' },
    rol: 'Luchador', descripcion: 'Equilibrado y rápido. Ráfagas de tres balas a media distancia.',
    descripcionSuper: 'Explosión de 14 balas en todas direcciones.',
  },
  roca: {
    nombre: 'Roca', rareza: 'comun', color: '#e8792b', colorOscuro: '#9a4a12', acento: '#5a2a08',
    cabeza: 'casco', arma: 'escopeta', forma: 'cuadrado',
    vida: 4800, velocidad: 150, alcance: 4.8 * TILE, recarga: 1.3,
    ataque: { nombre: 'Perdigonada', tipo: 'escopeta', cantidad: 5, apertura: 0.38, dano: 300, velocidad: 640, radio: 6 },
    superImpactos: 14, super: { nombre: 'Embestida', tipo: 'embestida', dano: 900 },
    gadget: { nombre: 'Hormigón', tipo: 'curar', cantidad: 900, descripcion: 'Recupera 900 de vida al instante.' },
    rol: 'Tanque', descripcion: 'Muchísima vida y una escopeta devastadora de cerca.',
    descripcionSuper: 'Embestida que arrolla, daña y empuja a los enemigos.',
  },
  vega: {
    nombre: 'Vega', rareza: 'raro', color: '#4fa3ff', colorOscuro: '#1d5fb0', acento: '#0b2f5c',
    cabeza: 'visor', arma: 'rifle', forma: 'rombo',
    vida: 2800, velocidad: 160, alcance: 9 * TILE, recarga: 1.6,
    ataque: { nombre: 'Tiro de precisión', tipo: 'simple', dano: 1050, velocidad: 920, radio: 5 },
    superImpactos: 3, super: { nombre: 'Bala colosal', tipo: 'perforante', dano: 1700, velocidad: 1000, radio: 9 },
    gadget: { nombre: 'Salto atrás', tipo: 'retroceso', distancia: 3 * TILE, descripcion: 'Da un salto hacia atrás para alejarse del peligro.' },
    rol: 'Francotiradora', descripcion: 'El mayor alcance del juego. Un solo disparo, pero contundente.',
    descripcionSuper: 'Bala gigante que atraviesa enemigos y muros.',
  },
  lua: {
    nombre: 'Lúa', rareza: 'raro', color: '#c77dff', colorOscuro: '#7a2ec2', acento: '#3a1060',
    cabeza: 'sombrero', arma: 'baston', forma: 'triangulo',
    vida: 2400, velocidad: 160, alcance: 7.5 * TILE, recarga: 1.7,
    ataque: { nombre: 'Bomba lunar', tipo: 'lanzamiento', dano: 900, velocidad: 540, radio: 7, area: 64 },
    superImpactos: 4, super: { nombre: 'Lluvia de meteoros', tipo: 'lluvia', cantidad: 3, dano: 1100, velocidad: 520, radio: 10, area: 110 },
    gadget: { nombre: 'Cortina de humo', tipo: 'humo', duracion: 6, radio: 1.4 * TILE, descripcion: 'Crea una nube que te oculta durante 6 segundos.' },
    rol: 'Lanzadora', descripcion: 'Sus bombas pasan por encima de los muros.',
    descripcionSuper: 'Tres bombas enormes caen sobre la zona elegida.',
  },
  nimbo: {
    nombre: 'Nimbo', rareza: 'epico', color: '#7fe3e0', colorOscuro: '#2a9c99', acento: '#0f4f4d',
    cabeza: 'nube', arma: 'canon', forma: 'hexagono',
    vida: 3000, velocidad: 165, alcance: 6.5 * TILE, recarga: 1.3,
    ataque: { nombre: 'Chorro', tipo: 'simple', dano: 720, velocidad: 820, radio: 6 },
    superImpactos: 6, super: { nombre: 'Nube sanadora', tipo: 'curacion', cantidad: 2000, radio: 3.2 * TILE },
    gadget: { nombre: 'Rocío', tipo: 'curarAliado', cantidad: 1000, radio: 4 * TILE, descripcion: 'Cura 1000 de vida al aliado más herido cercano (o a ti).' },
    rol: 'Sanador', descripcion: 'Mantiene vivo a su equipo mientras dispara chorros de agua.',
    descripcionSuper: 'Nube que cura 2000 de vida a ti y a los aliados cercanos.',
  },
  sombra: {
    nombre: 'Sombra', rareza: 'epico', color: '#8c7bbf', colorOscuro: '#3d2f6b', acento: '#1a1030', colorBala: '#d9ccff',
    cabeza: 'capucha', arma: 'dagas', forma: 'estrella',
    vida: 2600, velocidad: 188, alcance: 3.6 * TILE, recarga: 0.9,
    ataque: { nombre: 'Dagas gemelas', tipo: 'rafaga', cantidad: 3, intervalo: 0.06, dano: 430, velocidad: 900, radio: 5 },
    superImpactos: 9, super: { nombre: 'Parpadeo', tipo: 'parpadeo', distancia: 5 * TILE, dano: 700, radio: 1.6 * TILE },
    gadget: { nombre: 'Adrenalina', tipo: 'velocidad', duracion: 3, factor: 1.45, descripcion: 'Corre un 45 % más rápido durante 3 segundos.' },
    rol: 'Asesina', descripcion: 'La más rápida. Letal de cerca, frágil de lejos.',
    descripcionSuper: 'Se teletransporta y hiere a quien tenga alrededor.',
  },
  tesla: {
    nombre: 'Tesla', rareza: 'legendario', color: '#ffe14d', colorOscuro: '#b89a00', acento: '#4a3d00',
    cabeza: 'gafas', arma: 'bobina', forma: 'pentagono',
    vida: 3100, velocidad: 160, alcance: 6 * TILE, recarga: 1.4,
    ataque: { nombre: 'Rayo en cadena', tipo: 'cadena', dano: 650, velocidad: 820, radio: 6, saltos: 3, alcanceSalto: 3 * TILE },
    superImpactos: 7, super: { nombre: 'Tormenta', tipo: 'tormenta', dano: 1200, radio: 4 * TILE, lentitud: 2 },
    gadget: { nombre: 'Pulso', tipo: 'empujon', radio: 2.5 * TILE, fuerza: 2 * TILE, descripcion: 'Empuja a todos los enemigos cercanos.' },
    rol: 'Eléctrico', descripcion: 'Sus rayos saltan de un enemigo a otro.',
    descripcionSuper: 'Electrocuta y ralentiza a todos los enemigos cercanos.',
  },
  bastion: {
    nombre: 'Bastión', rareza: 'legendario', color: '#9aa5b1', colorOscuro: '#4d5661', acento: '#242a31',
    cabeza: 'yelmo', arma: 'mortero', forma: 'anillo',
    vida: 5200, velocidad: 140, alcance: 5.2 * TILE, recarga: 1.5,
    ataque: { nombre: 'Proyectil pesado', tipo: 'simple', dano: 880, velocidad: 600, radio: 9 },
    superImpactos: 8, super: { nombre: 'Escudo', tipo: 'escudo', duracion: 4, reduccion: 0.6 },
    gadget: { nombre: 'Muralla', tipo: 'muro', duracion: 5, descripcion: 'Levanta un muro temporal delante de ti durante 5 segundos.' },
    rol: 'Guardián', descripcion: 'La mayor vida del juego y proyectiles que pegan como martillos.',
    descripcionSuper: 'Reduce el daño recibido un 60 % durante 4 segundos.',
  },
};

const RAREZAS = {
  comun: { nombre: 'Común', color: '#8ef05a' },
  raro: { nombre: 'Raro', color: '#4fa3ff' },
  epico: { nombre: 'Épico', color: '#c77dff' },
  legendario: { nombre: 'Legendario', color: '#ffd43b' },
};

const MODOS = {
  cristales: {
    nombre: 'Caza de cristales', icono: '💎', equipos: true, jugadores: 6, duracion: 240,
    descripcion: 'Reúne 10 cristales de la mina central y aguanta 15 segundos sin perderlos.',
    mapas: ['Mina Central', 'Cañón Verde'],
  },
  atraco: {
    nombre: 'Atraco', icono: '💰', equipos: true, jugadores: 6, duracion: 150,
    descripcion: 'Destruye la caja fuerte rival antes de que acabe el tiempo y protege la tuya.',
    mapas: ['Banco Seguro'],
  },
  balon: {
    nombre: 'Balón Brawl', icono: '⚽', equipos: true, jugadores: 6, duracion: 150,
    descripcion: 'Mete el balón en la portería rival. Gana quien marque dos goles o lleve ventaja al final.',
    mapas: ['Estadio Arena'],
  },
  supervivencia: {
    nombre: 'Supervivencia', icono: '☠️', equipos: false, jugadores: 8, duracion: 0,
    descripcion: 'Todos contra todos. Rompe cajas, coge cubos de poder, huye del gas y sé el último en pie.',
    mapas: ['Rocas Perdidas', 'Pantano Hondo'],
  },
};

const TEMAS = {
  desierto: { suelo: ['#d9c79a', '#cdb98a'], sueloB: ['#d6c08f', '#c9b17d'], muroTop: '#8a7ab0', muroFrente: '#5b4b7a', muroLinea: 'rgba(0,0,0,0.25)', agua: '#4fa3ff', fondo: '#1b1f3a', nombre: 'Desierto' },
  bosque: { suelo: ['#9ccc6a', '#8fbf60'], sueloB: ['#a3cf72', '#95c265'], muroTop: '#a37a4a', muroFrente: '#6e4d2c', muroLinea: 'rgba(0,0,0,0.3)', agua: '#3fa0d6', fondo: '#10281a', nombre: 'Bosque' },
  cueva: { suelo: ['#8c8798', '#7f7a8c'], sueloB: ['#938e9f', '#857f92'], muroTop: '#5c5f7a', muroFrente: '#363850', muroLinea: 'rgba(0,0,0,0.35)', agua: '#5fd1c8', fondo: '#0c0d18', nombre: 'Cueva' },
};

/* Leyenda de los mapas:
   '#' muro   '.' suelo   'b' arbusto   'w' agua (no se puede pisar, las balas pasan)
   'f' valla (bloquea el paso, las balas pasan)   'C' caja con cubo   'M' mina de cristales
   '1' aparición del equipo azul (al reflejar pasa a '2')   'S' aparición en supervivencia
   'A' caja fuerte   'G' portería   'B' posición inicial del balón
   Los mapas por equipos definen la mitad superior y se reflejan; los de supervivencia definen
   el cuarto superior izquierdo y se reflejan en horizontal y vertical. */
const MAPAS = {
  'Mina Central': { tema: 'desierto', tipo: 'mitad', filas: [
    "####################",
    "#..................#",
    "#.1....bb....bb..1.#",
    "#...1..bb....bb....#",
    "#..................#",
    "#.##......##.....#.#",
    "#.##.bbb..##..bb.#.#",
    "#....bbb......bb...#",
    "#ww.......##.......#",
    "#.bb..##..##..###..#",
    "#.bb..##......###.w#",
    "#......b..........w#",
    "#..###.b..####....b#",
    "#..###....####..bb.#",
    "#.........MM....bb.#",
  ] },
  'Cañón Verde': { tema: 'bosque', tipo: 'mitad', filas: [
    "####################",
    "#........ff........#",
    "#.1......1.......1.#",
    "#..bb..........bb..#",
    "#..bb.###..###.bb..#",
    "#.....#......#.....#",
    "#..w..#..bb..#..w..#",
    "#..w.....bb.....w..#",
    "#....ff......ff....#",
    "#.bb..............b#",
    "#.bb..###..###....b#",
    "#.....#ww..ww#.....#",
    "#.....#......#.....#",
    "#...bbb......bbb...#",
    "#.........MM.......#",
  ] },
  'Banco Seguro': { tema: 'cueva', tipo: 'mitad', filas: [
    "####################",
    "#........AA........#",
    "#..1.....##.....1..#",
    "#....1.........#...#",
    "#..bb......bb..#...#",
    "#..bb.####.bb......#",
    "#.........ff.......#",
    "#.ww..........bb...#",
    "#.ww..###.....bb...#",
    "#.....###..........#",
    "#..........##..w...#",
    "#..bbb.....##..w...#",
    "#..bbb..ff.........#",
    "#.......ff..###....#",
    "#...........###....#",
  ] },
  'Estadio Arena': { tema: 'bosque', tipo: 'mitad', filas: [
    "########GGGG########",
    "#..................#",
    "#..1.....1.....1...#",
    "#..................#",
    "#.....bb....bb.....#",
    "#..##..........##..#",
    "#..##..........##..#",
    "#.........ff.......#",
    "#..bb..#......#..bb#",
    "#..bb..#......#..bb#",
    "#..................#",
    "#.....###..###.....#",
    "#..................#",
    "#.bb......ff.....bb#",
    "#.........BB.......#",
  ] },
  'Rocas Perdidas': { tema: 'desierto', tipo: 'cuarto', filas: [
    "##############",
    "#.............",
    "#.S....bb..#..",
    "#......bb..##.",
    "#..C.......##.",
    "#.....#.b..bb.",
    "#.##..#.b...C.",
    "#.##......##..",
    "#.....C...bbb.",
    "#.bb..#...bbb.",
    "#.bb..###.....",
    "#.....###..C..",
    "#..S......#...",
    "#.b......##...",
    "#.C..##..##.b.",
    "#..bb##.....b.",
    "#..bb..C..##..",
    "#.........bb..",
  ] },
  'Pantano Hondo': { tema: 'bosque', tipo: 'cuarto', filas: [
    "##############",
    "#.............",
    "#.S...ww......",
    "#.....ww..bb..",
    "#..C......bb..",
    "#..........#..",
    "#.bbb..##..#..",
    "#.bbb..##.....",
    "#......C......",
    "#..#.......ww.",
    "#..#..bb...ww.",
    "#.....bb..C...",
    "#..S..........",
    "#.....###.....",
    "#.C...###..bb.",
    "#..ww......bb.",
    "#..ww..C......",
    "#.........##..",
  ] },
};

const NOMBRES_BOT = ['Nébula', 'Trueno', 'Chispa', 'Ferro', 'Cometa', 'Brisa', 'Volt', 'Ónix', 'Dardo', 'Mango', 'Zafiro', 'Lince', 'Pólvora', 'Rayo'];

const DIFICULTADES = {
  facil:   { nombre: 'Fácil', punteria: 0.22, reaccion: 0.45, vista: 7, esquiva: 0.2 },
  normal:  { nombre: 'Normal', punteria: 0.12, reaccion: 0.25, vista: 9, esquiva: 0.5 },
  dificil: { nombre: 'Difícil', punteria: 0.05, reaccion: 0.12, vista: 11, esquiva: 0.85 },
};

/* ---------- Progresión ---------- */
const TROFEOS_PUESTO = [10, 7, 5, 3, 1, -1, -3, -5];         // supervivencia, puesto 1.º a 8.º
const TROFEOS_EQUIPO = { victoria: 8, derrota: -3, empate: 2 };
const FICHAS_EQUIPO = { victoria: 20, derrota: 10, empate: 15 };  // fichas por partida; 100 fichas = 1 caja
const FICHAS_POR_CAJA = 100;

// Coste para subir del nivel n al n+1 (índice n-1): puntos de poder y monedas
const COSTE_PUNTOS = [20, 30, 50, 80, 130, 210, 340, 550];
const COSTE_MONEDAS = [20, 35, 75, 140, 290, 480, 800, 1250];
const BONUS_NIVEL = 0.05;  // +5 % de vida y daño por nivel

// Camino de trofeos: recompensas por trofeos totales
const CAMINO_TROFEOS = [
  { trofeos: 10, tipo: 'monedas', cantidad: 30 },
  { trofeos: 20, tipo: 'caja' },
  { trofeos: 30, tipo: 'luchador', luchador: 'vega' },
  { trofeos: 50, tipo: 'puntos', cantidad: 20 },
  { trofeos: 70, tipo: 'caja' },
  { trofeos: 80, tipo: 'luchador', luchador: 'lua' },
  { trofeos: 100, tipo: 'monedas', cantidad: 50 },
  { trofeos: 130, tipo: 'caja' },
  { trofeos: 160, tipo: 'luchador', luchador: 'nimbo' },
  { trofeos: 200, tipo: 'caja' },
  { trofeos: 240, tipo: 'monedas', cantidad: 80 },
  { trofeos: 280, tipo: 'luchador', luchador: 'sombra' },
  { trofeos: 330, tipo: 'caja' },
  { trofeos: 380, tipo: 'puntos', cantidad: 40 },
  { trofeos: 450, tipo: 'luchador', luchador: 'tesla' },
  { trofeos: 520, tipo: 'caja' },
  { trofeos: 600, tipo: 'monedas', cantidad: 150 },
  { trofeos: 700, tipo: 'luchador', luchador: 'bastion' },
  { trofeos: 800, tipo: 'caja' },
  { trofeos: 1000, tipo: 'monedas', cantidad: 300 },
  { trofeos: 1300, tipo: 'caja' },
  { trofeos: 1600, tipo: 'puntos', cantidad: 100 },
  { trofeos: 2000, tipo: 'monedas', cantidad: 500 },
];
const LUCHADORES_INICIALES = ['pixel', 'roca'];
