@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ======================================================================
echo  INICIANDO SERVIDOR LOCAL (PUERTO 5080) + TUNEL EXTERNO HTTPS PUBLICO
echo ======================================================================
start "Servidor Presupuesto Local (5080)" powershell.exe -NoExit -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 5080
timeout /t 2 >nul
echo.
echo Abriendo Tunel HTTPS para acceso desde equipos externos o datos moviles...
echo Copia el enlace https://xxxxxx.lhr.life que aparecera abajo:
echo.
ssh.exe -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:127.0.0.1:5080 nokey@localhost.run
pause
