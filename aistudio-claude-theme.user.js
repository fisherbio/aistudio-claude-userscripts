// ==UserScript==
// @name         Google AI Studio — Claude 暖纸主题
// @namespace    local.aistudio.claude-theme
// @version      1.3.0
// @description  Claude 风格的暖纸配色、居中首页和阅读排版；独立于模型默认设置脚本。
// @match        https://aistudio.google.com/*
// @grant        GM_registerMenuCommand
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
    const css = String.raw`
html[data-claude-studio] {
  color-scheme: light;
  --cs-bg:#FAF9F5; --cs-surface:#F5F4ED; --cs-soft:#F0EEE6;
  --cs-text:#141413; --cs-muted:#6F675D; --cs-border:#D8D2C4;
  --cs-accent:#BF6243; --cs-accent-soft:#D97757; --cs-code:#8A3F27; --cs-code-bg:#F1EEE8;
  --cs-ui: -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
  --cs-reading: Georgia,"Noto Serif CJK SC","Songti SC",STSong,serif;
  --color-v3-accent-1:var(--cs-accent);
  background:var(--cs-bg)!important; color:var(--cs-text)!important;
}
html[data-claude-studio] body { background:var(--cs-bg)!important; color:var(--cs-text)!important; font-family:var(--cs-ui)!important; }
html[data-claude-studio] :is(app-root,ms-app,.banner-and-app-container,.makersuite-layout,.layout-wrapper,.layout-main,ms-prompt-renderer,ms-chunk-editor,.chunk-editor-main,.chat-container,.chat-view-container) { background:var(--cs-bg)!important; color:var(--cs-text)!important; }
html[data-claude-studio] :is(button,input,textarea,select) { font-family:var(--cs-ui)!important; }
html[data-claude-studio] :is(button,a,input,textarea):focus-visible { outline:2px solid var(--cs-accent-soft)!important; outline-offset:3px; }
html[data-claude-studio] ::selection { background:#D9775733; }
html[data-claude-studio] ms-navbar-v2 { background:var(--cs-surface)!important; border-right:1px solid #D8D2C45C!important; }
html[data-claude-studio] ms-navbar-v2 :is(a,button) { color:var(--cs-text)!important; border-radius:8px!important; }
html[data-claude-studio] ms-navbar-v2 :is(a,button):hover { background:var(--cs-soft)!important; }
html[data-claude-studio] ms-navbar-v2 a[href="/prompts/new_chat"] { font-family:var(--cs-reading)!important; }
html[data-claude-studio] :is(ms-header,ms-playground-toolbar,.toolbar-left,.toolbar-right) { background:transparent!important; border-color:transparent!important; }
html[data-claude-studio] ms-playground-toolbar .mode-title { font:500 15px/1.4 var(--cs-ui)!important; color:var(--cs-muted)!important; }
html[data-claude-studio] :is(.ms-button-icon,.ms-button-borderless) { border-radius:9px!important; color:var(--cs-muted)!important; }
html[data-claude-studio] :is(.ms-button-icon,.ms-button-borderless):not([aria-disabled="true"]):hover { background:var(--cs-soft)!important; color:var(--cs-text)!important; }
html[data-claude-studio] ms-prompt-box { display:block; background:#FFFEFB!important; border:1px solid var(--cs-border)!important; border-radius:20px!important; box-shadow:0 3px 16px #14141308,0 1px 3px #14141305!important; overflow:visible; }
html[data-claude-studio] ms-prompt-box:focus-within { border-color:#B4AA99!important; box-shadow:0 3px 20px #1414130D!important; }
html[data-claude-studio] ms-prompt-box textarea { background:transparent!important; color:var(--cs-text)!important; font:16px/1.5 var(--cs-ui)!important; caret-color:var(--cs-accent); }
html[data-claude-studio] ms-prompt-box textarea::placeholder { color:#8A8377!important; opacity:1; }
html[data-claude-studio] ms-prompt-box button { font-size:12px!important; }
html[data-claude-studio] :is(button[aria-label="Run"],ms-run-button button) { background:var(--cs-accent)!important; color:#fff!important; border-color:var(--cs-accent)!important; border-radius:11px!important; }
html[data-claude-studio] :is(button[aria-label="Run"],ms-run-button button):disabled { opacity:.42!important; }
html[data-claude-studio] ms-right-side-panel { background:var(--cs-bg)!important; border-left:1px solid var(--cs-border)!important; }
html[data-claude-studio] ms-run-settings { background:var(--cs-bg)!important; color:var(--cs-text)!important; }
html[data-claude-studio] ms-run-settings :is(button,mat-select) { border-color:var(--cs-border)!important; background-color:#FFFEFB!important; color:var(--cs-text)!important; border-radius:12px!important; }
html[data-claude-studio] ms-run-settings :is(h2,h3) { color:var(--cs-text)!important; font-family:var(--cs-ui)!important; }
html[data-claude-studio] :is(.mat-mdc-menu-panel,.mat-mdc-select-panel,mat-dialog-container .mdc-dialog__surface) { background:var(--cs-bg)!important; color:var(--cs-text)!important; border:1px solid var(--cs-border)!important; border-radius:14px!important; }
html[data-claude-studio] mat-option { color:var(--cs-text)!important; }
html[data-claude-studio] mat-option:hover { background:var(--cs-soft)!important; }
/* Set the reading scale once; inline cmark hosts inherit their semantic parent. */
html[data-claude-studio] :is(ms-text-chunk,.markdown) { color:var(--cs-text)!important; font:16px/1.5 var(--cs-reading)!important; }
html[data-claude-studio] ms-cmark-node { color:inherit!important; font-family:inherit!important; font-size:inherit!important; line-height:inherit!important; }
html[data-claude-studio] :is(ms-cmark-node,.markdown) :is(p,ul,ol,li,blockquote,th,td) { font-family:inherit!important; font-size:inherit!important; line-height:inherit!important; }
html[data-claude-studio] :is(ms-cmark-node,.markdown) :is(h1,h2,h3,h4) { font-family:var(--cs-reading)!important; color:var(--cs-text)!important; font-weight:600; line-height:1.4!important; letter-spacing:-.02em; margin:1.1em 0 .45em!important; }
html[data-claude-studio] :is(ms-cmark-node,.markdown) h1 { font-size:1.5em!important; }
html[data-claude-studio] :is(ms-cmark-node,.markdown) h2 { font-size:1.25em!important; }
html[data-claude-studio] :is(ms-cmark-node,.markdown) h3 { font-size:1.125em!important; }
html[data-claude-studio] :is(ms-cmark-node,.markdown) h4 { font-size:1em!important; }
html[data-claude-studio] :is(ms-cmark-node,.markdown) p { margin:0 0 10px!important; }
html[data-claude-studio] :is(ms-cmark-node,.markdown) :is(ul,ol) { margin:6px 0 10px!important; }
html[data-claude-studio] :is(ms-cmark-node,.markdown) li { margin:3px 0!important; }
html[data-claude-studio] :is(ms-cmark-node,.markdown) a { color:var(--cs-accent)!important; text-decoration-color:#BF624366; text-underline-offset:3px; }
html[data-claude-studio] :is(ms-cmark-node,.markdown) :not(pre)>code { color:var(--cs-code)!important; background:var(--cs-code-bg)!important; border-radius:4px; padding:2px 5px; }
html[data-claude-studio] :is(pre,code,.cm-editor,.monaco-editor) { font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace!important; }
html[data-claude-studio] :is(ms-cmark-node,.markdown) pre { background:var(--cs-code-bg)!important; border:1px solid var(--cs-border)!important; border-radius:12px; padding:16px; }
html[data-claude-studio] :is(ms-cmark-node,.markdown) table { border-collapse:collapse; width:100%; font-size:14px!important; line-height:1.5!important; }
html[data-claude-studio] :is(ms-cmark-node,.markdown) :is(th,td) { border-color:var(--cs-border)!important; padding:10px 13px; }
html[data-claude-studio] :is(ms-cmark-node,.markdown) th { background:var(--cs-surface)!important; }
html[data-claude-studio] :is(ms-cmark-node,.markdown) blockquote { border-left:3px solid var(--cs-border); color:var(--cs-muted); padding-left:18px; }
html[data-claude-studio] .chat-view-container:not(.zero-state) { max-width:760px!important; width:100%; margin-inline:auto!important; }
html[data-claude-studio] .chunk-editor-main>footer { max-width:760px!important; width:calc(100% - 48px)!important; margin-inline:auto!important; padding-bottom:18px!important; }
html[data-claude-studio][data-cs-home] .chunk-editor-main { position:relative; justify-content:center!important; padding-bottom:12vh!important; }
html[data-claude-studio][data-cs-home] ms-playground-toolbar { position:absolute!important; inset:0 0 auto 0; z-index:2; }
html[data-claude-studio][data-cs-home] .chat-container { flex:0 0 auto!important; width:100%; max-width:760px; margin:0 auto!important; padding:0 24px!important; box-sizing:border-box; }
html[data-claude-studio][data-cs-home] .chat-view-container.zero-state { display:none!important; }
html[data-claude-studio][data-cs-home] .chunk-editor-main>footer { flex:0 0 auto!important; position:relative!important; bottom:auto!important; max-width:720px!important; margin:0 auto!important; padding:0!important; }
#claude-studio-welcome { display:none; }
html[data-claude-studio][data-cs-home] #claude-studio-welcome { display:flex; align-items:center; justify-content:center; gap:13px; padding:0 0 32px; }
#claude-studio-welcome .cs-sun { color:#C87556; font:48px/1 Georgia,serif; }
#claude-studio-welcome h2 { margin:0; font:400 34px/1.5 Georgia,"Noto Serif CJK SC","Songti SC",STSong,serif; letter-spacing:-.035em; color:#302D28; }
@media(max-width:700px) {
 html[data-claude-studio][data-cs-home] .chunk-editor-main { padding-bottom:8vh!important; }
 #claude-studio-welcome h2 { font-size:27px; }
 #claude-studio-welcome .cs-sun { font-size:36px; }
 html[data-claude-studio] .chunk-editor-main>footer { width:calc(100% - 28px)!important; }
}

html[data-claude-studio] ms-prompt-box { background:transparent!important; border:0!important; box-shadow:none!important; }
html[data-claude-studio] ms-prompt-box .prompt-box-container { margin:0!important; padding:16px!important; background:#FFFEFB!important; border:1px solid var(--cs-border)!important; border-radius:20px!important; box-shadow:0 3px 15px #14141308!important; }
html[data-claude-studio] ms-prompt-box:focus-within .prompt-box-container { border-color:#B4AA99!important; }
html[data-claude-studio] ms-prompt-box .textarea-row { padding:0!important; }
html[data-claude-studio] ms-prompt-box textarea { field-sizing:content; height:auto!important; min-height:66px!important; max-height:30vh!important; padding:0!important; box-sizing:border-box; }
html[data-claude-studio] ms-prompt-box .buttons-row { gap:6px!important; align-items:center!important; }
html[data-claude-studio] ms-prompt-box button.ms-button-icon { width:30px!important; min-width:30px!important; height:30px!important; padding:4px!important; box-shadow:none!important; border:0!important; background:transparent!important; }
html[data-claude-studio] ms-prompt-box .material-symbols-outlined { font-size:21px!important; }
html[data-claude-studio] :is(button[aria-label="Run"],ms-run-button button)[aria-disabled="true"] { opacity:.38!important; }
html[data-claude-studio] ms-playground-toolbar { box-shadow:none!important; }
html[data-claude-studio] ms-header button.ms-button-icon { width:32px!important; height:32px!important; min-width:32px!important; border:0!important; background:transparent!important; }
html[data-claude-studio][data-cs-home] .chunk-editor-main>footer::before { display:none!important; }
html[data-claude-studio][data-cs-home] ms-chat-bottom-overlay { background:transparent!important; }

html[data-claude-studio] ms-prompt-box .button-row-left { gap:5px!important; min-width:0; }
html[data-claude-studio] ms-prompt-box .button-wrapper { display:flex; gap:7px!important; align-items:center; margin-left:auto; }
html[data-claude-studio] ms-prompt-box .buttons-row { flex-wrap:wrap; row-gap:10px!important; }
html[data-claude-studio] ms-prompt-box :is(ms-add-media-button,ms-paid-api-key-button,ms-stt-button) button { min-width:30px!important; width:30px!important; height:30px!important; padding:3px!important; border:0!important; box-shadow:none!important; background:transparent!important; color:var(--cs-muted)!important; border-radius:7px!important; }
html[data-claude-studio] ms-prompt-box ms-prompt-box-tools button { height:30px!important; padding:3px 7px!important; border:0!important; box-shadow:none!important; background:transparent!important; color:var(--cs-muted)!important; font-size:12px!important; }
html[data-claude-studio] ms-prompt-box .enabled-tool-container { background:var(--cs-soft)!important; border-radius:7px!important; max-width:180px; }
html[data-claude-studio] ms-prompt-box .enabled-tool { background:transparent!important; color:var(--cs-muted)!important; }
html[data-claude-studio] ms-prompt-box .tool-name { display:block; max-width:125px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-size:11px!important; }
html[data-claude-studio] ms-prompt-box ms-run-button button[data-cs-send] { position:relative; width:32px!important; min-width:32px!important; height:32px!important; padding:0!important; border-radius:9px!important; font-size:0!important; }
html[data-claude-studio] ms-prompt-box ms-run-button button[data-cs-send]>* { opacity:0; }
html[data-claude-studio] ms-prompt-box ms-run-button button[data-cs-send]::after { content:'↑'; position:absolute; inset:0; display:grid; place-items:center; color:white; font:22px/1 var(--cs-ui); }
#claude-studio-model,#claude-studio-starters { display:none; }
html[data-claude-studio] #claude-studio-model { display:inline-flex; align-items:center; gap:7px; border:0; background:transparent; color:var(--cs-muted); padding:6px 7px; border-radius:7px; white-space:nowrap; font:12px/1.4 var(--cs-ui); cursor:pointer; }
html[data-claude-studio] #claude-studio-model:hover { background:var(--cs-soft); color:var(--cs-text); }
html[data-claude-studio] #claude-studio-model::after { content:'⌄'; font-size:14px; }
html[data-claude-studio][data-cs-home] #claude-studio-starters { display:flex; justify-content:center; flex-wrap:wrap; gap:8px; margin-top:18px; }
html[data-claude-studio] #claude-studio-starters button { display:flex; align-items:center; gap:6px; padding:8px 12px; border:1px solid #D8D2C4AA; border-radius:8px; background:transparent; color:var(--cs-muted); font:12px/1.4 var(--cs-ui); cursor:pointer; }
html[data-claude-studio] #claude-studio-starters button:hover { background:var(--cs-soft); color:var(--cs-text); }
html[data-claude-studio] #claude-studio-starters .material-symbols-outlined { font-size:17px; }
html[data-claude-studio][data-cs-draft] #claude-studio-starters { visibility:hidden; pointer-events:none; }
html[data-claude-studio] pre:has(.katex) { background:transparent!important; border:0!important; box-shadow:none!important; padding:4px 0!important; }
html[data-claude-studio] .katex-display { overflow-x:auto; overflow-y:hidden; max-width:100%; margin:.75em 0!important; }
@media(max-width:700px) {
 html[data-claude-studio] ms-prompt-box .enabled-tool-container { max-width:110px; }
 html[data-claude-studio] ms-prompt-box .tool-name { max-width:65px; }
 html[data-claude-studio] #claude-studio-model { font-size:11px; }
 html[data-claude-studio] #claude-studio-starters button { padding:7px 9px; }
}

/* Conversation: quiet user bubble, unboxed answers, native KaTeX fonts. */
html[data-claude-studio] .chat-turn-container.user { background:transparent!important; border:0!important; box-shadow:none!important; padding:0!important; margin:16px 0 28px!important; }
html[data-claude-studio] .user-prompt-container { background:var(--cs-soft)!important; border:0!important; border-radius:16px!important; padding:14px 18px!important; margin-left:auto!important; max-width:88%!important; width:fit-content!important; }
html[data-claude-studio] .user-prompt-container :is(ms-text-chunk,.markdown) { font:14px/1.6 var(--cs-ui)!important; }
html[data-claude-studio] .chat-turn-container.model { background:transparent!important; border:0!important; box-shadow:none!important; padding:0 8px!important; margin:0 0 24px!important; }
html[data-claude-studio] .model-prompt-container { padding:0!important; }
html[data-claude-studio] ms-cmark-node { overflow-wrap:anywhere; }
html[data-claude-studio] ms-katex { overflow-wrap:normal; }
html[data-claude-studio] ms-katex pre { border:0!important; background:transparent!important; box-shadow:none!important; margin:0!important; padding:4px 0!important; }
html[data-claude-studio] ms-katex.inline pre { display:inline!important; padding:0!important; overflow:visible!important; }
html[data-claude-studio] ms-katex code.rendered { background:transparent!important; color:inherit!important; padding:0!important; }
html[data-claude-studio] ms-code-block { display:block; background:var(--cs-code-bg)!important; border:1px solid var(--cs-border)!important; border-radius:12px!important; overflow:hidden; margin:16px 0; }
html[data-claude-studio] ms-code-block pre { margin:0!important; border:0!important; border-radius:0!important; background:transparent!important; padding:14px 16px!important; }
html[data-claude-studio] ms-code-block :is(button,.code-block-header) { background:var(--cs-code-bg)!important; color:var(--cs-muted)!important; }

html[data-claude-studio] #claude-studio-model { max-width:175px; overflow:hidden; text-overflow:ellipsis; flex-shrink:1; }
html[data-claude-studio] ms-prompt-box .button-wrapper { min-width:0; max-width:100%; }
html[data-claude-studio] :is(.chunk-editor-main,.chat-container,.chat-view-container,ms-text-chunk,ms-cmark-node) { min-width:0; }
html[data-claude-studio] ms-code-block pre { max-width:100%; overflow:auto; box-sizing:border-box; }

html[data-claude-studio] ms-prompt-box textarea:focus-visible { outline:none!important; }
html[data-claude-studio] ms-prompt-box:focus-within .prompt-box-container { border-color:#BF624399!important; box-shadow:0 0 0 2px #BF62430D!important; }
html[data-claude-studio] ms-token-count .token-count-container { font:11px/1.4 var(--cs-ui)!important; color:var(--cs-muted)!important; }

/* Conversation: a one-line capsule; secondary tools and model sit below it.
   Native controls stay in place, so disabling the theme restores their layout. */
html[data-claude-studio]:not([data-cs-home]) .chunk-editor-main>footer { padding-bottom:48px!important; }
html[data-claude-studio]:not([data-cs-home]) ms-prompt-box .prompt-box-container { position:relative; display:grid!important; grid-template-columns:minmax(0,1fr) auto; column-gap:8px; padding:8px 10px!important; border-radius:14px!important; }
html[data-claude-studio]:not([data-cs-home]) ms-prompt-box .textarea-row { grid-column:1; grid-row:1; align-self:center; min-width:0; margin:0!important; }
html[data-claude-studio]:not([data-cs-home]) ms-prompt-box .text-wrapper { min-height:0!important; }
html[data-claude-studio]:not([data-cs-home]) ms-prompt-box textarea { width:100%!important; min-height:32px!important; padding:4px 0 4px 36px!important; }
html[data-claude-studio]:not([data-cs-home]) ms-prompt-box .buttons-row { display:contents!important; }
html[data-claude-studio]:not([data-cs-home]) ms-prompt-box .button-wrapper { grid-column:2; grid-row:1; align-self:end; margin:0!important; }
html[data-claude-studio]:not([data-cs-home]) ms-prompt-box .button-row-left { position:absolute; left:10px; top:calc(100% + 6px); width:calc(100% - 205px); height:30px; margin:0!important; }
html[data-claude-studio]:not([data-cs-home]) ms-prompt-box ms-add-media-button { position:absolute; left:0; bottom:calc(100% + 14px); }
html[data-claude-studio]:not([data-cs-home]) #claude-studio-model { position:absolute; right:0; top:calc(100% + 6px); height:30px; box-sizing:border-box; }
html[data-claude-studio]:not([data-cs-home]) ms-chat-bottom-overlay { height:20px!important; }
@media(max-width:700px) {
 html[data-claude-studio]:not([data-cs-home]) #claude-studio-model { max-width:140px; }
 html[data-claude-studio]:not([data-cs-home]) ms-prompt-box .button-row-left { width:calc(100% - 165px); }
}

/* Inline math stays in the sentence; only display equations may scroll. */
html[data-claude-studio] ms-cmark-node:has(>ms-katex.inline) { display:contents!important; }
html[data-claude-studio] :is(ms-katex.inline,ms-katex.inline pre,ms-katex.inline code.rendered,ms-katex.inline .katex,ms-katex.inline .katex-display) { display:inline!important; width:auto!important; max-width:none!important; margin:0!important; padding:0!important; overflow:visible!important; text-align:inherit!important; vertical-align:baseline!important; }

html[data-claude-studio] :is(ms-katex.inline,ms-katex.inline pre,ms-katex.inline code.rendered) { white-space:normal!important; }
html[data-claude-studio] ms-katex.inline .katex { white-space:nowrap!important; }
`;


    let lastModelName = '选择模型';
    const nativeModelButton = () => [...document.querySelectorAll('ms-run-settings button')]
        .find(el => /gemini-[\w.-]+/i.test(el.textContent || ''));
    async function openModelPicker() {
        if (!nativeModelButton()) document.querySelector('button[aria-label="Toggle run settings panel"]')?.click();
        const end = Date.now() + 5000;
        while (Date.now() < end) {
            const button = nativeModelButton();
            if (button) { button.click(); return; }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    function enhanceComposer(prompt) {
        const nativeModel = nativeModelButton();
        if (nativeModel) {
            const name = (nativeModel.innerText || '').split('gemini-')[0].replace(/\s+/g,' ').trim();
            if (name) lastModelName = name;
        }
        const textarea = prompt.querySelector('textarea[aria-label="Enter a prompt"]');
        if (textarea) {
            if (!textarea.hasAttribute('data-cs-placeholder')) textarea.setAttribute('data-cs-placeholder', textarea.placeholder);
            textarea.placeholder = enabled ? '给 Gemini 发消息…' : textarea.getAttribute('data-cs-placeholder');
            document.documentElement.toggleAttribute('data-cs-draft', !!textarea.value.trim());
        }
        const run = prompt.querySelector('ms-run-button button');
        if (run) run.toggleAttribute('data-cs-send', /^Run$/i.test((run.querySelector('.run-button-label')?.textContent || '').trim()));
        const wrapper = prompt.querySelector('.button-wrapper');
        if (wrapper) {
            let picker = wrapper.querySelector('#claude-studio-model');
            if (!picker) {
                picker = document.createElement('button');
                picker.id = 'claude-studio-model'; picker.type = 'button';
                picker.title = '选择模型'; picker.setAttribute('aria-label', '选择模型');
                picker.addEventListener('click', openModelPicker);
                wrapper.prepend(picker);
            }
            if (picker.textContent !== lastModelName) picker.textContent = lastModelName;
        }
        const footer = prompt.closest('footer');
        if (footer && !footer.querySelector('#claude-studio-starters')) {
            const starters = document.createElement('div');
            starters.id = 'claude-studio-starters';
            const choices = [
                ['edit_note','写作','请帮我润色下面这段文字，保留原意，使表达更清晰自然：\n'],
                ['school','学习','请从直觉、定义和一个例子三个层次，帮我理解这个概念：\n'],
                ['code','编程','请帮我分析下面的代码，解释其行为并定位问题：\n'],
                ['analytics','分析','请帮我分析下面的材料，提炼结论、依据和局限：\n']
            ];
            choices.forEach(([icon,label,value]) => {
                const button = document.createElement('button'); button.type = 'button';
                button.title = '填入提示，不会自动发送';
                const symbol = document.createElementNS('http://www.w3.org/2000/svg','svg');
                symbol.setAttribute('viewBox','0 0 24 24'); symbol.setAttribute('width','17'); symbol.setAttribute('height','17');
                symbol.setAttribute('fill','none'); symbol.setAttribute('stroke','currentColor'); symbol.setAttribute('stroke-width','1.6');
                symbol.setAttribute('stroke-linecap','round'); symbol.setAttribute('stroke-linejoin','round'); symbol.setAttribute('aria-hidden','true');
                const paths = {edit_note:'M4 20h4L20 8l-4-4L4 16v4M13 7l4 4',school:'M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1v15',code:'M8 6l-6 6 6 6M16 6l6 6-6 6M14 4l-4 16',analytics:'M4 20V12M10 20V4M16 20V9M22 20H2'};
                const path = document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('d',paths[icon]); symbol.appendChild(path);
                const title = document.createElement('span'); title.textContent = label;
                button.append(symbol,title);
                button.addEventListener('click', () => {
                    const field = prompt.querySelector('textarea[aria-label="Enter a prompt"]');
                    if (!field) return;
                    if (!field.value.trim()) {
                        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(field,value);
                        field.dispatchEvent(new Event('input',{bubbles:true}));
                    }
                    field.focus(); requestUpdate();
                });
                starters.appendChild(button);
            });
            footer.appendChild(starters);
        }
    }

    let enabled = true;
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
        root.toggleAttribute('data-claude-studio', enabled);
        const empty = document.querySelector('.chat-view-container.zero-state .empty-state[data-kind="chat"]');
        root.toggleAttribute('data-cs-home', enabled && !!empty);
        const container = empty?.closest('.chat-container');
        if (container && !container.querySelector('#claude-studio-welcome')) {
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
    new MutationObserver(requestUpdate).observe(document, {childList:true,subtree:true});
    document.addEventListener('input', requestUpdate, true);
    update();
    if (typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand('切换 Claude 暖纸主题 / 原版', () => { enabled = !enabled; update(); });
    }
})();
