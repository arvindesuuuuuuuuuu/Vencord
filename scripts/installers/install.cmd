@echo off
setlocal
rem Match pnpm inject: use the bundled build instead of downloading upstream.
set "VENCORD_USER_DATA_DIR=%~dp0"
set "VENCORD_DEV_INSTALL=1"
if "%~1"=="" goto menu
"%~dp0VencordInstallerCli.exe" %*
goto finished

:menu
echo Fully quit Discord before continuing.
echo.
echo 1) Install
echo 2) Reinstall
echo 3) Uninstall
echo 4) Exit
choice /c 1234 /n /m "Choose an option [1-4]: "
if errorlevel 4 exit /b 0
if errorlevel 3 goto uninstall
rem Install also reapplies the patch to an already patched Discord installation.
"%~dp0VencordInstallerCli.exe" --install
goto finished

:uninstall
"%~dp0VencordInstallerCli.exe" --uninstall

:finished
set "INSTALLER_EXIT_CODE=%ERRORLEVEL%"
pause
exit /b %INSTALLER_EXIT_CODE%
