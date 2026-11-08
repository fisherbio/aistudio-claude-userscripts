// ==UserScript==
// @name         Google AI Studio — Claude 暖纸与暗黑双主题
// @namespace    local.aistudio.claude-theme
// @version      2.0.7
// @description  Claude 风格暖纸与暗黑双主题、View Transition 真正渐进扩散动画（可调速 0.1x~2.0x）、居中极简首页、自动同步原生主题设置、可自定义启动默认主题。
// @match        https://aistudio.google.com/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// @noframes
// @license      MIT
// @homepageURL  https://github.com/fisherbio/aistudio-claude-userscripts
// @supportURL   https://github.com/fisherbio/aistudio-claude-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/fisherbio/aistudio-claude-userscripts/main/aistudio-claude-theme.user.js
// @updateURL    https://raw.githubusercontent.com/fisherbio/aistudio-claude-userscripts/main/aistudio-claude-theme.user.js
// ==/UserScript==

(function () {
    'use strict';

    const KEY_THEME = 'claude_studio_theme';
    const KEY_DEFAULT_THEME = 'claude_studio_default_theme';
    const KEY_ANIM_SPEED = 'claude_studio_anim_speed';
    const KEY_CHAT_WIDTH = 'claude_studio_chat_width';
    const BASE_DURATION = 520; // 1.0x 基准时长 520ms

    // 读取启动默认主题（用户设定为准，新标签页或刷新统一生效）
    let configuredDefault = (typeof GM_getValue === 'function')
        ? GM_getValue(KEY_DEFAULT_THEME, 'dark')
        : 'dark';

    let currentTheme = configuredDefault;

    let animSpeed = (typeof GM_getValue === 'function')
        ? Number(GM_getValue(KEY_ANIM_SPEED, 1.0)) || 1.0
        : 1.0;

    let chatWidth = (typeof GM_getValue === 'function')
        ? GM_getValue(KEY_CHAT_WIDTH, '960px')
        : '960px';

    let enabled = true;
    let isThemeTransitioning = false;
    let activeThemeTransition = null;

    // 安全兼容 Google AI Studio 的 Trusted Types CSP 策略，防止 innerHTML 被拦截抛出异常
    const ttPolicy = (typeof window.trustedTypes !== 'undefined' && window.trustedTypes?.createPolicy)
        ? (window.trustedTypes.defaultPolicy || (() => {
            try {
                return window.trustedTypes.createPolicy('claude-theme-policy', { createHTML: s => s });
            } catch (_) {
                try {
                    return window.trustedTypes.createPolicy('default', { createHTML: s => s });
                } catch (_) {
                    return null;
                }
            }
        })())
        : null;

    function setSafeHTML(element, htmlString) {
        if (!element) return;
        if (ttPolicy) {
            element.innerHTML = ttPolicy.createHTML(htmlString);
        } else {
            element.innerHTML = htmlString;
        }
    }

    const css = String.raw`
/* ===== 基础与暖纸浅色主题 (Light Warm Paper) ===== */
html[data-claude-studio] {
  color-scheme: light;
  --cs-chat-width: 960px;
  --cs-bg: #FAF9F5;
  --cs-surface: #F5F4ED;
  --cs-soft: #F0EEE6;
  --cs-text: #141413;
  --cs-muted: #6F675D;
  --cs-border: #D8D2C4;
  --cs-border-soft: #D8D2C45C;
  --cs-border-focus: #B4AA99;
  --cs-accent: #BF6243;
  --cs-accent-soft: #D97757;
  --cs-code: #8A3F27;
  --cs-code-bg: #F1EEE8;
  --cs-input-bg: #FFFEFB;
  --cs-placeholder: #8A8377;
  --cs-welcome-heading: #302D28;
  --cs-starter-border: #D8D2C4AA;
  --cs-shadow: 0 3px 16px #14141308, 0 1px 3px #14141305;
  --cs-shadow-hover: 0 3px 20px #1414130D;
  --cs-selection: #D9775733;
  --cs-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  --cs-reading: Georgia, "Noto Serif CJK SC", "Songti SC", STSong, serif;
  --color-v3-accent-1: var(--cs-accent);
  background: var(--cs-bg) !important;
  color: var(--cs-text) !important;
}

/* ===== Claude 暗黑主题 (Dark Charcoal) ===== */
html[data-claude-studio][data-cs-theme="dark"] {
  color-scheme: dark;
  --cs-bg: #1F1E1D;
  --cs-surface: #262523;
  --cs-soft: #2E2D29;
  --cs-text: #E5E3DC;
  --cs-muted: #9E988F;
  --cs-border: #3D3B36;
  --cs-border-soft: #3D3B3680;
  --cs-border-focus: #5A564F;
  --cs-accent: #D97757;
  --cs-accent-soft: #BF6243;
  --cs-code: #E08264;
  --cs-code-bg: #282724;
  --cs-input-bg: #272624;
  --cs-placeholder: #7A756D;
  --cs-welcome-heading: #F0EDE6;
  --cs-starter-border: #3D3B36;
  --cs-shadow: 0 4px 20px rgba(0, 0, 0, 0.45), 0 1px 4px rgba(0, 0, 0, 0.25);
  --cs-shadow-hover: 0 6px 24px rgba(0, 0, 0, 0.55);
  --cs-selection: #D9775755;
  background: var(--cs-bg) !important;
  color: var(--cs-text) !important;
}

/* Material 与 Shadow DOM 主题映射 */
html[data-claude-studio] :is(app-root, ms-app, ms-navbar-v2, ms-right-side-panel, ms-run-settings, ms-prompt-renderer, ms-chat-turn, ms-chunk-editor, ms-prompt-box) {
  --mat-sys-background: var(--cs-bg) !important;
  --mat-sys-on-background: var(--cs-text) !important;
  --mat-sys-surface: var(--cs-surface) !important;
  --mat-sys-surface-dim: var(--cs-bg) !important;
  --mat-sys-surface-container-lowest: var(--cs-input-bg) !important;
  --mat-sys-surface-container-low: var(--cs-surface) !important;
  --mat-sys-surface-container: var(--cs-surface) !important;
  --mat-sys-surface-container-high: var(--cs-soft) !important;
  --mat-sys-surface-container-highest: var(--cs-soft) !important;
  --mat-sys-on-surface: var(--cs-text) !important;
  --mat-sys-on-surface-variant: var(--cs-muted) !important;
  --mat-sys-outline: var(--cs-border) !important;
  --mat-sys-outline-variant: var(--cs-border-soft) !important;
  --mat-sys-primary: var(--cs-accent) !important;
  --mat-sys-on-primary: #fff !important;
  --mdc-theme-background: var(--cs-bg) !important;
  --mdc-theme-on-background: var(--cs-text) !important;
  --mdc-theme-surface: var(--cs-surface) !important;
  --mdc-theme-on-surface: var(--cs-text) !important;
  --mdc-theme-primary: var(--cs-accent) !important;
  --mdc-theme-on-primary: #fff !important;
}

/* 核心布局与容器覆盖 */
html[data-claude-studio] body { background: var(--cs-bg) !important; color: var(--cs-text) !important; font-family: var(--cs-ui) !important; }
html[data-claude-studio] :is(app-root, ms-app, .banner-and-app-container, .makersuite-layout, .layout-wrapper, .layout-main, ms-prompt-renderer, ms-chunk-editor, .chunk-editor-main, .chat-container, .chat-view-container) { background: var(--cs-bg) !important; color: var(--cs-text) !important; }
html[data-claude-studio] :is(button, input, textarea, select) { font-family: var(--cs-ui) !important; }
html[data-claude-studio] :is(button, a, input, textarea):focus-visible { outline: 2px solid var(--cs-accent-soft) !important; outline-offset: 3px; }
html[data-claude-studio] ::selection { background: var(--cs-selection); }

/* 左侧导航栏与抽屉容器全覆盖 */
html[data-claude-studio] :is(ms-navbar-v2, ms-side-nav, mat-sidenav, .mat-drawer, [role="navigation"], aside) {
  background: var(--cs-surface) !important;
  border-right: 1px solid var(--cs-border-soft) !important;
  box-shadow: none !important;
}
html[data-claude-studio] :is(ms-navbar-v2, ms-side-nav, mat-sidenav, .mat-drawer, [role="navigation"], aside) :is(.nav-content, .mat-drawer-inner-container, .navigation-drawer, nav, ul, li) {
  background: transparent !important;
  color: var(--cs-text) !important;
}
html[data-claude-studio] :is(ms-navbar-v2, ms-side-nav, mat-sidenav, .mat-drawer, [role="navigation"], aside) :is(a, button, span, .nav-item, [role="listitem"]) {
  color: var(--cs-text) !important;
  border-radius: 8px !important;
}
html[data-claude-studio] :is(ms-navbar-v2, ms-side-nav, mat-sidenav, .mat-drawer, [role="navigation"], aside) :is(a, button):hover {
  background: var(--cs-soft) !important;
}
html[data-claude-studio] :is(ms-navbar-v2, ms-side-nav) a[href="/prompts/new_chat"] { font-family: var(--cs-reading) !important; }

/* 顶部与工具栏（彻底消除黑色暗影） */
html[data-claude-studio] :is(ms-header, ms-playground-toolbar, .toolbar-left, .toolbar-right, ms-chat-bottom-overlay) {
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
}
html[data-claude-studio] :is(ms-header, ms-playground-toolbar)::before,
html[data-claude-studio] :is(ms-header, ms-playground-toolbar)::after {
  display: none !important;
  background: none !important;
  box-shadow: none !important;
}
html[data-claude-studio] ms-playground-toolbar .mode-title { font: 500 15px/1.4 var(--cs-ui) !important; color: var(--cs-muted) !important; }
html[data-claude-studio] :is(.ms-button-icon, .ms-button-borderless) { border-radius: 9px !important; color: var(--cs-muted) !important; }
html[data-claude-studio] :is(.ms-button-icon, .ms-button-borderless):not([aria-disabled="true"]):hover { background: var(--cs-soft) !important; color: var(--cs-text) !important; }

/* 输入框基础 */
html[data-claude-studio] ms-prompt-box { display: block; background: transparent !important; border: 0 !important; box-shadow: none !important; overflow: visible; }
html[data-claude-studio] ms-prompt-box .prompt-box-container { margin: 0 !important; padding: 16px !important; background: var(--cs-input-bg) !important; border: 1px solid var(--cs-border) !important; border-radius: 20px !important; box-shadow: var(--cs-shadow) !important; }
html[data-claude-studio] ms-prompt-box:focus-within .prompt-box-container { border-color: var(--cs-border-focus) !important; box-shadow: var(--cs-shadow-hover) !important; }
/* Keep the composer focus ring inside its border, clear of the chat fade above it. */
@media (forced-colors: none) {
  html[data-claude-studio] ms-prompt-box .prompt-box-container:has(textarea:focus) {
    border-color: var(--cs-accent) !important;
    box-shadow: inset 0 0 0 1px var(--cs-accent), var(--cs-shadow-hover) !important;
  }
  html[data-claude-studio] ms-prompt-box .prompt-box-container textarea:focus-visible {
    outline: none !important;
  }
}
html[data-claude-studio] ms-prompt-box textarea { background: transparent !important; color: var(--cs-text) !important; font: 16px/1.5 var(--cs-ui) !important; caret-color: var(--cs-accent); field-sizing: content; height: auto !important; min-height: 66px !important; max-height: 30vh !important; padding: 0 !important; box-sizing: border-box; }
html[data-claude-studio] ms-prompt-box textarea::placeholder { color: var(--cs-placeholder) !important; opacity: 1; }
html[data-claude-studio] ms-prompt-box button { font-size: 12px !important; }
html[data-claude-studio] ms-prompt-box .buttons-row { gap: 6px !important; align-items: center !important; flex-wrap: wrap; row-gap: 10px !important; }
html[data-claude-studio] ms-prompt-box .button-row-left { gap: 5px !important; min-width: 0; }
html[data-claude-studio] ms-prompt-box .button-wrapper { display: flex; gap: 7px !important; align-items: center; margin-left: auto; }
html[data-claude-studio] ms-prompt-box :is(ms-add-media-button, ms-paid-api-key-button, ms-stt-button) button { min-width: 30px !important; width: 30px !important; height: 30px !important; padding: 3px !important; border: 0 !important; box-shadow: none !important; background: transparent !important; color: var(--cs-muted) !important; border-radius: 7px !important; }
html[data-claude-studio] ms-prompt-box ms-prompt-box-tools button { height: 30px !important; padding: 3px 7px !important; border: 0 !important; box-shadow: none !important; background: transparent !important; color: var(--cs-muted) !important; font-size: 12px !important; }
html[data-claude-studio] ms-prompt-box .enabled-tool-container { background: var(--cs-soft) !important; border-radius: 7px !important; max-width: 180px; }
html[data-claude-studio] ms-prompt-box .enabled-tool { background: transparent !important; color: var(--cs-muted) !important; }
html[data-claude-studio] ms-prompt-box .tool-name { display: block; max-width: 125px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 11px !important; }

/* 发送按钮魔改：Claude 标志性陶土色方块与纯白箭头 ↑ */
html[data-claude-studio] ms-prompt-box ms-run-button button[data-cs-send] {
  position: relative !important;
  width: 32px !important;
  min-width: 32px !important;
  height: 32px !important;
  padding: 0 !important;
  border-radius: 9px !important;
  font-size: 0 !important;
  background: var(--cs-accent) !important;
  border-color: var(--cs-accent) !important;
  box-shadow: none !important;
}
html[data-claude-studio] ms-prompt-box ms-run-button button[data-cs-send] > * { opacity: 0 !important; }
html[data-claude-studio] ms-prompt-box ms-run-button button[data-cs-send]::after {
  content: '↑' !important;
  position: absolute !important;
  inset: 0 !important;
  display: grid !important;
  place-items: center !important;
  color: white !important;
  font: 22px/1 var(--cs-ui) !important;
}
html[data-claude-studio] :is(button[aria-label="Run"], ms-run-button button)[aria-disabled="true"] { opacity: .4 !important; }

/* 右侧参数面板与菜单 */
html[data-claude-studio] ms-right-side-panel { background: var(--cs-bg) !important; border-left: 1px solid var(--cs-border) !important; }
html[data-claude-studio] ms-run-settings { background: var(--cs-bg) !important; color: var(--cs-text) !important; }
html[data-claude-studio] ms-run-settings :is(button, mat-select) { border-color: var(--cs-border) !important; background-color: var(--cs-input-bg) !important; color: var(--cs-text) !important; border-radius: 12px !important; }
html[data-claude-studio] ms-run-settings :is(h2, h3) { color: var(--cs-text) !important; font-family: var(--cs-ui) !important; }
html[data-claude-studio] :is(.mat-mdc-menu-panel, .mat-mdc-select-panel, mat-dialog-container .mdc-dialog__surface) { background: var(--cs-surface) !important; color: var(--cs-text) !important; border: 1px solid var(--cs-border) !important; border-radius: 14px !important; box-shadow: var(--cs-shadow-hover) !important; }
html[data-claude-studio] :is(.mat-mdc-option, .mat-mdc-menu-item) { color: var(--cs-text) !important; font-family: var(--cs-ui) !important; }
html[data-claude-studio] :is(.mat-mdc-option.mdc-list-item--selected, .mat-mdc-option:hover, .mat-mdc-menu-item:hover) { background: var(--cs-soft) !important; }

/* 对话正文排版 (Claude 风格居中与衬线体，宽度支持自由调节) */
html[data-claude-studio] .chat-view-container:not(.zero-state) {
  max-width: var(--cs-chat-width, 960px) !important;
  width: 100%;
  margin-inline: auto !important;
  box-sizing: border-box !important;
  padding-inline: 16px !important;
}
/* Keep horizontal scrolling inside wide content, not on the conversation column. */
html[data-claude-studio] .chat-view-container:not(.zero-state, .side-by-side) {
  overflow-x: hidden !important;
}
html[data-claude-studio] .chat-view-container:not(.zero-state, .side-by-side) :is(ms-code-block pre, ms-cmark-node .table-container) {
  box-sizing: border-box;
  max-width: 100%;
  overflow-x: auto;
}
html[data-claude-studio] .chunk-editor-main > footer { max-width: var(--cs-chat-width, 960px) !important; width: calc(100% - 48px) !important; margin-inline: auto !important; padding-bottom: 18px !important; }
html[data-claude-studio] :is(ms-text-chunk, .markdown) { color: var(--cs-text) !important; font: 16px/1.5 var(--cs-reading) !important; }
html[data-claude-studio] ms-cmark-node { color: inherit !important; font-family: inherit !important; font-size: inherit !important; line-height: inherit !important; }
html[data-claude-studio] :is(ms-cmark-node, .markdown) :is(p, ul, ol, li, blockquote, th, td) { font-family: inherit !important; font-size: inherit !important; line-height: inherit !important; }
html[data-claude-studio] :is(ms-cmark-node, .markdown) :is(h1, h2, h3, h4) { font-family: var(--cs-reading) !important; color: var(--cs-text) !important; font-weight: 600; line-height: 1.4 !important; letter-spacing: -.02em; margin: 1.1em 0 .45em !important; }
html[data-claude-studio] :is(ms-cmark-node, .markdown) h1 { font-size: 1.5em !important; }
html[data-claude-studio] :is(ms-cmark-node, .markdown) h2 { font-size: 1.25em !important; }
html[data-claude-studio] :is(ms-cmark-node, .markdown) h3 { font-size: 1.125em !important; }
html[data-claude-studio] :is(ms-cmark-node, .markdown) p { margin: 0 0 10px !important; }
html[data-claude-studio] :is(ms-cmark-node, .markdown) :is(ul, ol) { margin: 6px 0 10px !important; padding-left: 26px; }
html[data-claude-studio] :is(ms-cmark-node, .markdown) li { margin: 3px 0 !important; }
html[data-claude-studio] :is(ms-cmark-node, .markdown) a { color: var(--cs-accent) !important; text-decoration: underline; text-underline-offset: 3px; }
html[data-claude-studio] :is(ms-cmark-node, .markdown) :not(pre) > code { color: var(--cs-code) !important; background: var(--cs-code-bg) !important; border-radius: 4px; padding: 2px 5px; font-family: "SFMono-Regular", Consolas, monospace !important; }
html[data-claude-studio] :is(ms-cmark-node, .markdown) pre { background: var(--cs-code-bg) !important; border: 1px solid var(--cs-border) !important; border-radius: 12px; padding: 16px; font-family: "SFMono-Regular", Consolas, monospace !important; }
html[data-claude-studio] :is(ms-cmark-node, .markdown) table { border-collapse: collapse; width: 100%; font-size: 14px !important; line-height: 1.5 !important; border: 1px solid var(--cs-border); }
html[data-claude-studio] :is(ms-cmark-node, .markdown) :is(th, td) { border: 1px solid var(--cs-border) !important; padding: 10px 13px; text-align: left; }
html[data-claude-studio] :is(ms-cmark-node, .markdown) th { background: var(--cs-surface) !important; font-weight: 600; }
html[data-claude-studio] :is(ms-cmark-node, .markdown) blockquote { border-left: 3px solid var(--cs-accent); background: var(--cs-soft); border-radius: 0 8px 8px 0; color: var(--cs-text); padding: 10px 18px; margin: 16px 0; font-style: italic; }

/* ==================== 100% 还原图一：Claude 居中极简首页 (Zero-State) ==================== */
/* 彻底隐藏谷歌原生的 RECENT 列表、Build with Gemini 4 Argon 推广横幅与 3D 卡片 */
html[data-claude-studio][data-cs-home] .chat-view-container.zero-state,
html[data-claude-studio][data-cs-home] ms-zero-state,
html[data-claude-studio][data-cs-home] .zero-state-container,
html[data-claude-studio][data-cs-home] .empty-state[data-kind="chat"] {
  display: none !important;
}

/* 垂直居中容器 */
html[data-claude-studio][data-cs-home] .chunk-editor-main {
  position: relative !important;
  justify-content: center !important;
  padding-bottom: 12vh !important;
}
html[data-claude-studio][data-cs-home] ms-playground-toolbar {
  position: absolute !important;
  inset: 0 0 auto 0 !important;
  z-index: 2 !important;
}
html[data-claude-studio][data-cs-home] .chat-container {
  flex: 0 0 auto !important;
  width: 100% !important;
  max-width: var(--cs-chat-width, 960px) !important;
  margin: 0 auto !important;
  padding: 0 24px !important;
  box-sizing: border-box !important;
}
html[data-claude-studio][data-cs-home] .chunk-editor-main > footer {
  flex: 0 0 auto !important;
  position: relative !important;
  bottom: auto !important;
  max-width: min(calc(var(--cs-chat-width, 960px) - 40px), 1100px) !important;
  margin: 0 auto !important;
  padding: 0 !important;
}
html[data-claude-studio][data-cs-home] .chunk-editor-main > footer::before { display: none !important; }
html[data-claude-studio][data-cs-home] ms-chat-bottom-overlay { background: transparent !important; }

/* 欢迎页标题与太阳星号图标 */
#claude-studio-welcome { display: none; }
html[data-claude-studio][data-cs-home] #claude-studio-welcome {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 13px !important;
  padding: 0 0 32px !important;
}
#claude-studio-welcome .cs-sun {
  color: #C87556 !important;
  font: 48px/1 Georgia, serif !important;
  display: inline-block !important;
}
#claude-studio-welcome h2 {
  margin: 0 !important;
  font: 400 34px/1.5 Georgia, "Noto Serif CJK SC", "Songti SC", STSong, serif !important;
  letter-spacing: -0.035em !important;
  color: var(--cs-welcome-heading) !important;
}

/* 输入框内模型选择器 pill */
#claude-studio-model { display: none; }
html[data-claude-studio] #claude-studio-model {
  display: inline-flex !important;
  align-items: center !important;
  gap: 7px !important;
  border: 0 !important;
  background: transparent !important;
  color: var(--cs-muted) !important;
  padding: 6px 7px !important;
  border-radius: 7px !important;
  white-space: nowrap !important;
  font: 12px/1.4 var(--cs-ui) !important;
  cursor: pointer !important;
  max-width: 175px !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
html[data-claude-studio] #claude-studio-model:hover {
  background: var(--cs-soft) !important;
  color: var(--cs-text) !important;
}
html[data-claude-studio] #claude-studio-model::after {
  content: '⌄' !important;
  font-size: 14px !important;
}

/* 4 个快捷灵感胶囊 */
#claude-studio-starters { display: none; }
html[data-claude-studio][data-cs-home] #claude-studio-starters {
  display: flex !important;
  justify-content: center !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  margin-top: 18px !important;
}
html[data-claude-studio] #claude-studio-starters button {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 8px 12px !important;
  border: 1px solid var(--cs-starter-border) !important;
  border-radius: 8px !important;
  background: transparent !important;
  color: var(--cs-muted) !important;
  font: 12px/1.4 var(--cs-ui) !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}
html[data-claude-studio] #claude-studio-starters button:hover {
  background: var(--cs-soft) !important;
  color: var(--cs-text) !important;
}
html[data-claude-studio] #claude-studio-starters svg {
  width: 17px;
  height: 17px;
  stroke: currentColor;
}
html[data-claude-studio][data-cs-draft] #claude-studio-starters {
  visibility: hidden !important;
  pointer-events: none !important;
}

/* 对话态胶囊输入框 */
html[data-claude-studio]:not([data-cs-home]) .chunk-editor-main > footer { padding-bottom: 48px !important; }
html[data-claude-studio]:not([data-cs-home]) ms-prompt-box .prompt-box-container {
  position: relative;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: 8px;
  padding: 8px 10px !important;
  border-radius: 14px !important;
}
html[data-claude-studio]:not([data-cs-home]) ms-prompt-box .textarea-row { grid-column: 1; grid-row: 1; align-self: center; min-width: 0; margin: 0 !important; }
html[data-claude-studio]:not([data-cs-home]) ms-prompt-box .text-wrapper { min-height: 0 !important; }
html[data-claude-studio]:not([data-cs-home]) ms-prompt-box textarea { width: 100% !important; min-height: 32px !important; padding: 4px 0 4px 36px !important; }
html[data-claude-studio]:not([data-cs-home]) ms-prompt-box .buttons-row { display: contents !important; }
html[data-claude-studio]:not([data-cs-home]) ms-prompt-box .button-wrapper { grid-column: 2; grid-row: 1; align-self: end; margin: 0 !important; }
html[data-claude-studio]:not([data-cs-home]) ms-prompt-box .button-row-left { position: absolute; left: 10px; top: calc(100% + 6px); width: calc(100% - 205px); height: 30px; margin: 0 !important; }
html[data-claude-studio]:not([data-cs-home]) ms-prompt-box ms-add-media-button { position: absolute; left: 0; bottom: calc(100% + 14px); }
html[data-claude-studio]:not([data-cs-home]) #claude-studio-model { position: absolute; right: 0; top: calc(100% + 6px); height: 30px; box-sizing: border-box; }
html[data-claude-studio]:not([data-cs-home]) ms-chat-bottom-overlay { height: 20px !important; }
html[data-claude-studio]:not([data-cs-home]) .chunk-editor-main > footer > ms-chat-bottom-overlay .bottom-overlay {
  background: linear-gradient(to top, var(--cs-bg), transparent) !important;
}

/* 行内与块级公式 */
html[data-claude-studio] pre:has(.katex) { background: transparent !important; border: 0 !important; box-shadow: none !important; padding: 4px 0 !important; }
html[data-claude-studio] .katex-display { overflow-x: auto; overflow-y: hidden; max-width: 100%; margin: .75em 0 !important; }
html[data-claude-studio] ms-cmark-node:has(>ms-katex.inline) { display: contents !important; }
html[data-claude-studio] :is(ms-katex.inline, ms-katex.inline pre, ms-katex.inline code.rendered, ms-katex.inline .katex, ms-katex.inline .katex-display) { display: inline !important; width: auto !important; max-width: none !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; text-align: inherit !important; vertical-align: baseline !important; }
html[data-claude-studio] :is(ms-katex.inline, ms-katex.inline pre, ms-katex.inline code.rendered) { white-space: normal !important; }
html[data-claude-studio] ms-katex.inline .katex { white-space: nowrap !important; }

/* 气泡式对话 */
html[data-claude-studio] .chat-turn-container.user { background: transparent !important; border: 0 !important; box-shadow: none !important; padding: 0 !important; margin: 16px 0 28px !important; }
html[data-claude-studio] .user-prompt-container { background: var(--cs-soft) !important; border: 0 !important; border-radius: 16px !important; padding: 14px 18px !important; margin-left: auto !important; max-width: 88% !important; width: fit-content !important; }
html[data-claude-studio] .user-prompt-container :is(ms-text-chunk, .markdown) { font: 14px/1.6 var(--cs-ui) !important; }
/* Rendered user messages: leave the composer and the inline editor unchanged. */
html[data-claude-studio] .chat-turn-container.user.render {
  padding-inline: 8px !important;
  margin-bottom: 12px !important;
}
html[data-claude-studio] .chat-turn-container.user.render > .user-prompt-container {
  box-sizing: border-box;
  border-radius: 12px !important;
  padding: 10px 16px !important;
}
html[data-claude-studio] .chat-turn-container.user.render .user-prompt-container :is(ms-text-chunk, .markdown) {
  font: 16px/1.5 var(--cs-ui) !important;
  text-align: start;
}
/* The answer's paragraph rhythm must not add bottom padding inside a user bubble. */
html[data-claude-studio] .chat-turn-container.user.render .user-prompt-container
  :is(.markdown, ms-cmark-node.user-chunk, ms-cmark-node.user-chunk > ms-cmark-node:last-child) > p:last-child {
  margin-block-end: 0 !important;
}
html[data-claude-studio] .chat-turn-container.user.render > .user-prompt-container > .turn-content > .turn-separator {
  display: none !important;
}
/* Keep the native author heading and time in the accessibility tree, without a visual row. */
html[data-claude-studio] .chat-turn-container.user.render > .user-prompt-container > .turn-content > .author-label {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: 0 !important;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
html[data-claude-studio] .chat-turn-container.model {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  padding: 0 8px !important;
  margin: 0 0 20px !important;
  position: relative !important;
}
html[data-claude-studio] .model-prompt-container {
  padding: 0 !important;
}

/* Thoughts: use a quiet disclosure above the answer, with AI Studio's native toggle. */
html[data-claude-studio] ms-chat-turn.thought-activity-host > .chat-turn-container.model {
  margin-bottom: 0 !important;
}
html[data-claude-studio] ms-thought-chunk {
  margin-bottom: 0 !important;
}
html[data-claude-studio] ms-thought-chunk .compact-accordion > .thought-panel {
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}
html[data-claude-studio] ms-thought-chunk .thought-panel > .top-panel-header {
  display: inline-flex !important;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  max-width: 100%;
  min-height: 32px;
  height: auto !important;
  padding: 4px 8px !important;
  border-radius: 7px !important;
  background: transparent !important;
  color: var(--cs-muted) !important;
  font: 500 13px/1.4 var(--cs-ui) !important;
}
html[data-claude-studio] ms-thought-chunk .thought-panel > .top-panel-header[aria-disabled="false"]:hover {
  background: var(--cs-soft) !important;
  color: var(--cs-text) !important;
}
html[data-claude-studio] ms-thought-chunk .thought-panel > .top-panel-header:focus-visible {
  outline: 2px solid var(--cs-accent) !important;
  outline-offset: -2px;
}
html[data-claude-studio] ms-thought-chunk .top-panel-header .top-panel-title {
  gap: 6px;
  margin: 0 !important;
  color: inherit !important;
  font: inherit !important;
  filter: grayscale(1);
}
html[data-claude-studio] ms-thought-chunk .thought-panel > .top-panel-header[aria-disabled="false"]::after {
  content: "";
  flex: 0 0 6px;
  height: 6px;
  border: solid currentColor;
  border-width: 0 1.5px 1.5px 0;
  transform: rotate(-45deg);
}
html[data-claude-studio] ms-thought-chunk .thought-panel > .top-panel-header[aria-expanded="true"]::after {
  transform: translateY(-2px) rotate(45deg);
}
html[data-claude-studio] ms-thought-chunk .thought-panel > .mat-expansion-panel-content-wrapper .mat-expansion-panel-body {
  margin: 4px 0 8px 8px;
  padding: 2px 0 2px 14px !important;
  border-inline-start: 1px solid var(--cs-border);
}
html[data-claude-studio] ms-thought-chunk .thought-panel .mat-expansion-panel-body :is(ms-text-chunk, .markdown) {
  color: var(--cs-muted) !important;
  font-size: 15px !important;
}
/* Hide the secondary hint only when the native header is available as the disclosure. */
html[data-claude-studio] ms-thought-chunk .compact-accordion:has(> .thought-panel > .top-panel-header[aria-disabled="false"])
  > mat-expansion-panel[disabled]:has(> mat-expansion-panel-header .thought-panel-footer) {
  display: none !important;
}

/* 彻底隐藏点赞反馈按钮以及模型响应用时秒数小胶囊 (Model run stats) 及底栏 */
.model-run-time-pill,
[dialoglabel="Model run stats"],
html[data-claude-studio] .chat-turn-container.model > .turn-footer {
  display: none !important;
}

/* ==================== 原生 View Transition 圆形扩散动画 (双轨驱动) ==================== */
@keyframes cs-circle-spread {
  from {
    clip-path: circle(0px at var(--cs-circle-x, 90vw) var(--cs-circle-y, 24px));
  }
  to {
    clip-path: circle(var(--cs-circle-r, 2500px) at var(--cs-circle-x, 90vw) var(--cs-circle-y, 24px));
  }
}
::view-transition,
::view-transition-group(root),
::view-transition-image-pair(root) {
  animation: none !important;
  mix-blend-mode: normal !important;
  pointer-events: none !important;
}
::view-transition-old(root) {
  animation: none !important;
  z-index: 1 !important;
  mix-blend-mode: normal !important;
}
::view-transition-new(root) {
  animation: cs-circle-spread var(--cs-anim-duration, 520ms) cubic-bezier(0.22, 1, 0.36, 1) !important;
  z-index: 999999 !important;
  mix-blend-mode: normal !important;
}

/* ==================== 顶栏原生化主题切换与设置控制组 (符合 upstream PR 标准) ==================== */
#claude-studio-theme-group {
  display: inline-flex !important;
  align-items: center !important;
  margin: 0 4px !important;
  vertical-align: middle !important;
  position: relative !important;
}

#claude-studio-theme-toggle {
  appearance: none;
  position: static;
  width: 32px !important;
  min-width: 32px !important;
  height: 32px !important;
  box-sizing: border-box;
  border-radius: 9px !important;
  border: 0 !important;
  background: transparent !important;
  color: var(--cs-muted, inherit) !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: none !important;
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
  user-select: none;
  padding: 4px !important;
  margin: 0 !important;
}
#claude-studio-theme-toggle:hover {
  background: var(--cs-soft, rgba(0, 0, 0, 0.06)) !important;
  color: var(--cs-text, inherit) !important;
}
#claude-studio-theme-toggle svg {
  display: block;
  width: 18px;
  height: 18px;
  fill: none !important;
  stroke: currentColor !important;
  stroke-width: 2 !important;
  stroke-linecap: round !important;
  stroke-linejoin: round !important;
}

/* ==================== 现代化悬浮独立设置面板系统 (完全对标 LDFC C.html 设计规范) ==================== */
#claude-studio-settings-panel[hidden] {
  display: none !important;
}
#claude-studio-settings-panel {
  position: fixed !important;
  right: 16px !important;
  top: 60px !important;
  width: min(390px, calc(100vw - 32px)) !important;
  max-height: calc(100vh - 80px) !important;
  box-sizing: border-box !important;
  z-index: 2147483647 !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  padding: 0 !important;
  border-radius: 14px !important;
  border: 1px solid #d8d3c5 !important;
  background: rgba(247, 245, 239, 0.98) !important;
  color: #1c1b18 !important;
  box-shadow: 0 24px 60px -12px rgba(40, 30, 20, 0.2), 0 4px 16px rgba(0, 0, 0, 0.06) !important;
  backdrop-filter: blur(24px) saturate(160%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(160%) !important;
  font-family: var(--cs-ui, sans-serif) !important;
  scrollbar-width: thin !important;
  transition: opacity 160ms ease, transform 180ms cubic-bezier(0.16, 1, 0.3, 1) !important;
}
html[data-cs-theme="dark"] #claude-studio-settings-panel {
  border-color: rgba(255, 255, 255, 0.09) !important;
  background: rgba(24, 23, 20, 0.98) !important;
  color: #f3efe6 !important;
  box-shadow: 0 34px 80px -40px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
}

/* 线性图标基础类 (对标 C.html --sw: 1.8) */
.cs-c-ico {
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
  fill: none !important;
  stroke: currentColor !important;
  stroke-width: 1.8 !important;
  stroke-linecap: round !important;
  stroke-linejoin: round !important;
}

/* C.html 风格吸顶标题栏 */
.cs-c-sheethead {
  position: sticky !important;
  top: 0 !important;
  z-index: 10 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 14px 16px 12px !important;
  background: linear-gradient(180deg, rgba(201, 100, 66, 0.1), rgba(247, 245, 239, 0.98)) !important;
  border-bottom: 1px solid #e5dfd2 !important;
  backdrop-filter: blur(12px) !important;
}
html[data-cs-theme="dark"] .cs-c-sheethead {
  background: linear-gradient(180deg, rgba(229, 139, 60, 0.12), rgba(24, 23, 20, 0.98)) !important;
  border-bottom-color: rgba(255, 255, 255, 0.07) !important;
}
.cs-c-sheethead h3 {
  margin: 0 !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  color: inherit !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  letter-spacing: 0.01em !important;
}
.cs-c-dot {
  width: 7px !important;
  height: 7px !important;
  border-radius: 50% !important;
  background: var(--cs-accent, #c96442) !important;
  box-shadow: 0 0 10px color-mix(in srgb, var(--cs-accent, #c96442) 80%, transparent) !important;
}
.cs-c-headtools {
  display: flex !important;
  gap: 7px !important;
}
.cs-c-sqbtn {
  width: 29px !important;
  height: 29px !important;
  padding: 0 !important;
  border: 1px solid #ddd7ca !important;
  border-radius: 9px !important;
  background: rgba(0, 0, 0, 0.04) !important;
  color: #7a7265 !important;
  display: grid !important;
  place-items: center !important;
  cursor: pointer !important;
  transition: all 0.16s ease !important;
}
html[data-cs-theme="dark"] .cs-c-sqbtn {
  border-color: rgba(255, 255, 255, 0.1) !important;
  background: rgba(255, 255, 255, 0.05) !important;
  color: #a39b8c !important;
}
.cs-c-sqbtn:hover {
  background: rgba(0, 0, 0, 0.08) !important;
  color: #1c1b18 !important;
}
html[data-cs-theme="dark"] .cs-c-sqbtn:hover {
  background: rgba(255, 255, 255, 0.12) !important;
  color: #f3efe6 !important;
}
.cs-c-sqbtn.on {
  background: var(--cs-accent, #c96442) !important;
  border-color: transparent !important;
  color: #fff !important;
  box-shadow: 0 4px 14px -4px color-mix(in srgb, var(--cs-accent, #c96442) 80%, transparent) !important;
}

/* 面板主体内容区 */
.cs-c-body {
  padding: 12px 12px 6px !important;
}

/* 分区卡片 (对标 C.html .setsec) */
.cs-c-setsec {
  margin-bottom: 11px !important;
  border: 1px solid #e4ded2 !important;
  border-radius: 12px !important;
  overflow: hidden !important;
  background: #ffffff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03) !important;
}
html[data-cs-theme="dark"] .cs-c-setsec {
  border-color: rgba(255, 255, 255, 0.07) !important;
  background: rgba(255, 255, 255, 0.028) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
}
.cs-c-setsechead {
  display: flex !important;
  align-items: center !important;
  gap: 9px !important;
  padding: 10px 12px !important;
  background: rgba(201, 100, 66, 0.06) !important;
  border-bottom: 1px solid #eee8dc !important;
}
html[data-cs-theme="dark"] .cs-c-setsechead {
  background: rgba(229, 139, 60, 0.1) !important;
  border-bottom-color: rgba(255, 255, 255, 0.05) !important;
}
.cs-c-iconchip {
  width: 24px !important;
  height: 24px !important;
  border-radius: 8px !important;
  display: grid !important;
  place-items: center !important;
  background: rgba(201, 100, 66, 0.15) !important;
  color: var(--cs-accent, #c96442) !important;
}
html[data-cs-theme="dark"] .cs-c-iconchip {
  background: rgba(229, 139, 60, 0.22) !important;
  color: var(--cs-accent, #e58b3c) !important;
}
.cs-c-setsechead b {
  font-size: 13px !important;
  font-weight: 700 !important;
  letter-spacing: 0.02em !important;
  color: inherit !important;
}
.cs-c-setsechead em {
  margin-left: auto !important;
  font-style: normal !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  color: var(--cs-accent, #c96442) !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace !important;
}
html[data-cs-theme="dark"] .cs-c-setsechead em {
  color: var(--cs-accent, #e58b3c) !important;
}

/* 滑块控件 */
.cs-c-slider-box {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  padding: 10px 12px 6px !important;
}
.cs-c-slider-box input[type="range"] {
  flex: 1 !important;
  accent-color: var(--cs-accent, #c96442) !important;
  cursor: pointer !important;
  height: 4px !important;
}
.cs-c-tip {
  font-size: 11px !important;
  color: #8c8374 !important;
  white-space: nowrap !important;
  font-variant-numeric: tabular-nums !important;
}
html[data-cs-theme="dark"] .cs-c-tip {
  color: #a39b8c !important;
}

/* C.html 标志性分段胶囊按钮组 (.seg) */
.cs-c-seg {
  display: flex !important;
  gap: 6px !important;
  padding: 8px 12px 12px !important;
  flex-wrap: wrap !important;
}
.cs-c-seg button {
  padding: 5px 11px !important;
  border-radius: 999px !important;
  border: 1px solid #dcd5c7 !important;
  background: #f8f6f0 !important;
  color: #5c5548 !important;
  font-size: 11.5px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: all .16s ease !important;
  white-space: nowrap !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 5px !important;
}
html[data-cs-theme="dark"] .cs-c-seg button {
  border-color: rgba(255, 255, 255, 0.12) !important;
  background: transparent !important;
  color: #a39b8c !important;
}
.cs-c-seg button:hover {
  border-color: var(--cs-accent, #c96442) !important;
  color: #1c1b18 !important;
}
html[data-cs-theme="dark"] .cs-c-seg button:hover {
  border-color: var(--cs-accent, #e58b3c) !important;
  color: #f3efe6 !important;
}
.cs-c-seg button.on {
  background: rgba(201, 100, 66, 0.12) !important;
  border-color: rgba(201, 100, 66, 0.45) !important;
  color: var(--cs-accent, #c96442) !important;
  font-weight: 700 !important;
  box-shadow: 0 2px 8px rgba(201, 100, 66, 0.2) !important;
}
html[data-cs-theme="dark"] .cs-c-seg button.on {
  background: rgba(229, 139, 60, 0.2) !important;
  border-color: rgba(229, 139, 60, 0.5) !important;
  color: var(--cs-accent, #e58b3c) !important;
  box-shadow: 0 2px 8px rgba(229, 139, 60, 0.24) !important;
}

/* 动效预览测试按钮 */
.cs-c-btn-test {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  width: calc(100% - 24px) !important;
  margin: 0 12px 12px !important;
  padding: 7px 10px !important;
  font-size: 11.5px !important;
  font-weight: 600 !important;
  border: 1px dashed rgba(201, 100, 66, 0.5) !important;
  border-radius: 8px !important;
  background: transparent !important;
  color: var(--cs-accent, #c96442) !important;
  cursor: pointer !important;
  transition: all .16s ease !important;
}
html[data-cs-theme="dark"] .cs-c-btn-test {
  border-color: rgba(229, 139, 60, 0.5) !important;
  color: var(--cs-accent, #e58b3c) !important;
}
.cs-c-btn-test:hover {
  background: rgba(201, 100, 66, 0.1) !important;
  border-style: solid !important;
}
html[data-cs-theme="dark"] .cs-c-btn-test:hover {
  background: rgba(229, 139, 60, 0.12) !important;
}

/* C.html 标志性底部操作栏 (.sheetfoot) */
.cs-c-sheetfoot {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 8px !important;
  padding: 12px 16px !important;
  border-top: 1px solid #e5dfd2 !important;
  background: rgba(247, 245, 239, 0.98) !important;
}
html[data-cs-theme="dark"] .cs-c-sheetfoot {
  border-top-color: rgba(255, 255, 255, 0.07) !important;
  background: rgba(24, 23, 20, 0.98) !important;
}
.cs-c-solidbtn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 7px 16px !important;
  border-radius: 999px !important;
  border: 0 !important;
  background: var(--cs-accent, #c96442) !important;
  color: #fff !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--cs-accent, #c96442) 80%, transparent) !important;
  transition: all .16s ease !important;
}
.cs-c-solidbtn:hover {
  opacity: 0.92 !important;
  transform: translateY(-1px) !important;
}
.cs-c-ghostbtn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 6px 14px !important;
  border-radius: 999px !important;
  border: 1px solid #dcd5c7 !important;
  background: transparent !important;
  color: #7a7265 !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: all .16s ease !important;
}
html[data-cs-theme="dark"] .cs-c-ghostbtn {
  border-color: rgba(255, 255, 255, 0.14) !important;
  color: #a39b8c !important;
}
.cs-c-ghostbtn:hover {
  border-color: var(--cs-accent, #c96442) !important;
  color: #1c1b18 !important;
}
html[data-cs-theme="dark"] .cs-c-ghostbtn:hover {
  border-color: var(--cs-accent, #e58b3c) !important;
  color: #f3efe6 !important;
}

/* Toast 提示条 */
#claude-theme-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: rgba(30, 30, 30, 0.92);
  color: #fff;
  padding: 10px 18px;
  border-radius: 9px;
  font: 13px/1.4 var(--cs-ui);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.3);
  z-index: 2147483647 !important;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.25s ease, transform 0.25s ease;
}
#claude-theme-toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
`;

    function showToast(message) {
        let toast = document.getElementById('claude-theme-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'claude-theme-toast';
            const toastHost = document.documentElement || document.body;
            toastHost.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.classList.remove('show');
        }, 2600);
    }

    function applyChatWidth() {
        const root = document.documentElement;
        if (root) {
            root.style.setProperty('--cs-chat-width', chatWidth);
        }
    }

    function setChatWidth(width) {
        if (!width) return;
        chatWidth = width;
        if (typeof GM_setValue === 'function') {
            GM_setValue(KEY_CHAT_WIDTH, width);
        }
        applyChatWidth();
        updateSettingsPanelUi();
        const desc = width === '760px' ? '紧凑原版' : (width === '960px' ? '舒适宽屏' : (width === '1120px' ? '超宽代码' : '100% 满屏'));
        showToast(`对话区宽度已设为【${width}】(${desc})`);
    }

    function applyThemeClasses() {
        const root = document.documentElement;
        if (!root) return;
        root.toggleAttribute('data-claude-studio', enabled);
        if (enabled && currentTheme === 'dark') {
            root.setAttribute('data-cs-theme', 'dark');
            root.style.colorScheme = 'dark';
        } else {
            root.removeAttribute('data-cs-theme');
            root.style.colorScheme = 'light';
        }
        applyChatWidth();
    }

    // 同步 AI Studio 原生设置与 Angular Signal
    function syncNativeGoogleTheme(theme) {
        if (!['dark', 'light'].includes(theme)) return;
        try {
            const raw = window.localStorage.getItem('theme');
            const data = raw ? JSON.parse(raw) : {};
            if (data.theme !== theme) {
                data.theme = theme;
                window.localStorage.setItem('theme', JSON.stringify(data));
                window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: JSON.stringify(data) }));
            }
        } catch (_) {}

        if (document.body) {
            if (theme === 'dark') {
                document.body.classList.add('dark-theme');
                document.body.classList.remove('light-theme');
            } else {
                document.body.classList.remove('dark-theme');
                document.body.classList.add('light-theme');
            }
        }

        // 尝试触发 Angular Signal
        try {
            const targets = document.querySelectorAll('app-root, ms-app, ms-navbar-v2, ms-playground-toolbar');
            for (const el of targets) {
                const ctx = el.__ngContext__;
                if (!ctx) continue;
                const items = Array.isArray(ctx) ? ctx : [ctx];
                for (const item of items) {
                    if (!item || typeof item !== 'object') continue;
                    if (item.theme && typeof item.theme.set === 'function') {
                        item.theme.set(theme);
                        return;
                    }
                    if (item.Va && item.Va.theme && typeof item.Va.theme.set === 'function') {
                        item.Va.theme.set(theme);
                        return;
                    }
                }
            }
        } catch (_) {}
    }

    // 设置默认启动主题
    function setDefaultTheme(theme) {
        if (!['dark', 'light'].includes(theme)) return;
        configuredDefault = theme;
        currentTheme = theme;
        if (typeof GM_setValue === 'function') {
            GM_setValue(KEY_DEFAULT_THEME, theme);
            GM_setValue(KEY_THEME, theme);
        }
        applyThemeClasses();
        createOrUpdateToggleBtn();
        syncNativeGoogleTheme(theme);
        showToast(`已将【${theme === 'dark' ? 'Claude 暗黑主题' : '暖纸浅色主题'}】设为启动默认主题！`);
    }

    // 创建或更新顶栏原生风格主题切换按钮（鼠标靠近自动开面板，离开自动关，点击切换主题）
    function createOrUpdateToggleBtn() {
        if (!enabled) {
            document.getElementById('claude-studio-theme-group')?.remove();
            document.getElementById('claude-studio-speed-badge')?.remove();
            closeSettingsPanel();
            return;
        }

        // 彻底清理历史残留胶囊与设置按钮
        document.getElementById('claude-studio-speed-badge')?.remove();
        document.getElementById('claude-studio-settings-toggle')?.remove();

        let group = document.getElementById('claude-studio-theme-group');
        let btn = document.getElementById('claude-studio-theme-toggle');

        if (!group) {
            group = document.createElement('div');
            group.id = 'claude-studio-theme-group';
        }

        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'claude-studio-theme-toggle';
            btn.type = 'button';
            btn.className = 'ms-button-icon ms-button-borderless';
            group.appendChild(btn);
        }

        // 手势分流绑定：左键切主题（Alt+左键唤出设置），右键唤出设置，快捷键 Alt+C
        if (!btn.hasAttribute('data-cs-bound')) {
            btn.setAttribute('data-cs-bound', '1');

            // 1. 右键单击直接唤起或关闭设置面板，阻止原生浏览器右键菜单
            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleSettingsPanel();
            });

            // 2. 左键单击：若按住 Alt 键直接打开设置面板，否则执行顺畅的主题切换扩散动画
            btn.addEventListener('click', (event) => {
                if (event.altKey) {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleSettingsPanel();
                    return;
                }
                toggleThemeWithAnimation(event);
            });
        }

        const isDark = currentTheme === 'dark';
        btn.setAttribute('aria-label', isDark ? '切换到暖纸浅色主题' : '切换到 Claude 暗黑主题');
        btn.setAttribute('aria-pressed', String(isDark));
        btn.title = isDark
            ? '当前：Claude 暗黑模式\n• 左键点击：切换到暖纸浅色\n• 右键点击 / Alt+点击：打开偏好设置\n• 快捷键：Alt+C'
            : '当前：暖纸浅色模式\n• 左键点击：切换到 Claude 暗黑\n• 右键点击 / Alt+点击：打开偏好设置\n• 快捷键：Alt+C';

        if (btn.dataset.themeIcon !== currentTheme || !btn.querySelector('svg')) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('width', '18');
            svg.setAttribute('height', '18');
            svg.setAttribute('aria-hidden', 'true');
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'currentColor');
            svg.setAttribute('stroke-width', '2');
            svg.setAttribute('stroke-linecap', 'round');
            svg.setAttribute('stroke-linejoin', 'round');

            if (isDark) {
                // 太阳图标（带 8 条发散光芒射线，用于切换到浅色暖纸主题）
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12'); circle.setAttribute('r', '4');
                circle.setAttribute('fill', 'none');
                circle.setAttribute('stroke', 'currentColor');
                circle.setAttribute('stroke-width', '2');

                const rays = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                rays.setAttribute('d', 'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41');
                rays.setAttribute('fill', 'none');
                rays.setAttribute('stroke', 'currentColor');
                rays.setAttribute('stroke-width', '2');
                rays.setAttribute('stroke-linecap', 'round');

                svg.append(circle, rays);
            } else {
                // 月亮图标（优雅新月，用于切换到 Claude 暗黑主题）
                const crescent = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                crescent.setAttribute('d', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');
                crescent.setAttribute('fill', 'none');
                crescent.setAttribute('stroke', 'currentColor');
                crescent.setAttribute('stroke-width', '2');
                crescent.setAttribute('stroke-linecap', 'round');
                crescent.setAttribute('stroke-linejoin', 'round');

                svg.appendChild(crescent);
            }
            btn.replaceChildren(svg);
            btn.dataset.themeIcon = currentTheme;
        }

        // 精准嵌入右侧原生顶栏工具栏（与 share、tune 等图标融为一体）
        const candidateToolbar = document.querySelector('ms-playground-toolbar .toolbar-right, ms-header .toolbar-right, ms-navbar-v2 .toolbar-right');
        const tbRect = candidateToolbar?.getBoundingClientRect?.();
        const isValidTopToolbar = Boolean(candidateToolbar && tbRect && tbRect.height > 0 && tbRect.top < 120);

        if (isValidTopToolbar) {
            if (group.parentElement !== candidateToolbar) {
                candidateToolbar.prepend(group);
            }
            group.style.removeProperty('position');
            group.style.removeProperty('top');
            group.style.removeProperty('right');
            group.style.removeProperty('z-index');
        } else {
            // 工具栏未就绪或处于首页欢迎状态时，牢固置于视口右上角
            const host = document.body || document.documentElement;
            if (group.parentElement !== host && host) {
                host.appendChild(group);
            }
            group.style.setProperty('position', 'fixed', 'important');
            group.style.setProperty('top', '12px', 'important');
            group.style.setProperty('right', '24px', 'important');
            group.style.setProperty('z-index', '2147483000', 'important');
        }
    }

    // ==================== 真正渐进式颜色替换扩散动画 (View Transition) ====================
    function toggleThemeWithAnimation(event) {
        if (isThemeTransitioning) {
            // 若扩散动画正在缓慢运行中（如 0.1x 慢动作），再次点击可立即瞬间完成跳过
            try {
                if (activeThemeTransition?.skipTransition) {
                    activeThemeTransition.skipTransition();
                } else if (document.activeViewTransition?.skipTransition) {
                    document.activeViewTransition.skipTransition();
                }
            } catch (_) {}
            activeThemeTransition = null;
            isThemeTransitioning = false;
            return;
        }
        isThemeTransitioning = true;

        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

        const btn = document.getElementById('claude-studio-theme-toggle');
        const rect = btn?.getBoundingClientRect();

        // 精确定位按钮中心作为圆心
        const x = rect ? Math.round(rect.left + rect.width / 2) : (window.innerWidth - 68);
        const y = rect ? Math.round(rect.top + rect.height / 2) : 28;

        // 计算覆盖视口所有四角所需的最大外接圆半径
        const endRadius = Math.ceil(Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        )) + 50;

        const currentSpeed = Math.min(2.0, Math.max(0.1, Number(animSpeed) || 1.0));
        const duration = Math.round(BASE_DURATION / currentSpeed);
        const easing = 'cubic-bezier(0.22, 1, 0.36, 1)';

        // 关键：将动画位置与时长写入 CSS 变量，确保双轨驱动下扩散动画 100% 播放
        const root = document.documentElement;
        if (root) {
            root.style.setProperty('--cs-circle-x', `${x}px`);
            root.style.setProperty('--cs-circle-y', `${y}px`);
            root.style.setProperty('--cs-circle-r', `${endRadius}px`);
            root.style.setProperty('--cs-anim-duration', `${duration}ms`);
        }

        const performUpdate = () => {
            currentTheme = nextTheme;
            if (typeof GM_setValue === 'function') {
                GM_setValue(KEY_THEME, nextTheme);
            }
            applyThemeClasses();
            createOrUpdateToggleBtn();
            syncNativeGoogleTheme(nextTheme);
        };

        // 按钮旋转动画时间与倍速完全联动
        if (btn) {
            const rotDurationMs = Math.round(Math.min(2500, (BASE_DURATION / animSpeed)));
            btn.style.transition = `transform ${rotDurationMs}ms cubic-bezier(0.25, 1, 0.5, 1)`;
            btn.style.transform = nextTheme === 'dark' ? 'rotate(-360deg)' : 'rotate(360deg)';
            setTimeout(() => {
                if (btn) {
                    btn.style.transition = 'none';
                    btn.style.transform = 'none';
                }
            }, rotDurationMs + 50);
        }

        // 不支持 View Transition 或偏好减弱动效时直接应用
        if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            performUpdate();
            isThemeTransitioning = false;
            return;
        }

        // 原生 View Transition 真正渐进式替换：
        // 底层保留旧主题画面，顶层应用新主题实时渲染，以右上角为圆心扩散，内部是实实在在的新主题 UI，绝非遮挡内容的纯色块！
        try {
            const transition = document.startViewTransition(() => {
                performUpdate();
            });
            activeThemeTransition = transition;

            transition.ready.then(() => {
                const anim = document.documentElement.animate([
                    { clipPath: `circle(0px at ${x}px ${y}px)` },
                    { clipPath: `circle(${endRadius}px at ${x}px ${y}px)` }
                ], {
                    duration: duration,
                    easing: easing,
                    pseudoElement: '::view-transition-new(root)'
                });

                const done = () => {
                    isThemeTransitioning = false;
                    activeThemeTransition = null;
                };

                anim.onfinish = done;
                anim.oncancel = done;
                transition.finished.then(done).catch(done);
            }).catch(() => {
                isThemeTransitioning = false;
                activeThemeTransition = null;
            });
        } catch (_) {
            performUpdate();
            isThemeTransitioning = false;
            activeThemeTransition = null;
        }
    }

    // ==================== 即时交互响应器（解决 View Transition 期间点击被阻断问题） ====================
    // 当 View Transition 处于动画中时，浏览器底层默认会阻止真实 DOM 的 hit-test。
    // 如果用户在动画期间点击了页面（例如输入框、按钮、链接）或按下按键，立即瞬间结束动画并恢复真实 DOM 交互，确保 0 延迟响应。
    const interruptThemeTransition = (event) => {
        if (!activeThemeTransition && !document.activeViewTransition) return;
        // 允许主题切换按钮与独立设置面板组件的交互正常进行
        if (event?.target?.closest?.('#claude-studio-theme-toggle') ||
            event?.target?.closest?.('#claude-studio-theme-group') ||
            event?.target?.closest?.('#claude-studio-settings-panel')) {
            return;
        }

        try {
            if (activeThemeTransition?.skipTransition) {
                activeThemeTransition.skipTransition();
            } else if (document.activeViewTransition?.skipTransition) {
                document.activeViewTransition.skipTransition();
            }
        } catch (_) {}
        activeThemeTransition = null;
        isThemeTransitioning = false;

        // 如果用户点击了输入框或其外层容器区域，即刻聚焦输入框，消除首击无响应
        const target = event?.target;
        const x = typeof event.clientX === 'number' ? event.clientX : -1;
        const y = typeof event.clientY === 'number' ? event.clientY : -1;
        const pointEl = (x >= 0 && y >= 0) ? document.elementFromPoint(x, y) : null;
        const promptBox = target?.closest?.('ms-prompt-box') || pointEl?.closest?.('ms-prompt-box');
        if (promptBox || target?.matches?.('textarea, input') || pointEl?.matches?.('textarea, input')) {
            const input = promptBox?.querySelector('textarea[aria-label="Enter a prompt"], textarea') ||
                         (target?.matches?.('textarea, input') ? target : (pointEl?.matches?.('textarea, input') ? pointEl : null));
            if (input && typeof input.focus === 'function') {
                input.focus();
                setTimeout(() => input.focus(), 0);
            }
        }
    };

    window.addEventListener('pointerdown', interruptThemeTransition, { capture: true, passive: true });
    window.addEventListener('mousedown', interruptThemeTransition, { capture: true, passive: true });
    window.addEventListener('keydown', interruptThemeTransition, { capture: true, passive: true });

    // ==================== 现代化悬浮独立设置面板系统 (仿 LDFC 工业级标准) ====================
    let panelDebounceTimer = null;
    let panelCloseTimer = null;
    let panelLastOpenedAt = 0; // 打开冷却防抖，避免失焦或 pointerdown 误收起
    let isPanelPinned = false; // 是否已固定常驻

    function isPanelOpen() {
        const panel = document.getElementById('claude-studio-settings-panel');
        return Boolean(panel && !panel.hidden && panel.dataset.sheetState === 'open');
    }

    function positionSettingsPanel(panel) {
        if (!panel) panel = document.getElementById('claude-studio-settings-panel');
        if (!panel) return;

        const anchor = document.getElementById('claude-studio-theme-group') || document.getElementById('claude-studio-theme-toggle');
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const panelWidth = Math.min(390, vw - 24);

        if (anchor && anchor.getBoundingClientRect) {
            const rect = anchor.getBoundingClientRect();
            if (rect.width > 0 && rect.bottom > 0) {
                let right = Math.max(12, Math.round(vw - rect.right));
                let top = Math.round(rect.bottom + 8);
                if (top + 460 > vh && rect.top > 460) {
                    top = Math.max(12, Math.round(rect.top - 8 - 460));
                }

                panel.style.setProperty('right', `${right}px`, 'important');
                panel.style.setProperty('top', `${top}px`, 'important');
                panel.style.setProperty('left', 'auto', 'important');
                panel.style.setProperty('bottom', 'auto', 'important');
                panel.style.setProperty('width', `${panelWidth}px`, 'important');
                return;
            }
        }

        // 锚点尚未渲染或不可用时的兜底右上角稳妥定位
        panel.style.setProperty('right', '16px', 'important');
        panel.style.setProperty('top', '60px', 'important');
        panel.style.setProperty('left', 'auto', 'important');
        panel.style.setProperty('bottom', 'auto', 'important');
        panel.style.setProperty('width', `${panelWidth}px`, 'important');
    }

    function updateSettingsPanelThemeStyles(panel) {
        if (!panel) panel = document.getElementById('claude-studio-settings-panel');
        if (!panel) return;
        // 彻底交由纯 CSS 规则与 CSS 变量统管深浅色外观，移除任何残留行内样式
        panel.style.removeProperty('background');
        panel.style.removeProperty('border');
        panel.style.removeProperty('color');
        panel.style.removeProperty('box-shadow');
    }

    function setAnimSpeed(speed) {
        speed = Math.min(2.0, Math.max(0.1, Math.round(Number(speed) * 10) / 10));
        animSpeed = speed;
        if (typeof GM_setValue === 'function') {
            GM_setValue(KEY_ANIM_SPEED, speed);
        }
        const ms = Math.round(BASE_DURATION / speed);
        const root = document.documentElement;
        if (root) {
            root.style.setProperty('--cs-anim-duration', `${ms}ms`);
        }
        const desc = speed < 1 ? `慢 ${(1 / speed).toFixed(1)} 倍` : (speed > 1 ? `快 ${speed.toFixed(1)} 倍` : '标准');
        showToast(`动画速度已设为【${speed.toFixed(1)}x】(${desc}，耗时约 ${ms}ms)`);
        updateSettingsPanelUi();
    }

    function updateSettingsPanelUi() {
        const panel = document.getElementById('claude-studio-settings-panel');
        if (!panel) return;

        // 1. 速度状态更新
        const speedRange = panel.querySelector('#cs-drawer-speed-range');
        const speedText = panel.querySelector('#cs-drawer-speed-text');
        const ms = Math.round(BASE_DURATION / animSpeed);
        if (speedRange) speedRange.value = animSpeed;
        if (speedText) {
            const desc = animSpeed < 1 ? `慢 ${(1 / animSpeed).toFixed(1)} 倍` : (animSpeed > 1 ? `快 ${animSpeed.toFixed(1)} 倍` : '标准');
            speedText.textContent = `${animSpeed.toFixed(1)}x (${ms}ms)`;
        }
        panel.querySelectorAll('#cs-drawer-speed-presets button').forEach(b => {
            const sp = Number(b.dataset.speed);
            const active = Math.abs(sp - animSpeed) < 0.05;
            b.classList.toggle('active', active);
            b.classList.toggle('on', active);
        });

        // 2. 宽度状态更新
        const widthText = panel.querySelector('#cs-drawer-width-text');
        if (widthText) {
            widthText.textContent = `${chatWidth}`;
        }
        panel.querySelectorAll('#cs-drawer-width-presets button').forEach(b => {
            const w = b.dataset.width;
            const active = (w === chatWidth);
            b.classList.toggle('active', active);
            b.classList.toggle('on', active);
        });

        // 3. 启动默认主题状态更新
        const themeText = panel.querySelector('#cs-drawer-theme-text');
        if (themeText) {
            themeText.textContent = configuredDefault === 'dark' ? '暗黑模式' : '暖纸浅色';
        }
        panel.querySelectorAll('#cs-drawer-theme-presets button[data-default-theme]').forEach(b => {
            const t = b.dataset.defaultTheme;
            const active = (t === configuredDefault);
            b.classList.toggle('active', active);
            b.classList.toggle('on', active);
        });

        // 4. 固定按钮状态更新
        const pinBtn = panel.querySelector('#cs-drawer-btn-pin');
        if (pinBtn) {
            pinBtn.setAttribute('aria-pressed', String(isPanelPinned));
            pinBtn.classList.toggle('on', isPanelPinned);
            pinBtn.title = isPanelPinned ? '已固定常驻（点击外部不收起）' : '固定常驻面板（点击外部不收起）';
        }
    }

    function ensureSettingsPanel() {
        let panel = document.getElementById('claude-studio-settings-panel');
        const host = document.body || document.documentElement;

        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'claude-studio-settings-panel';
            panel.hidden = true;
            panel.style.display = 'none';
            panel.setAttribute('role', 'region');
            panel.setAttribute('aria-label', 'Claude 偏好设置面板');
            panel.dataset.sheetState = 'closed';

            setSafeHTML(panel, `
                <div class="cs-c-sheethead">
                    <h3><span class="cs-c-dot"></span>Claude 偏好设置</h3>
                    <div class="cs-c-headtools">
                        <button type="button" class="cs-c-sqbtn" id="cs-drawer-btn-pin" title="固定常驻面板（点击外部不收起）" aria-label="固定面板" aria-pressed="false">
                            <svg class="cs-c-ico" viewBox="0 0 24 24"><path d="M16 3l5 5-1.5 1.5-1.5-1.5-4 4v5l-2 2-2-2v-5l-4-4L4.5 9.5 3 8l5-5 8 0z"/><line x1="12" y1="15" x2="12" y2="22"/></svg>
                        </button>
                        <button type="button" class="cs-c-sqbtn" id="cs-drawer-btn-close-header" title="关闭面板 (Esc)" aria-label="关闭">
                            <svg class="cs-c-ico" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                </div>

                <div class="cs-c-body">
                    <!-- 卡片 1：过渡动效与调速 -->
                    <section class="cs-c-setsec">
                        <div class="cs-c-setsechead">
                            <span class="cs-c-iconchip">
                                <svg class="cs-c-ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            </span>
                            <b>过渡动效与调速</b>
                            <em id="cs-drawer-speed-text">1.0x (520ms)</em>
                        </div>
                        <div class="cs-c-slider-box">
                            <span class="cs-c-tip">0.1x (慢)</span>
                            <input type="range" id="cs-drawer-speed-range" min="0.1" max="2.0" step="0.1" value="${animSpeed}">
                            <span class="cs-c-tip">2.0x (快)</span>
                        </div>
                        <div class="cs-c-seg" id="cs-drawer-speed-presets">
                            <button type="button" data-speed="0.1">0.1x 慢动</button>
                            <button type="button" data-speed="0.5">0.5x 舒缓</button>
                            <button type="button" data-speed="1.0">1.0x 标准</button>
                            <button type="button" data-speed="2.0">2.0x 极速</button>
                        </div>
                        <button type="button" class="cs-c-btn-test" id="cs-drawer-btn-test-anim">
                            <svg class="cs-c-ico" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            立即测试扩散动效
                        </button>
                    </section>

                    <!-- 卡片 2：对话区最大排版宽度 -->
                    <section class="cs-c-setsec">
                        <div class="cs-c-setsechead">
                            <span class="cs-c-iconchip">
                                <svg class="cs-c-ico" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
                            </span>
                            <b>对话区最大排版宽度</b>
                            <em id="cs-drawer-width-text">${chatWidth}</em>
                        </div>
                        <div class="cs-c-seg" id="cs-drawer-width-presets">
                            <button type="button" data-width="760px">760px 紧凑</button>
                            <button type="button" data-width="960px">960px 宽适</button>
                            <button type="button" data-width="1120px">1120px 宽展</button>
                            <button type="button" data-width="100%">100% 满屏</button>
                        </div>
                    </section>

                    <!-- 卡片 3：启动默认外观 -->
                    <section class="cs-c-setsec">
                        <div class="cs-c-setsechead">
                            <span class="cs-c-iconchip">
                                <svg class="cs-c-ico" viewBox="0 0 24 24"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
                            </span>
                            <b>启动默认外观</b>
                            <em id="cs-drawer-theme-text">${configuredDefault === 'dark' ? '暗黑模式' : '暖纸浅色'}</em>
                        </div>
                        <div class="cs-c-seg" id="cs-drawer-theme-presets">
                            <button type="button" data-default-theme="dark">
                                <svg class="cs-c-ico" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                                默认暗黑
                            </button>
                            <button type="button" data-default-theme="light">
                                <svg class="cs-c-ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                                默认暖纸
                            </button>
                            <button type="button" id="cs-drawer-btn-current-default">
                                <svg class="cs-c-ico" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                                设当前为默认
                            </button>
                        </div>
                    </section>
                </div>

                <div class="cs-c-sheetfoot">
                    <button type="button" class="cs-c-ghostbtn" id="cs-drawer-btn-reset">
                        <svg class="cs-c-ico" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><polyline points="3 3 3 8 8 8"/></svg>
                        恢复默认
                    </button>
                    <button type="button" class="cs-c-solidbtn" id="cs-drawer-btn-close">
                        <svg class="cs-c-ico" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        完成
                    </button>
                </div>
            `);
            host.appendChild(panel);

            // 关闭按钮
            panel.querySelector('#cs-drawer-btn-close-header')?.addEventListener('click', () => closeSettingsPanel(true));
            panel.querySelector('#cs-drawer-btn-close')?.addEventListener('click', () => closeSettingsPanel(true));

            // 固定按钮
            panel.querySelector('#cs-drawer-btn-pin')?.addEventListener('click', () => {
                isPanelPinned = !isPanelPinned;
                updateSettingsPanelUi();
                showToast(isPanelPinned ? '📌 面板已固定常驻（点击外部不收起）' : '已取消固定，点击外部区域可收起');
            });

            // 滑块拖动事件
            const range = panel.querySelector('#cs-drawer-speed-range');
            range?.addEventListener('input', () => {
                const val = Math.round(Number(range.value) * 10) / 10;
                animSpeed = val;
                updateSettingsPanelUi();
                if (panelDebounceTimer) clearTimeout(panelDebounceTimer);
                panelDebounceTimer = setTimeout(() => {
                    setAnimSpeed(val);
                }, 140);
            });

            // 速度预设点击
            panel.querySelectorAll('#cs-drawer-speed-presets button').forEach(b => {
                b.addEventListener('click', () => {
                    if (panelDebounceTimer) clearTimeout(panelDebounceTimer);
                    const sp = Number(b.dataset.speed);
                    setAnimSpeed(sp);
                });
            });

            // 宽度预设点击
            panel.querySelectorAll('#cs-drawer-width-presets button').forEach(b => {
                b.addEventListener('click', () => {
                    const w = b.dataset.width;
                    setChatWidth(w);
                });
            });

            // 启动主题预设点击
            panel.querySelectorAll('#cs-drawer-theme-presets button[data-default-theme]').forEach(b => {
                b.addEventListener('click', () => {
                    const t = b.dataset.defaultTheme;
                    setDefaultTheme(t);
                    updateSettingsPanelUi();
                });
            });

            panel.querySelector('#cs-drawer-btn-current-default')?.addEventListener('click', () => {
                setDefaultTheme(currentTheme);
                updateSettingsPanelUi();
            });

            // 测试动画按钮
            panel.querySelector('#cs-drawer-btn-test-anim')?.addEventListener('click', (e) => {
                closeSettingsPanel(true);
                setTimeout(() => {
                    toggleThemeWithAnimation(e);
                }, 180);
            });

            // 恢复推荐设置按钮 (1.0x / 960px / dark)
            panel.querySelector('#cs-drawer-btn-reset')?.addEventListener('click', () => {
                setAnimSpeed(1.0);
                setChatWidth('960px');
                setDefaultTheme('dark');
                showToast('已恢复推荐设置 (1.0x / 960px / 暗黑模式)');
            });
        } else if (panel.parentElement !== host) {
            host.appendChild(panel);
        }
        return panel;
    }

    function openSettingsPanel() {
        try {
            panelLastOpenedAt = Date.now();
            if (panelCloseTimer) {
                clearTimeout(panelCloseTimer);
                panelCloseTimer = null;
            }
            const panel = ensureSettingsPanel();
            if (!panel) return;

            if (panel._anim) {
                try { panel._anim.cancel(); } catch (_) {}
                panel._anim = null;
            }

            updateSettingsPanelThemeStyles(panel);
            updateSettingsPanelUi();
            panel.dataset.sheetState = 'open';
            panel.hidden = false;
            panel.style.setProperty('display', 'block', 'important');
            panel.style.setProperty('pointer-events', 'auto', 'important');
            panel.classList.add('open');
            positionSettingsPanel(panel);

            if (typeof panel.animate === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                panel._anim = panel.animate([
                    { transform: 'translateY(-10px) scale(0.96)', opacity: 0 },
                    { transform: 'translateY(0) scale(1)', opacity: 1 }
                ], {
                    duration: 180,
                    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                    fill: 'both'
                });
                panel._anim.finished.then(() => {
                    if (panel._anim) {
                        try { panel._anim.cancel(); } catch (_) {}
                        panel._anim = null;
                    }
                    panel.style.opacity = '1';
                    panel.style.transform = 'none';
                }).catch(() => {});
            } else {
                panel.style.opacity = '1';
                panel.style.transform = 'none';
            }
        } catch (err) {
            console.error('[Claude Theme] openSettingsPanel 异常:', err);
        }
    }

    function closeSettingsPanel(force = false) {
        if (panelCloseTimer) {
            clearTimeout(panelCloseTimer);
            panelCloseTimer = null;
        }
        const panel = document.getElementById('claude-studio-settings-panel');
        if (!panel || panel.hidden || panel.dataset.sheetState === 'closed') return;

        // 若已固定且非强制关闭（如点击关闭按钮为强制），则保持常驻
        if (isPanelPinned && !force) return;

        panel.dataset.sheetState = 'closing';

        if (panel._anim) {
            try { panel._anim.cancel(); } catch (_) {}
            panel._anim = null;
        }

        const finishHide = () => {
            if (panelCloseTimer) {
                clearTimeout(panelCloseTimer);
                panelCloseTimer = null;
            }
            if (panel.dataset.sheetState !== 'closing') return;

            panel.hidden = true;
            panel.style.setProperty('display', 'none', 'important');
            panel.style.setProperty('pointer-events', 'none', 'important');
            panel.classList.remove('open');
            panel.dataset.sheetState = 'closed';
            panel._anim = null;
        };

        if (force) {
            finishHide();
            return;
        }

        if (typeof panel.animate === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            panel.style.setProperty('pointer-events', 'none', 'important');
            panel._anim = panel.animate([
                { transform: 'translateY(0) scale(1)', opacity: 1 },
                { transform: 'translateY(-8px) scale(0.96)', opacity: 0 }
            ], {
                duration: 150,
                easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
                fill: 'both'
            });
            panel._anim.finished.then(() => {
                if (panel.dataset.sheetState === 'closing') finishHide();
            }).catch(() => {});
            panelCloseTimer = setTimeout(finishHide, 180);
        } else {
            finishHide();
        }
    }

    function toggleSettingsPanel(force) {
        if (typeof force === 'boolean') {
            force ? openSettingsPanel() : closeSettingsPanel(true);
            return;
        }
        if (isPanelOpen()) {
            closeSettingsPanel(true);
        } else {
            openSettingsPanel();
        }
    }

    // 窗口尺寸或滚动变动时实时重新吸附位置
    window.addEventListener('resize', () => {
        if (isPanelOpen()) positionSettingsPanel();
    }, { passive: true });
    window.addEventListener('scroll', () => {
        if (isPanelOpen()) positionSettingsPanel();
    }, { passive: true });

    // 点击页面外部区域时收起面板（仿 LDFC onDoc 机制，带打开冷却保护与 Pin 固定豁免）
    document.addEventListener('pointerdown', (e) => {
        const panel = document.getElementById('claude-studio-settings-panel');
        if (!panel || panel.hidden || panel.dataset.sheetState === 'closed') return;
        if (isPanelPinned) return;

        // 刚打开 450ms 内忽略外部点击，防止由打开事件引起的失焦或穿透误关
        if (Date.now() - panelLastOpenedAt < 450) return;

        const path = e.composedPath ? e.composedPath() : [];
        const btn = document.getElementById('claude-studio-theme-toggle');
        const group = document.getElementById('claude-studio-theme-group');

        if (path.includes(panel) || (btn && path.includes(btn)) || (group && path.includes(group))) {
            return;
        }
        closeSettingsPanel(false);
    }, true);

    // 键盘 Escape 收起面板，快捷键 Alt+C 切换面板
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (isPanelOpen()) {
                e.preventDefault();
                closeSettingsPanel(true);
            }
        } else if ((e.altKey && (e.key === 'c' || e.key === 'C')) || 
                   (e.ctrlKey && e.altKey && (e.key === 'c' || e.key === 'C'))) {
            e.preventDefault();
            toggleSettingsPanel();
        }
    }, true);

    // ==================== 100% 还原图一：输入框增强、占位符与快捷胶囊 ====================
    let lastModelName = '选择模型';
    const nativeModelButton = () => [...document.querySelectorAll('ms-run-settings button')]
        .find(el => /gemini-[\w.-]+/i.test(el.textContent || ''));

    async function openModelPicker() {
        const native = nativeModelButton();
        if (native) {
            native.click();
            return;
        }
        document.querySelector('button[aria-label="Toggle run settings panel"]')?.click();
        const end = Date.now() + 4000;
        while (Date.now() < end) {
            const btn = nativeModelButton();
            if (btn) { btn.click(); return; }
            await new Promise(r => setTimeout(r, 100));
        }
    }

    function enhanceComposer(prompt) {
        const nativeModel = nativeModelButton();
        if (nativeModel) {
            const name = (nativeModel.innerText || '').split('gemini-')[0].replace(/\s+/g, ' ').trim();
            if (name) lastModelName = name;
        }

        // 1. 占位符修改为 Claude 风格「给 Gemini 发消息…」
        const textarea = prompt.querySelector('textarea[aria-label="Enter a prompt"]');
        if (textarea) {
            if (!textarea.hasAttribute('data-cs-placeholder')) {
                textarea.setAttribute('data-cs-placeholder', textarea.placeholder);
            }
            textarea.placeholder = enabled ? '给 Gemini 发消息…' : textarea.getAttribute('data-cs-placeholder');
            document.documentElement.toggleAttribute('data-cs-draft', !!textarea.value.trim());
        }

        // 2. 发送按钮打上 data-cs-send 变成经典方块与白色 ↑ 箭头（兼容中英双语「Run」「跑」「运行」）
        const run = prompt.querySelector('ms-run-button button');
        if (run) {
            const label = (run.querySelector('.run-button-label')?.textContent || run.getAttribute('aria-label') || run.textContent || '').trim();
            run.toggleAttribute('data-cs-send', /^(?:Run|跑|运行)/i.test(label));
        }

        // 3. 输入框内部右下角挂载模型选择 pill
        const wrapper = prompt.querySelector('.button-wrapper');
        if (wrapper) {
            let picker = wrapper.querySelector('#claude-studio-model');
            if (!picker) {
                picker = document.createElement('button');
                picker.id = 'claude-studio-model';
                picker.type = 'button';
                picker.title = '选择模型';
                picker.setAttribute('aria-label', '选择模型');
                picker.addEventListener('click', openModelPicker);
                wrapper.prepend(picker);
            }
            if (picker.textContent !== lastModelName) picker.textContent = lastModelName;
        }

        // 4. 输入框下方挂载 4 个快捷灵感胶囊（写作、学习、编程、分析）
        const footer = prompt.closest('footer');
        if (footer && !footer.querySelector('#claude-studio-starters')) {
            const starters = document.createElement('div');
            starters.id = 'claude-studio-starters';
            const choices = [
                ['edit_note', '写作', '请帮我润色下面这段文字，保留原意，使表达更清晰自然：\n'],
                ['school', '学习', '请从直觉、定义和一个例子三个层次，帮我理解这个概念：\n'],
                ['code', '编程', '请帮我分析下面的代码，解释其行为并定位问题：\n'],
                ['analytics', '分析', '请帮我分析下面的材料，提炼结论、依据和局限：\n']
            ];
            choices.forEach(([icon, label, value]) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.title = '填入提示，不会自动发送';
                const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                symbol.setAttribute('viewBox', '0 0 24 24');
                symbol.setAttribute('width', '17');
                symbol.setAttribute('height', '17');
                symbol.setAttribute('fill', 'none');
                symbol.setAttribute('stroke', 'currentColor');
                symbol.setAttribute('stroke-width', '1.6');
                symbol.setAttribute('stroke-linecap', 'round');
                symbol.setAttribute('stroke-linejoin', 'round');
                symbol.setAttribute('aria-hidden', 'true');
                const paths = {
                    edit_note: 'M4 20h4L20 8l-4-4L4 16v4M13 7l4 4',
                    school: 'M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1v15',
                    code: 'M8 6l-6 6 6 6M16 6l6 6-6 6M14 4l-4 16',
                    analytics: 'M4 20V12M10 20V4M16 20V9M22 20H2'
                };
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', paths[icon]);
                symbol.appendChild(path);
                const title = document.createElement('span');
                title.textContent = label;
                button.append(symbol, title);
                button.addEventListener('click', () => {
                    const field = prompt.querySelector('textarea[aria-label="Enter a prompt"]');
                    if (!field) return;
                    if (!field.value.trim()) {
                        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(field, value);
                        field.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    field.focus();
                    requestUpdate();
                });
                starters.appendChild(button);
            });
            footer.appendChild(starters);
        }
    }

    let style;
    let frame;
    function update() {
        const root = document.documentElement;
        if (!root) return;
        if (!style) {
            style = document.createElement('style');
            style.id = 'claude-studio-theme';
            style.textContent = css;
            root.appendChild(style);
        }

        applyThemeClasses();
        createOrUpdateToggleBtn();
        if (style) style.disabled = !enabled;

        if (!enabled) {
            root.removeAttribute('data-cs-home');
            document.getElementById('claude-studio-welcome')?.remove();
            document.getElementById('claude-studio-starters')?.remove();
            document.getElementById('claude-studio-model')?.remove();
            document.getElementById('claude-studio-settings-panel')?.remove();
            document.getElementById('claude-studio-settings-drawer')?.remove();
            document.getElementById('claude-studio-settings-mask')?.remove();
            document.getElementById('claude-studio-speed-badge')?.remove();
            return;
        }

        // 精准判断零状态首页（Zero-State）
        const empty = document.querySelector('.chat-view-container.zero-state .empty-state[data-kind="chat"]') ||
                      document.querySelector('.chat-view-container.zero-state') ||
                      document.querySelector('ms-zero-state') ||
                      document.querySelector('.empty-state[data-kind="chat"]');

        root.toggleAttribute('data-cs-home', enabled && !!empty);

        const container = empty?.closest('.chat-container') || document.querySelector('.chat-container');
        if (container && empty && !container.querySelector('#claude-studio-welcome')) {
            const welcome = document.createElement('div');
            welcome.id = 'claude-studio-welcome';
            const sun = document.createElement('span');
            sun.className = 'cs-sun';
            sun.setAttribute('aria-hidden', 'true');
            sun.textContent = '✳';
            const heading = document.createElement('h2');
            heading.textContent = '今天，有什么新想法？';
            welcome.append(sun, heading);
            container.prepend(welcome);
        }

        const prompt = document.querySelector('ms-prompt-box');
        if (prompt) enhanceComposer(prompt);
    }

    function requestUpdate() {
        if (frame) return;
        frame = requestAnimationFrame(() => { frame = null; update(); });
    }

    new MutationObserver(requestUpdate).observe(document, { childList: true, subtree: true });
    document.addEventListener('input', requestUpdate, true);
    update();

    // ==================== 全局 API 穿透与控制台助手 ====================
    const apis = {
        openClaudeSettings: openSettingsPanel,
        closeClaudeSettings: () => closeSettingsPanel(true),
        toggleClaudeSettings: toggleSettingsPanel,
        openClaudeSettingsDrawer: openSettingsPanel,
        showClaudeSpeedModal: openSettingsPanel,
        setClaudeThemeSpeed: setAnimSpeed,
        getClaudeThemeSpeed: () => animSpeed,
        setClaudeChatWidth: setChatWidth,
        getClaudeChatWidth: () => chatWidth,
        setClaudeDefaultTheme: setDefaultTheme,
        getClaudeDefaultTheme: () => configuredDefault
    };

    try {
        Object.assign(window, apis);
        if (typeof unsafeWindow !== 'undefined' && unsafeWindow !== window) {
            Object.assign(unsafeWindow, apis);
        }
    } catch (_) {}

    // 注册油猴原生菜单命令（多通道兜底）
    if (typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand('⚙️ Claude 偏好设置 (调速 / 宽度 / 启动主题)...', () => {
            openSettingsPanel();
        });
        GM_registerMenuCommand('🌓 快速切换主题 (暖纸 / 暗黑)', () => toggleThemeWithAnimation());
        GM_registerMenuCommand('👁️ 启用/停用 Claude 界面风格', () => {
            enabled = !enabled;
            update();
        });
    }

    try {
        console.log('%c[Claude Studio Theme]%c 脚本已就绪！\n• 左键点击右上角图标：切换主题（View Transition 扩散动画）\n• 右键点击 / Alt+点击 / 双击：唤起独立设置面板\n• 键盘快捷键 Alt+C：快速切换面板开合\n• F12 控制台输入 openClaudeSettings()：随时直接打开面板', 'color: #bf6243; font-weight: bold;', 'color: inherit;');
    } catch (_) {}
})();
