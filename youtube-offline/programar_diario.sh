#!/usr/bin/env bash
# Programa la actualización automática cada día (Linux y macOS) usando cron.
# Uso:  ./programar_diario.sh          -> cada día a las 08:00
#       ./programar_diario.sh 21:30    -> cada día a las 21:30
#       ./programar_diario.sh --quitar -> elimina la programación
cd "$(dirname "$0")"
CARPETA="$(pwd)"
MARCA="# mitube-offline"
PYTHON="$(command -v python3 || command -v python)"

if [ "$1" = "--quitar" ]; then
  crontab -l 2>/dev/null | grep -v "$MARCA" | crontab -
  echo "Programación diaria eliminada."
  exit 0
fi

HORA="${1:-08:00}"
H="${HORA%%:*}"; M="${HORA##*:}"
if ! [[ "$H" =~ ^[0-9]{1,2}$ && "$M" =~ ^[0-9]{1,2}$ ]]; then
  echo "La hora debe tener el formato HH:MM (ejemplo: 08:00)"; exit 1
fi

LINEA="$((10#$M)) $((10#$H)) * * * cd \"$CARPETA\" && \"$PYTHON\" actualizar.py --actualizar-ytdlp >> actualizar.log 2>&1 $MARCA"
( crontab -l 2>/dev/null | grep -v "$MARCA"; echo "$LINEA" ) | crontab -

echo "Listo. Cada día a las $HORA se descargarán los vídeos nuevos en:"
echo "  $CARPETA/videos/"
echo "El registro de cada actualización queda en actualizar.log."
echo "Nota: en macOS, si el sistema lo pide, concede acceso a cron en Ajustes > Privacidad > Acceso total al disco."
