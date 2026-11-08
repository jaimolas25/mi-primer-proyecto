@echo off
REM Programa la actualizacion automatica cada dia en Windows (Programador de tareas).
REM Uso:  programar_diario.bat            -> cada dia a las 08:00
REM       programar_diario.bat 21:30      -> cada dia a las 21:30
REM       programar_diario.bat --quitar   -> elimina la programacion
cd /d "%~dp0"

if "%1"=="--quitar" (
  schtasks /Delete /TN "MiTube Offline" /F
  exit /b
)

set HORA=%1
if "%HORA%"=="" set HORA=08:00

schtasks /Create /F /SC DAILY /ST %HORA% /TN "MiTube Offline" ^
  /TR "cmd /c cd /d \"%~dp0\" && python actualizar.py --actualizar-ytdlp >> actualizar.log 2>&1"

echo.
echo Listo. Cada dia a las %HORA% se descargaran los videos nuevos en:
echo   %~dp0videos\
echo El registro de cada actualizacion queda en actualizar.log.
