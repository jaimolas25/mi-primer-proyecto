#!/usr/bin/env bash
# Abre MiTube en el navegador. Si hay conexión, antes descarga las novedades.
# Uso:  ./iniciar.sh            (actualiza y abre)
#       ./iniciar.sh --solo-abrir   (abre sin actualizar)
cd "$(dirname "$0")"

if [ "$1" != "--solo-abrir" ]; then
  echo "Buscando vídeos nuevos (si no hay conexión, se abrirá lo ya descargado)…"
  python3 actualizar.py || python3 actualizar.py --sin-descargar
fi

# Abrir index.html con el navegador predeterminado del sistema
RUTA="$(pwd)/index.html"
if command -v xdg-open >/dev/null 2>&1; then xdg-open "$RUTA"      # Linux
elif command -v open >/dev/null 2>&1; then open "$RUTA"            # macOS
else echo "Abre este archivo en tu navegador: $RUTA"; fi
