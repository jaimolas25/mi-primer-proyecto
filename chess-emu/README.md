# ChessEmu

Web de ajedrez al estilo chess.com para jugar contra rivales que parecen personas y que van subiendo de nivel según tu Elo. Todo corre en el navegador: sin backend, sin registro.

**Jugar:** <https://chess-emu.vercel.app/> (ver «Despliegue» si la URL de tu proyecto en Vercel es otra).

## Qué hace

- **Emparejamiento por Elo.** Empiezas con 800 (puedes elegir 400/800/1200/1600 antes de tu primera partida). Tras cada partida tu Elo se recalcula con la fórmula estándar (K = 40/24/16 según partidas jugadas) en función del resultado y del Elo del rival. El siguiente rival se elige cerca de tu Elo: si encadenas victorias te tocan rivales más fuertes; si pierdes, algo más flojos.
- **Rivales que parecen personas.** 36 perfiles con nombre, bandera, estilo (agresivo, sólido, táctico, equilibrado), título (CM/FM/IM/GM en los más fuertes), chat en español o inglés (saludo, «gg», quejas cuando se equivocan…), tiempos de reflexión variables (rápidos en recapturas y jugadas de libro, pensadas largas de vez en cuando, prisa cuando queda poco reloj), aperturas de un libro propio, abandono cuando la posición está perdida y aceptación/rechazo de tablas según la evaluación.
- **Motor con modelo de error humano.** Un motor propio (tablero 0x88, alfa-beta con quiescencia, profundización iterativa, ~1M nodos/s) puntúa todas las jugadas y después elige una con una distribución que depende del Elo del bot. Se ejecuta en un Web Worker para no bloquear la interfaz.
- **Experiencia tipo chess.com.** Tablero verde con arrastrar/soltar o clic-clic, puntos de jugadas legales, promoción, relojes (bala, blitz, rápidas, clásicas o sin reloj), piezas capturadas y diferencia de material, lista de jugadas navegable, sonidos, chat rápido, tablas y rendirse, modal de resultado con la variación de Elo, perfil con gráfico de evolución e historial, y listado de rivales. Funciona en móvil.
- **Progreso guardado** en `localStorage` del navegador.

## Nivel de los rivales

| Elo del bot | Comportamiento |
|---|---|
| < 1200 | Errores frecuentes, se cuelgan piezas, finales mal rematados a veces |
| 1200–1500 | Errores ocasionales de hasta una pieza menor |
| 1500–1800 | Imprecisiones; como mucho pierde un par de peones de golpe |
| 1800–2100 | Juega sólido, errores de ≤ 1 peón |
| 2100–2400 | Pequeñas imprecisiones (≤ 0,7 peones) |
| ≥ 2400 | Prácticamente siempre la mejor jugada que ve el motor |

## Estructura

```
index.html          Página principal
style.css           Estilos (tema oscuro / tablero verde)
app.js              Interfaz, partida, relojes, Elo, chat, perfil
engine.worker.js    Motor de ajedrez + modelo humano (Web Worker)
bots.js             Perfiles de rivales, frases y emparejamiento
book.js             Libro de aperturas
vendor/chess.js     chess.js 1.0.0 (reglas, SAN, finales de partida)
vendor/pieces.css   Piezas SVG "cburnett" (CC BY-SA 3.0)
vercel.json         Cabeceras y URLs limpias (sitio estático, sin build)
robots.txt, sitemap.xml   Para la indexación en Google
```

## Despliegue en Vercel

1. En [vercel.com](https://vercel.com) → **Add New… → Project** e importa este repositorio.
2. Framework **Other**, sin comando de build ni directorio de salida. Pulsa **Deploy**.
3. Vercel asigna una URL `https://<nombre>.vercel.app`. Si no es `chess-emu.vercel.app`, sustituye esa URL en `index.html` (canonical, Open Graph y JSON-LD), `robots.txt` y `sitemap.xml`.

Cada push a `main` vuelve a desplegar.

## Aparecer en Google

La página ya lleva título, descripción, datos estructurados, texto indexable, `robots.txt` y `sitemap.xml`. Para acelerar la indexación:

1. Entra en [Google Search Console](https://search.google.com/search-console) y añade la propiedad con la URL de Vercel.
2. Verifica la propiedad (Vercel permite añadir el registro DNS o la etiqueta HTML que pide Google).
3. En «Sitemaps» envía `https://<tu-url>/sitemap.xml` y en «Inspección de URLs» solicita la indexación de la portada.

Sin Search Console, Google tarda semanas en descubrir una web nueva.

## Desarrollo local

```
python3 -m http.server 8000
# abre http://localhost:8000
```

Hace falta servirlo por HTTP (no abrir el fichero directamente) porque la app usa módulos ES y un Web Worker.

## Créditos

- Reglas de ajedrez: [chess.js](https://github.com/jhlywa/chess.js) (BSD-2-Clause).
- Piezas: conjunto «cburnett» de Colin M.L. Burnett, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
- El resto del código es propio. ChessEmu no está afiliado a chess.com.
