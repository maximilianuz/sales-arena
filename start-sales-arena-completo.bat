@echo off
setlocal
title Sales Arena - servidor completo (8888)
cd /d "%~dp0"

echo ==========================================================
echo   SALES ARENA - servidor completo
echo   Incluye las funciones: Feynman, roleplay y auditoria.
echo ==========================================================
echo.

REM Aviso temprano si falta la key, porque si no las funciones de IA
REM fallan recien cuando las usas y el error no dice que era esto.
if not exist ".env.local" (
  echo   [!] No se encontro .env.local
  echo       Las funciones de IA no van a funcionar sin las claves.
  echo.
)

REM Si ya hay un servidor arriba, no levantamos otro: el segundo fallaria
REM por puerto ocupado y encima el sondeo daria verde igual, porque el que
REM responde es el viejo. Mejor detectarlo y abrir el navegador directo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "try{ Invoke-WebRequest -Uri 'http://localhost:8888' -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop | Out-Null; exit 0 }catch{ if($_.Exception.Response){ exit 0 } }; exit 1"

if not errorlevel 1 (
  echo   [i] Ya habia un servidor corriendo en 8888. Abro el navegador.
  start http://localhost:8888
  exit
)

echo Levantando el servidor... la primera vez puede tardar un minuto.
echo No cierres la ventana que se abre: ahi corre el servidor.
echo.

start "Sales Arena - servidor (no cerrar)" cmd /k "npm run dev:functions"

echo Esperando a que el servidor responda en http://localhost:8888 ...

REM Sondea por HTTP y no por TCP. Dos motivos: Vite escucha solo en IPv6
REM (::1) y un TcpClient apunta a IPv4 por defecto, con lo cual nunca
REM conectaria; y ademas lo que importa no es que el puerto este abierto
REM sino que la app conteste. Un 404 o un 500 tambien cuentan como "arriba".
REM El timeout es largo porque Netlify levanta su proxy y Vite por dentro.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$fin=(Get-Date).AddSeconds(120); while((Get-Date) -lt $fin){ try{ Invoke-WebRequest -Uri 'http://localhost:8888' -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop | Out-Null; exit 0 }catch{ if($_.Exception.Response){ exit 0 } }; Start-Sleep -Milliseconds 700 }; exit 1"

if errorlevel 1 (
  echo.
  echo   [X] El servidor no respondio en 120 segundos.
  echo       Revisa la otra ventana: ahi esta el error real.
  echo.
  pause
  exit /b 1
)

echo   [OK] Servidor arriba. Abriendo el navegador...
start http://localhost:8888
exit
