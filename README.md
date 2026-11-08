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
