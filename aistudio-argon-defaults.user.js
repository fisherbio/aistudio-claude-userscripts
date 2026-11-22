// ==UserScript==
// @name         Google AI Studio - Gemini 4 默认模型与思考强度自动切换
// @namespace    https://tampermonkey.net/
// @version      4.1.0
// @description  打开 Google AI Studio 时，自动切换到所选 Gemini 4 模型（Neon / Hydrogen / Carbon / Argon）与对应思考强度，并可自动折叠右侧 Run settings 侧边栏；完整适配桌面与安卓手机端布局及触控交互
// @author       Antigravity
// @match        https://aistudio.google.com/*
// @icon         https://www.gstatic.com/lamda/images/favicon_v1_150160cddff7f2942da3.svg
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @run-at       document-start
// @noframes
// @license      MIT
// @homepageURL  https://github.com/fisherbio/aistudio-claude-userscripts
// @supportURL   https://github.com/fisherbio/aistudio-claude-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/fisherbio/aistudio-claude-userscripts/main/aistudio-argon-defaults.user.js
// @updateURL    https://raw.githubusercontent.com/fisherbio/aistudio-claude-userscripts/main/aistudio-argon-defaults.user.js
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'aistudio_gemini4_preset_v1';
    const DEBUG = true;

    const THINKING_META = {
        low: {
            key: 'low',
            label: 'Low',
            shortLabel: 'Low',
            tinyLabel: 'L',
            match: /^(low|低)$/i
        },
        medium: {
            key: 'medium',
            label: 'Medium',
            shortLabel: 'Med',
            tinyLabel: 'M',
            match: /^(medium|中|中等)$/i
        },
        high: {
            key: 'high',
            label: 'High',
            shortLabel: 'High',
            tinyLabel: 'H',
            match: /^(high|高)$/i
        },
        extra_high: {
            key: 'extra_high',
            label: 'Extra High',
            shortLabel: 'XHigh',
            tinyLabel: 'XH',
            match: /^(extra\s*high|xhigh|极高|超高)$/i
        }
    };

    const GEMINI4_MODELS = [
        {
            id: 'gemini-4-neon',
            name: 'Gemini 4 Neon',
            shortName: 'Neon',
            symbol: 'Ne',
            atomicNumber: '10',
            badge: 'New',
            thinkingLevels: ['low', 'medium', 'high', 'extra_high'],
            defaultThinking: 'high'
        },
        {
            id: 'gemini-4-hydrogen',
            name: 'Gemini 4 Hydrogen',
            shortName: 'Hydrogen',
            symbol: 'H',
            atomicNumber: '1',
            badge: 'New',
            thinkingLevels: ['low', 'medium', 'high', 'extra_high'],
            defaultThinking: 'high'
        },
        {
            id: 'gemini-4-carbon',
            name: 'Gemini 4 Carbon',
            shortName: 'Carbon',
            symbol: 'C',
            atomicNumber: '6',
            badge: 'Paid',
            thinkingLevels: ['low', 'medium', 'high'],
            defaultThinking: 'high'
        },
        {
            id: 'gemini-4-argon',
            name: 'Gemini 4 Argon',
            shortName: 'Argon',
            symbol: 'Ar',
            atomicNumber: '18',
            badge: '',
            thinkingLevels: ['low', 'medium', 'high'],
            defaultThinking: 'high'
        }
    ];

    const DEFAULT_MODEL_ID = 'gemini-4-argon';

    function getModelConfig(modelId) {
        return GEMINI4_MODELS.find(m => m.id === modelId) || GEMINI4_MODELS.find(m => m.id === DEFAULT_MODEL_ID);
    }

    function normalizeThinkingForModel(model, levelKey) {
        if (levelKey && model.thinkingLevels.includes(levelKey)) return levelKey;
        if (levelKey === 'extra_high' && model.thinkingLevels.includes('high')) return 'high';
        return model.defaultThinking;
    }

    function createDefaultSettings() {
        const thinkingByModel = {};
        for (const m of GEMINI4_MODELS) {
            thinkingByModel[m.id] = m.defaultThinking;
        }
        return {
            modelId: DEFAULT_MODEL_ID,
            thinkingByModel,
            autoSwitch: true,
            autoCollapse: true
        };
    }

    function sanitizeSettings(raw) {
        const defaults = createDefaultSettings();
        if (!raw || typeof raw !== 'object') return defaults;
        const model = getModelConfig(raw.modelId);
        const thinkingByModel = { ...defaults.thinkingByModel };
        if (raw.thinkingByModel && typeof raw.thinkingByModel === 'object') {
            for (const m of GEMINI4_MODELS) {
                if (typeof raw.thinkingByModel[m.id] === 'string') {
                    thinkingByModel[m.id] = normalizeThinkingForModel(m, raw.thinkingByModel[m.id]);
                }
            }
        }
        return {
            modelId: model.id,
            thinkingByModel,
            autoSwitch: raw.autoSwitch !== false,
            autoCollapse: raw.autoCollapse !== false
        };
    }

    function loadSettings() {
        try {
            if (typeof GM_getValue === 'function') {
                return sanitizeSettings(GM_getValue(STORAGE_KEY, null));
            }
            const raw = localStorage.getItem(STORAGE_KEY);
            return sanitizeSettings(raw ? JSON.parse(raw) : null);
        } catch (_) {
            return createDefaultSettings();
        }
    }

    function saveSettings(next) {
        settings = sanitizeSettings(next);
        try {
            if (typeof GM_setValue === 'function') {
                GM_setValue(STORAGE_KEY, settings);
            } else {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            }
        } catch (err) {
            console.warn('[AIStudio-G4-Helper] 保存配置失败:', err);
        }
        refreshMenuCommands();
        updateToolbarTrigger();
        renderPopoverContent();
    }

    let settings = loadSettings();

    function getActiveModel() {
        return getModelConfig(settings.modelId);
    }

    function getActiveThinkingKey(model = getActiveModel()) {
        return normalizeThinkingForModel(model, settings.thinkingByModel?.[model.id]);
    }

    function getActiveThinkingMeta(model = getActiveModel()) {
        return THINKING_META[getActiveThinkingKey(model)] || THINKING_META.high;
    }

    function formatPresetSummary(mode = false) {
        const model = getActiveModel();
        const thinking = getActiveThinkingMeta(model);
        if (mode === 'compact') {
            return `${model.symbol}·${thinking.tinyLabel}`;
        }
        return mode
            ? `${model.shortName} · ${thinking.shortLabel}`
            : `${model.name} · ${thinking.label}`;
    }

    // ==================== 首屏防闪烁遮罩（document-start） ====================
    const onPromptPage = () => /^\/prompts(?:\/|$)/.test(location.pathname);
    const earlyState = {
        readyState: document.readyState,
        panelAlreadyPresent: !!document.querySelector('ms-run-settings')
    };
    let maskOwner = 0;
    let maskWanted = settings.autoSwitch && onPromptPage();
    let maskStyle;

    function setStartupMask(owner, wanted) {
        maskOwner = owner;
        maskWanted = wanted;
        const root = document.documentElement;
        if (!root) return;
        if (wanted) {
            if (!maskStyle) {
                maskStyle = document.createElement('style');
                maskStyle.id = 'aistudio-g4-startup-style';
                maskStyle.textContent = String.raw`
                    html[data-g4-initializing] ms-right-side-panel {
                        position: fixed !important;
                        top: 0 !important;
                        right: 0 !important;
                        opacity: 0 !important;
                        pointer-events: none !important;
                    }
                    html[data-g4-initializing] :is(
                        ms-run-settings, ms-run-settings *,
                        .cdk-overlay-pane:has(ms-model-carousel[data-test-id="model-carousel-in-selector"]),
                        .cdk-overlay-pane:has(ms-model-carousel[data-test-id="model-carousel-in-selector"]) *,
                        [role="listbox"][aria-label="Thinking Level"],
                        [role="listbox"][aria-label="Thinking Level"] *,
                        .cdk-overlay-backdrop,
                        .mat-drawer-backdrop,
                        .overlay-backdrop
                    ) {
                        opacity: 0 !important;
                        pointer-events: none !important;
                        animation: none !important;
                        transition: none !important;
                    }
                `;
            }
            if (!maskStyle.isConnected) {
                root.appendChild(maskStyle);
            }
            root.setAttribute('data-g4-initializing', '');
        } else {
            root.removeAttribute('data-g4-initializing');
        }
    }

    function releaseStartupMask(owner) {
        if (owner === maskOwner) setStartupMask(owner, false);
    }

    setStartupMask(0, maskWanted);
    if (!document.documentElement) {
        const rootObserver = new MutationObserver(() => {
            if (!document.documentElement) return;
            rootObserver.disconnect();
            setStartupMask(maskOwner, maskWanted);
        });
        rootObserver.observe(document, { childList: true });
    }

    // ==================== 通用工具 ====================
    function log(...args) {
        if (DEBUG) {
            console.log('%c[AIStudio-G4-Helper]%c', 'color:#c96442;font-weight:bold;', 'color:inherit;', ...args);
        }
    }

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const visible = (el) => !!el && el.isConnected && el.getClientRects().length > 0 &&
        getComputedStyle(el).visibility !== 'hidden';
    const text = (el) => (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
    const find = (selector, root = document) => [...root.querySelectorAll(selector)].find(visible);

    let toastTimer = null;
    function showToast(message, isSuccess = true) {
        const host = document.body || document.documentElement;
        if (!host) return;
        const id = 'aistudio-g4-toast';
        let toast = document.getElementById(id);
        if (!toast) {
            toast = document.createElement('div');
            toast.id = id;
            Object.assign(toast.style, {
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: '2147483646',
                padding: '10px 16px',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: '500',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                boxShadow: '0 8px 28px rgba(0,0,0,0.26)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                maxWidth: 'min(380px, calc(100vw - 24px))',
                boxSizing: 'border-box',
                transition: 'opacity 0.22s ease, transform 0.22s ease',
                opacity: '0',
                transform: 'translateY(10px)',
                pointerEvents: 'none',
                backdropFilter: 'blur(12px)'
            });
            host.appendChild(toast);
        }
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            toast.style.left = '50%';
            toast.style.right = 'auto';
            toast.style.bottom = 'calc(86px + env(safe-area-inset-bottom, 0px))';
            toast.style.transform = 'translateX(-50%) translateY(10px)';
        } else {
            toast.style.left = 'auto';
            toast.style.right = '24px';
            toast.style.bottom = '24px';
            toast.style.transform = 'translateY(10px)';
        }
        toast.textContent = (isSuccess ? '✓ ' : 'ℹ ') + message;
        toast.style.backgroundColor = isSuccess ? 'rgba(28, 27, 24, 0.94)' : 'rgba(122, 34, 34, 0.95)';
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = isMobile ? 'translateX(-50%) translateY(0)' : 'translateY(0)';
        });
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = isMobile ? 'translateX(-50%) translateY(10px)' : 'translateY(10px)';
        }, 3400);
    }

    // ==================== AI Studio 控件检测与操作 ====================
    const closeButton = () => find('button[aria-label="Close run settings panel"]');
    const isPanelOpen = () => !!closeButton();

    const NON_MODEL_BTN_RE = /^(get code|reset default settings|close run settings panel|system instructions|expand or collapse|edit\b)/i;
    const MODEL_ID_HINT_RE = /(?:gemini|gemma|imagen|veo|learnlm|antigravity|deep-research|nano)[\w.-]*/i;

    function modelButton() {
        const buttons = [...document.querySelectorAll('ms-run-settings button')].filter(visible);
        const geminiBtn = buttons.find(b => /gemini-[\w.-]+/i.test(text(b)));
        if (geminiBtn) return geminiBtn;
        const otherModelBtn = buttons.find(b => {
            const label = (b.getAttribute('aria-label') || text(b)).trim();
            if (NON_MODEL_BTN_RE.test(label)) return false;
            return MODEL_ID_HINT_RE.test(text(b));
        });
        return otherModelBtn || null;
    }

    function matchesModelId(str, modelId) {
        const re = new RegExp(`(?:^|[^\\w.-])${escapeRegExp(modelId)}(?![\\w.-])`, 'i');
        return re.test(str || '');
    }

    function isTargetModel(model) {
        return matchesModelId(text(modelButton()), model.id);
    }

    const thinkingControl = () => find('ms-run-settings [role="combobox"][aria-label="Thinking Level"]');

    function thinkingValue() {
        const el = thinkingControl();
        return text(el?.querySelector('.mat-mdc-select-value-text, .mat-mdc-select-value, .mat-mdc-select-trigger') || el)
            .replace(/expand_more/g, '')
            .trim();
    }

    function isTargetThinking(levelKey) {
        const meta = THINKING_META[levelKey];
        if (!meta) return false;
        return meta.match.test(thinkingValue());
    }

    let generation = 0;
    let lastStatus = '等待页面就绪';
    const cancelled = () => new DOMException('页面已切换', 'AbortError');
    const check = (token) => { if (token !== generation) throw cancelled(); };

    async function waitFor(test, token, label, timeout = 12000) {
        const end = Date.now() + timeout;
        while (Date.now() < end) {
            check(token);
            const result = test();
            if (result) return result;
            await sleep(120);
        }
        throw new Error(label);
    }

    async function openPanel(token = generation) {
        if (isPanelOpen()) return;
        const button = await waitFor(
            () => find('button[aria-label="Toggle run settings panel"]'),
            token,
            '找不到 Run settings 打开按钮'
        );
        button.click();
        await waitFor(isPanelOpen, token, 'Run settings 未能展开');
    }

    function findCarousel() {
        return find('ms-model-carousel[data-test-id="model-carousel-in-selector"]') || find('ms-model-carousel');
    }

    function findModelCard(model, carousel) {
        const byId = document.getElementById(`model-carousel-row-models/${model.id}`);
        if (visible(byId)) return byId;
        if (!carousel) return null;
        return [...carousel.querySelectorAll('button')].find(btn => {
            if (!visible(btn)) return false;
            const t = text(btn);
            if (!matchesModelId(t, model.id)) return false;
            const aria = (btn.getAttribute('aria-label') || '').trim();
            if (/^(star|unstar|copy)/i.test(aria) || /^(star|unstar|copy)/i.test(t)) return false;
            return true;
        }) || null;
    }

    function clearCarouselSearch(carousel) {
        if (!carousel) return false;
        const input = [...carousel.querySelectorAll('input')].find(visible);
        if (!input || !input.value) return false;
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }

    function clickCarouselTab(carousel, tabPattern) {
        if (!carousel) return false;
        const tabBtn = [...carousel.querySelectorAll('button')].find(
            btn => visible(btn) && tabPattern.test(text(btn))
        );
        if (!tabBtn) return false;
        tabBtn.click();
        return true;
    }

    async function setModel(model, token) {
        const button = await waitFor(modelButton, token, '模型选择器尚未加载');
        if (isTargetModel(model)) return;

        button.click();
        const carousel = await waitFor(findCarousel, token, '模型选择弹窗未能打开');

        // 若目标卡片未立即出现（例如上次停留在 Images / Starred / 元素周期表标签页或搜索框有过滤词），切回 Gemini / All 列表。
        let option = findModelCard(model, carousel);
        if (!option) {
            await sleep(220);
            check(token);
            option = findModelCard(model, carousel);
        }
        if (!option) {
            clearCarouselSearch(carousel);
            if (clickCarouselTab(carousel, /^gemini$/i)) {
                await sleep(260);
                check(token);
                option = findModelCard(model, carousel);
            }
        }
        if (!option) {
            if (clickCarouselTab(carousel, /^all$/i)) {
                await sleep(260);
                check(token);
                option = findModelCard(model, carousel);
            }
        }
        if (!option) {
            option = await waitFor(
                () => findModelCard(model, findCarousel()),
                token,
                `模型列表中找不到 ${model.name}`
            );
        }

        option.scrollIntoView({ block: 'nearest' });
        option.click();

        await waitFor(
            () => isTargetModel(model) && !findCarousel(),
            token,
            `${model.name} 未实际选中`
        );
        // 留出极短帧间隔，确保切换模型后 Thinking Level 控件完成重渲染。
        await sleep(180);
        check(token);
    }

    async function setThinkingLevel(levelKey, model, token) {
        const meta = THINKING_META[levelKey];
        if (!meta) throw new Error(`未知思考强度：${levelKey}`);

        const select = await waitFor(thinkingControl, token, `${model.shortName} 页面中找不到 Thinking Level 控件`);
        if (isTargetThinking(levelKey)) return;

        if (select.getAttribute('aria-expanded') !== 'true') {
            select.click();
        }

        const option = await waitFor(() => {
            const current = thinkingControl();
            const list = (current?.getAttribute('aria-controls') && document.getElementById(current.getAttribute('aria-controls')))
                || find('[role="listbox"][aria-label="Thinking Level"]');
            return list && [...list.querySelectorAll('mat-option, [role="option"]')]
                .find(el => visible(el) && meta.match.test(text(el)));
        }, token, `${model.shortName} 的 Thinking Level 列表中找不到 ${meta.label}`);

        option.scrollIntoView({ block: 'nearest' });
        option.click();

        await waitFor(
            () => isTargetThinking(levelKey) && thinkingControl()?.getAttribute('aria-expanded') !== 'true',
            token,
            `${meta.label} 未实际生效`
        );
    }

    async function closePanel(token = generation) {
        const button = closeButton();
        if (!button) return;
        button.click();
        await waitFor(() => !isPanelOpen(), token, 'Run settings 未能折叠');
        // 等离场动画销毁或彻底隐藏面板后再解开遮罩，兼容移动端抽屉驻留 DOM 场景
        await waitFor(() => {
            const rs = document.querySelector('ms-run-settings');
            return !rs || !visible(rs);
        }, token, 'Run settings 离场尚未完成');
    }

    async function executeFlow(token, { manual = false } = {}) {
        if (!onPromptPage()) {
            releaseStartupMask(token);
            return;
        }
        if (!manual && !settings.autoSwitch) {
            releaseStartupMask(token);
            return;
        }

        const targetModel = getActiveModel();
        const targetThinkingKey = getActiveThinkingKey(targetModel);
        const targetThinking = THINKING_META[targetThinkingKey];
        const summary = `${targetModel.name} · ${targetThinking.label}`;

        lastStatus = `正在切换：${summary}`;
        updatePopoverStatus();

        try {
            await waitFor(
                () => isPanelOpen() || find('button[aria-label="Toggle run settings panel"]'),
                token,
                '页面加载超时，请从油猴菜单或顶栏重试',
                45000
            );
            await openPanel(token);
            const rsEl = document.querySelector('ms-run-settings');
            log('开始执行配置', JSON.stringify({
                targetModel: targetModel.id,
                targetThinking: targetThinking.label,
                autoCollapse: settings.autoCollapse,
                ...earlyState,
                masked: document.documentElement.hasAttribute('data-g4-initializing') &&
                    !!rsEl && getComputedStyle(rsEl).opacity === '0'
            }));

            await setModel(targetModel, token);
            await setThinkingLevel(targetThinkingKey, targetModel, token);

            // 等待框架回写稳定后再确认成功。
            let since = Date.now();
            await waitFor(() => {
                if (!isTargetModel(targetModel) || !isTargetThinking(targetThinkingKey)) {
                    since = Date.now();
                    return false;
                }
                return Date.now() - since >= 600;
            }, token, `${summary} 未能保持生效`);

            if (settings.autoCollapse) {
                await closePanel(token);
            }
            check(token);

            lastStatus = settings.autoCollapse
                ? `已确认 ${summary}，侧栏已折叠`
                : `已确认 ${summary}`;
            log('✔', lastStatus);
            updatePopoverStatus();
            if (manual) {
                showToast(lastStatus, true);
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            lastStatus = `配置未完成：${error.message}`;
            console.warn('[AIStudio-G4-Helper]', lastStatus);
            updatePopoverStatus();
            showToast(`${lastStatus}；可点击重试`, false);
        } finally {
            releaseStartupMask(token);
        }
    }

    let timer;
    function schedule({ manual = false } = {}) {
        const token = ++generation;
        clearTimeout(timer);
        const shouldRun = onPromptPage() && (manual || settings.autoSwitch);
        setStartupMask(token, shouldRun);
        if (!shouldRun) return;
        timer = setTimeout(() => executeFlow(token, { manual }), manual ? 30 : 350);
    }

    // ==================== 优雅内嵌配置面板（无 innerHTML，兼容 Trusted Types） ====================
    let isPopoverOpen = false;
    let statusEl = null;

    function injectUiStyles() {
        const host = document.head || document.documentElement;
        if (!host || document.getElementById('aistudio-g4-ui-style')) return;
        const style = document.createElement('style');
        style.id = 'aistudio-g4-ui-style';
        style.textContent = String.raw`
            #aistudio-g4-trigger {
                --g4-fg: var(--cs-muted, #5f6368);
                --g4-fg-strong: var(--cs-text, #1f1f1f);
                --g4-bg: transparent;
                --g4-bg-hover: var(--cs-soft, rgba(0, 0, 0, 0.06));
                --g4-border: var(--cs-border, rgba(120, 113, 102, 0.24));
                --g4-accent: var(--cs-accent, #1a73e8);

                appearance: none !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 6px !important;
                height: 30px !important;
                padding: 0 10px !important;
                margin: 0 4px !important;
                border-radius: 9px !important;
                border: 1px solid var(--g4-border) !important;
                background: var(--g4-bg) !important;
                color: var(--g4-fg) !important;
                font-family: var(--cs-ui, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif) !important;
                font-size: 12px !important;
                font-weight: 500 !important;
                line-height: 1 !important;
                letter-spacing: 0.01em !important;
                white-space: nowrap !important;
                cursor: pointer !important;
                user-select: none !important;
                box-shadow: none !important;
                vertical-align: middle !important;
                transition: background-color 0.16s ease, color 0.16s ease, border-color 0.16s ease !important;
            }
            html[data-claude-studio] #aistudio-g4-trigger {
                --g4-accent: var(--cs-accent, #c96442);
            }
            html[data-cs-theme="dark"] #aistudio-g4-trigger,
            body.dark-theme #aistudio-g4-trigger,
            html.dark-theme #aistudio-g4-trigger {
                --g4-fg: var(--cs-muted, #b5aea1);
                --g4-fg-strong: var(--cs-text, #f3efe6);
                --g4-bg-hover: var(--cs-soft, rgba(255, 255, 255, 0.08));
                --g4-border: rgba(255, 255, 255, 0.14);
            }
            #aistudio-g4-trigger:hover,
            #aistudio-g4-trigger[aria-expanded="true"] {
                background: var(--g4-bg-hover) !important;
                color: var(--g4-fg-strong) !important;
                border-color: color-mix(in srgb, var(--g4-accent) 45%, var(--g4-border)) !important;
            }
            #aistudio-g4-trigger .g4-dot {
                width: 6px !important;
                height: 6px !important;
                border-radius: 50% !important;
                background: var(--g4-accent) !important;
                flex: 0 0 auto !important;
            }
            #aistudio-g4-trigger[data-paused="1"] .g4-dot {
                background: #9ca3af !important;
            }
            #aistudio-g4-trigger .g4-chev {
                font-size: 10px !important;
                opacity: 0.65 !important;
                margin-left: -1px !important;
            }

            #aistudio-g4-popover[hidden] {
                display: none !important;
            }
            #aistudio-g4-popover {
                --g4-panel-bg: rgba(247, 245, 239, 0.98);
                --g4-card-bg: rgba(255, 255, 255, 0.68);
                --g4-card-hover: rgba(255, 255, 255, 0.94);
                --g4-panel-border: #d8d3c5;
                --g4-divider: #e5dfd2;
                --g4-text: #1c1b18;
                --g4-muted: #6f675d;
                --g4-accent: #1a73e8;
                --g4-accent-soft: rgba(26, 115, 232, 0.11);
                --g4-shadow: 0 22px 54px -14px rgba(32, 26, 18, 0.22), 0 4px 16px rgba(0, 0, 0, 0.06);

                position: fixed !important;
                top: 58px;
                right: 16px;
                width: min(358px, calc(100vw - 24px)) !important;
                box-sizing: border-box !important;
                z-index: 2147483645 !important;
                border-radius: 14px !important;
                border: 1px solid var(--g4-panel-border) !important;
                background: var(--g4-panel-bg) !important;
                color: var(--g4-text) !important;
                box-shadow: var(--g4-shadow) !important;
                backdrop-filter: blur(22px) saturate(150%) !important;
                -webkit-backdrop-filter: blur(22px) saturate(150%) !important;
                font-family: var(--cs-ui, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif) !important;
                max-height: calc(100dvh - 76px - env(safe-area-inset-bottom, 0px)) !important;
                overflow-x: hidden !important;
                overflow-y: auto !important;
                -webkit-overflow-scrolling: touch !important;
                overscroll-behavior: contain !important;
                text-align: left !important;
            }
            html[data-claude-studio] #aistudio-g4-popover {
                --g4-accent: var(--cs-accent, #c96442);
                --g4-accent-soft: rgba(201, 100, 66, 0.12);
            }
            html[data-cs-theme="dark"] #aistudio-g4-popover,
            body.dark-theme #aistudio-g4-popover,
            html.dark-theme #aistudio-g4-popover {
                --g4-panel-bg: rgba(25, 24, 21, 0.98);
                --g4-card-bg: rgba(255, 255, 255, 0.04);
                --g4-card-hover: rgba(255, 255, 255, 0.08);
                --g4-panel-border: rgba(255, 255, 255, 0.1);
                --g4-divider: rgba(255, 255, 255, 0.07);
                --g4-text: #f3efe6;
                --g4-muted: #a39b8c;
                --g4-accent-soft: rgba(201, 100, 66, 0.18);
                --g4-shadow: 0 30px 72px -20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.07);
            }
            html:not([data-claude-studio]) body.dark-theme #aistudio-g4-popover,
            html.dark-theme:not([data-claude-studio]) #aistudio-g4-popover {
                --g4-accent: #8ab4f8;
                --g4-accent-soft: rgba(138, 180, 248, 0.16);
            }

            .g4-head {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                padding: 12px 14px 10px !important;
                border-bottom: 1px solid var(--g4-divider) !important;
            }
            .g4-title {
                display: flex !important;
                align-items: center !important;
                gap: 7px !important;
                font-size: 13.5px !important;
                font-weight: 700 !important;
                color: var(--g4-text) !important;
                margin: 0 !important;
            }
            .g4-title-dot {
                width: 7px !important;
                height: 7px !important;
                border-radius: 50% !important;
                background: var(--g4-accent) !important;
            }
            .g4-close {
                width: 26px !important;
                height: 26px !important;
                border-radius: 8px !important;
                border: 1px solid transparent !important;
                background: transparent !important;
                color: var(--g4-muted) !important;
                font-size: 16px !important;
                line-height: 1 !important;
                display: grid !important;
                place-items: center !important;
                cursor: pointer !important;
                padding: 0 !important;
            }
            .g4-close:hover {
                background: var(--g4-card-hover) !important;
                color: var(--g4-text) !important;
            }

            .g4-body {
                padding: 12px 14px 13px !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 12px !important;
            }
            .g4-section-head {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                margin-bottom: 7px !important;
            }
            .g4-label {
                font-size: 11.5px !important;
                font-weight: 600 !important;
                color: var(--g4-muted) !important;
                letter-spacing: 0.02em !important;
            }
            .g4-subhint {
                font-size: 11px !important;
                color: var(--g4-muted) !important;
                opacity: 0.85 !important;
            }

            .g4-model-grid {
                display: grid !important;
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                gap: 8px !important;
            }
            .g4-model-card {
                appearance: none !important;
                position: relative !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                padding: 9px 10px !important;
                border-radius: 11px !important;
                border: 1px solid var(--g4-divider) !important;
                background: var(--g4-card-bg) !important;
                color: var(--g4-text) !important;
                text-align: left !important;
                cursor: pointer !important;
                overflow: hidden !important;
                transition: border-color 0.14s ease, background-color 0.14s ease, transform 0.12s ease !important;
            }
            .g4-model-card:hover {
                background: var(--g4-card-hover) !important;
                border-color: color-mix(in srgb, var(--g4-accent) 45%, var(--g4-divider)) !important;
            }
            .g4-model-card[data-active="1"] {
                border-color: var(--g4-accent) !important;
                background: var(--g4-accent-soft) !important;
            }
            .g4-elem-box {
                width: 30px !important;
                height: 30px !important;
                border-radius: 8px !important;
                border: 1px solid var(--g4-divider) !important;
                background: var(--g4-panel-bg) !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                flex: 0 0 auto !important;
                line-height: 1 !important;
            }
            .g4-model-card[data-active="1"] .g4-elem-box {
                border-color: color-mix(in srgb, var(--g4-accent) 55%, transparent) !important;
                color: var(--g4-accent) !important;
            }
            .g4-elem-num {
                font-size: 8.5px !important;
                opacity: 0.65 !important;
                margin-bottom: 1px !important;
            }
            .g4-elem-sym {
                font-size: 13px !important;
                font-weight: 700 !important;
            }
            .g4-model-meta {
                min-width: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 2px !important;
            }
            .g4-model-name-row {
                display: flex !important;
                align-items: center !important;
                gap: 4px !important;
            }
            .g4-model-name {
                font-size: 12.5px !important;
                font-weight: 600 !important;
                color: var(--g4-text) !important;
            }
            .g4-badge {
                font-size: 9.5px !important;
                font-weight: 600 !important;
                padding: 1px 5px !important;
                border-radius: 999px !important;
                background: var(--g4-divider) !important;
                color: var(--g4-muted) !important;
                line-height: 1.3 !important;
            }
            .g4-badge[data-kind="Paid"] {
                background: rgba(194, 120, 3, 0.15) !important;
                color: #b45309 !important;
            }
            html[data-cs-theme="dark"] .g4-badge[data-kind="Paid"],
            body.dark-theme .g4-badge[data-kind="Paid"] {
                color: #fbbf24 !important;
            }
            .g4-model-sub {
                font-size: 10.5px !important;
                color: var(--g4-muted) !important;
            }

            .g4-thinking-row {
                display: grid !important;
                gap: 6px !important;
            }
            .g4-thinking-pill {
                appearance: none !important;
                height: 32px !important;
                padding: 0 6px !important;
                border-radius: 9px !important;
                border: 1px solid var(--g4-divider) !important;
                background: var(--g4-card-bg) !important;
                color: var(--g4-text) !important;
                font-size: 12px !important;
                font-weight: 500 !important;
                cursor: pointer !important;
                white-space: nowrap !important;
                transition: all 0.14s ease !important;
            }
            .g4-thinking-pill:hover {
                background: var(--g4-card-hover) !important;
                border-color: color-mix(in srgb, var(--g4-accent) 45%, var(--g4-divider)) !important;
            }
            .g4-thinking-pill[data-active="1"] {
                background: var(--g4-accent) !important;
                border-color: var(--g4-accent) !important;
                color: #ffffff !important;
                font-weight: 600 !important;
            }

            .g4-options {
                display: flex !important;
                flex-direction: column !important;
                gap: 7px !important;
                padding-top: 2px !important;
                border-top: 1px solid var(--g4-divider) !important;
            }
            .g4-toggle-row {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                font-size: 12px !important;
                color: var(--g4-text) !important;
                padding-top: 4px !important;
                cursor: pointer !important;
                user-select: none !important;
            }
            .g4-switch {
                position: relative !important;
                width: 34px !important;
                height: 19px !important;
                border-radius: 999px !important;
                border: none !important;
                background: var(--g4-divider) !important;
                cursor: pointer !important;
                padding: 0 !important;
                transition: background-color 0.16s ease !important;
                flex: 0 0 auto !important;
            }
            .g4-switch[aria-checked="true"] {
                background: var(--g4-accent) !important;
            }
            .g4-switch::after {
                content: '' !important;
                position: absolute !important;
                top: 2px !important;
                left: 2px !important;
                width: 15px !important;
                height: 15px !important;
                border-radius: 50% !important;
                background: #fff !important;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.22) !important;
                transition: transform 0.16s ease !important;
            }
            .g4-switch[aria-checked="true"]::after {
                transform: translateX(15px) !important;
            }

            .g4-apply-btn {
                appearance: none !important;
                width: 100% !important;
                height: 36px !important;
                border-radius: 10px !important;
                border: none !important;
                background: var(--g4-accent) !important;
                color: #ffffff !important;
                font-size: 12.5px !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: opacity 0.15s ease, transform 0.1s ease !important;
            }
            .g4-apply-btn:hover {
                opacity: 0.92 !important;
            }
            .g4-apply-btn:active {
                transform: scale(0.99) !important;
            }
            .g4-status {
                font-size: 11px !important;
                color: var(--g4-muted) !important;
                line-height: 1.4 !important;
                text-align: center !important;
                margin-top: -4px !important;
            }

            /* 安卓 / 移动端紧凑顶栏胶囊与触控面板适配 */
            #aistudio-g4-trigger {
                touch-action: manipulation !important;
                -webkit-tap-highlight-color: transparent !important;
            }
            @media (max-width: 640px) {
                #aistudio-g4-trigger {
                    height: 28px !important;
                    padding: 0 7px !important;
                    margin: 0 2px !important;
                    gap: 4px !important;
                    font-size: 11.5px !important;
                    border-radius: 8px !important;
                }
                .g4-close {
                    width: 32px !important;
                    height: 32px !important;
                }
                .g4-thinking-pill {
                    height: 36px !important;
                    font-size: 11.5px !important;
                    padding: 0 4px !important;
                }
                .g4-toggle-row {
                    min-height: 36px !important;
                    font-size: 12.5px !important;
                }
                .g4-apply-btn {
                    height: 40px !important;
                    font-size: 13px !important;
                }
            }
            @media (max-width: 380px) {
                .g4-body {
                    padding: 10px 11px 12px !important;
                }
                .g4-model-grid {
                    gap: 6px !important;
                }
                .g4-model-card {
                    padding: 8px !important;
                    gap: 6px !important;
                }
                .g4-elem-box {
                    width: 26px !important;
                    height: 26px !important;
                }
            }
        `;
        host.appendChild(style);
    }

    function ensureTriggerButton() {
        if (!document.body || !onPromptPage()) {
            document.getElementById('aistudio-g4-trigger')?.remove();
            return null;
        }
        injectUiStyles();

        let btn = document.getElementById('aistudio-g4-trigger');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'aistudio-g4-trigger';
            btn.type = 'button';
            btn.setAttribute('aria-haspopup', 'dialog');
            btn.setAttribute('aria-expanded', 'false');

            const dot = document.createElement('span');
            dot.className = 'g4-dot';
            const label = document.createElement('span');
            label.className = 'g4-trigger-text';
            const chev = document.createElement('span');
            chev.className = 'g4-chev';
            chev.textContent = '▾';

            btn.append(dot, label, chev);
            btn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                togglePopover();
            });
        }

        const toolbar = document.querySelector('ms-playground-toolbar .toolbar-right, ms-header .toolbar-right, ms-navbar-v2 .toolbar-right');
        const tbRect = toolbar?.getBoundingClientRect?.();
        const validToolbar = Boolean(toolbar && tbRect && tbRect.height > 0 && tbRect.top < 120);

        if (validToolbar) {
            const claudeGroup = toolbar.querySelector('#claude-studio-theme-group');
            if (claudeGroup) {
                if (btn.parentElement !== toolbar || btn.nextElementSibling !== claudeGroup) {
                    toolbar.insertBefore(btn, claudeGroup);
                }
            } else if (btn.parentElement !== toolbar) {
                toolbar.prepend(btn);
            }
            btn.style.removeProperty('position');
            btn.style.removeProperty('top');
            btn.style.removeProperty('right');
            btn.style.removeProperty('z-index');
        } else {
            if (btn.parentElement !== document.body) {
                document.body.appendChild(btn);
            }
            btn.style.setProperty('position', 'fixed', 'important');
            btn.style.setProperty('top', '13px', 'important');
            btn.style.setProperty('right', '68px', 'important');
            btn.style.setProperty('z-index', '2147483001', 'important');
        }

        return btn;
    }

    function updateToolbarTrigger() {
        const btn = ensureTriggerButton();
        if (!btn) return;
        const textSpan = btn.querySelector('.g4-trigger-text');
        const isCompact = window.innerWidth <= 640;
        const summary = formatPresetSummary(isCompact ? 'compact' : true);
        const nextText = settings.autoSwitch ? summary : (isCompact ? `${summary}·停` : `${summary} (暂停)`);
        if (textSpan && textSpan.textContent !== nextText) {
            textSpan.textContent = nextText;
        }
        const nextPaused = settings.autoSwitch ? '0' : '1';
        if (btn.dataset.paused !== nextPaused) btn.dataset.paused = nextPaused;
        const nextAria = `Gemini 4 默认配置：${formatPresetSummary(false)}`;
        if (btn.getAttribute('aria-label') !== nextAria) btn.setAttribute('aria-label', nextAria);
        const nextExpanded = String(isPopoverOpen);
        if (btn.getAttribute('aria-expanded') !== nextExpanded) btn.setAttribute('aria-expanded', nextExpanded);
        const nextTitle = `Gemini 4 自动切换预设：${formatPresetSummary(false)}\n自动切换：${settings.autoSwitch ? '开启' : '暂停'} · 自动折叠侧栏：${settings.autoCollapse ? '开启' : '关闭'}\n点击打开配置面板`;
        if (btn.title !== nextTitle) btn.title = nextTitle;
    }

    function ensurePopover() {
        if (!document.body) return null;
        injectUiStyles();
        let pop = document.getElementById('aistudio-g4-popover');
        if (!pop) {
            pop = document.createElement('div');
            pop.id = 'aistudio-g4-popover';
            pop.setAttribute('role', 'dialog');
            pop.setAttribute('aria-label', 'Gemini 4 默认切换设置');
            pop.hidden = true;
            pop.addEventListener('click', (e) => e.stopPropagation());
            document.body.appendChild(pop);
        }
        return pop;
    }

    function positionPopover(pop) {
        const trigger = document.getElementById('aistudio-g4-trigger');
        const vw = window.innerWidth;
        const vh = window.visualViewport?.height || window.innerHeight;
        const popWidth = Math.min(358, vw - 24);

        // 手机端居中定位，避免偏右溢出或顶栏遮挡
        if (vw <= 640) {
            const top = (trigger && visible(trigger))
                ? Math.min(Math.max(52, Math.round(trigger.getBoundingClientRect().bottom + 8)), Math.max(52, Math.round(vh - 200)))
                : 56;
            const side = Math.max(12, Math.round((vw - popWidth) / 2));
            pop.style.setProperty('top', `${top}px`, 'important');
            pop.style.setProperty('left', `${side}px`, 'important');
            pop.style.setProperty('right', `${side}px`, 'important');
            pop.style.setProperty('width', `${popWidth}px`, 'important');
            return;
        }

        if (!trigger || !visible(trigger)) {
            pop.style.setProperty('top', '58px', 'important');
            pop.style.setProperty('right', '16px', 'important');
            pop.style.setProperty('left', 'auto', 'important');
            return;
        }
        const rect = trigger.getBoundingClientRect();
        const top = Math.min(vh - 120, Math.round(rect.bottom + 8));
        const maxRight = Math.max(12, vw - popWidth - 12);
        const right = Math.min(maxRight, Math.max(16, Math.round(vw - rect.right)));
        pop.style.setProperty('top', `${top}px`, 'important');
        pop.style.setProperty('right', `${right}px`, 'important');
        pop.style.setProperty('left', 'auto', 'important');
    }

    function updatePopoverStatus() {
        if (statusEl && statusEl.isConnected) {
            statusEl.textContent = lastStatus;
        }
    }

    function renderPopoverContent() {
        const pop = document.getElementById('aistudio-g4-popover');
        if (!pop) return;

        const activeModel = getActiveModel();
        const activeThinkingKey = getActiveThinkingKey(activeModel);

        // Header
        const head = document.createElement('div');
        head.className = 'g4-head';

        const title = document.createElement('h3');
        title.className = 'g4-title';
        const titleDot = document.createElement('span');
        titleDot.className = 'g4-title-dot';
        const titleText = document.createElement('span');
        titleText.textContent = 'Gemini 4 自动切换预设';
        title.append(titleDot, titleText);

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'g4-close';
        closeBtn.setAttribute('aria-label', '关闭设置面板');
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => closePopover());

        head.append(title, closeBtn);

        // Body
        const body = document.createElement('div');
        body.className = 'g4-body';

        // Section 1: Models
        const modelSec = document.createElement('div');
        const modelSecHead = document.createElement('div');
        modelSecHead.className = 'g4-section-head';
        const modelLabel = document.createElement('span');
        modelLabel.className = 'g4-label';
        modelLabel.textContent = '默认模型';
        const modelHint = document.createElement('span');
        modelHint.className = 'g4-subhint';
        modelHint.textContent = 'Gemini 4 系列';
        modelSecHead.append(modelLabel, modelHint);

        const grid = document.createElement('div');
        grid.className = 'g4-model-grid';

        for (const m of GEMINI4_MODELS) {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'g4-model-card';
            card.dataset.modelId = m.id;
            card.dataset.active = m.id === activeModel.id ? '1' : '0';

            const elemBox = document.createElement('div');
            elemBox.className = 'g4-elem-box';
            const num = document.createElement('span');
            num.className = 'g4-elem-num';
            num.textContent = m.atomicNumber;
            const sym = document.createElement('span');
            sym.className = 'g4-elem-sym';
            sym.textContent = m.symbol;
            elemBox.append(num, sym);

            const meta = document.createElement('div');
            meta.className = 'g4-model-meta';

            const nameRow = document.createElement('div');
            nameRow.className = 'g4-model-name-row';
            const nameEl = document.createElement('span');
            nameEl.className = 'g4-model-name';
            nameEl.textContent = m.shortName;
            nameRow.append(nameEl);

            if (m.badge) {
                const badgeEl = document.createElement('span');
                badgeEl.className = 'g4-badge';
                badgeEl.dataset.kind = m.badge;
                badgeEl.textContent = m.badge;
                nameRow.append(badgeEl);
            }

            const sub = document.createElement('span');
            sub.className = 'g4-model-sub';
            const savedLevel = THINKING_META[getActiveThinkingKey(m)]?.shortLabel || 'High';
            sub.textContent = `${m.thinkingLevels.length} 档 · ${savedLevel}`;

            meta.append(nameRow, sub);
            card.append(elemBox, meta);

            card.addEventListener('click', () => {
                saveSettings({ ...settings, modelId: m.id });
            });
            grid.append(card);
        }

        modelSec.append(modelSecHead, grid);

        // Section 2: Thinking Level (dynamic per selected model)
        const thinkSec = document.createElement('div');
        const thinkSecHead = document.createElement('div');
        thinkSecHead.className = 'g4-section-head';
        const thinkLabel = document.createElement('span');
        thinkLabel.className = 'g4-label';
        thinkLabel.textContent = '思考强度 (Thinking Level)';
        const thinkHint = document.createElement('span');
        thinkHint.className = 'g4-subhint';
        thinkHint.textContent = `${activeModel.shortName} 支持 ${activeModel.thinkingLevels.length} 档`;
        thinkSecHead.append(thinkLabel, thinkHint);

        const thinkRow = document.createElement('div');
        thinkRow.className = 'g4-thinking-row';
        thinkRow.style.gridTemplateColumns = `repeat(${activeModel.thinkingLevels.length}, minmax(0, 1fr))`;

        const useShortThinkingLabel = window.innerWidth <= 420 && activeModel.thinkingLevels.length >= 4;
        for (const lvlKey of activeModel.thinkingLevels) {
            const lvlMeta = THINKING_META[lvlKey];
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = 'g4-thinking-pill';
            pill.dataset.level = lvlKey;
            pill.dataset.active = lvlKey === activeThinkingKey ? '1' : '0';
            pill.textContent = useShortThinkingLabel ? lvlMeta.shortLabel : lvlMeta.label;
            pill.addEventListener('click', () => {
                saveSettings({
                    ...settings,
                    thinkingByModel: {
                        ...settings.thinkingByModel,
                        [activeModel.id]: lvlKey
                    }
                });
            });
            thinkRow.append(pill);
        }

        thinkSec.append(thinkSecHead, thinkRow);

        // Section 3: Toggles
        const optSec = document.createElement('div');
        optSec.className = 'g4-options';

        const makeToggleRow = (labelText, checked, onToggle) => {
            const row = document.createElement('div');
            row.className = 'g4-toggle-row';
            const txt = document.createElement('span');
            txt.textContent = labelText;
            const sw = document.createElement('button');
            sw.type = 'button';
            sw.className = 'g4-switch';
            sw.setAttribute('role', 'switch');
            sw.setAttribute('aria-checked', String(checked));
            sw.setAttribute('aria-label', labelText);
            const handle = () => onToggle(!checked);
            row.addEventListener('click', handle);
            row.append(txt, sw);
            return row;
        };

        optSec.append(
            makeToggleRow('打开页面 / 新对话时自动切换', settings.autoSwitch, (nextVal) => {
                saveSettings({ ...settings, autoSwitch: nextVal });
            }),
            makeToggleRow('切换完成后自动折叠右侧栏', settings.autoCollapse, (nextVal) => {
                saveSettings({ ...settings, autoCollapse: nextVal });
            })
        );

        // Apply Button
        const applyBtn = document.createElement('button');
        applyBtn.type = 'button';
        applyBtn.className = 'g4-apply-btn';
        applyBtn.textContent = `立即应用 (${formatPresetSummary(true)})`;
        applyBtn.addEventListener('click', () => {
            closePopover();
            schedule({ manual: true });
        });

        // Status line
        statusEl = document.createElement('div');
        statusEl.className = 'g4-status';
        statusEl.textContent = lastStatus;

        body.append(modelSec, thinkSec, optSec, applyBtn, statusEl);
        pop.replaceChildren(head, body);
    }

    function openPopover() {
        const pop = ensurePopover();
        if (!pop) return;
        isPopoverOpen = true;
        renderPopoverContent();
        positionPopover(pop);
        pop.hidden = false;
        updateToolbarTrigger();
    }

    function closePopover() {
        const pop = document.getElementById('aistudio-g4-popover');
        if (pop) pop.hidden = true;
        if (!isPopoverOpen) return;
        isPopoverOpen = false;
        updateToolbarTrigger();
    }

    function togglePopover() {
        if (isPopoverOpen) closePopover();
        else openPopover();
    }

    document.addEventListener('click', (event) => {
        if (!isPopoverOpen) return;
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest('#aistudio-g4-popover, #aistudio-g4-trigger')) return;
        closePopover();
    }, true);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isPopoverOpen) {
            closePopover();
        }
    }, true);

    const handleViewportChange = () => {
        if (document.body) updateToolbarTrigger();
        if (!isPopoverOpen) return;
        const pop = document.getElementById('aistudio-g4-popover');
        if (pop) {
            renderPopoverContent();
            positionPopover(pop);
        }
    };
    window.addEventListener('resize', handleViewportChange, { passive: true });
    window.addEventListener('orientationchange', handleViewportChange, { passive: true });
    window.visualViewport?.addEventListener('resize', () => {
        if (!isPopoverOpen) return;
        const pop = document.getElementById('aistudio-g4-popover');
        if (pop) positionPopover(pop);
    }, { passive: true });

    // ==================== 跨标签页配置同步 ====================
    if (typeof GM_addValueChangeListener === 'function') {
        try {
            GM_addValueChangeListener(STORAGE_KEY, (_key, _oldVal, newVal, remote) => {
                if (!remote) return;
                settings = sanitizeSettings(newVal);
                refreshMenuCommands();
                updateToolbarTrigger();
                if (isPopoverOpen) renderPopoverContent();
            });
        } catch (_) {}
    }

    // ==================== 油猴菜单（动态同步当前预设） ====================
    let menuIds = [];
    function refreshMenuCommands() {
        if (typeof GM_registerMenuCommand !== 'function') return;
        if (typeof GM_unregisterMenuCommand === 'function') {
            for (const id of menuIds) {
                try { GM_unregisterMenuCommand(id); } catch (_) {}
            }
            menuIds = [];
        } else if (menuIds.length > 0) {
            return;
        }

        const register = (title, fn) => {
            try {
                const id = GM_registerMenuCommand(title, fn);
                if (id !== undefined) menuIds.push(id);
            } catch (_) {}
        };

        const summary = formatPresetSummary(true);
        register(`⚙️ 配置 Gemini 4 默认项 (当前: ${summary})`, () => {
            if (!document.body) return;
            togglePopover();
        });
        register(`⚡️ 立即应用 (${summary})`, () => schedule({ manual: true }));
        register(
            settings.autoSwitch ? '⏸ 暂停自动切换 (当前: 已开启)' : '▶️ 开启自动切换 (当前: 已暂停)',
            () => {
                saveSettings({ ...settings, autoSwitch: !settings.autoSwitch });
                showToast(settings.autoSwitch ? `已开启自动切换 (${formatPresetSummary(true)})` : '已暂停自动切换', true);
            }
        );
        register('📁 展开/折叠 Run Settings 面板', async () => {
            ++generation;
            clearTimeout(timer);
            setStartupMask(generation, false);
            try {
                if (isPanelOpen()) await closePanel();
                else await openPanel();
            } catch (error) {
                showToast(error.message, false);
            }
        });
        register('ℹ️ 查看当前运行状态', () => showToast(lastStatus, !lastStatus.includes('未完成')));
    }

    refreshMenuCommands();

    // ==================== SPA 路由与组件生命周期监听 ====================
    let lastUrl = location.pathname;
    let lastRenderer = document.querySelector('ms-prompt-renderer');

    setInterval(() => {
        if (document.body) updateToolbarTrigger();
        const renderer = document.querySelector('ms-prompt-renderer');
        if (location.pathname !== lastUrl || renderer !== lastRenderer) {
            const prevUrl = lastUrl;
            const sameRenderer = renderer && renderer === lastRenderer;
            lastUrl = location.pathname;
            lastRenderer = renderer;

            // 新对话发送首条消息时，URL 会从 /prompts/new_chat 静默升级为 /prompts/<id>，保持原组件不中断当前对话。
            const isNewChatPromotion = prevUrl === '/prompts/new_chat'
                && /^\/prompts\/(?!new_chat(?:\/|$))[^/]+/.test(lastUrl)
                && sameRenderer
                && !!document.querySelector('ms-chat-turn');

            if (!isNewChatPromotion) {
                schedule({ manual: false });
            }
        }
    }, 400);

    // New chat 有时复用同一个 URL 和组件，不能只依赖地址变化。
    document.addEventListener('click', (event) => {
        const el = event.target instanceof Element ? event.target.closest('button, a') : null;
        if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
        const label = (el.getAttribute('aria-label') || text(el)).trim();
        if (/^New chat$/i.test(label) || (el.tagName === 'A' && /\/prompts\/new_chat(?:[?#]|$)/.test(el.href))) {
            schedule({ manual: false });
        }
    }, true);

    window.addEventListener('popstate', () => schedule({ manual: false }));

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => updateToolbarTrigger(), { once: true });
    } else {
        updateToolbarTrigger();
    }

    schedule({ manual: false });
})();
