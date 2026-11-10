/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { Dashboard } from "./ui";

export const settings = definePluginSettings({
    dashboard: {
        type: OptionType.COMPONENT,
        component: () => <Dashboard />
    },
    hoursPerGame: {
        type: OptionType.NUMBER,
        description: "Game Time: hours credited per game session (1-24).",
        default: 2
    },
    varietyMinutes: {
        type: OptionType.NUMBER,
        description: "Game Variety: minutes per game session (1-30).",
        default: 2
    },
    batchSize: {
        type: OptionType.NUMBER,
        description: "Game sessions sent per request (1-50). Lower is gentler on the API.",
        default: 25
    },
    batchDelay: {
        type: OptionType.NUMBER,
        description: "Delay between requests in milliseconds (min 1000).",
        default: 1500
    },
    streamHoursPerMinute: {
        type: OptionType.NUMBER,
        description: "Streaming: hours claimed per heartbeat pulse (1-500).",
        default: 50
    },
    streamIntervalSeconds: {
        type: OptionType.NUMBER,
        description: "Streaming: seconds between heartbeat pulses (2-60). Use 60 for strict 1-minute cadence, or lower for faster completion.",
        default: 15
    },
    showProgressWidget: {
        type: OptionType.BOOLEAN,
        description: "Show a Discord Quest-style progress widget in the bottom-left account panel when a session is running or finished.",
        default: true
    },
    filterAdultGames: {
        type: OptionType.BOOLEAN,
        description: "Skip games whose names look adult/NSFW so they never get logged on your account.",
        default: true
    },
    extraBlocklist: {
        type: OptionType.STRING,
        description: "Extra comma-separated words; games whose names contain any of them are skipped.",
        default: ""
    }
});

export const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
