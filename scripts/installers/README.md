# Vencord installers for Windows and Linux

These archives include this fork's compiled Vencord build and the official installer CLI. They support x86-64 Windows and Linux. Node.js and pnpm are not required to install them.

The interactive launcher closes the selected Discord branch before applying changes. Finish any calls or uploads first. After a successful install or reinstall, it starts that branch again.

## Windows

1. Download `VencordInstaller-windows.zip`.
2. Extract the entire archive to a permanent folder.
3. Open that folder and double-click `install.cmd`.
4. Choose **Install**, **Reinstall**, or **Uninstall**, then choose **Stable**, **PTB**, or **Canary**.
5. Choose **Continue** to apply the change. Discord starts automatically after a successful install or reinstall.

Always launch **`install.cmd`** to install this fork. The EXE in `bin` is an internal helper; running it directly installs upstream Vencord and can replace your fork with the original repository's build.

If you previously ran the EXE directly, fully quit Discord, then run `install.cmd` and choose **Reinstall** for the same Discord branch. This replaces the upstream patch with the bundled fork build.

Choose **Back** to return to the previous screen or **Exit** to leave the installer. After an operation, choose **Back to main menu** to perform another action.

To uninstall, open Command Prompt in the extracted folder and run:

```bat
install.cmd --uninstall
```

## Linux

Download `VencordInstaller-linux.tar.gz`, then extract it and run the installer:

```sh
tar -xzf VencordInstaller-linux.tar.gz
cd VencordInstaller-linux
sh ./install.sh
```

Choose **Install**, **Reinstall**, or **Uninstall**, then choose **Stable**, **PTB**, or **Canary** and **Continue**. Use **Back** to return to the previous screen or **Exit** to leave. After an operation, you can return to the main menu.

The launcher closes the selected branch before patching and starts it after a successful install or reinstall. This requires `pgrep` and `pkill` (usually provided by `procps` or `procps-ng`). If Discord does not exit within 10 seconds, the operation stops so you can quit it from the tray and try again.

If the installer cannot write to Discord's installation directory, rerun `sudo sh ./install.sh`. When running as root, it leaves Discord closed; start it yourself as your normal user. Automatic launch supports the `discord`, `discord-ptb`, and `discord-canary` commands and their Flatpak installations. If no launcher is found, start Discord from your application menu.

Discord installed through Snap is unsupported. Use the official Discord package or Flatpak.

To uninstall, run this from the extracted folder:

```sh
sh ./install.sh --uninstall
```

If uninstalling requires administrator privileges, use `sudo sh ./install.sh --uninstall`.

## Keep the extracted folder

Discord loads Vencord directly from the archive's extracted `dist` folder. Keep the entire extracted folder in its permanent location. Uninstall Vencord before deleting or moving it.

## Reinstalling

Run the launcher again and choose **Reinstall**. This reapplies the bundled build to the selected Discord installation, replacing its existing Vencord patch while keeping your settings. For a direct command, use `install.cmd --install` on Windows or `sh ./install.sh --install` on Linux. Uninstall is also available from either launcher's menu or through the commands above.

Direct commands bypass the menus and automatic restart. Fully quit Discord before using them, then start it yourself afterward. They also support the official installer's `--location` option for custom installations.

## Updating

Automatic updates are supported through Vencord's Updater settings. Enable automatic updates there, or check for updates manually. The updater downloads this fork's latest installer archive and replaces the bundled desktop build; restart Discord when prompted. Keep the extracted folder writable by your user so updates can be saved.

If you previously installed a release with automatic updates disabled, install this newer release once to enable the updater. For a manual update, quit Discord, extract the newest archive over the existing folder, and run its launcher again. Keep the same folder location. Back up any local changes before replacing files.

The release contains the Windows archive, Linux archive, and this README. Each archive also includes these instructions and license information.
