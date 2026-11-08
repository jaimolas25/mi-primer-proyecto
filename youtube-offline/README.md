# MiTube · YouTube sin conexión

Una copia local de tus canales favoritos de YouTube: un programa descarga cada día
los vídeos nuevos a tu ordenador y una página web propia (sin anuncios, sin
cuenta y **sin conexión**) te los reproduce con un aspecto parecido a YouTube.

```
youtube-offline/
├── index.html            Interfaz: ábrela con doble clic para ver los vídeos
├── canales.txt           Lista de canales/listas que quieres seguir  ← edítalo
├── actualizar.py         Descarga novedades y prepara la biblioteca
├── iniciar.sh / .bat     Actualiza (si hay conexión) y abre la interfaz
├── programar_diario.sh   Programa la actualización automática diaria (Linux/Mac)
├── programar_diario.bat  Programa la actualización automática diaria (Windows)
├── videos/               Aquí se guardan los vídeos (se crea sola)
└── biblioteca.js         Índice de vídeos que lee index.html (se genera solo)
```

## Requisitos

- **Python 3.8 o superior** → <https://www.python.org/downloads/> (en Windows marca "Add Python to PATH").
- **ffmpeg** (recomendado) → <https://ffmpeg.org/download.html>. Sin él solo se descarga
  en calidad limitada (unos 720p) y las miniaturas quedan en formato .webp. Con él se
  pueden pedir 1080p o más.
- **yt-dlp** se instala solo la primera vez que ejecutas `actualizar.py`
  (o a mano con `pip install yt-dlp`).

## Puesta en marcha (3 pasos)

1. Abre `canales.txt` y escribe los canales que quieres seguir, uno por línea:
   ```
   https://www.youtube.com/@Kurzgesagt
   https://www.youtube.com/@QuantumFracture
   https://www.youtube.com/playlist?list=PLxxxxxxxx
   ```
2. En una terminal, dentro de esta carpeta, ejecuta:
   ```bash
   python3 actualizar.py        # en Windows: python actualizar.py
   ```
   La primera vez tardará un rato: descarga los 5 vídeos más recientes de cada canal
   publicados en los últimos 30 días.
3. Abre `index.html` con doble clic (o ejecuta `./iniciar.sh` / `iniciar.bat`).
   A partir de aquí no hace falta conexión para ver nada de lo descargado.

## Actualización automática cada día

Elige **una** de estas tres opciones:

| Opción | Cómo | Para quién |
|---|---|---|
| Programador del sistema | `./programar_diario.sh 08:00` (Linux/Mac) o `programar_diario.bat 08:00` (Windows) | Lo normal: se ejecuta solo aunque cierres todo |
| Programa residente | `python3 actualizar.py --cada-dia --hora 08:00` y dejar la ventana abierta | Si no quieres tocar el programador del sistema |
| Al abrir | `./iniciar.sh` o `iniciar.bat` | Actualiza solo cuando tú abres MiTube |

Para quitar la programación: `./programar_diario.sh --quitar` o `programar_diario.bat --quitar`.
Cada ejecución queda anotada en `actualizar.log`.

En modo diario también se actualiza `yt-dlp`, porque YouTube cambia a menudo y
una versión antigua deja de descargar.

## Opciones de `actualizar.py`

| Opción | Qué hace | Por defecto |
|---|---|---|
| `--max-videos N` | Vídeos recientes a revisar por canal | 5 |
| `--dias N` | Solo vídeos publicados en los últimos N días | 30 |
| `--calidad N` | Altura máxima: 480, 720, 1080, 1440, 2160 | 720 |
| `--conservar N` | Borra vídeos publicados hace más de N días (0 = nunca) | 60 |
| `--incluir-shorts` | Descargar también vídeos de menos de 60 s | no |
| `--sin-descargar` | Solo regenerar la biblioteca con lo que ya hay | — |
| `--actualizar-ytdlp` | Actualizar yt-dlp antes de empezar | — |
| `--cada-dia` / `--hora HH:MM` | Repetir cada 24 h a esa hora | 08:00 |

Ejemplo: `python3 actualizar.py --max-videos 10 --calidad 1080 --conservar 90`

## Qué ofrece la interfaz

- Rejilla de vídeos con miniatura, duración, canal, visualizaciones y fecha.
- Búsqueda por título, canal o descripción, y orden por fecha, vistas o duración.
- Reproductor con descripción, lista "A continuación" y reproducción automática del siguiente.
- Recuerda por dónde ibas en cada vídeo (barra roja en la miniatura) y tu historial.
- Secciones: Inicio, Pendientes de ver, Historial y un apartado por canal.
- Atajos de teclado: `K` pausa, `J`/`L` ±10 s, `F` pantalla completa, `M` silencio,
  `N` siguiente, `Esc` volver, `/` buscar.
- Funciona en móvil si copias la carpeta (o la compartes por red local).

## Preguntas frecuentes

**¿Ocupa mucho?** A 720p un vídeo de 15 minutos ronda 150–300 MB. Ajusta `--calidad`,
`--max-videos` y `--conservar` según tu disco.

**¿Puedo verlo en el móvil o en otro ordenador?** Sí: copia la carpeta entera o ejecuta
`python3 -m http.server 8080` dentro de ella y abre `http://IP-de-tu-ordenador:8080`
desde cualquier dispositivo de tu red.

**¿Por qué no descarga nada?** Mira `actualizar.log`. Lo más habitual es que yt-dlp
esté desactualizado (`pip install -U yt-dlp`) o que los vídeos del canal tengan más de
30 días (`--dias 365`).

**Esta parte no se publica en GitHub Pages**: los vídeos se descargan a tu ordenador,
no al repositorio (`videos/` y `biblioteca.js` están en `.gitignore`).

## Nota

Descargar vídeos puede ir en contra de las condiciones de uso de YouTube. Úsalo solo
para ver en privado contenido al que ya tienes acceso, y respeta los derechos de los
creadores.
