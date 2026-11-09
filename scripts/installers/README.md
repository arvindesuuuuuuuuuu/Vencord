# Vencord installers for Windows and Linux

These archives include this fork's compiled Vencord build and the official installer CLI. They support x86-64 Windows and Linux. Node.js and pnpm are not required to install them.

The interactive launcher closes the selected Discord branch before applying changes. Finish any calls or uploads first. After a successful install or reinstall, it starts that branch again.

## Windows

1. Download `VencordInstaller-windows.zip`.
2. Extract the entire archive to a permanent folder.
3. Open that folder and double-click `install.cmd`.
4. The **Vencord Graphical Installer** window opens with a dark Discord theme.
5. Select your Discord branch (**Discord Stable**, **PTB**, **Canary**, or specify a custom folder).
6. Click **Install**, **Reinstall / Repair**, or **Uninstall**.
7. If "Automatically close and restart Discord" is checked, the installer gracefully stops Discord, applies the patch, and restarts Discord automatically.

*Note:* If you prefer the terminal interface or run in a headless environment, launch `install.cmd --cli`.
Always launch **`install.cmd`** to install this fork. Do not run the EXE in `bin` directly; it installs upstream Vencord.

To uninstall via command line, run:

```bat
install.cmd --uninstall
```

## Linux

Download `VencordInstaller-linux.tar.gz`, then extract it and run the installer:

```sh
tar -xzf VencordInstaller-linux.tar.gz
cd VencordInstaller-linux
./install.sh
```

When run in a desktop environment (GNOME, KDE, XFCE, Sway, Hyprland, etc.), a native graphical wizard (`zenity`) appears guiding you through:
- Choosing **Install**, **Reinstall / Repair**, or **Uninstall**
- Selecting **Discord Stable**, **PTB**, **Canary**, or a custom installation directory
- Reviewing confirmation and monitoring live progress
- Discord is automatically closed before patching and restarted after a successful install or reinstall

If run inside a terminal without a graphical desktop (or if you run `./install.sh --cli`), an interactive terminal UI (`whiptail` or ANSI-colored menu) is displayed.

If the installer cannot write to Discord's installation directory, rerun `sudo ./install.sh`. When running as root, it leaves Discord closed; start it yourself as your normal user. Automatic launch supports `discord`, `discord-ptb`, and `discord-canary` commands and Flatpak installations. Snap is unsupported.

To uninstall via command line:

```sh
./install.sh --uninstall
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
