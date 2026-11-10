/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { isPluginEnabled } from "@api/PluginManager";
import { sleep } from "@utils/misc";
import { ApplicationStreamingStore, FluxDispatcher, SelectedChannelStore, showToast, UserStore } from "@webpack/common";

import {
    clientSession,
    Game,
    getCatalogue,
    logger,
    nextSequence,
    postScience,
    realFingerprint,
    ScienceEvent
} from "./api";
import { clamp, settings } from "./settings";
import { BadgeKind, CATEGORIES, Tier } from "./tiers";

const USED_GAMES_KEY = "vencorfy_used_games_v1";
const STATS_KEY = "vencorfy_stats_v1";

export interface VencorfyStats {
    totalGamesClaimed: number;
    totalHoursClaimed: number;
    totalStreamHoursClaimed: number;
}

export interface TaskState {
    running: boolean;
    completed?: boolean;
    error?: boolean;
    kind?: BadgeKind;
    tierLabel?: string;
    tierIcon?: string;
    categoryTitle?: string;
    progress: number;
    text: string;
}

export interface LiveStreamStatus {
    isLive: boolean;
    viewers: number;
    guildId: string;
    channelId: string;
}

let activeTask: {
    cancelled: boolean;
    stopStream?: () => void;
    state: TaskState;
} | null = null;

let widgetHidden = false;

const listeners = new Set<() => void>();

export function subscribeTask(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

function notify() {
    for (const fn of listeners) fn();
}

export function isWidgetHidden(): boolean {
    return widgetHidden;
}

export function setWidgetHidden(hidden: boolean) {
    widgetHidden = hidden;
    notify();
}

export function dismissTask() {
    if (!activeTask) return;
    if (activeTask.state.running) {
        widgetHidden = true;
        notify();
    } else {
        activeTask = null;
        widgetHidden = false;
        notify();
    }
}

function resolveTierMeta(kind: BadgeKind, tier?: Tier): { tierLabel: string; tierIcon: string; categoryTitle: string; } {
    const cat = CATEGORIES.find(c => c.kind === kind) ?? CATEGORIES[0];
    const resolvedTier = tier ?? cat.tiers[cat.tiers.length - 1];
    return {
        tierLabel: resolvedTier.label,
        tierIcon: resolvedTier.icon,
        categoryTitle: cat.title
    };
}

function safeToast(text: string, variant: "success" | "critical") {
    try {
        showToast({ text, variant });
    } catch {
        // Discord Canary may change the internal toast webpack module; ignore so task status stays intact
    }
}

export function getTaskState(): TaskState | null {
    return activeTask?.state ?? null;
}

function setTaskState(state: TaskState) {
    if (activeTask) activeTask.state = state;
    notify();
}

export async function getUsedGames(): Promise<string[]> {
    return (await DataStore.get<string[]>(USED_GAMES_KEY)) ?? [];
}

export async function saveUsedGames(ids: string[]): Promise<void> {
    await DataStore.set(USED_GAMES_KEY, ids);
}

export async function resetUsedGames(): Promise<void> {
    await DataStore.set(USED_GAMES_KEY, []);
    notify();
}

export async function getStats(): Promise<VencorfyStats> {
    return (await DataStore.get<VencorfyStats>(STATS_KEY)) ?? {
        totalGamesClaimed: 0,
        totalHoursClaimed: 0,
        totalStreamHoursClaimed: 0
    };
}

async function addStats(gamesDelta: number, hoursDelta: number, streamHoursDelta = 0): Promise<VencorfyStats> {
    const current = await getStats();
    const updated: VencorfyStats = {
        totalGamesClaimed: (current.totalGamesClaimed || 0) + gamesDelta,
        totalHoursClaimed: (current.totalHoursClaimed || 0) + hoursDelta,
        totalStreamHoursClaimed: (current.totalStreamHoursClaimed || 0) + streamHoursDelta
    };
    await DataStore.set(STATS_KEY, updated);
    return updated;
}

export function selectGames(
    allGames: Game[],
    neededCount: number,
    usedGameIds: string[]
): { selectedGames: Game[]; newUsedGames: string[]; } {
    const validIds = new Set(allGames.map(g => g.id));
    const usedSet = new Set(usedGameIds);
    const freshIds = allGames.filter(g => !usedSet.has(g.id)).map(g => g.id);
    const validUsed = usedGameIds.filter(id => validIds.has(id));

    let chosenIds: string[] = [];
    if (freshIds.length >= neededCount) {
        chosenIds = freshIds.slice(0, neededCount);
    } else {
        chosenIds = [...freshIds];
        if (validUsed.length > 0) {
            const rem = neededCount - chosenIds.length;
            const rotated = validUsed.slice(rem).concat(validUsed.slice(0, rem));
            chosenIds.push(...rotated.slice(0, rem));
        }
    }

    const newUsedGames = validUsed.filter(id => !chosenIds.includes(id)).concat(chosenIds);
    const byId = new Map(allGames.map(g => [g.id, g]));
    return {
        selectedGames: chosenIds.map(id => byId.get(id)!).filter(Boolean),
        newUsedGames
    };
}

export async function generateFingerprint(userId: string): Promise<string> {
    if (!userId) return "";
    try {
        const enc = new TextEncoder();
        const sha256 = async (str: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(str)));
        const uuid = crypto.randomUUID();
        const hUuid = await sha256(uuid + userId);
        const hHeader = await sha256("pe_header_" + userId);
        const hSection = await sha256("pe_section_" + userId);
        const hCert = await sha256("pe_cert_" + userId);

        const buf = new Uint8Array(146);
        const view = new DataView(buf.buffer);
        buf[0] = 1;
        buf[1] = 3;
        view.setBigUint64(2, 65432100n, true);
        view.setUint32(10, Math.floor(Date.now() / 1000) - 2592000, true);
        view.setUint32(14, 38797312, true);
        buf.set(hHeader, 18);
        buf.set(hUuid, 50);
        buf.set(hSection, 82);
        buf.set(hCert, 114);

        const mask = await sha256(userId + "https://discord.com/careers");
        for (let i = 1; i < buf.length; i++) {
            buf[i] ^= mask[(i - 1) & 31];
        }

        let bin = "";
        for (let i = 0; i < buf.length; i++) {
            bin += String.fromCharCode(buf[i]);
        }
        return btoa(bin);
    } catch {
        return "";
    }
}

function setDebugRunningGame(game: Game | null, startedAt = Date.now()) {
    try {
        if (!game) {
            FluxDispatcher.dispatch({ type: "RUNNING_GAME_SET_DEBUG_GAME", game: null });
            return;
        }
        const folder = game.name.replace(/[<>:"/\\|?*]/g, "").toLowerCase();
        const pid = 10000 + Math.floor(Math.random() * 40000);
        FluxDispatcher.dispatch({
            type: "RUNNING_GAME_SET_DEBUG_GAME",
            game: {
                id: game.id,
                name: game.name,
                exeName: game.exe,
                exePath: `c:/program files/${folder}/${game.exe}`,
                cmdLine: `c:/program files/${folder}/${game.exe}`,
                processName: game.name,
                pid,
                pidPath: [pid],
                start: startedAt,
                lastFocused: Math.floor(startedAt / 1000),
                lastLaunched: startedAt,
                nativeProcessObserverId: -1,
                hidden: false,
                isLauncher: false,
                elevated: false,
                sandboxed: false
            }
        });
    } catch (e) {
        logger.warn("Could not dispatch RUNNING_GAME_SET_DEBUG_GAME", e);
    }
}

function buildGameSessionEvents(
    game: Game,
    durationMs: number,
    fallbackFingerprint: string,
    startTime?: number
): ScienceEvent[] {
    const { heartbeatSession, launchSignature, locale } = clientSession();
    const gameSessionId = crypto.randomUUID();
    const endTs = startTime != null ? startTime + durationMs : Date.now();
    const startTs = Math.max(0, endTs - durationMs);
    const fp = realFingerprint(game.id) || fallbackFingerprint;

    const launchProps: Record<string, unknown> = {
        client_track_timestamp: endTs,
        client_heartbeat_session_id: heartbeatSession,
        event_sequence_number: nextSequence(),
        game: game.name,
        game_id: game.id,
        verified: true,
        elevated: false,
        is_launcher: false,
        game_platform: "desktop",
        detection_method: "verified_game",
        is_overlay_enabled: false,
        is_overlay_game_enabled: true,
        is_overlay_game_source: "OOP_DEFAULT_DATABASE",
        fullscreen_type: "UNKNOWN",
        hardware_display_count: 1,
        overlay_method: "Disabled",
        activity_status_enabled: true,
        activity_status_shared_guilds: [],
        current_user_status: "online",
        game_detection_enabled: true,
        executable_path: game.exe,
        voice_channel_id: null,
        voice_channel_type: null,
        voice_channel_bitrate: null,
        voice_channel_guild_id: null,
        hidden_by_distributor: false,
        game_metadata: null,
        client_performance_cpu: null,
        client_performance_memory: null,
        cpu_core_count: null,
        accessibility_features: 0,
        rendered_locale: locale,
        launch_signature: launchSignature,
        client_rtc_state: null,
        client_app_state: "focused",
        client_send_timestamp: endTs
    };

    if (fp) launchProps.executable_fingerprint = fp;

    const makeHeartbeat = (dur: number, initial: boolean, final: boolean, ts: number): ScienceEvent => ({
        type: "running_game_heartbeat",
        properties: {
            client_track_timestamp: ts,
            client_heartbeat_session_id: heartbeatSession,
            event_sequence_number: nextSequence(),
            game_id: game.id,
            game_name: game.name,
            game_metadata: null,
            game_executable: game.exe,
            game_detection_enabled: true,
            initial_heartbeat: initial,
            final_heartbeat: final,
            game_session_id: gameSessionId,
            duration_tracked_ms: dur,
            rtc_connection_id: null,
            media_session_id: null,
            launch_signature: launchSignature,
            client_app_state: "focused",
            client_send_timestamp: ts
        }
    });

    return [
        makeHeartbeat(0, true, false, startTs),
        { type: "launch_game", properties: launchProps },
        makeHeartbeat(durationMs, false, true, endTs)
    ];
}

export function getLiveStreamStatus(): LiveStreamStatus {
    try {
        const stream = ApplicationStreamingStore.getCurrentUserActiveStream();
        if (stream && typeof stream.channelId === "string" && stream.channelId !== "") {
            const viewers = ApplicationStreamingStore.getViewerIds(stream).length;
            return {
                isLive: true,
                viewers,
                guildId: stream.guildId ?? "0",
                channelId: stream.channelId
            };
        }
    } catch (e) {
        logger.warn("Could not inspect ApplicationStreamingStore", e);
    }

    const fallbackChannel = SelectedChannelStore.getVoiceChannelId() || "900000000000000001";
    return {
        isLive: false,
        viewers: 0,
        guildId: "0",
        channelId: fallbackChannel
    };
}

export function cancelForge() {
    if (!activeTask) return;
    const task = activeTask;
    const prev = task.state;
    task.cancelled = true;
    task.stopStream?.();
    setDebugRunningGame(null);
    setTaskState({
        ...prev,
        running: false,
        error: true,
        progress: 0,
        text: "Session cancelled."
    });
    setTimeout(() => {
        if (activeTask === task && task.cancelled) {
            activeTask = null;
            notify();
        }
    }, 1800);
}

export async function startVarietyForge(targetThreshold: number, currentCount = 0, tier?: Tier) {
    if (!isPluginEnabled("Vencorfy")) {
        safeToast("Enable the Vencorfy plugin first before starting a session.", "critical");
        return;
    }
    if (activeTask?.state.running) throw new Error("A Vencorfy session is already running.");
    const accountId = UserStore.getCurrentUser()?.id;
    if (!accountId) {
        safeToast("Discord account identity is unavailable; cannot start a session.", "critical");
        return;
    }

    const meta = resolveTierMeta("variety", tier);
    widgetHidden = false;

    const task = {
        cancelled: false,
        state: {
            running: true,
            kind: "variety" as BadgeKind,
            ...meta,
            progress: 2,
            text: "Loading detectable games catalogue..."
        }
    };
    activeTask = task;
    notify();

    try {
        const games = await getCatalogue();
        if (!games.length) throw new Error("No detectable games available.");

        const used = await getUsedGames();
        const needed = Math.max(1, targetThreshold - (currentCount < targetThreshold ? currentCount : 0));
        const { selectedGames, newUsedGames } = selectGames(games, needed, used);
        if (!selectedGames.length) throw new Error("Could not select games from catalogue.");

        const fallbackFp = await generateFingerprint(accountId);
        const batchSize = clamp(settings.store.batchSize, 1, 50);
        const delayMs = clamp(settings.store.batchDelay, 500, 30000);
        const durationMs = clamp(settings.store.varietyMinutes, 1, 30) * 60_000;

        const total = selectedGames.length;
        const totalBatches = Math.ceil(total / batchSize);
        let completed = 0;

        setTaskState({
            running: true,
            kind: "variety",
            ...meta,
            progress: 5,
            text: `Game Variety: Starting ${total} unique games...`
        });

        for (let b = 0; b < totalBatches && !task.cancelled; b++) {
            const slice = selectedGames.slice(b * batchSize, (b + 1) * batchSize);
            setDebugRunningGame(slice[0]);

            const events = slice.flatMap(g => buildGameSessionEvents(g, durationMs, fallbackFp));
            await postScience(events, accountId, () => task.cancelled);

            completed += slice.length;
            const pct = Math.min(95, Math.round((completed / total) * 95));
            setTaskState({
                running: true,
                kind: "variety",
                ...meta,
                progress: pct,
                text: `Game Variety: ${completed}/${total} games (${pct}%)`
            });

            if (b + 1 < totalBatches && !task.cancelled) {
                await sleep(delayMs);
            }
        }

        setDebugRunningGame(null);
        if (task.cancelled) return;

        await saveUsedGames(newUsedGames);
        await addStats(completed, 0, 0);

        const doneMsg = `Complete: ${completed}/${total} games claimed! (updates in ~1–3 days)`;
        widgetHidden = false;
        setTaskState({
            running: false,
            completed: true,
            kind: "variety",
            ...meta,
            progress: 100,
            text: doneMsg
        });
        safeToast(doneMsg, "success");
    } catch (e: any) {
        if (task.cancelled || activeTask !== task) return;
        setDebugRunningGame(null);
        const msg = e?.message || "Failed to complete Game Variety session";
        widgetHidden = false;
        setTaskState({
            running: false,
            error: true,
            kind: "variety",
            ...meta,
            progress: 0,
            text: msg
        });
        safeToast(msg, "critical");
    }
}

export async function startTimeForge(hoursToAdd: number, specificGame?: Game | null, tier?: Tier) {
    if (!isPluginEnabled("Vencorfy")) {
        safeToast("Enable the Vencorfy plugin first before starting a session.", "critical");
        return;
    }
    if (activeTask?.state.running) throw new Error("A Vencorfy session is already running.");
    const accountId = UserStore.getCurrentUser()?.id;
    if (!accountId) {
        safeToast("Discord account identity is unavailable; cannot start a session.", "critical");
        return;
    }

    const meta = resolveTierMeta("time", tier);
    widgetHidden = false;

    const task = {
        cancelled: false,
        state: {
            running: true,
            kind: "time" as BadgeKind,
            ...meta,
            progress: 2,
            text: "Preparing Game Time session..."
        }
    };
    activeTask = task;
    notify();

    try {
        const games = await getCatalogue();
        if (!games.length) throw new Error("No detectable games available.");

        const hoursPerSession = clamp(settings.store.hoursPerGame, 1, 24);
        const totalHoursWanted = Math.max(1, hoursToAdd);
        const sessionsCount = Math.ceil(totalHoursWanted / hoursPerSession);
        const sessionDurationMs = Math.floor(hoursPerSession * 3_600_000);

        const used = await getUsedGames();
        let sessionGames: Game[];
        let updatedUsed = used;

        if (specificGame) {
            sessionGames = Array.from({ length: sessionsCount }, () => specificGame);
        } else {
            const sel = selectGames(games, sessionsCount, used);
            sessionGames = sel.selectedGames;
            updatedUsed = sel.newUsedGames;
        }

        if (!sessionGames.length) throw new Error("Could not select games for Game Time.");

        const fallbackFp = await generateFingerprint(accountId);
        const batchSize = clamp(settings.store.batchSize, 1, 50);
        const delayMs = clamp(settings.store.batchDelay, 500, 30000);

        const totalSessions = sessionGames.length;
        const totalBatches = Math.ceil(totalSessions / batchSize);
        let sessionsDone = 0;
        let cursor = Date.now();

        setTaskState({
            running: true,
            kind: "time",
            ...meta,
            progress: 5,
            text: specificGame
                ? `Game Time: Claiming ${(totalSessions * hoursPerSession).toLocaleString()}h on ${specificGame.name}...`
                : `Game Time: Claiming ${hoursPerSession}h across ${totalSessions} games (~${(totalSessions * hoursPerSession).toLocaleString()}h)...`
        });

        for (let b = 0; b < totalBatches && !task.cancelled; b++) {
            const slice = sessionGames.slice(b * batchSize, (b + 1) * batchSize);
            setDebugRunningGame(slice[0]);

            const events = slice.flatMap(g => {
                cursor -= sessionDurationMs;
                return buildGameSessionEvents(g, sessionDurationMs, fallbackFp, cursor);
            });

            await postScience(events, accountId, () => task.cancelled);

            sessionsDone += slice.length;
            const claimedHours = sessionsDone * hoursPerSession;
            const pct = Math.min(95, Math.round((sessionsDone / totalSessions) * 95));
            setTaskState({
                running: true,
                kind: "time",
                ...meta,
                progress: pct,
                text: `Game Time: ${claimedHours.toLocaleString()}h claimed · batch ${b + 1}/${totalBatches}`
            });

            if (b + 1 < totalBatches && !task.cancelled) {
                await sleep(delayMs);
            }
        }

        setDebugRunningGame(null);
        if (task.cancelled) return;

        if (!specificGame) {
            await saveUsedGames(updatedUsed);
        }
        const totalClaimedHours = sessionsDone * hoursPerSession;
        await addStats(specificGame ? 1 : sessionsDone, totalClaimedHours, 0);

        const doneMsg = `Complete: ${totalClaimedHours.toLocaleString()}h claimed! (updates in ~1–3 days)`;
        widgetHidden = false;
        setTaskState({
            running: false,
            completed: true,
            kind: "time",
            ...meta,
            progress: 100,
            text: doneMsg
        });
        safeToast(doneMsg, "success");
    } catch (e: any) {
        if (task.cancelled || activeTask !== task) return;
        setDebugRunningGame(null);
        const msg = e?.message || "Failed to complete Game Time session";
        widgetHidden = false;
        setTaskState({
            running: false,
            error: true,
            kind: "time",
            ...meta,
            progress: 0,
            text: msg
        });
        safeToast(msg, "critical");
    }
}

export async function startStreamForge(hoursToAdd: number, tier?: Tier) {
    if (!isPluginEnabled("Vencorfy")) {
        safeToast("Enable the Vencorfy plugin first before starting a session.", "critical");
        return;
    }
    if (activeTask?.state.running) throw new Error("A Vencorfy session is already running.");
    const accountId = UserStore.getCurrentUser()?.id;
    if (!accountId) {
        safeToast("Discord account identity is unavailable; cannot start a session.", "critical");
        return;
    }

    const initialLive = getLiveStreamStatus();
    if (!initialLive.isLive) {
        safeToast("Share your screen in a voice channel first — Discord ignores streaming hours without an active screen share.", "critical");
        return;
    }
    const targetHours = Math.max(1, hoursToAdd);
    const meta = resolveTierMeta("stream", tier);
    widgetHidden = false;

    const task: {
        cancelled: boolean;
        stopStream?: () => void;
        state: TaskState;
    } = {
        cancelled: false,
        state: {
            running: true,
            kind: "stream",
            ...meta,
            progress: 2,
            text: initialLive.isLive
                ? `Streaming (Turbo Live · ${initialLive.viewers} viewer${initialLive.viewers === 1 ? "" : "s"}): Starting...`
                : "Streaming (Turbo): Starting session..."
        }
    };
    activeTask = task;
    notify();

    const heartbeatSessionId = crypto.randomUUID();
    const launchSignature = crypto.randomUUID();

    const getStreamProps = () => {
        const current = getLiveStreamStatus();
        return {
            isLive: current.isLive,
            viewers: current.viewers,
            props: {
                guild_id: current.guildId,
                channel_id: current.channelId,
                channel_type: 2
            }
        };
    };

    const makeStreamEvent = (type: string, streamProps: Record<string, unknown>, extra: Record<string, unknown>): ScienceEvent => {
        const now = Date.now();
        return {
            type,
            properties: {
                client_track_timestamp: now,
                client_send_timestamp: now,
                client_heartbeat_session_id: heartbeatSessionId,
                launch_signature: launchSignature,
                event_sequence_number: nextSequence(),
                client_app_state: "focused",
                ...streamProps,
                ...extra
            }
        };
    };

    try {
        const startInfo = getStreamProps();
        await postScience([
            makeStreamEvent("media_session_joined", startInfo.props, {}),
            makeStreamEvent("video_stream_started", startInfo.props, {})
        ], accountId, () => task.cancelled);

        let creditedHours = 0;

        while (!task.cancelled && creditedHours < targetHours) {
            const hoursPerTick = clamp(settings.store.streamHoursPerMinute, 1, 500);
            const intervalSec = clamp(settings.store.streamIntervalSeconds, 2, 60);
            let liveNow = getStreamProps();

            while (!liveNow.isLive && !task.cancelled) {
                const pausedPct = Math.min(95, Math.max(2, Math.round((creditedHours / targetHours) * 95)));
                setTaskState({
                    running: true,
                    kind: "stream",
                    ...meta,
                    progress: pausedPct,
                    text: `Paused: Share screen in VC to resume (${creditedHours.toLocaleString()}/${targetHours.toLocaleString()}h)`
                });
                await new Promise<void>(resolve => {
                    const timer = setTimeout(resolve, 1000);
                    task.stopStream = () => {
                        clearTimeout(timer);
                        resolve();
                    };
                });
                liveNow = getStreamProps();
            }
            if (task.cancelled) break;

            const claimHours = Math.min(hoursPerTick, targetHours - creditedHours);
            const durationTrackedMs = Math.round(claimHours * 3_600_000);
            const totalDurationMs = Math.round((creditedHours + claimHours) * 3_600_000);

            await postScience([
                makeStreamEvent("video_stream_heartbeat", liveNow.props, {
                    duration_tracked_ms: durationTrackedMs,
                    total_duration_ms: totalDurationMs
                })
            ], accountId, () => task.cancelled);

            creditedHours = Math.min(targetHours, Number((creditedHours + claimHours).toFixed(2)));
            await addStats(0, 0, claimHours);

            const pct = Math.min(95, Math.max(5, Math.round((creditedHours / targetHours) * 95)));
            if (creditedHours >= targetHours || task.cancelled) break;

            for (let rem = intervalSec; rem > 0 && !task.cancelled; rem--) {
                const tickLive = getStreamProps();
                const modeLabel = tickLive.isLive
                    ? `Streaming (Live · ${tickLive.viewers}v)`
                    : "Streaming (Turbo)";
                setTaskState({
                    running: true,
                    kind: "stream",
                    ...meta,
                    progress: pct,
                    text: `${modeLabel}: ${creditedHours.toLocaleString()}/${targetHours.toLocaleString()}h claimed · next pulse in ${rem}s`
                });

                await new Promise<void>(resolve => {
                    const timer = setTimeout(resolve, 1000);
                    task.stopStream = () => {
                        clearTimeout(timer);
                        resolve();
                    };
                });
            }
        }

        if (task.cancelled) return;

        const endInfo = getStreamProps();
        const finalDurationMs = Math.round(creditedHours * 3_600_000);

        await postScience([
            makeStreamEvent("video_stream_ended", endInfo.props, {
                duration_ms: finalDurationMs
            })
        ], accountId, () => task.cancelled);

        if (task.cancelled) return;

        const doneMsg = `Complete: ${creditedHours.toLocaleString()}h streaming claimed! (updates in ~1–3 days)`;
        widgetHidden = false;
        setTaskState({
            running: false,
            completed: true,
            kind: "stream",
            ...meta,
            progress: 100,
            text: doneMsg
        });
        safeToast(doneMsg, "success");
    } catch (e: any) {
        if (task.cancelled || activeTask !== task) return;
        const msg = e?.message || "Failed to complete Streaming session";
        widgetHidden = false;
        setTaskState({
            running: false,
            error: true,
            kind: "stream",
            ...meta,
            progress: 0,
            text: msg
        });
        safeToast(msg, "critical");
    }
}
