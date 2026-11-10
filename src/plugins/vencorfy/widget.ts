/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { cancelForge, dismissTask, getTaskState, isWidgetHidden, subscribeTask, TaskState } from "./session";
import { settings } from "./settings";
import { CATEGORIES } from "./tiers";
import { bindTooltip, hideTooltip, updateTooltipText } from "./tooltip";
import { openVencorfyModal } from "./ui";

const WIDGET_ID = "vc-vencorfy-panel-widget";

const SPINNER_SVG = "<svg class=\"vc-vencorfy-spinning\" xmlns=\"http://www.w3.org/2000/svg\" width=\"10\" height=\"10\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\" stroke=\"currentColor\" strokeWidth=\"3.2\" stroke-width=\"3.2\" fill=\"none\" stroke-linecap=\"round\" stroke-dasharray=\"28 28\"/></svg>";
const CHECK_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"10\" height=\"10\" viewBox=\"0 0 32 32\"><path fill=\"currentColor\" d=\"M28.928 10.3a3.25 3.25 0 0 1-.137 4.595L13.94 28.89a3.25 3.25 0 0 1-4.557-.098l-6.264-6.435a3.25 3.25 0 0 1 4.658-4.534l4.033 4.143l12.525-11.802a3.25 3.25 0 0 1 4.594.136\"/></svg>";
const ERROR_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"9\" height=\"9\" viewBox=\"0 0 64 64\"><path fill=\"currentColor\" d=\"M62 10.571L53.429 2L32 23.429L10.571 2L2 10.571L23.429 32L2 53.429L10.571 62L32 40.571L53.429 62L62 53.429L40.571 32z\"/></svg>";

const OPEN_MODAL_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"3\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"1.5\"/></svg>";
const STOP_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\"><rect x=\"5\" y=\"5\" width=\"14\" height=\"14\" rx=\"2.5\" fill=\"currentColor\"/></svg>";
const CLOSE_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M18 6 6 18\"/><path d=\"m6 6 12 12\"/></svg>";

interface WidgetDom {
    root: HTMLDivElement;
    iconImg: HTMLImageElement;
    badgeEl: HTMLSpanElement;
    titleEl: HTMLSpanElement;
    pillEl: HTMLSpanElement;
    subEl: HTMLDivElement;
    stopBtn: HTMLButtonElement;
    closeBtn: HTMLButtonElement;
    fillEl: HTMLDivElement;
    lastBadgeMode: string;
}

let widgetDom: WidgetDom | null = null;
let unsubscribeTask: (() => void) | null = null;
let domObserver: MutationObserver | null = null;

function findPanelsContainer(): HTMLElement | null {
    const byClass = document.querySelector<HTMLElement>(
        'section[class^="panels_"], section[class*=" panels_"], div[class^="panels_"], div[class*=" panels_"]'
    );
    if (byClass) return byClass;

    const byAria = document.querySelector<HTMLElement>(
        'section[aria-label*="User"], section[aria-label*="user"]'
    );
    if (byAria) return byAria;

    const settingsBtn = document.querySelector<HTMLElement>(
        'button[aria-label="User Settings"], button[aria-label="Mute"], button[aria-label="Deafen"]'
    );
    return settingsBtn?.closest("section") ?? null;
}

function createWidgetDom(): WidgetDom {
    const root = document.createElement("div");
    root.id = WIDGET_ID;
    root.className = "vc-vencorfy-widget";

    const topRow = document.createElement("div");
    topRow.className = "vc-vencorfy-widget-top";

    const mainClick = document.createElement("div");
    mainClick.className = "vc-vencorfy-widget-main";
    bindTooltip(mainClick, "Open Vencorfy");
    mainClick.addEventListener("click", () => openVencorfyModal());

    const iconWrap = document.createElement("div");
    iconWrap.className = "vc-vencorfy-widget-icon-wrap";

    const iconImg = document.createElement("img");
    iconImg.className = "vc-vencorfy-widget-icon";
    iconImg.alt = "Badge";

    const badgeEl = document.createElement("span");
    badgeEl.className = "vc-vencorfy-widget-badge";

    iconWrap.append(iconImg, badgeEl);

    const infoCol = document.createElement("div");
    infoCol.className = "vc-vencorfy-widget-info";

    const titleRow = document.createElement("div");
    titleRow.className = "vc-vencorfy-widget-title-row";

    const titleEl = document.createElement("span");
    titleEl.className = "vc-vencorfy-widget-title";

    const pillEl = document.createElement("span");
    pillEl.className = "vc-vencorfy-widget-pill";

    titleRow.append(titleEl, pillEl);

    const subEl = document.createElement("div");
    subEl.className = "vc-vencorfy-widget-sub";

    infoCol.append(titleRow, subEl);
    mainClick.append(iconWrap, infoCol);

    const actions = document.createElement("div");
    actions.className = "vc-vencorfy-widget-actions";

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "vc-vencorfy-widget-btn";
    bindTooltip(openBtn, "Open Vencorfy");
    openBtn.innerHTML = OPEN_MODAL_SVG;
    openBtn.addEventListener("click", e => {
        e.stopPropagation();
        openVencorfyModal();
    });

    const stopBtn = document.createElement("button");
    stopBtn.type = "button";
    stopBtn.className = "vc-vencorfy-widget-btn vc-vencorfy-widget-btn-stop";
    bindTooltip(stopBtn, "Stop Session");
    stopBtn.innerHTML = STOP_SVG;
    stopBtn.addEventListener("click", e => {
        e.stopPropagation();
        cancelForge();
    });

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "vc-vencorfy-widget-btn vc-vencorfy-widget-btn-close";
    bindTooltip(closeBtn, () => (getTaskState()?.running ? "Hide Widget" : "Dismiss"));
    closeBtn.innerHTML = CLOSE_SVG;
    closeBtn.addEventListener("click", e => {
        e.stopPropagation();
        dismissTask();
    });

    actions.append(openBtn, stopBtn, closeBtn);
    topRow.append(mainClick, actions);

    const track = document.createElement("div");
    track.className = "vc-vencorfy-widget-track";

    const fillEl = document.createElement("div");
    fillEl.className = "vc-vencorfy-widget-fill";
    track.appendChild(fillEl);

    root.append(topRow, track);

    return {
        root,
        iconImg,
        badgeEl,
        titleEl,
        pillEl,
        subEl,
        stopBtn,
        closeBtn,
        fillEl,
        lastBadgeMode: ""
    };
}

function updateWidgetDom(dom: WidgetDom, task: TaskState) {
    const stateClass = task.completed ? " is-completed" : task.error ? " is-error" : " is-running";
    dom.root.className = `vc-vencorfy-widget${stateClass}`;

    const fallbackIcon = CATEGORIES[0].tiers[CATEGORIES[0].tiers.length - 1].icon;
    const desiredIcon = task.tierIcon || fallbackIcon;
    if (dom.iconImg.getAttribute("src") !== desiredIcon) {
        dom.iconImg.setAttribute("src", desiredIcon);
    }

    const badgeMode = task.running ? "running" : task.completed ? "completed" : "error";
    if (dom.lastBadgeMode !== badgeMode) {
        dom.lastBadgeMode = badgeMode;
        dom.badgeEl.className = `vc-vencorfy-widget-badge ${badgeMode}`;
        dom.badgeEl.innerHTML = badgeMode === "running"
            ? SPINNER_SVG
            : badgeMode === "completed"
                ? CHECK_SVG
                : ERROR_SVG;
    }

    const headerTitle = task.tierLabel
        ? `${task.tierLabel} · ${task.categoryTitle || "Vencorfy"}`
        : task.categoryTitle || "Vencorfy";
    if (dom.titleEl.textContent !== headerTitle) {
        dom.titleEl.textContent = headerTitle;
    }

    const pct = Math.min(100, Math.max(0, Math.round(task.progress)));
    const pillText = task.completed
        ? "COMPLETED"
        : task.error
            ? "STOPPED"
            : `${pct}%`;
    const pillClass = `vc-vencorfy-widget-pill ${
        task.completed ? "completed" : task.error ? "error" : "running"
    }`;
    if (dom.pillEl.className !== pillClass) dom.pillEl.className = pillClass;
    if (dom.pillEl.textContent !== pillText) dom.pillEl.textContent = pillText;

    const cleanSub = task.text.replace(/^(Game Variety|Game Time|Streaming[^:]*):\s*/i, "");
    if (dom.subEl.textContent !== cleanSub) {
        dom.subEl.textContent = cleanSub;
    }

    dom.stopBtn.style.display = task.running ? "inline-flex" : "none";
    updateTooltipText(dom.closeBtn, task.running ? "Hide Widget" : "Dismiss");

    dom.fillEl.style.width = `${pct}%`;
}

export function syncProgressWidget() {
    const task = getTaskState();
    const shouldShow = Boolean(task) && !isWidgetHidden() && settings.store.showProgressWidget !== false;

    if (!shouldShow || !task) {
        if (widgetDom?.root.isConnected) {
            hideTooltip();
            widgetDom.root.remove();
        }
        return;
    }

    const panels = findPanelsContainer();
    if (!panels) return;

    if (!widgetDom) {
        widgetDom = createWidgetDom();
    }

    updateWidgetDom(widgetDom, task);

    if (panels.firstElementChild !== widgetDom.root) {
        panels.prepend(widgetDom.root);
    }
}

export function startProgressWidget() {
    stopProgressWidget();
    unsubscribeTask = subscribeTask(syncProgressWidget);

    if (typeof document !== "undefined" && document.body) {
        domObserver = new MutationObserver(() => {
            const task = getTaskState();
            if (!task || isWidgetHidden() || settings.store.showProgressWidget === false) return;
            if (!widgetDom?.root.isConnected) {
                syncProgressWidget();
            }
        });
        domObserver.observe(document.body, { childList: true, subtree: true });
    }

    syncProgressWidget();
}

export function stopProgressWidget() {
    hideTooltip();
    unsubscribeTask?.();
    unsubscribeTask = null;
    domObserver?.disconnect();
    domObserver = null;
    if (widgetDom?.root.isConnected) {
        widgetDom.root.remove();
    }
    widgetDom = null;
}
