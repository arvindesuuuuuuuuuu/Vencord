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

import { isPluginEnabled } from "@api/PluginManager";
import OpenInAppPlugin from "@plugins/openInApp";
import { findByProps, findByPropsLazy, proxyLazyWebpack } from "@webpack";
import { Flux, FluxDispatcher, showToast, Toasts } from "@webpack/common";

import { settings } from ".";

export interface Track {
    id: string;
    name: string;
    duration: number;
    isLocal: boolean;
    album: {
        id: string;
        name: string;
        image: {
            height: number;
            width: number;
            url: string;
        };
    };
    artists: {
        id: string;
        href: string;
        name: string;
        type: string;
        uri: string;
    }[];
}

interface PlayerState {
    accountId: string;
    track: Track | null;
    volumePercent: number,
    isPlaying: boolean,
    repeat: boolean,
    position: number,
    context?: any;
    device?: Device;

    // added by patch
    actual_repeat: Repeat;
    shuffle: boolean;
}

export interface Device {
    id: string;
    is_active: boolean;
    name?: string;
    type?: string;
    supports_volume?: boolean;
    volume_percent?: number;
}

type Repeat = "off" | "track" | "context";

// Don't wanna run before Flux and Dispatcher are ready!
export const SpotifyStore = proxyLazyWebpack(() => {
    // For some reason ts hates extends Flux.Store
    const { Store } = Flux;

    const SpotifySocket = findByProps("getActiveSocketAndDevice");
    const SpotifyAPI = findByPropsLazy("vcSpotifyMarker");

    const API_BASE = "https://api.spotify.com/v1/me/player";

    class SpotifyStore extends Store {
        public mPosition = 0;
        public _start = 0;

        public track: Track | null = null;
        public device: Device | null = null;
        public devices: Device[] = [];
        public isPlaying = false;
        public repeat: Repeat = "off";
        public shuffle = false;
        public volume = 0;

        public isSettingPosition = false;

        public openExternal(path: string) {
            const url = settings.store.useSpotifyUris || isPluginEnabled(OpenInAppPlugin.name)
                ? "spotify:" + path.replaceAll("/", (_, idx) => idx === 0 ? "" : ":")
                : "https://open.spotify.com" + path;

            VencordNative.native.openExternal(url);
        }

        // Need to keep track of this manually
        public get position(): number {
            let pos = this.mPosition;
            if (this.isPlaying) {
                pos += Date.now() - this._start;
            }
            return pos;
        }

        public set position(p: number) {
            this.mPosition = p;
            this._start = Date.now();
        }

        prev() {
            this._req("post", "/previous");
        }

        next() {
            this._req("post", "/next");
        }

        setVolume(percent: number) {
            if (this.device?.supports_volume === false) {
                showToast(`Volume control is not supported on ${this.device.name ?? "this device"}`, Toasts.Type.FAILURE);
                return Promise.resolve();
            }

            const vol = Math.max(0, Math.min(100, Math.round(percent)));
            const prev = this.volume;
            this.volume = vol;
            this.emitChange();

            return this._req("put", "/volume", {
                query: {
                    volume_percent: vol
                }
            }).catch((err: any) => {
                console.error("[SpotifyControls] Failed to set volume:", err?.status, err?.body, err?.text, err);
                const status = err?.status;
                const message = err?.body?.error?.message;
                if (status === 403) {
                    showToast(`Volume control is not supported on ${this.device?.name ?? "this device"}`, Toasts.Type.FAILURE);
                } else if (status === 404) {
                    showToast("No active Spotify playback device found", Toasts.Type.FAILURE);
                } else if (message) {
                    showToast(`Spotify: ${message}`, Toasts.Type.FAILURE);
                }
                this.volume = prev;
                this.emitChange();
            });
        }

        setPlaying(playing: boolean) {
            this._req("put", playing ? "/play" : "/pause");
        }

        setRepeat(state: Repeat) {
            this._req("put", "/repeat", {
                query: { state }
            });
        }

        setShuffle(state: boolean) {
            this._req("put", "/shuffle", {
                query: { state }
            }).then(() => {
                this.shuffle = state;
                this.emitChange();
            });
        }

        seek(ms: number) {
            if (this.isSettingPosition) return Promise.resolve();

            this.isSettingPosition = true;

            return this._req("put", "/seek", {
                query: {
                    position_ms: Math.round(ms)
                }
            }).catch((e: any) => {
                console.error("[VencordSpotifyControls] Failed to seek", e);
                this.isSettingPosition = false;
            });
        }

        _req(method: "post" | "get" | "put", route: string, data: any = {}) {
            const socketAndDevice = SpotifySocket.getActiveSocketAndDevice();
            const socket = socketAndDevice?.socket;
            const activeDevice = (this.device?.is_active ? this.device : socketAndDevice?.device) as Device | undefined;

            if (activeDevice?.id && activeDevice.is_active) {
                (data.query ??= {}).device_id = activeDevice.id;
            }

            if (!socket) {
                console.error("[SpotifyControls] No active socket found in SpotifySocket!", socketAndDevice);
                return Promise.reject(new Error("No active Spotify socket"));
            }

            let url = API_BASE + route;
            if (data.query && Object.keys(data.query).length > 0) {
                const searchParams = new URLSearchParams();
                for (const [key, value] of Object.entries(data.query)) {
                    if (value !== undefined && value !== null) {
                        searchParams.set(key, String(value));
                    }
                }
                const queryString = searchParams.toString();
                if (queryString) {
                    url += (url.includes("?") ? "&" : "?") + queryString;
                }
            }

            console.log("[SpotifyControls] Sending _req:", method, url, "data:", JSON.stringify(data), "device:", JSON.stringify(activeDevice));

            return SpotifyAPI[method](socket.accountId, socket.accessToken, {
                url,
                ...data
            });
        }
    }

    const store = new SpotifyStore(FluxDispatcher, {
        SPOTIFY_PLAYER_STATE(e: any) {
            console.log("[SpotifyControls] SPOTIFY_PLAYER_STATE:", JSON.stringify(e));
            store.track = e.track;
            if (e.device) {
                store.device = e.device;
            }
            store.isPlaying = e.isPlaying ?? false;
            store.volume = e.volumePercent ?? e.device?.volume_percent ?? store.volume ?? 0;
            store.repeat = e.actual_repeat || "off";
            store.shuffle = e.shuffle ?? false;
            store.position = e.position ?? 0;
            store.isSettingPosition = false;
            store.emitChange();
        },
        SPOTIFY_SET_DEVICES({ devices }: { devices: any[]; }) {
            console.log("[SpotifyControls] SPOTIFY_SET_DEVICES:", JSON.stringify(devices));
            store.devices = devices ?? [];
            const active = devices.find(d => d.is_active) ?? devices[0] ?? null;
            if (active) {
                store.device = active;
                if (active.volume_percent != null) {
                    store.volume = active.volume_percent;
                }
            }
            store.emitChange();
        }
    });

    return store;
});
