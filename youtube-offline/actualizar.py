#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
actualizar.py — Descarga los vídeos nuevos de los canales de "canales.txt"
y prepara la biblioteca que lee la interfaz (index.html).

Uso básico:
    python3 actualizar.py                  Descarga novedades y regenera la biblioteca
    python3 actualizar.py --cada-dia       Igual, pero se queda abierto y repite cada 24 h
    python3 actualizar.py --sin-descargar  Solo regenera la biblioteca con lo ya descargado
    python3 actualizar.py --ayuda          Muestra todas las opciones

Necesita:
    - Python 3.8 o superior
    - yt-dlp   (se instala solo la primera vez con: pip install yt-dlp)
    - ffmpeg   (opcional pero recomendado: permite calidad alta y miniaturas .jpg)
"""

import argparse
import datetime as dt
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

# ------------------------------------------------------------------
#  Rutas y valores por defecto
# ------------------------------------------------------------------
CARPETA = Path(__file__).resolve().parent          # carpeta donde está este archivo
ARCHIVO_CANALES = CARPETA / "canales.txt"          # lista de canales a seguir
CARPETA_VIDEOS = CARPETA / "videos"                # aquí se guardan los vídeos
ARCHIVO_BIBLIOTECA = CARPETA / "biblioteca.js"     # lo que lee index.html
ARCHIVO_REGISTRO = CARPETA_VIDEOS / "descargados.txt"  # para no repetir descargas
ARCHIVO_LOG = CARPETA / "actualizar.log"

EXTENSIONES_VIDEO = (".mp4", ".mkv", ".webm", ".mov")
EXTENSIONES_IMAGEN = (".jpg", ".jpeg", ".png", ".webp")


# ------------------------------------------------------------------
#  Utilidades pequeñas
# ------------------------------------------------------------------
def ahora() -> str:
    return dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def log(mensaje: str) -> None:
    """Escribe en pantalla y en actualizar.log a la vez."""
    linea = f"[{ahora()}] {mensaje}"
    print(linea, flush=True)
    try:
        with open(ARCHIVO_LOG, "a", encoding="utf-8") as f:
            f.write(linea + "\n")
    except OSError:
        pass


def hay_ffmpeg() -> bool:
    return shutil.which("ffmpeg") is not None


def asegurar_ytdlp(actualizar: bool = False):
    """Importa yt-dlp; si no está (o se pide), lo instala/actualiza con pip."""
    if actualizar:
        log("Actualizando yt-dlp (YouTube cambia a menudo y conviene tenerlo al día)…")
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "--quiet", "--upgrade", "yt-dlp"],
            check=False,
        )
    try:
        import yt_dlp  # noqa: F401
    except ImportError:
        log("yt-dlp no está instalado. Instalándolo con pip…")
        resultado = subprocess.run(
            [sys.executable, "-m", "pip", "install", "--quiet", "yt-dlp"], check=False
        )
        if resultado.returncode != 0:
            log("No se pudo instalar yt-dlp. Instálalo a mano con:  pip install yt-dlp")
            sys.exit(1)
    import yt_dlp
    return yt_dlp


def leer_canales() -> list:
    """Devuelve las direcciones de canales.txt (sin comentarios ni líneas vacías)."""
    if not ARCHIVO_CANALES.exists():
        log(f"No existe {ARCHIVO_CANALES.name}. Créalo con una dirección de canal por línea.")
        return []
    direcciones = []
    for linea in ARCHIVO_CANALES.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#"):
            continue
        # Si es un canal sin pestaña concreta, usamos su pestaña "Vídeos"
        # (así no se cuelan directos ni shorts salvo que se pida).
        es_canal = ("/@" in linea or "/channel/" in linea or "/c/" in linea or "/user/" in linea)
        if es_canal and not linea.rstrip("/").endswith(("/videos", "/shorts", "/streams", "/playlists")):
            linea = linea.rstrip("/") + "/videos"
        direcciones.append(linea)
    return direcciones


# ------------------------------------------------------------------
#  Descarga
# ------------------------------------------------------------------
def descargar(direcciones: list, args) -> None:
    yt_dlp = asegurar_ytdlp(actualizar=args.actualizar_ytdlp)
    CARPETA_VIDEOS.mkdir(parents=True, exist_ok=True)

    con_ffmpeg = hay_ffmpeg()
    if con_ffmpeg:
        # Mejor vídeo hasta la altura pedida + mejor audio, unidos en un .mp4
        formato = (
            f"bestvideo[height<={args.calidad}][ext=mp4]+bestaudio[ext=m4a]"
            f"/bestvideo[height<={args.calidad}]+bestaudio"
            f"/best[height<={args.calidad}]/best"
        )
    else:
        # Sin ffmpeg no se pueden unir pistas: pedimos un archivo ya completo
        log("Aviso: no se encontró ffmpeg. Se descargará en calidad limitada (normalmente 720p).")
        formato = f"best[height<={args.calidad}][ext=mp4]/best[ext=mp4]/best"

    # Filtro: nada de directos y, salvo que se pida, nada de shorts (< 60 s)
    condiciones = ["!is_live", "!was_live"]
    if not args.incluir_shorts:
        condiciones.append("duration >= 60")
    filtro = yt_dlp.utils.match_filter_func(" & ".join(condiciones))

    opciones = {
        "format": formato,
        "merge_output_format": "mp4",
        "outtmpl": str(CARPETA_VIDEOS / "%(channel_id,uploader_id,playlist_id|sin_canal)s" / "%(id)s.%(ext)s"),
        "download_archive": str(ARCHIVO_REGISTRO),   # recuerda lo ya bajado
        "playlistend": args.max_videos,              # solo los N más recientes de cada canal
        "daterange": yt_dlp.utils.DateRange(f"now-{args.dias}days", None),
        "match_filter": filtro,
        "writeinfojson": True,                       # metadatos (título, fecha, descripción…)
        "writethumbnail": True,                      # miniatura
        "clean_infojson": True,
        "ignoreerrors": True,                        # un vídeo roto no detiene el resto
        "no_warnings": False,
        "quiet": False,
        "noprogress": not sys.stdout.isatty(),
        "retries": 3,
        "fragment_retries": 3,
        "lazy_playlist": True,
        "extractor_args": {"youtubetab": {"approximate_date": ["true"]}},
        "postprocessors": [],
    }
    if con_ffmpeg:
        opciones["postprocessors"].append(
            {"key": "FFmpegThumbnailsConvertor", "format": "jpg", "when": "before_dl"}
        )

    with yt_dlp.YoutubeDL(opciones) as ydl:
        for direccion in direcciones:
            log(f"Revisando: {direccion}")
            try:
                ydl.download([direccion])
            except Exception as error:  # noqa: BLE001
                log(f"  Error con {direccion}: {error}")


# ------------------------------------------------------------------
#  Limpieza de vídeos antiguos
# ------------------------------------------------------------------
def limpiar_antiguos(dias_conservar: int) -> int:
    """Borra los vídeos publicados hace más de N días para no llenar el disco."""
    if dias_conservar <= 0 or not CARPETA_VIDEOS.exists():
        return 0
    limite = dt.date.today() - dt.timedelta(days=dias_conservar)
    borrados = 0
    for info in CARPETA_VIDEOS.rglob("*.info.json"):
        try:
            datos = json.loads(info.read_text(encoding="utf-8"))
            fecha_txt = datos.get("upload_date") or ""
            fecha = dt.datetime.strptime(fecha_txt, "%Y%m%d").date()
        except (ValueError, json.JSONDecodeError, OSError):
            continue
        if fecha < limite:
            base = info.name[: -len(".info.json")]
            for archivo in info.parent.glob(base + ".*"):
                archivo.unlink(missing_ok=True)
                borrados += 1
            log(f"  Borrado por antiguo: {datos.get('title', base)}")
    return borrados


# ------------------------------------------------------------------
#  Construcción de la biblioteca (biblioteca.js)
# ------------------------------------------------------------------
def fecha_legible(fecha_txt: str) -> str:
    try:
        return dt.datetime.strptime(fecha_txt, "%Y%m%d").strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return ""


def construir_biblioteca() -> dict:
    videos = []
    canales = {}
    if CARPETA_VIDEOS.exists():
        for info in sorted(CARPETA_VIDEOS.rglob("*.info.json")):
            try:
                datos = json.loads(info.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                continue
            if datos.get("_type") in ("playlist", "multi_video"):
                continue  # es la ficha de un canal o lista, no de un vídeo

            base = info.name[: -len(".info.json")]
            archivo_video = next(
                (a for a in info.parent.glob(base + ".*") if a.suffix.lower() in EXTENSIONES_VIDEO),
                None,
            )
            if archivo_video is None:
                continue  # aún no se ha descargado (o se borró)
            miniatura = next(
                (a for a in info.parent.glob(base + ".*") if a.suffix.lower() in EXTENSIONES_IMAGEN),
                None,
            )

            canal_id = datos.get("channel_id") or datos.get("uploader_id") or info.parent.name
            canal_nombre = datos.get("channel") or datos.get("uploader") or canal_id
            canales.setdefault(canal_id, {"id": canal_id, "nombre": canal_nombre, "videos": 0})
            canales[canal_id]["videos"] += 1

            videos.append({
                "id": datos.get("id") or base,
                "titulo": datos.get("title") or base,
                "canal": canal_nombre,
                "canal_id": canal_id,
                "fecha": fecha_legible(datos.get("upload_date", "")),
                "duracion": int(datos.get("duration") or 0),
                "vistas": datos.get("view_count"),
                "megusta": datos.get("like_count"),
                "descripcion": (datos.get("description") or "")[:3000],
                "url_original": datos.get("webpage_url") or "",
                "archivo": archivo_video.relative_to(CARPETA).as_posix(),
                "miniatura": miniatura.relative_to(CARPETA).as_posix() if miniatura else "",
                "descargado": dt.datetime.fromtimestamp(archivo_video.stat().st_mtime).strftime("%Y-%m-%d %H:%M"),
            })

    videos.sort(key=lambda v: (v["fecha"], v["descargado"]), reverse=True)
    return {
        "actualizado": ahora(),
        "total": len(videos),
        "canales": sorted(canales.values(), key=lambda c: c["nombre"].lower()),
        "videos": videos,
    }


def escribir_biblioteca(biblioteca: dict) -> None:
    # Se guarda como un archivo .js (y no .json) para que index.html funcione
    # abriéndolo directamente con doble clic, sin necesidad de servidor.
    contenido = (
        "// Archivo generado automáticamente por actualizar.py — no lo edites a mano.\n"
        "window.BIBLIOTECA = " + json.dumps(biblioteca, ensure_ascii=False, indent=1) + ";\n"
    )
    ARCHIVO_BIBLIOTECA.write_text(contenido, encoding="utf-8")


# ------------------------------------------------------------------
#  Ciclo principal
# ------------------------------------------------------------------
def ejecutar_una_vez(args) -> None:
    log("=== Inicio de la actualización ===")
    if not args.sin_descargar:
        direcciones = leer_canales()
        if direcciones:
            descargar(direcciones, args)
        else:
            log("No hay direcciones activas en canales.txt (quita el '#' de las que quieras seguir).")
    borrados = limpiar_antiguos(args.conservar)
    if borrados:
        log(f"Limpieza: {borrados} archivos antiguos eliminados.")
    biblioteca = construir_biblioteca()
    escribir_biblioteca(biblioteca)
    log(f"Biblioteca lista: {biblioteca['total']} vídeos de {len(biblioteca['canales'])} canales.")
    log("=== Fin ===")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Descarga vídeos de YouTube para verlos sin conexión.",
        add_help=False,
    )
    parser.add_argument("--ayuda", "-h", action="help", help="Muestra esta ayuda")
    parser.add_argument("--max-videos", type=int, default=5,
                        help="Vídeos más recientes a revisar por canal (por defecto 5)")
    parser.add_argument("--dias", type=int, default=30,
                        help="Solo vídeos publicados en los últimos N días (por defecto 30)")
    parser.add_argument("--calidad", type=int, default=720,
                        help="Altura máxima en píxeles: 480, 720, 1080… (por defecto 720)")
    parser.add_argument("--conservar", type=int, default=60,
                        help="Borrar vídeos de hace más de N días; 0 = no borrar nunca (por defecto 60)")
    parser.add_argument("--incluir-shorts", action="store_true",
                        help="Descargar también vídeos de menos de 60 segundos")
    parser.add_argument("--sin-descargar", action="store_true",
                        help="No descargar nada, solo regenerar biblioteca.js")
    parser.add_argument("--actualizar-ytdlp", action="store_true",
                        help="Actualizar yt-dlp antes de descargar")
    parser.add_argument("--cada-dia", action="store_true",
                        help="Dejar el programa abierto y repetir la actualización cada 24 horas")
    parser.add_argument("--hora", type=str, default="08:00",
                        help="Con --cada-dia: hora de la actualización diaria (por defecto 08:00)")
    args = parser.parse_args()

    if not args.cada_dia:
        ejecutar_una_vez(args)
        return

    # Modo "cada día": se ejecuta ahora y luego una vez al día a la hora indicada.
    try:
        hora, minuto = (int(x) for x in args.hora.split(":"))
    except ValueError:
        log("La hora debe tener el formato HH:MM (por ejemplo 08:00).")
        sys.exit(1)

    args.actualizar_ytdlp = True  # en modo diario conviene tener yt-dlp al día
    while True:
        ejecutar_una_vez(args)
        siguiente = dt.datetime.now().replace(hour=hora, minute=minuto, second=0, microsecond=0)
        if siguiente <= dt.datetime.now():
            siguiente += dt.timedelta(days=1)
        log(f"Próxima actualización: {siguiente:%Y-%m-%d %H:%M}. Deja esta ventana abierta (Ctrl+C para salir).")
        try:
            time.sleep(max(1, (siguiente - dt.datetime.now()).total_seconds()))
        except KeyboardInterrupt:
            log("Detenido por el usuario.")
            break


if __name__ == "__main__":
    main()
