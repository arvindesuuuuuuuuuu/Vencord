#!/bin/sh
set -eu

# Match pnpm inject: use the bundled build instead of downloading upstream.
VENCORD_USER_DATA_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
export VENCORD_USER_DATA_DIR
export VENCORD_DEV_INSTALL=1
installer="$VENCORD_USER_DATA_DIR/VencordInstallerCli-linux"
if [ ! -f "$installer" ]; then
    if [ -f "$VENCORD_USER_DATA_DIR/dist/Installer/VencordInstallerCli-linux" ]; then
        installer="$VENCORD_USER_DATA_DIR/dist/Installer/VencordInstallerCli-linux"
    elif [ -f "$VENCORD_USER_DATA_DIR/../../dist/Installer/VencordInstallerCli-linux" ]; then
        installer="$VENCORD_USER_DATA_DIR/../../dist/Installer/VencordInstallerCli-linux"
    fi
fi

if [ -f "$installer" ]; then
    chmod +x "$installer"
fi

# Flag parsing
MODE=""
if [ "$#" -gt 0 ]; then
    case "$1" in
        --cli|--tui)
            MODE="cli"
            shift
            ;;
        --gui)
            MODE="gui"
            shift
            ;;
        *)
            # Explicit CLI arguments retain upstream behavior and exit code
            exec "$installer" "$@"
            ;;
    esac
fi

close_discord() {
    if ! command -v pgrep >/dev/null || ! command -v pkill >/dev/null; then
        printf '%s\n' 'Automatic restart requires pgrep and pkill. Install procps or close Discord and use the direct CLI command.'
        return 1
    fi
    discord_uid=${SUDO_UID:-$(id -u)}
    if pgrep -u "$discord_uid" -x "$discord_process" >/dev/null 2>&1; then
        printf 'Closing %s...\n' "$discord_label"
        pkill -TERM -u "$discord_uid" -x "$discord_process" 2>/dev/null || true
        attempts=0
        while pgrep -u "$discord_uid" -x "$discord_process" >/dev/null 2>&1; do
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
    if [ -n "${discord_command:-}" ] && command -v "$discord_command" >/dev/null 2>&1; then
        (unset VENCORD_USER_DATA_DIR VENCORD_DEV_INSTALL
         nohup "$discord_command" >/dev/null 2>&1 < /dev/null &)
        printf 'Started %s.\n' "$discord_label"
    elif [ -n "${flatpak_id:-}" ] && command -v flatpak >/dev/null 2>&1 && flatpak info "$flatpak_id" >/dev/null 2>&1; then
        (unset VENCORD_USER_DATA_DIR VENCORD_DEV_INSTALL
         nohup flatpak run "$flatpak_id" >/dev/null 2>&1 < /dev/null &)
        printf 'Started %s (Flatpak).\n' "$discord_label"
    else
        printf '%s\n' 'Installation succeeded. Discord was not found on PATH or in Flatpak; start it from your application menu.'
    fi
}

run_zenity_gui() {
    while :; do
        action_choice=$(zenity --list --title="Vencord Installer" \
            --text="<b><big>Vencord Installer</big></b>\nCustom Vencord fork with extended plugins & enhancements\n\nBundled build: <i>$VENCORD_USER_DATA_DIR/dist</i>\n\nChoose an action:" \
            --radiolist \
            --column="Select" --column="Action" --column="Description" \
            TRUE "Install" "Install Vencord into Discord" \
            FALSE "Reinstall" "Reinstall / Repair Vencord files" \
            FALSE "Uninstall" "Remove Vencord from Discord" \
            --width=520 --height=340 --ok-label="Next" --cancel-label="Exit" 2>/dev/null) || return 0

        case "$action_choice" in
            Install) operation="Install"; action_flag="--install" ;;
            Reinstall) operation="Reinstall"; action_flag="--install" ;;
            Uninstall) operation="Uninstall"; action_flag="--uninstall" ;;
            *) return 0 ;;
        esac

        branch_choice=$(zenity --list --title="Select Discord Version" \
            --text="Select which Discord version to patch for <b>$operation</b>:" \
            --radiolist \
            --column="Select" --column="Branch" --column="Details" \
            TRUE "Stable" "Discord (Standard release)" \
            FALSE "PTB" "Discord Public Test Build" \
            FALSE "Canary" "Discord Canary (Development)" \
            FALSE "Custom" "Custom installation directory..." \
            --width=520 --height=360 --ok-label="Next" --extra-button="Back" --cancel-label="Cancel" 2>/dev/null) || return 0

        if [ "$branch_choice" = "Back" ]; then
            continue
        fi

        custom_loc=""
        case "$branch_choice" in
            Stable)
                branch="stable"
                discord_label="Discord"
                discord_process="Discord"
                discord_command="discord"
                flatpak_id="com.discordapp.Discord"
                ;;
            PTB)
                branch="ptb"
                discord_label="Discord PTB"
                discord_process="DiscordPTB"
                discord_command="discord-ptb"
                flatpak_id="com.discordapp.DiscordPTB"
                ;;
            Canary)
                branch="canary"
                discord_label="Discord Canary"
                discord_process="DiscordCanary"
                discord_command="discord-canary"
                flatpak_id="com.discordapp.DiscordCanary"
                ;;
            Custom)
                custom_loc=$(zenity --file-selection --directory --title="Select Discord Installation Directory" 2>/dev/null) || continue
                branch="custom"
                discord_label="Custom Discord ($custom_loc)"
                discord_process="Discord"
                discord_command=""
                flatpak_id=""
                ;;
            *)
                continue
                ;;
        esac

        confirm_msg="Ready to <b>$operation</b> Vencord for <b>$discord_label</b>.\n\n"
        if [ "$branch" != "custom" ]; then
            confirm_msg="${confirm_msg}Discord will close automatically if running.\n"
            if [ "$action_flag" = "--install" ]; then
                confirm_msg="${confirm_msg}Discord will restart automatically after completion.\n"
            fi
        fi
        confirm_msg="${confirm_msg}\nDo you want to proceed?"

        if ! zenity --question --title="Confirm $operation" --text="$confirm_msg" --width=450 2>/dev/null; then
            continue
        fi

        log_file=$(mktemp)
        (
            echo "15"
            echo "# Closing Discord if running..."
            if [ "$branch" != "custom" ]; then
                close_discord >> "$log_file" 2>&1 || true
            fi
            sleep 0.3

            echo "45"
            echo "# Applying $operation to $discord_label..."
            if [ -n "$custom_loc" ]; then
                "$installer" "$action_flag" --location "$custom_loc" >> "$log_file" 2>&1
                res=$?
            else
                "$installer" "$action_flag" --branch "$branch" >> "$log_file" 2>&1
                res=$?
            fi

            echo "80"
            if [ "$res" -eq 0 ]; then
                if [ "$action_flag" = "--install" ] && [ "$branch" != "custom" ]; then
                    echo "# Starting $discord_label..."
                    start_discord >> "$log_file" 2>&1 || true
                fi
                echo "100"
                echo "# Done!"
                echo "__SUCCESS__" >> "$log_file"
            else
                echo "100"
                echo "# Failed!"
                echo "__FAILED__" >> "$log_file"
            fi
        ) | zenity --progress --title="Vencord Installer" --text="Starting..." --percentage=0 --pulsate --auto-close --no-cancel 2>/dev/null

        if grep -q "__SUCCESS__" "$log_file" 2>/dev/null; then
            zenity --info --title="Success" --text="<b>$operation completed successfully!</b>\n\nVencord has been patched for $discord_label." --width=420 2>/dev/null || true
        else
            zenity --text-info --title="Operation Failed" --filename="$log_file" --width=580 --height=380 2>/dev/null || true
        fi
        rm -f "$log_file"
        break
    done
    return 0
}

run_whiptail_tui() {
    while :; do
        action_choice=$(whiptail --title "Vencord Installer" --menu \
            "Bundled build: $VENCORD_USER_DATA_DIR/dist\n\nChoose an action:" 16 65 4 \
            "Install" "Install Vencord into Discord" \
            "Reinstall" "Reinstall / Repair Vencord" \
            "Uninstall" "Remove Vencord from Discord" \
            "Exit" "Exit installer" \
            3>&1 1>&2 2>&3) || return 0

        case "$action_choice" in
            Install) operation="Install"; action_flag="--install" ;;
            Reinstall) operation="Reinstall"; action_flag="--install" ;;
            Uninstall) operation="Uninstall"; action_flag="--uninstall" ;;
            *) return 0 ;;
        esac

        branch_choice=$(whiptail --title "Select Discord" --radiolist \
            "Select which Discord version to patch for $operation:" 16 65 3 \
            "stable" "Discord (Stable)" ON \
            "ptb" "Discord PTB" OFF \
            "canary" "Discord Canary" OFF \
            3>&1 1>&2 2>&3) || continue

        case "$branch_choice" in
            stable) branch=stable; discord_label='Discord'; discord_process=Discord; discord_command=discord; flatpak_id=com.discordapp.Discord ;;
            ptb) branch=ptb; discord_label='Discord PTB'; discord_process=DiscordPTB; discord_command=discord-ptb; flatpak_id=com.discordapp.DiscordPTB ;;
            canary) branch=canary; discord_label='Discord Canary'; discord_process=DiscordCanary; discord_command=discord-canary; flatpak_id=com.discordapp.DiscordCanary ;;
            *) continue ;;
        esac

        if ! whiptail --title "Confirm $operation" --yesno \
            "Ready to $operation $discord_label.\n\nDiscord will close automatically before applying changes.\nProceed?" 12 60; then
            continue
        fi

        clear
        printf 'Closing %s if running...\n' "$discord_label"
        close_discord || true
        printf 'Running %s for %s...\n' "$operation" "$discord_label"
        if "$installer" "$action_flag" --branch "$branch"; then
            printf '\n%s completed successfully!\n' "$operation"
            if [ "$action_flag" = "--install" ]; then
                start_discord
            fi
            whiptail --title "Success" --msgbox "$operation completed successfully for $discord_label!" 10 55
        else
            whiptail --title "Failed" --msgbox "$operation failed. Check terminal output for details." 10 55
        fi
        break
    done
    return 0
}

run_cli_menu() {
    # Check ANSI color support
    if [ -t 1 ]; then
        BOLD='\033[1m'
        CYAN='\033[1;36m'
        GREEN='\033[1;32m'
        YELLOW='\033[1;33m'
        RED='\033[1;31m'
        RESET='\033[0m'
    else
        BOLD='' CYAN='' GREEN='' YELLOW='' RED='' RESET=''
    fi

    read_choice() {
        printf '%bChoose an option: %b' "$CYAN" "$RESET"
        if ! IFS= read -r choice; then
            exit "${installer_exit_code:-0}"
        fi
    }

    installer_exit_code=0
    while :; do
        printf '\n%b╔══════════════════════════════════════════════════╗%b\n' "$BOLD" "$RESET"
        printf '%b║                VENCORD INSTALLER                 ║%b\n' "$BOLD" "$RESET"
        printf '%b╚══════════════════════════════════════════════════╝%b\n' "$BOLD" "$RESET"
        printf 'Bundled build: %s\n\n' "$VENCORD_USER_DATA_DIR/dist"
        printf '  %b1)%b Install\n' "$BOLD" "$RESET"
        printf '  %b2)%b Reinstall\n' "$BOLD" "$RESET"
        printf '  %b3)%b Uninstall\n' "$BOLD" "$RESET"
        printf '  %b4)%b Exit\n\n' "$BOLD" "$RESET"
        read_choice
        case "$choice" in
            1) operation=Install; action=--install ;;
            2) operation=Reinstall; action=--install ;;
            3) operation=Uninstall; action=--uninstall ;;
            4) exit "$installer_exit_code" ;;
            *) printf '%bPlease enter 1, 2, 3, or 4.%b\n' "$YELLOW" "$RESET"; continue ;;
        esac

        while :; do
            printf '\n%bSelect Discord Version:%b\n' "$BOLD" "$RESET"
            printf '  %b1)%b Stable\n' "$BOLD" "$RESET"
            printf '  %b2)%b PTB\n' "$BOLD" "$RESET"
            printf '  %b3)%b Canary\n' "$BOLD" "$RESET"
            printf '  %b4)%b Back\n' "$BOLD" "$RESET"
            printf '  %b5)%b Exit\n\n' "$BOLD" "$RESET"
            read_choice
            case "$choice" in
                1) branch=stable; discord_label='Discord'; discord_process=Discord; discord_command=discord; flatpak_id=com.discordapp.Discord ;;
                2) branch=ptb; discord_label='Discord PTB'; discord_process=DiscordPTB; discord_command=discord-ptb; flatpak_id=com.discordapp.DiscordPTB ;;
                3) branch=canary; discord_label='Discord Canary'; discord_process=DiscordCanary; discord_command=discord-canary; flatpak_id=com.discordapp.DiscordCanary ;;
                4) break ;;
                5) exit "$installer_exit_code" ;;
                *) printf '%bPlease enter 1, 2, 3, 4, or 5.%b\n' "$YELLOW" "$RESET"; continue ;;
            esac

            printf '\n%b%s %s.%b Discord will close before applying changes.\n' "$BOLD" "$operation" "$discord_label" "$RESET"
            if [ "$action" = --install ]; then
                printf 'Discord will start again after a successful install.\n'
            fi
            printf '  1) Continue\n  2) Back\n  3) Exit\n\n'
            read_choice
            case "$choice" in
                1) ;;
                2) continue ;;
                3) exit "$installer_exit_code" ;;
                *) printf '%bInvalid option. Returning to Discord selection.%b\n' "$YELLOW" "$RESET"; continue ;;
            esac

            installer_exit_code=0
            if close_discord; then
                if "$installer" "$action" --branch "$branch"; then
                    printf '\n%b%s completed successfully.%b\n' "$GREEN" "$operation" "$RESET"
                    if [ "$action" = --install ]; then
                        start_discord
                    fi
                else
                    installer_exit_code=$?
                    printf '\n%b%s failed. See the installer output above.%b\n' "$RED" "$operation" "$RESET"
                fi
            else
                installer_exit_code=1
            fi
            while :; do
                printf '\n  1) Back to main menu\n  2) Exit\n\n'
                read_choice
                case "$choice" in
                    1) break ;;
                    2) exit "$installer_exit_code" ;;
                    *) printf '%bPlease enter 1 or 2.%b\n' "$YELLOW" "$RESET" ;;
                esac
            done
            break
        done
    done
}

# Execution strategy
if [ "$MODE" != "cli" ] && { [ -n "${DISPLAY:-}" ] || [ -n "${WAYLAND_DISPLAY:-}" ]; }; then
    if command -v zenity >/dev/null 2>&1; then
        run_zenity_gui
        exit $?
    fi
fi

if [ -t 0 ] && command -v whiptail >/dev/null 2>&1 && [ "${TERM:-}" != "dumb" ]; then
    run_whiptail_tui
    exit $?
fi

run_cli_menu
