/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, React, useCallback, useEffect, useMemo, useRef, UserStore,useState } from "@webpack/common";

import { BadgeProgress, fetchBadges, Game, getCatalogue } from "./api";
import {
    cancelForge,
    dismissTask,
    getLiveStreamStatus,
    getStats,
    getTaskState,
    getUsedGames,
    isWidgetHidden,
    resetUsedGames,
    setWidgetHidden,
    startStreamForge,
    startTimeForge,
    startVarietyForge,
    subscribeTask,
    TaskState,
    VencorfyStats
} from "./session";
import { clamp, settings } from "./settings";
import { BadgeCategory, BadgeKind, CATEGORIES, Tier } from "./tiers";
import { hideTooltip, tooltipProps } from "./tooltip";

interface SheetTarget {
    category: BadgeCategory;
    tier: Tier;
    currentCount: number;
}

function CheckIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 32 32">
            <path
                fill="currentColor"
                fillRule="evenodd"
                d="M28.928 10.3a3.25 3.25 0 0 1-.137 4.595L13.94 28.89a3.25 3.25 0 0 1-4.557-.098l-6.264-6.435a3.25 3.25 0 0 1 4.658-4.534l4.033 4.143l12.525-11.802a3.25 3.25 0 0 1 4.594.136"
                clipRule="evenodd"
            />
        </svg>
    );
}

function StarsIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 16 16">
            <path
                fill="currentColor"
                d="M7.657 6.247c.11-.33.576-.33.686 0l.645 1.937a2.89 2.89 0 0 0 1.829 1.828l1.936.645c.33.11.33.576 0 .686l-1.937.645a2.89 2.89 0 0 0-1.828 1.829l-.645 1.936a.361.361 0 0 1-.686 0l-.645-1.937a2.89 2.89 0 0 0-1.828-1.828l-1.937-.645a.361.361 0 0 1 0-.686l1.937-.645a2.89 2.89 0 0 0 1.828-1.828zM3.794 1.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387A1.73 1.73 0 0 0 4.593 5.69l-.387 1.162a.217.217 0 0 1-.412 0L3.407 5.69A1.73 1.73 0 0 0 2.31 4.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387A1.73 1.73 0 0 0 3.407 2.31z"
            />
        </svg>
    );
}

function CrossIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 64 64">
            <path
                fill="currentColor"
                d="M62 10.571L53.429 2L32 23.429L10.571 2L2 10.571L23.429 32L2 53.429L10.571 62L32 40.571L53.429 62L62 53.429L40.571 32z"
            />
        </svg>
    );
}

function SpinnerIcon() {
    return (
        <svg className="vc-vencorfy-spinning" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeDasharray="28 28" />
        </svg>
    );
}

function InfoCircleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 16 16">
            <path
                fill="currentColor"
                d="M8 0a8 8 0 1 0 8 8a8.01 8.01 0 0 0-8-8m.857 12a.857.857 0 0 1-1.714 0V8a.857.857 0 0 1 1.714 0zM8 5.714A1.143 1.143 0 1 1 8 3.43a1.143 1.143 0 0 1 0 2.285"
            />
        </svg>
    );
}

function WarningTriangleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
            <path
                fill="currentColor"
                d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9c.55 0 1 .45 1 1v4c0 .55-.45 1-1 1s-1-.45-1-1v-4c0-.55.45-1 1-1zm1 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"
            />
        </svg>
    );
}

function TierStripSection({
    index,
    category,
    progress,
    onSelectTier,
    children
}: {
    index: number;
    category: BadgeCategory;
    progress: BadgeProgress | undefined;
    onSelectTier: (category: BadgeCategory, tier: Tier, currentCount: number) => void;
    children?: React.ReactNode;
}) {
    const stripRef = useRef<HTMLDivElement | null>(null);
    const currentTier = progress?.currentTier ?? null;
    const count = progress?.count ?? 0;
    const ownedTiers = progress?.ownedTiers ?? new Set<string>();

    const currentIdx = currentTier ? category.tiers.findIndex(t => t.key === currentTier) : -1;
    const isMaxed = currentIdx === category.tiers.length - 1 && currentIdx !== -1;
    const currentLabel = currentIdx !== -1 ? category.tiers[currentIdx].label : currentTier;

    const statusClass = isMaxed
        ? "vc-vencorfy-section-status maxed"
        : currentTier
            ? "vc-vencorfy-section-status owned"
            : "vc-vencorfy-section-status";

    const statusText = currentLabel
        ? `${currentLabel} · ${category.unit(count)}`
        : category.unit(count);

    const scrollBy = (delta: number) => {
        stripRef.current?.scrollBy({ left: delta, behavior: "smooth" });
    };

    return (
        <section className="vc-vencorfy-section">
            <div className="vc-vencorfy-section-header">
                <span className="vc-vencorfy-section-num">{index}</span>
                <span className="vc-vencorfy-section-title">{category.title}</span>
                <span className={statusClass}>{statusText}</span>
            </div>

            {children}

            <div className="vc-vencorfy-strip-wrap">
                <button
                    type="button"
                    className="vc-vencorfy-arrow vc-vencorfy-arrow-left"
                    onClick={() => scrollBy(-180)}
                    {...tooltipProps("Scroll Left")}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                        <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="m15 5l-6 7l6 7" />
                    </svg>
                </button>

                <div ref={stripRef} className="vc-vencorfy-strip">
                    {category.tiers.map((tier, idx) => {
                        const isCurrent = currentTier === tier.key;
                        const isOwned = ownedTiers.has(tier.key) || (currentIdx !== -1 && idx < currentIdx);

                        let cellClass = "vc-vencorfy-cell";
                        if (isCurrent) cellClass += isMaxed ? " maxed" : " current";
                        else if (isOwned || isMaxed) cellClass += " owned";

                        return (
                            <div
                                key={tier.key}
                                className={cellClass}
                                {...tooltipProps(`${tier.label} (${category.unit(tier.threshold)}) — Click to target`)}
                                onClick={() => onSelectTier(category, tier, count)}
                            >
                                <img className="vc-vencorfy-cell-img" src={tier.icon} alt={tier.label} />
                                <div className="vc-vencorfy-cell-label">{tier.label}</div>
                                <div className="vc-vencorfy-cell-req">{category.unit(tier.threshold)}</div>

                                {isCurrent && (
                                    <span className="vc-vencorfy-cell-badge current">
                                        <StarsIcon />
                                    </span>
                                )}
                                {!isCurrent && (isOwned || isMaxed) && (
                                    <span className="vc-vencorfy-cell-badge owned">
                                        <CheckIcon />
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                <button
                    type="button"
                    className="vc-vencorfy-arrow vc-vencorfy-arrow-right"
                    onClick={() => scrollBy(180)}
                    {...tooltipProps("Scroll Right")}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                        <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="m9 5l6 7l-6 7" />
                    </svg>
                </button>
            </div>
        </section>
    );
}

function DashboardInner() {
    const [badges, setBadges] = useState<Record<BadgeKind, BadgeProgress> | null>(null);
    const [stats, setStats] = useState<VencorfyStats>({
        totalGamesClaimed: 0,
        totalHoursClaimed: 0,
        totalStreamHoursClaimed: 0
    });
    const [usedCount, setUsedCount] = useState(0);
    const [task, setTask] = useState<TaskState | null>(() => getTaskState());
    const [hiddenWidget, setHiddenWidget] = useState<boolean>(() => isWidgetHidden());
    const [sheet, setSheet] = useState<SheetTarget | null>(null);

    const [catalogue, setCatalogue] = useState<Game[]>([]);
    const [gameSearch, setGameSearch] = useState("");
    const [pickedGame, setPickedGame] = useState<Game | null>(null);

    const pluginEnabled = Boolean(useSettings(["plugins.Vencorfy.enabled"]).plugins.Vencorfy?.enabled);
    const user = UserStore.getCurrentUser();
    const [liveStatus, setLiveStatus] = useState(() => getLiveStreamStatus());

    useEffect(() => {
        const timer = setInterval(() => {
            setLiveStatus(getLiveStreamStatus());
        }, 1500);
        return () => clearInterval(timer);
    }, []);

    const refreshAll = useCallback(async () => {
        const [b, s, u, c] = await Promise.all([
            fetchBadges().catch(() => null),
            getStats(),
            getUsedGames(),
            getCatalogue().catch(() => [])
        ]);
        if (b) setBadges(b);
        setStats(s);
        setUsedCount(u.length);
        if (c.length) setCatalogue(c);
    }, []);

    useEffect(() => {
        void refreshAll();
        const unsub = subscribeTask(() => {
            const next = getTaskState();
            setTask(next ? { ...next } : null);
            setHiddenWidget(isWidgetHidden());
            if (!next || next.completed) {
                void getStats().then(setStats);
                void getUsedGames().then(u => setUsedCount(u.length));
            }
        });
        return () => {
            unsub();
            hideTooltip();
        };
    }, [refreshAll]);

    const filteredGames = useMemo(() => {
        const q = gameSearch.trim().toLowerCase();
        if (!q || q.length < 2 || pickedGame) return [];
        return catalogue
            .filter(g => g.name.toLowerCase().includes(q))
            .slice(0, 12);
    }, [catalogue, gameSearch, pickedGame]);

    const handleConfirmSheet = () => {
        if (!sheet || !pluginEnabled || task?.running) return;
        if (sheet.category.kind === "stream" && !liveStatus.isLive) return;
        const { category, tier, currentCount } = sheet;
        const delta = Math.max(1, tier.threshold - (currentCount < tier.threshold ? currentCount : 0));
        setSheet(null);

        if (category.kind === "variety") {
            void startVarietyForge(tier.threshold, currentCount, tier);
        } else if (category.kind === "time") {
            void startTimeForge(delta, pickedGame, tier);
        } else {
            void startStreamForge(delta, tier);
        }
    };

    const avatarUrl = user?.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
        : "https://cdn.discordapp.com/embed/avatars/0.png";

    const displayName = (user as any)?.globalName || user?.username || "Discord User";
    const userTag = user?.discriminator && user.discriminator !== "0"
        ? `@${user.username}#${user.discriminator}`
        : `@${user?.username ?? "user"}`;

    const sheetDelta = sheet
        ? Math.max(1, sheet.tier.threshold - (sheet.currentCount < sheet.tier.threshold ? sheet.currentCount : 0))
        : 0;

    return (
        <div className="vc-vencorfy-root">
            <header className="vc-vencorfy-header">
                <div className="vc-vencorfy-brand">
                    <span className={`vc-vencorfy-tag ${pluginEnabled ? "" : "vc-vencorfy-tag-disabled"}`}>
                        {pluginEnabled ? "Enabled" : "Disabled"}
                    </span>
                    {liveStatus.isLive && (
                        <span className="vc-vencorfy-tag vc-vencorfy-stream-live">
                            Live · {liveStatus.viewers} viewer{liveStatus.viewers === 1 ? "" : "s"}
                        </span>
                    )}
                </div>
            </header>

            <div className="vc-vencorfy-user-row">
                <div className="vc-vencorfy-user-left">
                    <img className="vc-vencorfy-avatar" src={avatarUrl} alt="Avatar" />
                    <div className="vc-vencorfy-user-info">
                        <span className="vc-vencorfy-username">{displayName}</span>
                        <span className="vc-vencorfy-usertag">{userTag}</span>
                    </div>
                </div>
                <span className="vc-vencorfy-usertag">
                    {catalogue.length ? `${catalogue.length.toLocaleString()} games ready` : "Loading games..."}
                </span>
            </div>

            <div className="vc-vencorfy-warning-banner">
                <div className="vc-vencorfy-warning-title">
                    <WarningTriangleIcon />
                    <span>WARNING</span>
                </div>
                <div className="vc-vencorfy-warning-body">
                    Ensure <strong>&quot;Use data to personalize my Discord experience&quot;</strong> is{" "}
                    <strong>ENABLED</strong> in your Discord Privacy &amp; Safety settings before running the plugin. If
                    disabled, Discord will ignore incoming telemetry activity.
                </div>
            </div>

            <div className="vc-vencorfy-sync-banner">
                <span className="vc-vencorfy-sync-icon">
                    <InfoCircleIcon />
                </span>
                <span>
                    Badges update on Discord&apos;s nightly pass (~1–3 days). Click any tier card below to start a session.
                </span>
            </div>

            {CATEGORIES.map((category, i) => (
                <TierStripSection
                    key={category.kind}
                    index={i + 1}
                    category={category}
                    progress={badges?.[category.kind]}
                    onSelectTier={(cat, tier, cur) => setSheet({ category: cat, tier, currentCount: cur })}
                >
                    {category.kind === "time" && (
                        <div className="vc-vencorfy-game-picker">
                            <div className="vc-vencorfy-game-input-row">
                                <input
                                    type="text"
                                    className="vc-vencorfy-game-input"
                                    placeholder="Optional: search a specific game for Game Time (leave blank to rotate fresh games)"
                                    value={pickedGame ? `${pickedGame.name} (${pickedGame.exe})` : gameSearch}
                                    onChange={e => {
                                        setPickedGame(null);
                                        setGameSearch(e.currentTarget.value);
                                    }}
                                />
                                {(pickedGame || gameSearch) && (
                                    <button
                                        type="button"
                                        className="vc-vencorfy-game-clear"
                                        onClick={() => {
                                            setPickedGame(null);
                                            setGameSearch("");
                                        }}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            {filteredGames.length > 0 && (
                                <div className="vc-vencorfy-game-dropdown">
                                    {filteredGames.map(g => (
                                        <button
                                            type="button"
                                            key={g.id}
                                            className="vc-vencorfy-game-option"
                                            onClick={() => {
                                                setPickedGame(g);
                                                setGameSearch(g.name);
                                            }}
                                        >
                                            <span>{g.name}</span>
                                            <span className="vc-vencorfy-game-exe">{g.exe}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </TierStripSection>
            ))}

            <div className="vc-vencorfy-footer">
                <div className="vc-vencorfy-stats">
                    Claimed: <strong>{stats.totalGamesClaimed.toLocaleString()}</strong> games ·{" "}
                    <strong>{Math.round(stats.totalHoursClaimed).toLocaleString()}h</strong> play ·{" "}
                    <strong>{Math.round(stats.totalStreamHoursClaimed * 10) / 10}h</strong> stream
                </div>
                {usedCount > 0 && (
                    <button
                        type="button"
                        className="vc-vencorfy-reset-btn"
                        onClick={() => void resetUsedGames()}
                        {...tooltipProps("Clear the list of already-rotated games")}
                    >
                        Reset Used ({usedCount})
                    </button>
                )}
            </div>

            {task && (
                <div
                    className={`vc-vencorfy-task-box ${
                        task.completed ? "success" : task.error ? "error" : ""
                    }`}
                >
                    <div className="vc-vencorfy-task-info">
                        <div className="vc-vencorfy-task-left">
                            <span className="vc-vencorfy-task-icon">
                                {task.running ? <SpinnerIcon /> : task.completed ? <CheckIcon /> : <CrossIcon />}
                            </span>
                            <span className="vc-vencorfy-task-text">{task.text}</span>
                        </div>
                        <div className="vc-vencorfy-task-right">
                            {task.running ? (
                                <>
                                    <button
                                        type="button"
                                        className="vc-vencorfy-reset-btn"
                                        onClick={() => setWidgetHidden(!hiddenWidget)}
                                        {...tooltipProps(hiddenWidget ? "Show Progress Widget" : "Hide Progress Widget")}
                                    >
                                        {hiddenWidget ? "Show Widget" : "Hide Widget"}
                                    </button>
                                    <button
                                        type="button"
                                        className="vc-vencorfy-cancel-btn"
                                        onClick={cancelForge}
                                        {...tooltipProps("Stop Session")}
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    className="vc-vencorfy-reset-btn"
                                    onClick={dismissTask}
                                    {...tooltipProps("Dismiss")}
                                >
                                    Dismiss
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="vc-vencorfy-progress-bar">
                        <div
                            className="vc-vencorfy-progress-fill"
                            style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }}
                        />
                    </div>
                </div>
            )}

            {sheet && (
                <div className="vc-vencorfy-sheet-backdrop" onClick={() => setSheet(null)}>
                    <div className="vc-vencorfy-sheet" onClick={e => e.stopPropagation()}>
                        <div className="vc-vencorfy-sheet-handle" />
                        <div className="vc-vencorfy-sheet-header">
                            <div className="vc-vencorfy-sheet-title-group">
                                <img className="vc-vencorfy-sheet-img" src={sheet.tier.icon} alt={sheet.tier.label} />
                                <div>
                                    <h3 className="vc-vencorfy-sheet-name">{sheet.tier.label}</h3>
                                    <span className="vc-vencorfy-sheet-cat">{sheet.category.title} Badge</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="vc-vencorfy-icon-btn"
                                onClick={() => setSheet(null)}
                                {...tooltipProps("Close")}
                            >
                                <CrossIcon />
                            </button>
                        </div>

                        <div className="vc-vencorfy-progression-card">
                            <div className="vc-vencorfy-progression-box">
                                <span className="vc-vencorfy-progression-tag">Current</span>
                                <span className="vc-vencorfy-progression-val">
                                    {sheet.category.unit(sheet.currentCount)}
                                </span>
                            </div>
                            <span style={{ color: "var(--bf-muted)" }}>→</span>
                            <div className="vc-vencorfy-progression-box target">
                                <span className="vc-vencorfy-progression-tag">Target Tier</span>
                                <span className="vc-vencorfy-progression-val">
                                    {sheet.category.unit(sheet.tier.threshold)}
                                </span>
                            </div>
                        </div>

                        <div className="vc-vencorfy-sheet-summary">
                            {sheet.category.kind === "variety" && (
                                <>
                                    Simulating <strong>{sheetDelta.toLocaleString()}</strong> unique games (
                                    {clamp(settings.store.varietyMinutes, 1, 30)} min session each) to reach{" "}
                                    <strong>{sheet.tier.label}</strong>.
                                </>
                            )}
                            {sheet.category.kind === "time" && (
                                <>
                                    Claiming <strong>~{sheetDelta.toLocaleString()} hrs</strong>{" "}
                                    {pickedGame
                                        ? `on ${pickedGame.name}`
                                        : `distributed across fresh games (${clamp(settings.store.hoursPerGame, 1, 24)}h per game)`}{" "}
                                    to reach <strong>{sheet.tier.label}</strong>.
                                </>
                            )}
                            {sheet.category.kind === "stream" && (
                                <>
                                    Claiming <strong>{sheetDelta.toLocaleString()} hrs</strong> at{" "}
                                    <strong>{clamp(settings.store.streamHoursPerMinute, 1, 500)}h</strong> every{" "}
                                    <strong>{clamp(settings.store.streamIntervalSeconds, 2, 60)}s</strong>{" "}
                                    {liveStatus.isLive
                                        ? `(attached to active stream · ${liveStatus.viewers} viewer${liveStatus.viewers === 1 ? "" : "s"})`
                                        : "(Tip: Go Live with a viewer in VC so Discord validates the stream session)"}
                                    .
                                </>
                            )}
                        </div>

                        <div className="vc-vencorfy-notice-box">
                            <span className="vc-vencorfy-sync-icon" style={{ color: "var(--bf-maxed)" }}>
                                <InfoCircleIcon />
                            </span>
                            <div>
                                <strong>Notice:</strong> Discord profile badges take approximately 1~3 days to update after session
                                completion. Keep Discord open until the progress bar finishes.
                            </div>
                        </div>

                        <div className="vc-vencorfy-sheet-actions">
                            <button
                                type="button"
                                className="vc-vencorfy-btn vc-vencorfy-btn-primary"
                                disabled={
                                    !pluginEnabled ||
                                    Boolean(task?.running) ||
                                    (sheet.category.kind === "stream" && !liveStatus.isLive)
                                }
                                onClick={handleConfirmSheet}
                            >
                                <span>
                                    {!pluginEnabled
                                        ? "Enable Vencorfy Plugin First"
                                        : task?.running
                                            ? "Session Already Running..."
                                            : sheet.category.kind === "stream" && !liveStatus.isLive
                                                ? "Share Screen in Voice Channel First"
                                                : "Start Session"}
                                </span>
                            </button>
                            <button
                                type="button"
                                className="vc-vencorfy-btn vc-vencorfy-btn-secondary"
                                onClick={() => setSheet(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export const Dashboard = ErrorBoundary.wrap(DashboardInner, { noop: false });

function VencorfyModal(props: RenderModalProps) {
    return (
        <Modal {...props} size="md" title="Vencorfy">
            <Dashboard />
        </Modal>
    );
}

export function openVencorfyModal() {
    openModal(props => <VencorfyModal {...props} />);
}
