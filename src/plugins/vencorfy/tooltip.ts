/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const TOOLTIP_ID = "vc-vencorfy-discord-tooltip";

let tooltipEl: HTMLDivElement | null = null;
let contentEl: HTMLDivElement | null = null;
let pointerEl: HTMLDivElement | null = null;
let currentTarget: HTMLElement | null = null;
let rafId: number | null = null;

function ensureTooltipDom() {
    if (tooltipEl && tooltipEl.isConnected && contentEl && pointerEl) {
        return { tooltipEl, contentEl, pointerEl };
    }

    tooltipEl?.remove();
    tooltipEl = document.createElement("div");
    tooltipEl.id = TOOLTIP_ID;
    tooltipEl.className = "vc-vencorfy-tooltip";

    contentEl = document.createElement("div");
    contentEl.className = "vc-vencorfy-tooltip-content";

    pointerEl = document.createElement("div");
    pointerEl.className = "vc-vencorfy-tooltip-pointer";

    tooltipEl.append(contentEl, pointerEl);
    document.body.appendChild(tooltipEl);

    return { tooltipEl, contentEl, pointerEl };
}

function positionTooltip(target: HTMLElement) {
    if (!tooltipEl || !pointerEl) return;
    if (!target.isConnected) {
        hideTooltip();
        return;
    }

    const rect = target.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
        hideTooltip();
        return;
    }

    const tipRect = tooltipEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const margin = 8;

    let left = centerX - tipRect.width / 2;
    left = Math.max(margin, Math.min(window.innerWidth - tipRect.width - margin, left));

    let top = rect.top - tipRect.height - 8;
    let placeBelow = false;
    if (top < margin) {
        top = rect.bottom + 8;
        placeBelow = true;
    }

    tooltipEl.classList.toggle("is-below", placeBelow);
    tooltipEl.style.left = `${Math.round(left)}px`;
    tooltipEl.style.top = `${Math.round(top)}px`;

    const pointerX = Math.max(10, Math.min(tipRect.width - 10, centerX - left));
    pointerEl.style.left = `${Math.round(pointerX)}px`;
}

export function showTooltip(target: HTMLElement, text: string) {
    if (!text || typeof document === "undefined") return;
    const dom = ensureTooltipDom();
    currentTarget = target;
    dom.contentEl.textContent = text;
    dom.tooltipEl.classList.add("is-visible");
    positionTooltip(target);

    if (rafId != null) cancelAnimationFrame(rafId);
    const checkConnected = () => {
        if (!currentTarget || !currentTarget.isConnected) {
            hideTooltip();
            return;
        }
        rafId = requestAnimationFrame(checkConnected);
    };
    rafId = requestAnimationFrame(checkConnected);
}

export function updateTooltipText(target: HTMLElement, text: string) {
    if (currentTarget !== target || !tooltipEl || !contentEl) return;
    if (contentEl.textContent !== text) {
        contentEl.textContent = text;
        positionTooltip(target);
    }
}

export function hideTooltip(target?: HTMLElement) {
    if (target && currentTarget && currentTarget !== target) return;
    currentTarget = null;
    if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    if (tooltipEl) {
        tooltipEl.classList.remove("is-visible");
    }
}

export function bindTooltip(element: HTMLElement, textOrGetter: string | (() => string)) {
    const getText = () => (typeof textOrGetter === "function" ? textOrGetter() : textOrGetter);

    element.addEventListener("mouseenter", () => {
        const text = getText();
        if (text) showTooltip(element, text);
    });
    element.addEventListener("mouseleave", () => hideTooltip(element));
    element.addEventListener("mousedown", () => hideTooltip(element));
}

export function tooltipProps(text: string) {
    return {
        onMouseEnter: (e: { currentTarget: HTMLElement; }) => showTooltip(e.currentTarget, text),
        onMouseLeave: (e: { currentTarget: HTMLElement; }) => hideTooltip(e.currentTarget),
        onMouseDown: (e: { currentTarget: HTMLElement; }) => hideTooltip(e.currentTarget)
    };
}
