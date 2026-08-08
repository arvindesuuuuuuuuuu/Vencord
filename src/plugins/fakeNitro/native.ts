/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { IpcMainInvokeEvent } from "electron";

const CATBOX_API_URL = "https://catbox.moe/user/api.php";
const CATBOX_FILE_URL_PREFIX = "https://files.catbox.moe/";
const CATBOX_MAX_FILE_SIZE = 200 * 1024 * 1024;

export interface LargeFileUploadResult {
    ok: boolean;
    url?: string;
    error?: string;
}

export async function uploadLargeFile(
    _: IpcMainInvokeEvent,
    data: Uint8Array,
    filename: string,
    contentType: string
): Promise<LargeFileUploadResult> {
    if (!data.byteLength)
        return { ok: false, error: "The selected file is empty" };

    if (data.byteLength > CATBOX_MAX_FILE_SIZE)
        return { ok: false, error: "Catbox only accepts files up to 200 MB" };

    try {
        const form = new FormData();
        form.append("reqtype", "fileupload");
        form.append("fileToUpload", new Blob([Uint8Array.from(data)], {
            type: contentType || "application/octet-stream"
        }), filename || "upload.bin");

        const response = await fetch(CATBOX_API_URL, {
            method: "POST",
            body: form,
            signal: AbortSignal.timeout(10 * 60 * 1000)
        });
        const body = (await response.text()).trim();

        if (!response.ok)
            return { ok: false, error: `Catbox returned HTTP ${response.status}` };

        if (!body.startsWith(CATBOX_FILE_URL_PREFIX))
            return { ok: false, error: body || "Catbox returned an invalid response" };

        return { ok: true, url: body };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
}
