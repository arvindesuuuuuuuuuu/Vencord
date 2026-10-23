/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Message } from "@vencord/discord-types";
import { useEffect } from "@webpack/common";

import { CORS_PROXY, normalizeCorsProxyUrl } from "./constants";

export function shouldHideUploadLink(message: Pick<Message, "content" | "embeds">, corsProxyUrl?: string): boolean {
    const content = message.content.trim();
    if (!content || !message.embeds.some(embed => embed.video || embed.image)) return false;

    const proxies = [CORS_PROXY, normalizeCorsProxyUrl(corsProxyUrl)];
    return content.split(/\s+/).every(link => {
        try {
            const url = new URL(link);
            const proxy = `${url.origin}${url.pathname}`.replace(/\/+$/, "");
            const target = proxies.includes(proxy)
                ? url.searchParams.get("url")
                : proxy === "https://discord.nfp.is" ? url.searchParams.get("v") : null;
            if (!target || !/^https?:\/\//.test(target)) return false;

            return message.embeds.some(embed => Boolean(embed.video || embed.image) && (
                embed.url === link || embed.video?.url === target || embed.image?.url === target
            ));
        } catch {
            return false;
        }
    });
}

export function UploadLinkHider({ messageId }: { messageId: string; }) {
    useEffect(() => {
        const content = document.getElementById(`message-content-${messageId}`);
        content?.classList.add("vc-file-upload-hidden-link");
        return () => content?.classList.remove("vc-file-upload-hidden-link");
    }, [messageId]);

    return null;
}
