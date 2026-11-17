# mi-primer-proyecto

Páginas publicadas con GitHub Pages:

- `index.html` — Catálogo y tasador de libros.
- `tube/index.html` — **MiTube**: buscador y reproductor de vídeos de YouTube con interfaz
  propia. Busca cualquier vídeo (incluidos los subidos hace minutos), tendencias por país,
  canales, listas, vídeos relacionados, historial y reproducción automática del siguiente.
  No requiere cuenta ni instalación: `https://jaimolas25.github.io/mi-primer-proyecto/tube/`

## MiTube: cómo funciona

- Los datos (búsqueda, tendencias, canales, sugerencias) vienen de servidores públicos de
  [Piped](https://github.com/TeamPiped/Piped), sin clave. Si uno falla se prueba otro, y
  puedes elegirlo en ⚙️ Ajustes.
- El vídeo se reproduce con el reproductor incrustado oficial de YouTube (dominio
  `youtube-nocookie.com`), por lo que hace falta conexión a internet.
- Opcional: con una clave gratuita de la *YouTube Data API v3* (⚙️ Ajustes) las búsquedas
  van directas a YouTube y el filtro "Última hora" y el orden "Más recientes" son exactos.
- El historial y los ajustes se guardan solo en tu navegador.
- Abrir `tube/index.html` como archivo local no reproduce (YouTube lo bloquea con el
  error 153): usa la dirección publicada o sírvelo con `python3 -m http.server`.

## Aparecer en Google

El sitio ya está preparado para buscadores (`robots.txt`, `sitemap.xml`, metadatos y datos
estructurados en `tube/index.html`). Para que Google lo indexe cuanto antes:

1. Entra en <https://search.google.com/search-console> con tu cuenta de Google.
2. "Añadir propiedad" → tipo *Prefijo de URL* → `https://jaimolas25.github.io/mi-primer-proyecto/`.
3. Verifica con el método *Etiqueta HTML*: copia la etiqueta `<meta name="google-site-verification" …>`
   y pégala en la cabecera de `index.html` y de `tube/index.html` (hay un comentario que marca el sitio).
4. En Search Console, menú *Sitemaps*, envía `sitemap.xml`.
5. En *Inspección de URLs*, pega `https://jaimolas25.github.io/mi-primer-proyecto/tube/` y pulsa
   *Solicitar indexación*.

Google suele tardar entre unos días y un par de semanas en mostrar una página nueva.
