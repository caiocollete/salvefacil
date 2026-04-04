@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "GIT_ORIGIN_URL=https://github.com/caiocollete/salvefacil"

echo.
echo === SalveFacil — ambiente local ===
echo Pasta do projeto: %ROOT%
echo.

call :git_sync || exit /b 1

call :ensure_node_24 || exit /b 1

echo [2/5] npm install na API...
pushd "%ROOT%\api" || exit /b 1
call npm install
if errorlevel 1 popd & echo Falha: npm install na API. & exit /b 1
popd

echo [3/5] npm install na Web...
pushd "%ROOT%\web" || exit /b 1
call npm install
if errorlevel 1 popd & echo Falha: npm install na Web. & exit /b 1
popd

echo [4/5] Prisma ^(generate + migrate deploy se houver api\.env^)...
call :run_prisma || exit /b 1

echo [5/5] Iniciando API e Web em janelas separadas...
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

:git_sync
pushd "%ROOT%" || exit /b 1
where git >nul 2>&1
if errorlevel 1 (
  echo Git nao encontrado no PATH. Pulando atualizacao do repositorio.
  echo Instale o Git: https://git-scm.com/downloads
  echo Repositorio oficial: %GIT_ORIGIN_URL%
  echo Para clonar em outra pasta: git clone %GIT_ORIGIN_URL%
  popd
  exit /b 0
)
if not exist ".git" (
  echo Pasta .git nao encontrada. Pulando fetch/pull.
  echo Repositorio oficial: %GIT_ORIGIN_URL%
  popd
  exit /b 0
)
git remote 2>nul | findstr /r "." >nul
if errorlevel 1 (
  echo Nenhum remote Git configurado. Adicionando origin: %GIT_ORIGIN_URL%
  git remote add origin "%GIT_ORIGIN_URL%"
  if errorlevel 1 (
    echo Falha ao adicionar remote origin.
    popd
    exit /b 1
  )
)
echo [1/5] Git: fetch e pull ^(branch atual alinhada ao remoto^)...
git fetch --all --prune
if errorlevel 1 (
  echo Falha em git fetch. Verifique rede, VPN ou permissao no repositorio.
  popd
  exit /b 1
)
git pull
if errorlevel 1 git pull -u origin main
if errorlevel 1 git pull -u origin master
if errorlevel 1 (
  echo Falha em git pull. Ajuste o upstream ^(ex.: git branch -u origin/main^) ou resolva conflitos.
  popd
  exit /b 1
)
popd
exit /b 0

:ensure_node_24
where node >nul 2>&1
if errorlevel 1 goto :install_node24

node -e "process.exit(/^v24\./.test(process.version)?0:1)" >nul 2>&1
if errorlevel 1 (
  echo Node encontrado, mas a versao precisa ser 24.x ^(veja .nvmrc^).
  goto :install_node24
)
for /f "delims=" %%V in ('node -v') do echo Usando %%V
exit /b 0

:install_node24
echo Node 24 nao encontrado. Tentando instalar ^(pode pedir UAC / administrador^)...
where winget >nul 2>&1
if errorlevel 1 goto :install_node24_ps

winget install -e --id OpenJS.NodeJS --accept-package-agreements --accept-source-agreements
call :prepend_nodejs_paths
where node >nul 2>&1
if errorlevel 1 (
  echo winget instalou o Node, mas ele ainda nao esta no PATH desta janela.
  echo Feche este CMD, abra outro e rode dev-local.bat de novo.
  pause
  exit /b 1
)
node -e "process.exit(/^v24\./.test(process.version)?0:1)" >nul 2>&1
if errorlevel 1 (
  echo Aviso: a versao instalada pelo winget pode nao ser 24.x.
  echo Instale Node 24 em https://nodejs.org/ ^(Current 24.x^) e rode de novo.
  pause
  exit /b 1
)
for /f "delims=" %%V in ('node -v') do echo Instalado: %%V
exit /b 0

:install_node24_ps
echo winget indisponivel. Baixando instalador MSI Node 24.x de nodejs.org via PowerShell...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; ^
   $idx = Invoke-RestMethod 'https://nodejs.org/dist/index.json'; ^
   $it = @($idx | Where-Object { $_.version -match '^v24\.' } | Select-Object -First 1)[0]; ^
   if (-not $it) { throw 'Nenhuma versao v24.x listada em nodejs.org/dist/index.json' }; ^
   $v = $it.version.TrimStart('v'); ^
   $url = \"https://nodejs.org/dist/v$v/node-v$v-x64.msi\"; ^
   $msi = Join-Path $env:TEMP (\"node-v$v-x64.msi\"); ^
   Write-Host ('Baixando ' + $url); ^
   Invoke-WebRequest -Uri $url -OutFile $msi -UseBasicParsing; ^
   Write-Host 'Instalando ^(passivo^)...'; ^
   $p = Start-Process msiexec.exe -Wait -PassThru -ArgumentList @('/i', $msi, '/passive', 'ADDLOCAL=ALL'); ^
   if ($p.ExitCode -ne 0) { exit $p.ExitCode }"
if errorlevel 1 (
  echo Falha na instalacao via PowerShell. Instale Node 24 manualmente: https://nodejs.org/
  pause
  exit /b 1
)
call :prepend_nodejs_paths
where node >nul 2>&1
if errorlevel 1 (
  echo Instalacao concluida, mas o PATH ainda nao enxerga o node.exe.
  echo Abra um NOVO prompt de comando e execute dev-local.bat de novo.
  pause
  exit /b 1
)
for /f "delims=" %%V in ('node -v') do echo Instalado: %%V
exit /b 0

:prepend_nodejs_paths
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
if exist "%LocalAppData%\Programs\nodejs\node.exe" set "PATH=%LocalAppData%\Programs\nodejs;%PATH%"
exit /b 0

:run_prisma
pushd "%ROOT%\api" || exit /b 1
call npx prisma generate
if errorlevel 1 popd & echo Falha: prisma generate. & exit /b 1

if not exist ".env" (
  echo Nao ha api\.env — migrate ignorado. Copie api\.env.example para api\.env e configure DATABASE_URL.
  popd
  exit /b 0
)

findstr /b /c:"DATABASE_URL=" ".env" >nul 2>&1
if errorlevel 1 (
  echo api\.env sem DATABASE_URL — migrate deploy ignorado.
  popd
  exit /b 0
)

echo Aplicando migracoes pendentes ^(prisma migrate deploy^)...
call npx prisma migrate deploy
if errorlevel 1 (
  echo migrate deploy falhou ^(banco inacessivel ou migracoes novas em dev^).
  echo Em desenvolvimento, rode manualmente: cd api ^&^& npx prisma migrate dev
  popd
  exit /b 1
)
popd
exit /b 0
