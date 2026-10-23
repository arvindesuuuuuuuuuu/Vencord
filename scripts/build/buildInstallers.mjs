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

// @ts-check

import { execFileSync } from "child_process";
import { chmod, copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import Zip from "zip-local";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const dist = join(root, "dist");
const requiredFiles = ["patcher.js", "preload.js", "renderer.js", "renderer.css"];

// Fail before downloading anything if the desktop build is missing.
for (const file of requiredFiles)
    await readFile(join(dist, file));

const files = (await readdir(dist)).filter(file => /^(patcher|preload|renderer)\.(js|css)(\.map|\.LEGAL\.txt)?$/.test(file));
const instructions = join(root, "scripts/installers/README.md");
const revision = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const releaseReadme = `<!-- vencord-release: ${revision} -->\n\n${await readFile(instructions, "utf8")}`;
await writeFile(join(dist, "README.md"), releaseReadme);

async function download(url) {
    const response = await fetch(url);
    if (!response.ok)
        throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
    return response;
}

// Resolve latest once without the rate-limited API so both platforms use the same release.
const installerRelease = await download("https://github.com/Vencord/Installer/releases/latest");
const installerTag = new URL(installerRelease.url).pathname.split("/releases/tag/")[1];
if (!installerTag)
    throw new Error("Could not resolve the latest installer release tag.");
const staging = await mkdtemp(join(tmpdir(), "vencord-installers-"));
try {
    for (const platform of ["windows", "linux"]) {
        const name = `VencordInstaller-${platform}`;
        const directory = join(staging, name);
        await mkdir(join(directory, "dist"), { recursive: true });
        for (const file of files)
            await copyFile(join(dist, file), join(directory, "dist", file));
        await copyFile(join(root, "LICENSE"), join(directory, "LICENSE"));
        await copyFile(instructions, join(directory, "README.md"));

        const binary = platform === "windows" ? "VencordInstallerCli.exe" : "VencordInstallerCli-linux";
        const response = await download(`https://github.com/Vencord/Installer/releases/download/${installerTag}/${binary}`);
        // The Windows helper downloads upstream builds when launched directly.
        // Keep install.cmd as the entry point that selects this fork's bundled build.
        const binaryDirectory = platform === "windows" ? join(directory, "bin") : directory;
        await mkdir(binaryDirectory, { recursive: true });
        await writeFile(join(binaryDirectory, binary), Buffer.from(await response.arrayBuffer()), { mode: 0o755 });

        const launcher = platform === "windows" ? "install.cmd" : "install.sh";
        await copyFile(join(root, "scripts/installers", launcher), join(directory, launcher));
        await chmod(join(directory, launcher), 0o755);
        await writeFile(join(directory, "README.txt"), [
            `Run ${launcher}, choose Install, Reinstall, or Uninstall, then select Stable, PTB, or Canary.`,
            ...(platform === "windows" ? ["Windows: always run install.cmd. Do not launch bin/VencordInstallerCli.exe directly; it installs upstream Vencord instead of this fork."] : []),
            "Use Back to return or Exit to leave. Continue closes the selected Discord branch before applying changes.",
            "After a successful install or reinstall, Discord starts automatically (except when running as root).",
            "For direct CLI commands, fully close Discord yourself and restart it afterward.",
            "Extract the entire archive first. Keep this folder in a permanent location:",
            "Discord loads Vencord directly from its dist folder. Do not delete or move it.",
            `To uninstall, run ${launcher} --uninstall before removing this folder.`,
            "No Node.js or pnpm installation is required.",
            "These installers target x86-64 Windows and Linux. Linux Snap is unsupported.",
            "If Linux reports permission denied, rerun the launcher using sudo.",
            "",
            `Installer source (GPL-3.0): https://github.com/Vencord/Installer/tree/${installerTag}`,
            `Vencord source (GPL-3.0-or-later): ${execFileSync("git", ["remote", "get-url", "origin"], { cwd: root, encoding: "utf8" }).trim()}`,
            `Vencord commit: ${execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim()}`,
            ""
        ].join("\n"));

        if (platform === "windows") {
            Zip.sync.zip(directory).compress().save(join(dist, `${name}.zip`));
        } else {
            execFileSync("tar", ["-czf", join(dist, `${name}.tar.gz`), "-C", staging, name]);
        }
        console.info(`Packaged ${name}`);
    }
} finally {
    await rm(staging, { recursive: true, force: true });
}
