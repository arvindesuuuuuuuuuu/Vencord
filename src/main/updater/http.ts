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
let PendingUpdates = [] as [string, string][];
let PendingArchive: string | undefined;

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

    const data = await githubGet(`/compare/${gitHash}...HEAD`);

    return data.commits.map((c: any) => ({
        // github api only sends the long sha
        hash: c.sha.slice(0, 7),
        author: c.author?.login ?? c.commit?.author?.name ?? "Unknown Author",
        message: c.commit.message.split("\n")[0]
    }));
}

async function fetchUpdates() {
    PendingUpdates = [];
    PendingArchive = undefined;
    const data = await githubGet("/releases/latest");

    const hash = data.name.slice(data.name.lastIndexOf(" ") + 1);
    if (hash === gitHash)
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

    return true;
}

async function applyUpdates() {
    let fileContents: (readonly [string, Uint8Array])[];
    if (PendingArchive) {
        const files = unzipSync(await fetchBuffer(PendingArchive), {
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
    return true;
}

ipcMain.handle(IpcEvents.GET_REPO, serializeErrors(() => `https://github.com/${gitRemote}`));
ipcMain.handle(IpcEvents.GET_UPDATES, serializeErrors(calculateGitChanges));
ipcMain.handle(IpcEvents.UPDATE, serializeErrors(fetchUpdates));
ipcMain.handle(IpcEvents.BUILD, serializeErrors(applyUpdates));
