@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo === SalveFacil — iniciar aplicacao ===
echo Pasta do projeto: %ROOT%
echo.
echo [1/2] Atualizando repositorio e dependencias ^(update.bat^)...
call "%ROOT%\update.bat" nopause || exit /b 1

echo.
echo [2/2] Iniciando API e Web em janelas separadas...
set "SFAPI=%TEMP%\salvefacil-run-api.cmd"
set "SFWEB=%TEMP%\salvefacil-run-web.cmd"
> "%SFAPI%" echo @cd /d "%ROOT%\api"
>> "%SFAPI%" echo @npm run start:dev
> "%SFWEB%" echo @cd /d "%ROOT%\web"
>> "%SFWEB%" echo @npm run dev
start "SalveFacil API" cmd /k call "%SFAPI%"
start "SalveFacil Web" cmd /k call "%SFWEB%"
echo.
echo Aguardando o Next iniciar ^(~4 s^)...
timeout /t 4 /nobreak >nul
start "" "http://localhost:4000"
echo.
echo API: http://localhost:3001 ^(ou PORT no api\.env^)
echo Web: http://localhost:4000 ^(fixo nos scripts npm^)
echo Feche as janelas dos servidores para parar.
echo.
pause
exit /b 0
