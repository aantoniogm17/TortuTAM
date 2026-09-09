@echo off
rem Cierra las ventanas de API y Web abiertas por iniciar-local.bat
rem (y los procesos dotnet/python que corren dentro de ellas).

taskkill /FI "WINDOWTITLE eq TortuTAM API*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq TortuTAM Web*" /T /F >nul 2>&1

echo Procesos de TortuTAM detenidos.
