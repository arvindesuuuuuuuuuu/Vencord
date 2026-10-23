# Vencord installers for Windows and Linux

These archives include this fork's compiled Vencord build and the official installer CLI. They support x86-64 Windows and Linux. Node.js and pnpm are not required to install them.

Fully quit Discord, including its tray icon, before installing or uninstalling.

## Windows

1. Download `VencordInstaller-windows.zip`.
2. Extract the entire archive to a permanent folder.
3. Open that folder and double-click `install.cmd`.
4. Select your Discord installation and follow the prompts.
5. Start Discord again.

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

Select your Discord installation and follow the prompts, then start Discord again. If the installer cannot write to Discord's installation directory, rerun `sudo sh ./install.sh`.

Discord installed through Snap is unsupported. Use the official Discord package or Flatpak.

To uninstall, run this from the extracted folder:

```sh
sh ./install.sh --uninstall
```

If uninstalling requires administrator privileges, use `sudo sh ./install.sh --uninstall`.

## Keep the extracted folder

Discord loads Vencord directly from the archive's extracted `dist` folder. Keep the entire extracted folder in its permanent location. Uninstall Vencord before deleting or moving it.

## Updating

Automatic updates are supported through Vencord's Updater settings. Enable automatic updates there, or check for updates manually. The updater downloads this fork's latest installer archive and replaces the bundled desktop build; restart Discord when prompted. Keep the extracted folder writable by your user so updates can be saved.

If you previously installed a release with automatic updates disabled, install this newer release once to enable the updater. For a manual update, quit Discord, extract the newest archive over the existing folder, and run its launcher again. Keep the same folder location. Back up any local changes before replacing files.

The release contains the Windows archive, Linux archive, and this README. Each archive also includes these instructions and license information.
