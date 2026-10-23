@echo off
setlocal
rem Match pnpm inject: use the bundled build instead of downloading upstream.
set "VENCORD_USER_DATA_DIR=%~dp0"
set "VENCORD_DEV_INSTALL=1"
if "%~1"=="" (
    "%~dp0VencordInstallerCli.exe" --install
) else (
    "%~dp0VencordInstallerCli.exe" %*
)
set "INSTALLER_EXIT_CODE=%ERRORLEVEL%"
pause
exit /b %INSTALLER_EXIT_CODE%
