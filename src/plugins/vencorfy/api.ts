/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { sleep } from "@utils/misc";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { RestAPI, UserStore } from "@webpack/common";

import { clamp, settings } from "./settings";
import { BadgeKind, CATEGORIES } from "./tiers";

export const logger = new Logger("Vencorfy");

const SuperProperties: { getSuperProperties(): Record<string, unknown>; } = findByPropsLazy("getSuperProperties");
const RunningGameStore: {
    getRunningGames(): { id: string; executableFingerprint?: string; }[];
    getGamesSeen(includeHidden?: boolean): { id: string; executableFingerprint?: string; }[];
} = findStoreLazy("RunningGameStore");

export interface Game {
    id: string;
    name: string;
    exe: string;
}

export interface ScienceEvent {
    type: string;
    properties: Record<string, unknown>;
}

export interface BadgeProgress {
    currentTier: string | null;
    count: number;
    ownedTiers: Set<string>;
}

const TOKEN_MAX_AGE = 6 * 60 * 60 * 1000;
const ADULT_WORDS = ["sex", "hentai", "porn", "fap", "nsfw", "nude", "naked", "lewd", "erotic", "xxx", "18+", "waifu", "strip"];

let analyticsToken = "";
let analyticsTokenAt = 0;
let analyticsTokenOwnerId = "";
let catalogue: Game[] | null = null;
let sequence = Math.floor(Math.random() * 100_000);

export async function getAnalyticsToken(accountId: string) {
    if (analyticsToken && analyticsTokenOwnerId === accountId && Date.now() - analyticsTokenAt < TOKEN_MAX_AGE) return analyticsToken;

    const { body } = await RestAPI.get({ url: "/users/@me", query: { with_analytics_token: true } });
    if (UserStore.getCurrentUser()?.id !== accountId) throw new Error("Discord account changed; session stopped.");
    if (String(body?.id ?? "") !== accountId) throw new Error("Discord returned a different account; session stopped.");
    if (typeof body?.analytics_token !== "string")
        throw new Error("Discord returned no analytics_token. Check Privacy & Safety > \"Use data to improve Discord\".");

    analyticsToken = body.analytics_token;
    analyticsTokenAt = Date.now();
    analyticsTokenOwnerId = accountId;
    return analyticsToken;
}

export function clientSession() {
    let props: Record<string, unknown> = {};
    try {
        props = SuperProperties.getSuperProperties() ?? {};
    } catch (e) {
        logger.warn("Could not read super properties", e);
    }

    return {
        heartbeatSession: (props.client_heartbeat_session_id as string) ?? crypto.randomUUID(),
        launchSignature: (props.launch_signature as string) ?? crypto.randomUUID(),
        locale: (props.system_locale as string) ?? "en-US"
    };
}

export const nextSequence = () => ++sequence;

// Only real fingerprints the client has computed for games you actually ran; never fabricated
export function realFingerprint(gameId: string) {
    try {
        const seen = [...RunningGameStore.getRunningGames(), ...RunningGameStore.getGamesSeen(true)];
        return seen.find(g => g.id === gameId && g.executableFingerprint)?.executableFingerprint ?? "";
    } catch {
        return "";
    }
}

export async function postScience(events: ScienceEvent[], accountId: string, isCancelled: () => boolean) {
    const checkSession = () => {
        if (isCancelled()) throw new Error("Session cancelled.");
        if (!accountId || UserStore.getCurrentUser()?.id !== accountId)
            throw new Error("Discord account changed; session stopped.");
    };

    for (let attempt = 0; ; attempt++) {
        checkSession();
        try {
            const token = await getAnalyticsToken(accountId);
            checkSession();
            await RestAPI.post({ url: "/science", body: { token, events } });
            checkSession();
            return;
        } catch (e: any) {
            checkSession();
            const status = e?.status;

            if (status === 429 && attempt < 8) {
                const wait = clamp(Number(e?.body?.retry_after ?? 5), 1, 120) * 1000;
                logger.warn(`Rate limited, waiting ${wait}ms`);
                await sleep(wait + 500);
                continue;
            }

            if (status === 401 || status === 403) {
                analyticsToken = "";
                analyticsTokenOwnerId = "";
                if (attempt < 1) continue;
                throw new Error(`Discord rejected the request (${status}). Try again later.`);
            }

            if ((status === 500 || status === 502 || status === 503 || status === 504) && attempt < 6) {
                const wait = 2000 * (attempt + 1);
                logger.warn(`/science returned ${status}, retrying in ${wait}ms`);
                await sleep(wait);
                continue;
            }

            if (attempt < 2) {
                await sleep(3000);
                continue;
            }

            throw new Error(e?.body?.message ?? e?.message ?? `Request failed (${status ?? "network"})`);
        }
    }
}

function blocklist() {
    const extra = settings.store.extraBlocklist
        .split(",")
        .map(w => w.trim().toLowerCase())
        .filter(Boolean);
    return settings.store.filterAdultGames ? [...ADULT_WORDS, ...extra] : extra;
}

export async function getCatalogue(): Promise<Game[]> {
    if (!catalogue) {
        const { body } = await RestAPI.get({ url: "/applications/detectable" });
        if (!Array.isArray(body)) throw new Error("Could not load Discord's detectable games list");

        const seen = new Set<string>();
        catalogue = [];
        for (const app of body) {
            const id = String(app?.id ?? "");
            if (!/^\d+$/.test(id) || seen.has(id) || !app.name) continue;

            const exes: { os?: string; name?: string; is_launcher?: boolean; }[] = app.executables ?? [];
            const exe = exes.find(x => x.os === "win32" && !x.is_launcher && x.name) ?? exes.find(x => x.os === "win32" && x.name);
            if (!exe) continue;

            seen.add(id);
            catalogue.push({ id, name: app.name, exe: exe.name!.replace(/^>/, "") });
        }
    }

    const blocked = blocklist();
    return catalogue.filter(g => {
        const name = g.name.toLowerCase();
        return !blocked.some(word => name.includes(word));
    });
}

export async function fetchBadges(): Promise<Record<BadgeKind, BadgeProgress>> {
    const { body } = await RestAPI.get({ url: "/users/@me/badges" });
    const list: any[] = Array.isArray(body) ? body : body?.badges ?? [];

    const result = {} as Record<BadgeKind, BadgeProgress>;
    for (const cat of CATEGORIES) {
        result[cat.kind] = parseBadge(list.find(b => b?.badge_id === cat.badgeId));
    }
    return result;
}

function parseBadge(badge: any): BadgeProgress {
    const ownedTiers = new Set<string>();
    if (!badge) return { currentTier: null, count: 0, ownedTiers };

    let count = 0;
    const label = String(badge.info_label ?? "").replace(/,/g, "").match(/(\d+)/);
    if (label) count = Number(label[1]);
    if (!count && typeof badge.progress?.[0]?.current === "number") count = badge.progress[0].current;

    if (badge.tier_obtained_at && typeof badge.tier_obtained_at === "object")
        Object.keys(badge.tier_obtained_at).forEach(k => ownedTiers.add(k));
    if (Array.isArray(badge.tiers))
        badge.tiers.forEach((t: any) => t?.owned && ownedTiers.add(t.key));

    return { currentTier: badge.current_tier ?? null, count: Number.isFinite(count) ? count : 0, ownedTiers };
}
