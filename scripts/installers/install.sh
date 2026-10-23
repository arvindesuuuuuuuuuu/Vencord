#!/bin/sh
set -eu

# Match pnpm inject: use the bundled build instead of downloading upstream.
VENCORD_USER_DATA_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
export VENCORD_USER_DATA_DIR
export VENCORD_DEV_INSTALL=1
installer="$VENCORD_USER_DATA_DIR/VencordInstallerCli-linux"
chmod +x "$installer"

# Explicit CLI arguments retain the upstream installer's behavior and exit code.
if [ "$#" -gt 0 ]; then
    exec "$installer" "$@"
fi

read_choice() {
    printf 'Choose an option: '
    if ! IFS= read -r choice; then
        exit "${installer_exit_code:-0}"
    fi
}

close_discord() {
    if ! command -v pgrep >/dev/null || ! command -v pkill >/dev/null; then
        printf '%s\n' 'Automatic restart requires pgrep and pkill. Install procps or close Discord and use the direct CLI command.'
        return 1
    fi
    discord_uid=${SUDO_UID:-$(id -u)}
    if pgrep -u "$discord_uid" -x "$discord_process" >/dev/null; then
        printf 'Closing %s...\n' "$discord_label"
        pkill -TERM -u "$discord_uid" -x "$discord_process" || true
        attempts=0
        while pgrep -u "$discord_uid" -x "$discord_process" >/dev/null; do
            attempts=$((attempts + 1))
            if [ "$attempts" -ge 10 ]; then
                printf '%s\n' 'Discord is still running. Quit it from the tray, then try again.'
                return 1
            fi
            sleep 1
        done
    fi
}

start_discord() {
    if [ "$(id -u)" -eq 0 ]; then
        printf '%s\n' 'Installation succeeded. Start Discord as your normal user; the installer will not launch it as root.'
        return
    fi
    # Do not carry installer-only environment variables into Discord's settings.
    if command -v "$discord_command" >/dev/null; then
        (unset VENCORD_USER_DATA_DIR VENCORD_DEV_INSTALL
         nohup "$discord_command" >/dev/null 2>&1 < /dev/null &)
        printf 'Started %s.\n' "$discord_label"
    elif command -v flatpak >/dev/null && flatpak info "$flatpak_id" >/dev/null 2>&1; then
        (unset VENCORD_USER_DATA_DIR VENCORD_DEV_INSTALL
         nohup flatpak run "$flatpak_id" >/dev/null 2>&1 < /dev/null &)
        printf 'Started %s (Flatpak).\n' "$discord_label"
    else
        printf '%s\n' 'Installation succeeded. Discord was not found on PATH or in Flatpak; start it from your application menu.'
    fi
}

installer_exit_code=0
while :; do
    printf '\n%s\n' 'Vencord Installer' '1) Install' '2) Reinstall' '3) Uninstall' '4) Exit'
    read_choice
    case "$choice" in
        1) operation=Install; action=--install ;;
        2) operation=Reinstall; action=--install ;;
        3) operation=Uninstall; action=--uninstall ;;
        4) exit "$installer_exit_code" ;;
        *) printf '%s\n' 'Please enter 1, 2, 3, or 4.'; continue ;;
    esac

    while :; do
        printf '\n%s\n' 'Select Discord' '1) Stable' '2) PTB' '3) Canary' '4) Back' '5) Exit'
        read_choice
        case "$choice" in
            1) branch=stable; discord_label='Discord'; discord_process=Discord; discord_command=discord; flatpak_id=com.discordapp.Discord ;;
            2) branch=ptb; discord_label='Discord PTB'; discord_process=DiscordPTB; discord_command=discord-ptb; flatpak_id=com.discordapp.DiscordPTB ;;
            3) branch=canary; discord_label='Discord Canary'; discord_process=DiscordCanary; discord_command=discord-canary; flatpak_id=com.discordapp.DiscordCanary ;;
            4) break ;;
            5) exit "$installer_exit_code" ;;
            *) printf '%s\n' 'Please enter 1, 2, 3, 4, or 5.'; continue ;;
        esac
        printf '\n%s %s. Discord will close before applying changes.\n' "$operation" "$discord_label"
        if [ "$action" = --install ]; then
            printf '%s\n' 'Discord will start again after a successful install.'
        fi
        printf '%s\n' '1) Continue' '2) Back' '3) Exit'
        read_choice
        case "$choice" in
            1) ;;
            2) continue ;;
            3) exit "$installer_exit_code" ;;
            *) printf '%s\n' 'Invalid option. Returning to Discord selection.'; continue ;;
        esac

        installer_exit_code=0
        if close_discord; then
            if "$installer" "$action" --branch "$branch"; then
                printf '%s completed.\n' "$operation"
                if [ "$action" = --install ]; then
                    start_discord
                fi
            else
                installer_exit_code=$?
                printf '%s failed. See the installer output above.\n' "$operation"
            fi
        else
            installer_exit_code=1
        fi
        while :; do
            printf '\n%s\n' '1) Back to main menu' '2) Exit'
            read_choice
            case "$choice" in
                1) break ;;
                2) exit "$installer_exit_code" ;;
                *) printf '%s\n' 'Please enter 1 or 2.' ;;
            esac
        done
        break
    done
done
