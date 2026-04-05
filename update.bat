@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "GIT_ORIGIN_URL=https://github.com/caiocollete/salvefacil"

echo.
echo === SalveFacil — atualizar repositorio e dependencias ===
echo Pasta do projeto: %ROOT%
echo.

call :git_sync || exit /b 1

call :ensure_node_24 || exit /b 1

echo [2/4] npm install na API...
pushd "%ROOT%\api" || exit /b 1
call npm install
if errorlevel 1 popd & echo Falha: npm install na API. & exit /b 1
popd

echo [3/4] npm install na Web...
pushd "%ROOT%\web" || exit /b 1
call npm install
if errorlevel 1 popd & echo Falha: npm install na Web. & exit /b 1
popd

echo [4/4] Prisma ^(generate + migrate deploy se houver api\.env^)...
call :run_prisma || exit /b 1

echo.
if /i "%~1"=="nopause" (
  echo Pronto. Continuando com o start...
) else (
  echo Pronto. Execute start.bat para iniciar a API e a Web ^(ou use start.bat, que ja chama este update^).
  echo.
  pause
)
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
echo [1/4] Git: fetch e pull ^(branch atual alinhada ao remoto^)...
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
if errorlevel 1 (
  echo node nao encontrado no PATH. Instale Node.js 24 ^(veja .nvmrc^): https://nodejs.org/
  pause
  exit /b 1
)
node -e "process.exit(/^v24\./.test(process.version)?0:1)" >nul 2>&1
if errorlevel 1 (
  echo A versao do Node precisa ser 24.x ^(veja .nvmrc^). Instale em https://nodejs.org/
  pause
  exit /b 1
)
for /f "delims=" %%V in ('node -v') do echo Usando %%V
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
