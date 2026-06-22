@echo off
echo Iniciando servidor de Sales Arena...
cd /d "%~dp0"
start /min cmd /c "npm run dev"
echo Esperando a que el servidor inicie...
timeout /t 3 /nobreak > NUL
start http://localhost:5173
