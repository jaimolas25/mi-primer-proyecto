# mi-primer-proyecto

Página publicada con GitHub Pages.

- `index.html`: catálogo y tasador de libros (escáner de ISBN).
- `arena.html`: **Arena Brawl**, un juego de combate en vista cenital hecho con HTML5 Canvas, sin dependencias ni frameworks.

## Arena Brawl

Juego original de arena con bots, pensado para móvil y ordenador, con lobby, progresión y cuatro modos.

**Modos de juego**
- *Caza de cristales* (3 vs 3): reúne 10 cristales de la mina central y aguanta 15 segundos. Mapas: Mina Central, Cañón Verde.
- *Atraco* (3 vs 3): destruye la caja fuerte rival antes de que acabe el tiempo. Mapa: Banco Seguro.
- *Balón Brawl* (3 vs 3): fútbol con disparos; gana quien marque dos goles. Mapa: Estadio Arena.
- *Supervivencia* (8 jugadores): cajas con cubos de poder, gas que se cierra, último en pie. Mapas: Rocas Perdidas, Pantano Hondo.

**Ocho luchadores originales**, cada uno con ataque, súper y gadget (3 usos por partida): Píxel, Roca, Vega, Lúa, Nimbo, Sombra, Tesla y Bastión.

**Progresión (guardada en el dispositivo)**
- Trofeos por luchador y camino de trofeos con recompensas: monedas, puntos de poder, cajas y nuevos luchadores.
- Cajas de botín (cada 100 fichas ganadas en partidas) con monedas y puntos de poder.
- Nivel de poder 1 a 9 por luchador (+5 % de vida y daño por nivel) a cambio de puntos y monedas.
- Jugador estrella al final de cada partida.

**Partida**: cuenta atrás inicial, tres cargas de munición, súper que se carga golpeando, curación pasiva, arbustos y humo que ocultan, agua, vallas, muros con volumen, bots con esquiva y roles por modo, tres dificultades, música y efectos sintetizados.

**Controles**: teclado y ratón en ordenador (WASD, clic, E súper, Q gadget); en móvil joysticks táctiles, disparo automático y botones de súper y gadget.

### Instalar como app (sin tienda de aplicaciones)

Arena Brawl es una *Progressive Web App*: se instala desde el navegador, aparece con su icono en la pantalla de inicio y funciona sin conexión.

- **Android (Chrome)**: abre `arena.html` y toca **Instalar la app** en el lobby, o menú ⋮ → *Instalar aplicación*.
- **iPhone / iPad (Safari)**: botón *Compartir* → *Añadir a pantalla de inicio*.
- **Ordenador (Chrome o Edge)**: icono de instalar a la derecha de la barra de direcciones.

### Estructura

```
arena.html        página del juego (lobby y lienzo)
css/arena.css     estilos del lobby y las pantallas
js/datos.js       luchadores, modos, mapas, temas y progresión
js/util.js        utilidades
js/sonido.js      efectos y música con WebAudio
js/progreso.js    guardado local: trofeos, monedas, niveles, cajas
js/mapa.js        construcción del mapa, colisiones y visión
js/entidades.js   luchadores, balas, súper, gadgets, daño, balón, cajas
js/ia.js          inteligencia artificial de los bots
js/modos.js       reglas de cada modo
js/partida.js     bucle de la partida y recompensas
js/dibujo.js      dibujo de personajes, mapa, efectos y HUD
js/entrada.js     teclado, ratón y táctil
js/lobby.js       menú, luchadores, modos, cajas y resultados
js/app.js         arranque, pantallas y PWA
manifest.json, sw.js, iconos/   archivos de la app instalable
```

Cuando cambies el juego, sube el número de `VERSION` en `sw.js` para que los dispositivos descarguen la versión nueva.
