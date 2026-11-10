/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import casual from "file://assets/game-time/casual.svg?base64&minify";
import committed from "file://assets/game-time/committed.svg?base64&minify";
import dedicated from "file://assets/game-time/dedicated.svg?base64&minify";
import devoted from "file://assets/game-time/devoted.svg?base64&minify";
import eternal from "file://assets/game-time/eternal.svg?base64&minify";
import ironclad from "file://assets/game-time/ironclad.svg?base64&minify";
import recreational from "file://assets/game-time/recreational.svg?base64&minify";
import seasoned from "file://assets/game-time/seasoned.svg?base64&minify";
import serious from "file://assets/game-time/serious.svg?base64&minify";
import unshakeable from "file://assets/game-time/unshakeable.svg?base64&minify";
import adventurer from "file://assets/game-variety/adventurer.svg?base64&minify";
import dabbler from "file://assets/game-variety/dabbler.svg?base64&minify";
import enthusiast from "file://assets/game-variety/enthusiast.svg?base64&minify";
import explorer from "file://assets/game-variety/explorer.svg?base64&minify";
import maverick from "file://assets/game-variety/maverick.svg?base64&minify";
import polymath from "file://assets/game-variety/polymath.svg?base64&minify";
import ranger from "file://assets/game-variety/ranger.svg?base64&minify";
import sampler from "file://assets/game-variety/sampler.svg?base64&minify";
import universalist from "file://assets/game-variety/universalist.svg?base64&minify";
import voyager from "file://assets/game-variety/voyager.svg?base64&minify";
import breakout from "file://assets/streaming/breakout.svg?base64&minify";
import fledgling from "file://assets/streaming/fledgling.svg?base64&minify";
import headliner from "file://assets/streaming/headliner.svg?base64&minify";
import newcomer from "file://assets/streaming/newcomer.svg?base64&minify";
import phenomenon from "file://assets/streaming/phenomenon.svg?base64&minify";
import sensation from "file://assets/streaming/sensation.svg?base64&minify";
import standout from "file://assets/streaming/standout.svg?base64&minify";
import star from "file://assets/streaming/star.svg?base64&minify";
import trendsetter from "file://assets/streaming/trendsetter.svg?base64&minify";
import visionary from "file://assets/streaming/visionary.svg?base64&minify";

export type BadgeKind = "variety" | "time" | "stream";

export interface Tier {
    key: string;
    label: string;
    threshold: number;
    icon: string;
}

export interface BadgeCategory {
    kind: BadgeKind;
    badgeId: number;
    title: string;
    unit: (n: number) => string;
    tiers: Tier[];
}

const games = (n: number) => `${n.toLocaleString()} ${n === 1 ? "game" : "games"}`;
const hours = (n: number) => `${n.toLocaleString()} ${n === 1 ? "hr" : "hrs"}`;

export const CATEGORIES: BadgeCategory[] = [
    {
        kind: "variety",
        badgeId: 21,
        title: "Game Variety",
        unit: games,
        tiers: [
            { key: "sampler", label: "Sampler", threshold: 2, icon: sampler },
            { key: "dabbler", label: "Dabbler", threshold: 5, icon: dabbler },
            { key: "enthusiast", label: "Enthusiast", threshold: 10, icon: enthusiast },
            { key: "ranger", label: "Ranger", threshold: 15, icon: ranger },
            { key: "explorer", label: "Explorer", threshold: 20, icon: explorer },
            { key: "adventurer", label: "Adventurer", threshold: 30, icon: adventurer },
            { key: "voyager", label: "Voyager", threshold: 40, icon: voyager },
            { key: "maverick", label: "Maverick", threshold: 60, icon: maverick },
            { key: "polymath", label: "Polymath", threshold: 80, icon: polymath },
            { key: "universalist", label: "Universalist", threshold: 100, icon: universalist }
        ]
    },
    {
        kind: "time",
        badgeId: 20,
        title: "Game Time",
        unit: hours,
        tiers: [
            { key: "casual", label: "Casual", threshold: 1, icon: casual },
            { key: "recreational", label: "Recreational", threshold: 5, icon: recreational },
            { key: "dedicated", label: "Dedicated", threshold: 20, icon: dedicated },
            { key: "committed", label: "Committed", threshold: 75, icon: committed },
            { key: "serious", label: "Serious", threshold: 150, icon: serious },
            { key: "devoted", label: "Devoted", threshold: 300, icon: devoted },
            { key: "seasoned", label: "Seasoned", threshold: 500, icon: seasoned },
            { key: "ironclad", label: "Ironclad", threshold: 1000, icon: ironclad },
            { key: "unshakeable", label: "Unshakeable", threshold: 2000, icon: unshakeable },
            { key: "eternal", label: "Eternal", threshold: 5000, icon: eternal }
        ]
    },
    {
        kind: "stream",
        badgeId: 19,
        title: "Streaming",
        unit: hours,
        tiers: [
            { key: "newcomer", label: "Newcomer", threshold: 1, icon: newcomer },
            { key: "fledgling", label: "Fledgling", threshold: 5, icon: fledgling },
            { key: "breakout", label: "Breakout", threshold: 20, icon: breakout },
            { key: "standout", label: "Standout", threshold: 75, icon: standout },
            { key: "trendsetter", label: "Trendsetter", threshold: 150, icon: trendsetter },
            { key: "headliner", label: "Headliner", threshold: 300, icon: headliner },
            { key: "star", label: "Star", threshold: 500, icon: star },
            { key: "sensation", label: "Sensation", threshold: 1000, icon: sensation },
            { key: "visionary", label: "Visionary", threshold: 2000, icon: visionary },
            { key: "phenomenon", label: "Phenomenon", threshold: 5000, icon: phenomenon }
        ]
    }
];
