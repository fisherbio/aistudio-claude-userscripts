// ==UserScript==
// @name         Google AI Studio - 默认 Gemini 4 Argon & High 思考 & 自动折叠侧栏
// @namespace    https://tampermonkey.net/
// @version      3.1.0
// @description  每次打开 Google AI Studio 时，自动选择 Gemini 4 Argon 模型与 High 思考强度，并自动折叠右侧 Run settings 侧边栏
// @author       Antigravity
// @match        https://aistudio.google.com/*
// @icon         https://www.gstatic.com/lamda/images/favicon_v1_150160cddff7f2942da3.svg
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @license      MIT
// @homepageURL  https://github.com/fisherbio/aistudio-claude-userscripts
// @supportURL   https://github.com/fisherbio/aistudio-claude-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/fisherbio/aistudio-claude-userscripts/main/aistudio-argon-defaults.user.js
// @updateURL    https://raw.githubusercontent.com/fisherbio/aistudio-claude-userscripts/main/aistudio-argon-defaults.user.js
// ==/UserScript==

(function () {
    'use strict';

    // 在页面首屏绘制前安装作用域样式；opacity 保留控件布局供自动配置读取。
    const onPromptPage = () => /^\/prompts(?:\/|$)/.test(location.pathname);
    const earlyState = { readyState: document.readyState, panelAlreadyPresent: !!document.querySelector('ms-run-settings') };
    let maskOwner = 0;
    let maskWanted = onPromptPage();
    let maskStyle;
    function setStartupMask(owner, wanted) {
        maskOwner = owner;
        maskWanted = wanted;
        const root = document.documentElement;
        if (!root) return;
        if (wanted) {
            if (!maskStyle) {
                maskStyle = document.createElement('style');
                maskStyle.id = 'aistudio-argon-startup-style';
                maskStyle.textContent = String.raw`
                    html[data-argon-initializing] ms-right-side-panel {
                        position: fixed !important;
                        top: 0 !important;
                        right: 0 !important;
                        opacity: 0 !important;
                        pointer-events: none !important;
                    }
                    html[data-argon-initializing] :is(
                        ms-run-settings, ms-run-settings *,
                        .cdk-overlay-pane:has(ms-model-carousel[data-test-id="model-carousel-in-selector"]),
                        .cdk-overlay-pane:has(ms-model-carousel[data-test-id="model-carousel-in-selector"]) *,
                        [role="listbox"][aria-label="Thinking Level"],
                        [role="listbox"][aria-label="Thinking Level"] *,
                        .cdk-overlay-backdrop
                    ) {
                        opacity: 0 !important;
                        pointer-events: none !important;
                        animation: none !important;
                        transition: none !important;
                    }
                `;
                root.appendChild(maskStyle);
            }
            root.setAttribute('data-argon-initializing', '');
        } else {
            root.removeAttribute('data-argon-initializing');
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


    const CONFIG = {
        DEBUG: true
    };

    function log(...args) {
        if (CONFIG.DEBUG) {
            console.log('%c[AIStudio-Argon-Helper]%c', 'color:#1a73e8;font-weight:bold;', 'color:inherit;', ...args);
        }
    }

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    function showToast(message, isSuccess = true) {
        const id = 'aistudio-argon-helper-toast';
        let toast = document.getElementById(id);
        if (!toast) {
            toast = document.createElement('div');
            toast.id = id;
            Object.assign(toast.style, {
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: '999999',
                padding: '12px 18px',
                borderRadius: '8px',
                backgroundColor: isSuccess ? '#1e1e24' : '#451a1a',
                color: '#fff',
                fontSize: '13px',
                fontFamily: 'Roboto, sans-serif',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
                opacity: '0',
                transform: 'translateY(10px)',
                pointerEvents: 'none'
            });
            document.body.appendChild(toast);
        }
        toast.textContent = (isSuccess ? '✓ ' : 'ℹ ') + message;
        toast.style.backgroundColor = isSuccess ? '#1e1e24' : '#451a1a';
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
        }, 3800);
    }


    // 只操作可见的真实控件；不把隐藏面板或整个页面文本当成当前选择。
    const visible = el => !!el && el.isConnected && el.getClientRects().length > 0 &&
        getComputedStyle(el).visibility !== 'hidden';
    const text = el => (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
    const find = (selector, root = document) => [...root.querySelectorAll(selector)].find(visible);
    const closeButton = () => find('button[aria-label="Close run settings panel"]');
    const isPanelOpen = () => !!closeButton();
    const modelButton = () => [...document.querySelectorAll('ms-run-settings button')]
        .find(b => visible(b) && /gemini-[\w.-]+/i.test(text(b)));
    const isArgon = () => /gemini-4-argon(?![\w.-])/i.test(text(modelButton()));
    const thinkingControl = () => find('ms-run-settings [role="combobox"][aria-label="Thinking Level"]');
    // 新版 Material 的选项在控件内部的 popover 中，已不在 .cdk-overlay-container 中。
    const thinkingValue = () => {
        const el = thinkingControl();
        return text(el?.querySelector('.mat-mdc-select-value-text, .mat-mdc-select-value, .mat-mdc-select-trigger') || el)
            .replace(/expand_more/g, '').trim();
    };
    const isHigh = () => /^(high|高)$/i.test(thinkingValue());
    let generation = 0;
    let lastStatus = '等待页面';
    const cancelled = () => new DOMException('页面已切换', 'AbortError');
    const check = token => { if (token !== generation) throw cancelled(); };

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
        const button = await waitFor(() => find('button[aria-label="Toggle run settings panel"]'), token, '找不到 Run settings 打开按钮');
        button.click();
        await waitFor(isPanelOpen, token, 'Run settings 未能展开');
    }

    async function setModelToArgon(token) {
        const button = await waitFor(modelButton, token, '模型选择器尚未加载');
        if (isArgon()) return;
        button.click();
        const option = await waitFor(() => {
            const card = document.getElementById('model-carousel-row-models/gemini-4-argon');
            return visible(card) && card;
        }, token, '模型列表中找不到 Gemini 4 Argon');
        option.click();
        await waitFor(isArgon, token, 'Gemini 4 Argon 未实际选中');
    }

    async function setThinkingToHigh(token) {
        const select = await waitFor(thinkingControl, token, '找不到 Thinking Level 控件');
        if (isHigh()) return;
        if (select.getAttribute('aria-expanded') !== 'true') select.click();
        const option = await waitFor(() => {
            const current = thinkingControl();
            const list = document.getElementById(current?.getAttribute('aria-controls')) ||
                find('[role="listbox"][aria-label="Thinking Level"]');
            return list && [...list.querySelectorAll('mat-option, [role="option"]')]
                .find(el => visible(el) && /^(high|高)$/i.test(text(el)));
        }, token, 'Thinking Level 列表中找不到 High');
        option.click();
        await waitFor(() => isHigh() && thinkingControl()?.getAttribute('aria-expanded') !== 'true',
            token, 'High 未实际生效');
    }

    async function closePanel(token = generation) {
        const button = closeButton();
        if (!button) return;
        button.click();
        await waitFor(() => !isPanelOpen(), token, 'Run settings 未能折叠');
        // 等离场动画真正销毁面板后再解开遮罩，避免最后一帧闪现。
        await waitFor(() => !document.querySelector('ms-run-settings'), token, 'Run settings 离场尚未完成');
    }

    async function executeFlow(token) {
        if (!/^\/prompts(?:\/|$)/.test(location.pathname)) return;
        lastStatus = '正在设置 Gemini 4 Argon / High';
        try {
            await waitFor(() => isPanelOpen() || find('button[aria-label="Toggle run settings panel"]'),
                token, '页面加载超时，请从油猴菜单重新执行', 45000);
            await openPanel(token);
            log('启动隐藏检查', JSON.stringify({
                ...earlyState,
                masked: document.documentElement.hasAttribute('data-argon-initializing') &&
                    getComputedStyle(document.querySelector('ms-run-settings')).opacity === '0',
                outOfFlow: getComputedStyle(document.querySelector('ms-right-side-panel')).position === 'fixed'
            }));
            await setModelToArgon(token);
            await setThinkingToHigh(token);
            // 等待框架回写后再读一次，不能把 click() 当成配置成功。
            let since = Date.now();
            await waitFor(() => {
                if (!isArgon() || !isHigh()) { since = Date.now(); return false; }
                return Date.now() - since >= 600;
            }, token, '模型或 High 未能保持生效');
            await closePanel(token);
            check(token);
            lastStatus = '已确认 Gemini 4 Argon + High，Run settings 已折叠';
            log(lastStatus);
        } catch (error) {
            if (error.name === 'AbortError') return;
            lastStatus = '配置未完成：' + error.message;
            console.warn('[AIStudio-Argon-Helper]', lastStatus);
            showToast(lastStatus + '；可从油猴菜单重试', false);
            // 失败时恢复可见状态，保留面板供检查。
        } finally {
            releaseStartupMask(token);
        }
    }

    let timer;
    function schedule() {
        const token = ++generation;
        clearTimeout(timer);
        setStartupMask(token, onPromptPage());
        timer = setTimeout(() => executeFlow(token), 350);
    }
    // 不改写页面的 history。URL 和组件替换都覆盖，兼容 SPA 站内导航。
    let lastUrl = location.pathname;
    let lastRenderer = document.querySelector('ms-prompt-renderer');
    setInterval(() => {
        const renderer = document.querySelector('ms-prompt-renderer');
        if (location.pathname !== lastUrl || renderer !== lastRenderer) {
            lastUrl = location.pathname;
            lastRenderer = renderer;
            schedule();
        }
    }, 400);
    // New chat 有时复用同一个 URL 和组件，不能只依赖地址变化。
    document.addEventListener('click', event => {
        const el = event.target instanceof Element ? event.target.closest('button, a') : null;
        if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
        const label = (el.getAttribute('aria-label') || text(el)).trim();
        if (/^New chat$/i.test(label) || (el.tagName === 'A' && /\/prompts\/new_chat(?:[?#]|$)/.test(el.href))) schedule();
    }, true);
    window.addEventListener('popstate', schedule);
    schedule();

    if (typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand('⚡️ 重新执行配置 (Argon + High + 折叠)', schedule);
        GM_registerMenuCommand('📁 展开/折叠 Run Settings 面板', async () => {
            ++generation;
            clearTimeout(timer);
            setStartupMask(generation, false);
            try { if (isPanelOpen()) await closePanel(); else await openPanel(); }
            catch (error) { showToast(error.message, false); }
        });
        GM_registerMenuCommand('查看配置状态', () => showToast(lastStatus, !lastStatus.includes('未完成')));
    }
})();
