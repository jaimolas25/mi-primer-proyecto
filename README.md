# mi-primer-proyecto

Página publicada con GitHub Pages.

- `index.html`: catálogo y tasador de libros (escáner de ISBN).
- `arena.html`: **Arena Brawl**, un juego de combate en vista cenital hecho con HTML5 Canvas y sin dependencias.

## Arena Brawl

Juego original de arena con bots, pensado para móvil y ordenador.

**Modos de juego**
- *Caza de cristales*: 3 contra 3. Reúne 10 cristales de la mina central y aguanta 15 segundos.
- *Supervivencia*: todos contra todos, 8 luchadores. Rompe cajas para conseguir cubos de poder, huye del gas que se cierra y sé el último en pie.

**Ocho luchadores** con ataque y súper propios: Roca, Vega, Píxel, Lúa, Nimbo, Sombra, Tesla y Bastión.
Cada uno acumula **trofeos** (guardados en el dispositivo) según el resultado de sus partidas.

**Mecánicas**: tres cargas de munición con recarga, súper que se carga golpeando, curación pasiva, arbustos que ocultan, reaparición (en cristales), invulnerabilidad al aparecer, bots con inteligencia artificial en tres dificultades.

**Controles**: teclado y ratón en ordenador; joysticks táctiles, disparo automático y botón de súper en móvil.

### Instalar como app (sin tienda de aplicaciones)

Arena Brawl es una *Progressive Web App*: se instala desde el navegador, aparece con su icono en la pantalla de inicio y funciona sin conexión.

- **Android (Chrome)**: abre `arena.html`, toca **Instalar la app** en el menú del juego, o menú ⋮ → *Instalar aplicación*.
- **iPhone / iPad (Safari)**: botón *Compartir* → *Añadir a pantalla de inicio*.
- **Ordenador (Chrome o Edge)**: icono de instalar a la derecha de la barra de direcciones.

Archivos de la app: `manifest.json` (nombre, icono, colores), `sw.js` (caché para uso sin conexión) e `iconos/`.
Cuando cambies el juego, sube el número de `VERSION` en `sw.js` para que los dispositivos descarguen la versión nueva.
