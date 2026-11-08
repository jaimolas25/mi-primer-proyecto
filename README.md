# mi-primer-proyecto

Dos cosas conviven en este repositorio:

- **`index.html`** — el catálogo / tasador de libros (se publica tal cual en GitHub Pages).
- **`chess/`** — **ChessEmu**, una web de ajedrez al estilo chess.com para jugar contra rivales que parecen personas y que van subiendo de nivel según tu Elo. Es lo que se despliega en Vercel.

## ChessEmu

Abre `chess/index.html` desde un servidor estático (o la URL de Vercel) y pulsa **Jugar**.

### Qué hace

- **Emparejamiento por Elo.** Empiezas con 800 (puedes elegir 400/800/1200/1600 antes de tu primera partida). Tras cada partida tu Elo se recalcula con la fórmula estándar (K = 40/24/16 según partidas jugadas). El siguiente rival se elige cerca de tu Elo: si encadenas victorias te tocan rivales más fuertes; si pierdes, algo más flojos.
- **Rivales que parecen personas.** 36 perfiles con nombre, bandera, estilo (agresivo, sólido, táctico, equilibrado), título (CM/FM/IM/GM en los más fuertes), chat en español o inglés (saludo, «gg», quejas cuando se equivocan…), tiempos de reflexión variables (rápidos en recapturas y jugadas de libro, pensadas largas de vez en cuando, prisa cuando queda poco reloj), aperturas de un libro propio, abandono cuando la posición está perdida y aceptación/rechazo de tablas según la evaluación.
- **Motor con modelo de error humano.** Un motor propio (tablero 0x88, alfa-beta con quiescencia, profundización iterativa, ~1M nodos/s) calcula las puntuaciones de todas las jugadas y después elige una con una distribución que depende del Elo del bot: a 400 Elo se cuelgan piezas y se juega casi al azar entre opciones «razonables»; a 2500 casi siempre se juega la mejor. Se ejecuta en un Web Worker para no bloquear la interfaz.
- **Experiencia tipo chess.com.** Tablero verde con arrastrar/soltar o clic-clic, puntos de jugadas legales, promoción, relojes (bala, blitz, rápidas, clásicas o sin reloj), piezas capturadas y diferencia de material, lista de jugadas navegable, sonidos, chat rápido, botones de tablas y rendirse, modal de resultado con la variación de Elo, perfil con gráfico de evolución e historial, y listado de rivales.
- **Todo en el navegador.** Sin backend ni base de datos: el progreso se guarda en `localStorage`.

### Estructura

```
chess/
  index.html          Página principal
  style.css           Estilos (tema oscuro / tablero verde)
  app.js              Interfaz, partida, relojes, Elo, chat, perfil
  engine.worker.js    Motor de ajedrez + modelo humano (Web Worker)
  bots.js             Perfiles de rivales, frases y emparejamiento
  book.js             Libro de aperturas
  vendor/chess.js     chess.js 1.0.0 (reglas, SAN, finales de partida)
  vendor/pieces.css   Piezas SVG "cburnett" (CC BY-SA 3.0)
vercel.json           Configuración de despliegue (sirve la carpeta chess/)
```

### Dónde está publicada

- **GitHub Pages** (rama `main`): <https://jaimolas25.github.io/mi-primer-proyecto/chess/>
- **Vercel**: la URL `*.vercel.app` que asigne el proyecto al importar el repositorio (ver abajo). Si se usa Vercel como dirección principal, cambia la etiqueta `<link rel="canonical">` de `chess/index.html` y las URLs de `sitemap.xml` y `robots.txt` por la de Vercel.

Para que Google la indexe: la página ya lleva título, descripción, datos estructurados, `robots.txt` y `sitemap.xml`. Lo que acelera la aparición en Google es dar de alta la URL en [Google Search Console](https://search.google.com/search-console) y enviar el sitemap desde allí; sin eso Google tarda días o semanas en descubrirla.

### Nivel de los rivales

| Elo del bot | Comportamiento |
|---|---|
| < 1200 | Errores frecuentes, se cuelgan piezas, finales mal rematados a veces |
| 1200–1500 | Errores ocasionales de hasta una pieza menor |
| 1500–1800 | Imprecisiones; como mucho pierde un par de peones de golpe |
| 1800–2100 | Juega sólido, errores de ≤ 1 peón |
| 2100–2400 | Pequeñas imprecisiones (≤ 0,7 peones) |
| ≥ 2400 | Prácticamente siempre la mejor jugada que ve el motor |

### Despliegue en Vercel

1. En [vercel.com](https://vercel.com) → **Add New… → Project** e importa este repositorio de GitHub.
2. Deja el framework en **Other** y no cambies nada más: `vercel.json` ya indica que el contenido a publicar es la carpeta `chess/` (sin paso de build).
3. Pulsa **Deploy**. Cada push a la rama principal volverá a desplegar.

Con la CLI: `npx vercel --prod` desde la raíz del repositorio.

### Desarrollo local

```
cd chess
python3 -m http.server 8000
# abre http://localhost:8000
```

Hace falta servirlo por HTTP (no abrir el fichero directamente) porque la app usa módulos ES y un Web Worker.

### Créditos

- Reglas de ajedrez: [chess.js](https://github.com/jhlywa/chess.js) (BSD-2-Clause).
- Piezas: conjunto «cburnett» de Colin M.L. Burnett, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
- El resto del código es propio de este repositorio. ChessEmu no está afiliado a chess.com.
