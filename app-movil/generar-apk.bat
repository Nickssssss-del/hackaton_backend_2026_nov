@echo off
chcp 65001 >nul
REM Kuna - Genera el APK para instalar o compartir y lo deja en el Escritorio (Kuna-AAAA-MM-DD.apk).
REM Doble clic en este archivo. La primera vez tarda 10-30 minutos.
cd /d "%~dp0"
echo.
echo  Generando el APK de Kuna desde la rama:
git branch --show-current
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\correr-android.ps1" -Compartir %*
echo.
if errorlevel 1 (echo  No se genero el APK. Revisa node_modules\.vecinos-tmp\log-android.txt) else (echo  Listo: el APK esta en tu Escritorio.)
pause
