#!/bin/sh
set -eu

# Match pnpm inject: use the bundled build instead of downloading upstream.
VENCORD_USER_DATA_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
export VENCORD_USER_DATA_DIR
export VENCORD_DEV_INSTALL=1

if [ "$#" -eq 0 ]; then
    printf '%s\n' 'Fully quit Discord before continuing.'
    while :; do
        printf '\n%s\n' '1) Install' '2) Reinstall' '3) Uninstall' '4) Exit'
        printf 'Choose an option [1-4]: '
        if ! IFS= read -r choice; then
            exit 0
        fi
        case "$choice" in
            1|2) set -- --install; break ;;
            3) set -- --uninstall; break ;;
            4) exit 0 ;;
            *) printf '%s\n' 'Please enter 1, 2, 3, or 4.' ;;
        esac
    done
fi
chmod +x "$VENCORD_USER_DATA_DIR/VencordInstallerCli-linux"
exec "$VENCORD_USER_DATA_DIR/VencordInstallerCli-linux" "$@"
