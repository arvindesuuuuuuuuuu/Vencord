@echo off
setlocal
rem Match pnpm inject: use the bundled build instead of downloading upstream.
set "VENCORD_USER_DATA_DIR=%~dp0"
set "VENCORD_DEV_INSTALL=1"
set "INSTALLER_BIN=%~dp0bin\VencordInstallerCli.exe"
if not exist "%INSTALLER_BIN%" goto missing_files
for %%F in (patcher.js preload.js renderer.js renderer.css) do if not exist "%~dp0dist\%%F" goto missing_files
set "INSTALLER_EXIT_CODE=0"
if "%~1"=="" goto menu
"%INSTALLER_BIN%" %*
set "INSTALLER_EXIT_CODE=%ERRORLEVEL%"
pause
exit /b %INSTALLER_EXIT_CODE%

:menu
echo.
echo Vencord Fork Installer
echo Using bundled build: "%~dp0dist"
echo 1) Install
echo 2) Reinstall
echo 3) Uninstall
echo 4) Exit
choice /c 1234 /n /m "Choose an option: "
if errorlevel 4 goto exit
if errorlevel 3 goto choose_uninstall
if errorlevel 2 goto choose_reinstall
set "OPERATION=Install"
set "ACTION=--install"
goto branch

:choose_reinstall
set "OPERATION=Reinstall"
set "ACTION=--install"
goto branch

:choose_uninstall
set "OPERATION=Uninstall"
set "ACTION=--uninstall"

:branch
echo.
echo Select Discord
echo 1) Stable
echo 2) PTB
echo 3) Canary
echo 4) Back
echo 5) Exit
choice /c 12345 /n /m "Choose an option: "
if errorlevel 5 goto exit
if errorlevel 4 goto menu
if errorlevel 3 goto canary
if errorlevel 2 goto ptb
set "BRANCH=stable"
set "DISCORD_FOLDER=Discord"
set "DISCORD_PROCESS=Discord.exe"
goto confirm

:ptb
set "BRANCH=ptb"
set "DISCORD_FOLDER=DiscordPTB"
set "DISCORD_PROCESS=DiscordPTB.exe"
goto confirm

:canary
set "BRANCH=canary"
set "DISCORD_FOLDER=DiscordCanary"
set "DISCORD_PROCESS=DiscordCanary.exe"

:confirm
echo.
echo %OPERATION% %DISCORD_FOLDER%. Discord will close before applying changes.
if "%ACTION%"=="--install" echo Discord will start again after a successful install.
echo 1) Continue
echo 2) Back
echo 3) Exit
choice /c 123 /n /m "Choose an option: "
if errorlevel 3 goto exit
if errorlevel 2 goto branch
call :close_discord
if errorlevel 1 goto close_failed
"%INSTALLER_BIN%" %ACTION% --branch %BRANCH%
set "INSTALLER_EXIT_CODE=%ERRORLEVEL%"
if not "%INSTALLER_EXIT_CODE%"=="0" goto install_failed
echo %OPERATION% completed.
if "%ACTION%"=="--install" call :start_discord
goto finished

:close_failed
set "INSTALLER_EXIT_CODE=1"
echo Discord is still running. Quit it from the tray, then try again.
goto finished

:install_failed
echo %OPERATION% failed. See the installer output above.

:finished
echo.
echo 1) Back to main menu
echo 2) Exit
choice /c 12 /n /m "Choose an option: "
if errorlevel 2 goto exit
goto menu

:close_discord
tasklist /fi "imagename eq %DISCORD_PROCESS%" /nh | find /i "%DISCORD_PROCESS%" >nul
if errorlevel 1 exit /b 0
echo Closing %DISCORD_FOLDER%...
taskkill /im "%DISCORD_PROCESS%" /t >nul 2>&1
set "CLOSE_ATTEMPTS=0"
:wait_for_discord
tasklist /fi "imagename eq %DISCORD_PROCESS%" /nh | find /i "%DISCORD_PROCESS%" >nul
if errorlevel 1 exit /b 0
set /a CLOSE_ATTEMPTS+=1 >nul
if %CLOSE_ATTEMPTS% geq 10 exit /b 1
timeout /t 1 /nobreak >nul
goto wait_for_discord

:start_discord
if not exist "%LOCALAPPDATA%\%DISCORD_FOLDER%\Update.exe" goto start_missing
setlocal
set "VENCORD_USER_DATA_DIR="
set "VENCORD_DEV_INSTALL="
start "" "%LOCALAPPDATA%\%DISCORD_FOLDER%\Update.exe" --processStart %DISCORD_PROCESS%
endlocal
echo Started %DISCORD_FOLDER%.
exit /b 0
:start_missing
echo Installation succeeded. Start %DISCORD_FOLDER% from the Start menu.
exit /b 0

:missing_files
echo The installer archive is incomplete. Extract all files, including bin and dist, before running install.cmd.
echo Do not run the helper EXE directly; it installs the upstream build.
pause
exit /b 1

:exit
exit /b %INSTALLER_EXIT_CODE%
