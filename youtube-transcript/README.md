# Transcriptor de YouTube (proxy tipo transcript.lol)

Servicio web que, dado el enlace de un vídeo de YouTube, obtiene sus subtítulos y los muestra como
transcripción legible: con tiempos, con búsqueda, con salto al vídeo al pulsar una línea y con descarga
en TXT, SRT o VTT. También funciona como **API/proxy** para que otros programas pidan la transcripción.

No usa ninguna dependencia externa: solo Node.js 18 o superior.

## Arrancar en local

```bash
cd youtube-transcript
npm start
```

Abre <http://localhost:3000>, pega un enlace de YouTube y pulsa **Transcribir**.

Para ejecutar las pruebas (no necesitan internet, simulan a YouTube):

```bash
npm test
```

## API

| Ruta | Qué devuelve |
| --- | --- |
| `GET /api/transcript?url=...` | La transcripción. |
| `GET /api/languages?url=...` | Los idiomas de subtítulos disponibles y a cuáles se puede traducir. |
| `GET /api/health` | `{ "ok": true }` si el servidor vive. |

Parámetros de `/api/transcript`:

| Parámetro | Valores | Descripción |
| --- | --- | --- |
| `url` | URL o ID | Acepta `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/` o el ID de 11 caracteres. |
| `lang` | `es`, `es,en`... | Idiomas preferidos por orden. Si no hay subtítulos en ese idioma pero YouTube puede traducirlos, devuelve la traducción automática. Sin `lang`, elige los subtítulos manuales si existen. |
| `format` | `json` (defecto), `text`, `srt`, `vtt` | Formato de salida. |
| `timestamps` | `1` | Solo con `format=text`: añade `[m:ss]` delante de cada línea. |
| `download` | `1` | Fuerza la descarga como archivo con el título del vídeo. |

Ejemplo:

```bash
curl "http://localhost:3000/api/transcript?url=https://youtu.be/VIDEO_ID&lang=es&format=text"
```

Respuesta en JSON (resumida):

```json
{
  "videoId": "VIDEO_ID",
  "info": { "title": "...", "author": "...", "thumbnail": "..." },
  "language": "es",
  "languageName": "Español",
  "isGenerated": false,
  "isTranslated": false,
  "availableLanguages": [{ "languageCode": "es", "name": "Español", "isGenerated": false, "isTranslatable": true }],
  "segments": [{ "start": 0.5, "duration": 2.3, "text": "Hola a todos" }]
}
```

Las respuestas llevan `Access-Control-Allow-Origin: *`, así que cualquier página web puede llamar a la API
directamente desde el navegador.

## Configuración (variables de entorno)

| Variable | Por defecto | Descripción |
| --- | --- | --- |
| `PORT` | `3000` | Puerto de escucha. |
| `CACHE_TTL_SECONDS` | `3600` | Cuánto tiempo se guarda cada transcripción en memoria. |
| `RATE_LIMIT_PER_MINUTE` | `30` | Peticiones a la API por minuto y por IP. |
| `ALLOWED_ORIGIN` | `*` | Origen permitido en CORS (pon tu dominio para restringirlo). |

## Desplegar

GitHub Pages solo sirve archivos estáticos, así que este servidor hay que alojarlo en un servicio que
ejecute Node.js (Render, Railway, Fly.io, un VPS...). Incluye un `Dockerfile`:

```bash
docker build -t transcriptor youtube-transcript
docker run -p 3000:3000 transcriptor
```

## Cómo funciona por dentro

1. `lib/youtube.js` saca el ID del vídeo, descarga la página de YouTube y pide al reproductor interno
   ("innertube", con el cliente Android) la lista de pistas de subtítulos. Si eso falla, lee el JSON
   `ytInitialPlayerResponse` incrustado en la propia página.
2. Elige la pista más adecuada (manual antes que automática, variantes regionales, traducción si hace falta)
   y la descarga en XML o json3, convirtiéndola a segmentos `{ start, duration, text }`.
3. `lib/format.js` convierte esos segmentos a texto, SRT o VTT.
4. `server.js` expone la API, sirve la web de `public/`, cachea en memoria y limita las peticiones por IP.

## Limitaciones

- Depende de los subtítulos que ofrezca YouTube (manuales o generados automáticamente). Si el vídeo no tiene
  ninguno, devuelve un error `no_captions`.
- YouTube puede bloquear IPs de servidores en la nube que hacen muchas peticiones o pedirles aceptar cookies.
  Si pasa, el error será `consent` o `upstream`; prueba desde otra IP o baja el ritmo de peticiones.
- Los vídeos privados o con restricción de edad requieren iniciar sesión y no se pueden transcribir.
