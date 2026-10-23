/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

interface UploadLinkOptions {
    autoFormat?: boolean;
    displayOriginalFilename?: boolean;
    hideMediaLinks?: boolean;
    displayName?: string;
    mediaType?: string;
}

export function formatUploadLink(url: string, options: UploadLinkOptions): string {
    const { autoFormat, displayOriginalFilename, hideMediaLinks, displayName, mediaType } = options;
    const destination = url.replace(/\(/g, "%28").replace(/\)/g, "%29");
    if (displayOriginalFilename && displayName) {
        return `[${displayName.replace(/[[\]]/g, "")}](${destination})`;
    }
    if (autoFormat) return `<${url}>`;

    if (hideMediaLinks !== false && /^(image|video)\//.test(mediaType || "")) {
        try {
            const parsed = new URL(url);
            if (/^https?:$/.test(parsed.protocol)) return `[\u200b](${destination})`;
        } catch {
            // Preserve uploader responses that are already formatted links.
        }
    }

    return url;
}
