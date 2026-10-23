/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { fetchBuffer, fetchJson } from "@main/utils/http";
import { IpcEvents } from "@shared/IpcEvents";
import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { ipcMain } from "electron";
import { unzipSync } from "fflate";
import { writeFile } from "fs/promises";
import { join } from "path";

import gitHash from "~git-hash";
import gitRemote from "~git-remote";

import { serializeErrors, VENCORD_FILES } from "./common";

const API_BASE = `https://api.github.com/repos/${gitRemote}`;
const DOWNLOAD_BASE = `https://github.com/${gitRemote}/releases/latest/download/`;
let PendingUpdates = [] as [string, string][];
let PendingArchive: string | undefined;
let PendingArchiveContents: Buffer | undefined;
let PendingRelease: { hash: string; name: string; } | undefined;

function isBuildFile(name: string) {
    return VENCORD_FILES.some(file => name === file || name === `${file}.map` || name === `${file}.LEGAL.txt`);
}

async function githubGet<T = any>(endpoint: string) {
    return fetchJson<T>(API_BASE + endpoint, {
        headers: {
            Accept: "application/vnd.github+json",
            // "All API requests MUST include a valid User-Agent header.
            // Requests with no User-Agent header will be rejected."
            "User-Agent": VENCORD_USER_AGENT
        }
    });
}

async function calculateGitChanges() {
    const isOutdated = await fetchUpdates();
    if (!isOutdated) return [];

    try {
        const data = await githubGet(`/compare/${gitHash}...${PendingRelease!.hash}`);

        const commits = data.commits.map((c: any) => ({
            // github api only sends the long sha
            hash: c.sha.slice(0, 7),
            author: c.author?.login ?? c.commit?.author?.name ?? "Unknown Author",
            message: c.commit.message.split("\n")[0]
        }));
        if (commits.length) return commits;
    } catch (error) {
        console.warn("[Vencord] Could not retrieve update commit details; using release information.", error);
    }

    return [{ hash: PendingRelease!.hash, author: gitRemote.split("/")[0], message: PendingRelease!.name }];
}

async function fetchUpdates() {
    PendingUpdates = [];
    PendingArchive = undefined;
    PendingArchiveContents = undefined;
    PendingRelease = undefined;
    let data;
    try {
        if (!IS_DISCORD_DESKTOP) throw new Error("Use the standard release API for Vesktop.");
        // Release downloads are available even when GitHub's API is rate limited.
        const readme = (await fetchBuffer(DOWNLOAD_BASE + "README.md")).toString("utf8");
        let hash = /<!-- vencord-release: ([\da-f]{7,40}) -->/.exec(readme)?.[1];
        if (!hash) {
            // Older installer releases have no metadata in their README.
            PendingArchiveContents = await fetchBuffer(DOWNLOAD_BASE + "VencordInstaller-windows.zip");
            const files = unzipSync(PendingArchiveContents, { filter: ({ name }) => name === "dist/patcher.js" });
            const patcher = files["dist/patcher.js"];
            hash = patcher && /^\/\/ Vencord ([\da-f]{7,40})\r?\n/.exec(Buffer.from(patcher).toString("utf8"))?.[1];
            if (!hash) throw new Error("The installer archive has no build revision.");
        }
        data = {
            name: `DevBuild ${hash}`,
            assets: [{ name: "VencordInstaller-windows.zip", browser_download_url: DOWNLOAD_BASE + "VencordInstaller-windows.zip" }]
        };
    } catch {
        PendingArchiveContents = undefined;
        // Older releases and upstream builds still expose loose files via the API.
        data = await githubGet("/releases/latest");
    }

    const hash = data.name.slice(data.name.lastIndexOf(" ") + 1);
    if (hash.startsWith(gitHash) || gitHash.startsWith(hash))
        return false;

    const pendingUpdates: [string, string][] = [];
    data.assets.forEach(({ name, browser_download_url }) => {
        if (isBuildFile(name)) {
            pendingUpdates.push([name, browser_download_url]);
        }
    });

    if (!VENCORD_FILES.every(file => pendingUpdates.some(([name]) => name === file))) {
        // Both installers contain the same universal desktop build. Read the ZIP
        // on either OS so Linux doesn't need an external archive utility.
        const archive = IS_DISCORD_DESKTOP && data.assets.find(({ name }) => name === "VencordInstaller-windows.zip");
        if (!archive)
            throw new Error("The latest release does not contain a complete Vencord build.");
        PendingArchive = archive.browser_download_url;
    } else {
        PendingUpdates = pendingUpdates;
    }
    PendingRelease = { hash, name: data.name };

    return true;
}

async function applyUpdates() {
    let fileContents: (readonly [string, Uint8Array])[];
    if (PendingArchive) {
        const files = unzipSync(PendingArchiveContents ?? await fetchBuffer(PendingArchive), {
            filter: ({ name }) => name.startsWith("dist/") && isBuildFile(name.slice("dist/".length))
        });
        // Validate every required file before replacing any of the current build.
        for (const file of VENCORD_FILES) {
            if (!files[`dist/${file}`]?.length)
                throw new Error(`The installer archive is missing dist/${file}.`);
        }
        fileContents = Object.entries(files).map(([name, contents]) => [join(__dirname, name.slice("dist/".length)), contents] as const);
    } else {
        if (!PendingUpdates.length)
            throw new Error("No update is ready. Check for updates first.");
        fileContents = await Promise.all(PendingUpdates.map(async ([name, url]) => {
            const contents = await fetchBuffer(url);
            return [join(__dirname, name), contents] as const;
        }));
    }

    await Promise.all(fileContents.map(async ([filename, contents]) =>
        writeFile(filename, contents))
    );

    PendingUpdates = [];
    PendingArchive = undefined;
    PendingArchiveContents = undefined;
    return true;
}

ipcMain.handle(IpcEvents.GET_REPO, serializeErrors(() => `https://github.com/${gitRemote}`));
ipcMain.handle(IpcEvents.GET_UPDATES, serializeErrors(calculateGitChanges));
ipcMain.handle(IpcEvents.UPDATE, serializeErrors(fetchUpdates));
ipcMain.handle(IpcEvents.BUILD, serializeErrors(applyUpdates));
