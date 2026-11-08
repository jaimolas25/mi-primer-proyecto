@echo off
REM Abre MiTube en el navegador. Si hay conexion, antes descarga las novedades.
REM Uso:  iniciar.bat               (actualiza y abre)
REM       iniciar.bat --solo-abrir  (abre sin actualizar)
cd /d "%~dp0"

if not "%1"=="--solo-abrir" (
  echo Buscando videos nuevos (si no hay conexion, se abrira lo ya descargado)...
  python actualizar.py || python actualizar.py --sin-descargar
)

start "" "%~dp0index.html"
