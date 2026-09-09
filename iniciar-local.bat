@echo off
rem Levanta el backend (API) y el frontend (sitio estatico) en localhost,
rem cada uno en su propia ventana minimizada. Requiere dotnet SDK y Python
rem instalados y disponibles en PATH.

set "RAIZ=%~dp0"

start "TortuTAM API" /min cmd /k "cd /d "%RAIZ%src\TortuTAM.Api" && dotnet run"
start "TortuTAM Web" /min cmd /k "cd /d "%RAIZ%src\TortuTAM.Web" && py -3 -m http.server 8080"

echo API:  http://localhost:5034
echo Web:  http://localhost:8080
