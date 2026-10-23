#!/bin/sh
set -eu

# Match pnpm inject: use the bundled build instead of downloading upstream.
VENCORD_USER_DATA_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
export VENCORD_USER_DATA_DIR
export VENCORD_DEV_INSTALL=1

if [ "$#" -eq 0 ]; then
    set -- --install
fi
chmod +x "$VENCORD_USER_DATA_DIR/VencordInstallerCli-linux"
exec "$VENCORD_USER_DATA_DIR/VencordInstallerCli-linux" "$@"
