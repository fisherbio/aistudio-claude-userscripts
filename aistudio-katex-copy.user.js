// ==UserScript==
// @name         Google AI Studio - 公式复制还原 LaTeX / Markdown
// @namespace    local.aistudio.katex-copy
// @version      1.1.0
// @description  在 Google AI Studio 中复制包含 KaTeX 公式的内容时，自动还原为标准 LaTeX / Markdown 公式；仅选中公式一部分时自动补全为完整公式，正文与公式混选时精准保留正文与完整公式；支持桌面双击与安卓手机触控双击复制。
// @author       Antigravity
// @match        https://aistudio.google.com/*
// @icon         https://www.gstatic.com/lamda/images/favicon_v1_150160cddff7f2942da3.svg
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @run-at       document-start
// @noframes
// @license      MIT
// @homepageURL  https://github.com/fisherbio/aistudio-claude-userscripts
// @supportURL   https://github.com/fisherbio/aistudio-claude-userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/fisherbio/aistudio-claude-userscripts/main/aistudio-katex-copy.user.js
// @updateURL    https://raw.githubusercontent.com/fisherbio/aistudio-claude-userscripts/main/aistudio-katex-copy.user.js
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'aistudio_katex_copy_settings_v1';

    const FORMAT_MODES = {
        markdown: {
            key: 'markdown',
            label: 'Markdown ($ / $$)',
            inline: (tex) => `$${tex}$`,
            display: (tex) => formatBlockDelimiters(tex, '$$', '$$')
        },
        latex: {
            key: 'latex',
            label: 'LaTeX (\\( \\) / \\[ \\])',
            inline: (tex) => `\\(${tex}\\)`,
            display: (tex) => formatBlockDelimiters(tex, '\\[', '\\]')
        },
        bare_single: {
            key: 'bare_single',
            label: '单公式纯 TeX / 混选 $',
            inline: (tex, isSingleMath) => (isSingleMath ? tex : `$${tex}$`),
            display: (tex, isSingleMath) => (isSingleMath ? tex : formatBlockDelimiters(tex, '$$', '$$'))
        }
    };
    const FORMAT_ORDER = ['markdown', 'latex', 'bare_single'];

    function formatBlockDelimiters(tex, open, close) {
        if (tex.includes('\n')) {
            return `${open}\n${tex}\n${close}`;
        }
        return `${open}${tex}${close}`;
    }

    function createDefaultSettings() {
        return {
            enabled: true,
            format: 'markdown',
            dblclickCopy: true,
            showToast: true
        };
    }

    function sanitizeSettings(raw) {
        const defaults = createDefaultSettings();
        if (!raw || typeof raw !== 'object') return defaults;
        return {
            enabled: raw.enabled !== false,
            format: FORMAT_MODES[raw.format] ? raw.format : defaults.format,
            dblclickCopy: raw.dblclickCopy !== false,
            showToast: raw.showToast !== false
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
            console.warn('[AIStudio-KaTeX-Copy] 保存设置失败:', err);
        }
        refreshMenuCommands();
    }

    let settings = loadSettings();

    // ==================== 移动端公式触控防误缩放样式 ====================
    function ensureTouchStyle() {
        const host = document.head || document.documentElement;
        if (!host || document.getElementById('aistudio-katex-copy-style')) return;
        const style = document.createElement('style');
        style.id = 'aistudio-katex-copy-style';
        style.textContent = 'ms-katex, .katex, .katex-display { touch-action: manipulation; }';
        host.appendChild(style);
    }
    ensureTouchStyle();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureTouchStyle, { once: true });
    }

    // ==================== 轻提示（纯 DOM API，兼容 Trusted Types 与移动端安全区） ====================
    let toastTimer = null;
    function showToast(message, isSuccess = true) {
        const host = document.body || document.documentElement;
        if (!settings.showToast || !host) return;
        const id = 'aistudio-katex-copy-toast';
        let toast = document.getElementById(id);
        if (!toast) {
            toast = document.createElement('div');
            toast.id = id;
            Object.assign(toast.style, {
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: '2147483646',
                padding: '9px 14px',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '12.5px',
                fontWeight: '500',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.24)',
                maxWidth: 'min(360px, calc(100vw - 32px))',
                boxSizing: 'border-box',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                transition: 'opacity 0.18s ease, transform 0.18s ease',
                opacity: '0',
                transform: 'translateY(8px)',
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
            toast.style.transform = 'translateX(-50%) translateY(8px)';
        } else {
            toast.style.left = 'auto';
            toast.style.right = '24px';
            toast.style.bottom = '24px';
            toast.style.transform = 'translateY(8px)';
        }
        toast.textContent = (isSuccess ? '✓ ' : 'ℹ ') + message;
        toast.style.backgroundColor = isSuccess ? 'rgba(28, 27, 24, 0.92)' : 'rgba(122, 34, 34, 0.94)';
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = isMobile ? 'translateX(-50%) translateY(0)' : 'translateY(0)';
        });
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = isMobile ? 'translateX(-50%) translateY(8px)' : 'translateY(8px)';
        }, 2000);
    }

    // ==================== KaTeX 节点识别与源码读取 ====================
    function getLatexSource(mathEl) {
        if (!mathEl || mathEl.nodeType !== Node.ELEMENT_NODE) return null;
        const ann = mathEl.querySelector('annotation[encoding="application/x-tex"]')
            || mathEl.querySelector('annotation');
        if (!ann) return null;
        const tex = (ann.textContent || '').replace(/\r\n?/g, '\n').trim();
        return tex || null;
    }

    function isMathRoot(el) {
        if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
        const tag = el.tagName.toLowerCase();
        if (tag === 'ms-katex') return getLatexSource(el) !== null;
        if (el.classList?.contains('katex-display')) {
            return !el.closest('ms-katex') && getLatexSource(el) !== null;
        }
        if (el.classList?.contains('katex')) {
            return !el.closest('ms-katex, .katex-display') && getLatexSource(el) !== null;
        }
        return false;
    }

    function findMathRoot(node) {
        const el = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
        if (!el || typeof el.closest !== 'function') return null;
        const msKatex = el.closest('ms-katex');
        if (msKatex && getLatexSource(msKatex) !== null) return msKatex;
        const katexDisplay = el.closest('.katex-display');
        if (katexDisplay && getLatexSource(katexDisplay) !== null) return katexDisplay;
        const katex = el.closest('.katex');
        if (katex && getLatexSource(katex) !== null) return katex;
        return null;
    }

    function isDisplayMath(mathEl) {
        if (!mathEl || mathEl.nodeType !== Node.ELEMENT_NODE) return false;
        if (mathEl.classList?.contains('display')) return true;
        if (mathEl.classList?.contains('inline')) return false;
        if (mathEl.classList?.contains('katex-display')) return true;
        return !!mathEl.querySelector('.katex-display');
    }

    function formatMath(mathEl, isSingleMath) {
        const tex = getLatexSource(mathEl);
        if (!tex) return '';
        const mode = FORMAT_MODES[settings.format] || FORMAT_MODES.markdown;
        return isDisplayMath(mathEl)
            ? mode.display(tex, isSingleMath)
            : mode.inline(tex, isSingleMath);
    }

    function isEditableContext(node) {
        const el = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
        if (!el || typeof el.closest !== 'function') return false;
        return !!el.closest('input, textarea, [contenteditable="true"], [contenteditable=""], .CodeMirror, .cm-editor, .monaco-editor');
    }

    // ==================== 选区边界精确修正（精准保留非公式 + 补全部分公式） ====================
    const stripZeroWidth = (str) => (str || '').replace(/[\u200b\ufeff]/g, '');

    function hasVisualOverlapAtStart(mathRoot, startContainer, startOffset) {
        const katexHtml = mathRoot.querySelector('.katex-html');
        if (katexHtml && katexHtml.contains(startContainer)) {
            const probe = document.createRange();
            probe.setStart(startContainer, startOffset);
            probe.setEnd(katexHtml, katexHtml.childNodes.length);
            return stripZeroWidth(probe.toString()).length > 0;
        }
        const probe = document.createRange();
        probe.setStart(startContainer, startOffset);
        probe.setEndAfter(mathRoot);
        return stripZeroWidth(probe.toString()).length > 0;
    }

    function hasVisualOverlapAtEnd(mathRoot, endContainer, endOffset) {
        const katexHtml = mathRoot.querySelector('.katex-html');
        if (katexHtml && katexHtml.contains(endContainer)) {
            const probe = document.createRange();
            probe.setStart(katexHtml, 0);
            probe.setEnd(endContainer, endOffset);
            return stripZeroWidth(probe.toString()).length > 0;
        }
        const probe = document.createRange();
        probe.setStartBefore(mathRoot);
        probe.setEnd(endContainer, endOffset);
        return stripZeroWidth(probe.toString()).length > 0;
    }

    function normalizeRangeForMath(range) {
        const startMath = findMathRoot(range.startContainer);
        const endMath = findMathRoot(range.endContainer);

        // 情况 1：选区完全落在同一个公式内部（部分或全部）→ 直接返回完整单公式
        if (startMath && startMath === endMath) {
            return {
                singleMath: startMath,
                expandedRange: null,
                topListTag: null,
                firstOlStart: 1
            };
        }

        const expanded = range.cloneRange();

        // 情况 2：选区起点落在公式内部 → 仅在真正框中公式可见字符时向左扩到完整公式，否则跳过该公式避免误带
        if (startMath) {
            if (hasVisualOverlapAtStart(startMath, range.startContainer, range.startOffset)) {
                expanded.setStartBefore(startMath);
            } else {
                expanded.setStartAfter(startMath);
            }
        }

        // 情况 3：选区终点落在公式内部 → 仅在真正框中公式可见字符时向右扩到完整公式，否则截在公式之前避免误带
        if (endMath) {
            if (hasVisualOverlapAtEnd(endMath, range.endContainer, range.endOffset)) {
                expanded.setEndAfter(endMath);
            } else {
                expanded.setEndBefore(endMath);
            }
        }

        // 记录局部选区起始列表类型与真实序号（含跨多项 <li> 导致 cloneContents 不含外层 <ol>/<ul> 的情况）
        const ancestorEl = expanded.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
            ? expanded.commonAncestorContainer
            : expanded.commonAncestorContainer.parentElement;
        const ancestorTag = ancestorEl?.tagName?.toLowerCase() || '';
        const topListTag = (ancestorTag === 'ol' || ancestorTag === 'ul') ? ancestorTag : null;

        let firstOlStart = 1;
        let firstLi = null;
        if (topListTag === 'ol') {
            if (expanded.startContainer === ancestorEl) {
                for (let i = expanded.startOffset; i < ancestorEl.childNodes.length; i++) {
                    const child = ancestorEl.childNodes[i];
                    if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'li') {
                        firstLi = child;
                        break;
                    }
                }
            } else {
                const startEl = expanded.startContainer.nodeType === Node.ELEMENT_NODE
                    ? expanded.startContainer
                    : expanded.startContainer.parentElement;
                firstLi = startEl?.closest?.('li') || null;
            }
            if (firstLi && firstLi.parentElement === ancestorEl) {
                const base = Number.parseInt(ancestorEl.getAttribute('start') || '1', 10) || 1;
                const siblings = [...ancestorEl.children].filter((c) => c.tagName.toLowerCase() === 'li');
                const idx = siblings.indexOf(firstLi);
                if (idx >= 0) firstOlStart = base + idx;
            }
        } else {
            const startEl = expanded.startContainer.nodeType === Node.ELEMENT_NODE
                ? expanded.startContainer
                : expanded.startContainer.parentElement;
            const startLi = startEl?.closest?.('li');
            const startOl = startLi?.parentElement?.tagName?.toLowerCase() === 'ol' ? startLi.parentElement : null;
            if (startOl) {
                const base = Number.parseInt(startOl.getAttribute('start') || '1', 10) || 1;
                const siblings = [...startOl.children].filter((c) => c.tagName.toLowerCase() === 'li');
                const idx = siblings.indexOf(startLi);
                if (idx >= 0) firstOlStart = base + idx;
            }
        }

        return {
            singleMath: null,
            expandedRange: expanded,
            topListTag,
            firstOlStart
        };
    }

    // ==================== 片段转纯文本 / Markdown（保留正文精度与段落结构） ====================
    const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'template', 'button', 'svg', 'mat-icon']);
    const BLOCK_TAGS = new Set([
        'p', 'div', 'section', 'article', 'blockquote',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'pre', 'table', 'tr', 'hr',
        'ms-text-chunk', 'ms-chat-turn'
    ]);

    function shouldSkipElement(el) {
        const tag = el.tagName.toLowerCase();
        if (SKIP_TAGS.has(tag)) return true;
        if (el.classList?.contains('material-symbols-outlined') || el.classList?.contains('material-icons')) return true;
        if (el.getAttribute?.('aria-hidden') === 'true' && !el.querySelector?.('ms-katex, .katex')) return true;
        if (el.hidden) return true;
        return false;
    }

    function normalizeInlineText(str) {
        // 清理 HTML 模板换行与缩进，但保留正文原本的空格精度（含中英文间和公式两侧空格）
        return str
            .replace(/\r\n?/g, '\n')
            .replace(/[\u200b\ufeff]/g, '')
            .replace(/[ \t]*\n[ \t]*/g, ' ');
    }

    function extractFragment(fragment, { topListTag = null, firstOlStart = 1 } = {}) {
        let mathCount = 0;
        let hasNonMathText = false;
        let singleMathNode = null;
        let usedFirstOlStart = false;
        let topListItemIndex = 0;

        function serialize(node, ctx) {
            if (!node) return '';

            if (node.nodeType === Node.TEXT_NODE) {
                const raw = node.nodeValue || '';
                if (ctx.inPre) {
                    if (raw.length > 0) hasNonMathText = true;
                    return raw.replace(/\r\n?/g, '\n');
                }
                const cleaned = normalizeInlineText(raw);
                if (cleaned.trim().length > 0) hasNonMathText = true;
                return cleaned;
            }

            if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                return serializeChildren(node, ctx);
            }

            if (node.nodeType !== Node.ELEMENT_NODE) return '';

            if (isMathRoot(node)) {
                mathCount += 1;
                singleMathNode = node;
                const formatted = formatMath(node, false);
                if (isDisplayMath(node)) {
                    return `\n\n${formatted}\n\n`;
                }
                return formatted;
            }

            if (shouldSkipElement(node)) return '';

            const tag = node.tagName.toLowerCase();

            if (tag === 'br') return '\n';
            if (tag === 'hr') return '\n\n---\n\n';

            if (tag === 'ms-code-block') {
                const codeEl = node.querySelector('pre code, pre');
                if (codeEl) {
                    const langEl = node.querySelector('.mat-expansion-panel-header-title, .code-block-header span, header span');
                    const rawLang = (langEl?.textContent || '').trim();
                    const lang = /^[a-z0-9+#.-]{1,24}$/i.test(rawLang) ? rawLang : '';
                    const codeText = (codeEl.textContent || '').replace(/\r\n?/g, '\n').replace(/\n+$/, '');
                    if (codeText.trim().length > 0) hasNonMathText = true;
                    return `\n\n\`\`\`${lang}\n${codeText}\n\`\`\`\n\n`;
                }
            }

            if (tag === 'pre') {
                // 若 <pre> 仅作为公式容器，透传子节点让 ms-katex 处理
                if (node.querySelector('ms-katex, .katex')) {
                    return serializeChildren(node, ctx);
                }
                const codeEl = node.querySelector('code') || node;
                const codeText = (codeEl.textContent || '').replace(/\r\n?/g, '\n').replace(/\n+$/, '');
                if (codeText.trim().length > 0) hasNonMathText = true;
                return `\n\n${codeText}\n\n`;
            }

            if (tag === 'ul' || tag === 'ol') {
                const items = [...node.children].filter((c) => c.tagName?.toLowerCase() === 'li');
                if (items.length === 0) return serializeChildren(node, ctx);

                let startNum = 1;
                if (tag === 'ol') {
                    if (!usedFirstOlStart && ctx.depth === 0) {
                        startNum = firstOlStart;
                        usedFirstOlStart = true;
                    } else {
                        startNum = Number.parseInt(node.getAttribute('start') || '1', 10) || 1;
                    }
                }

                const lines = [];
                items.forEach((li, idx) => {
                    const inner = serializeChildren(li, {
                        ...ctx,
                        depth: ctx.depth + 1,
                        listDepth: ctx.listDepth + 1
                    })
                        .replace(/^\n+|\n+$/g, '')
                        .replace(/\n{3,}/g, '\n\n');
                    if (!inner) return;
                    const prefix = tag === 'ol' ? `${startNum + idx}. ` : '- ';
                    const indent = '  '.repeat(ctx.listDepth);
                    lines.push(indent + prefix + inner);
                });
                const sep = ctx.listDepth > 0 ? '\n' : '\n\n';
                return lines.length ? `${sep}${lines.join('\n')}${sep}` : '';
            }

            if (tag === 'li') {
                const inner = serializeChildren(node, {
                    ...ctx,
                    depth: ctx.depth + 1,
                    listDepth: topListTag && ctx.depth === 0 ? ctx.listDepth + 1 : ctx.listDepth
                }).replace(/^\n+|\n+$/g, '').replace(/\n{3,}/g, '\n\n');
                if (!inner) return '';
                if (topListTag && ctx.depth === 0) {
                    const prefix = topListTag === 'ol' ? `${firstOlStart + topListItemIndex}. ` : '- ';
                    topListItemIndex += 1;
                    return `${topListItemIndex > 1 ? '\n' : ''}${prefix}${inner}`;
                }
                // 孤立 <li>（例如未包在 <ul>/<ol> 中的片段）保持自然换行，不强加项目符号
                return `\n${inner}\n`;
            }

            if (tag === 'table') {
                const rows = [...node.querySelectorAll('tr')].map((tr) => {
                    const cells = [...tr.children]
                        .filter((c) => c.tagName && /^(td|th)$/i.test(c.tagName))
                        .map((cell) => serializeChildren(cell, { ...ctx, depth: ctx.depth + 1 }).replace(/\s*\n\s*/g, ' ').trim());
                    return cells.join('\t');
                }).filter(Boolean);
                return rows.length ? `\n\n${rows.join('\n')}\n\n` : '';
            }

            if (tag === 'tr') {
                const cells = [...node.children]
                    .filter((c) => c.tagName && /^(td|th)$/i.test(c.tagName))
                    .map((cell) => serializeChildren(cell, { ...ctx, depth: ctx.depth + 1 }).replace(/\s*\n\s*/g, ' ').trim());
                return cells.length ? `\n${cells.join('\t')}\n` : '';
            }

            const inner = serializeChildren(node, {
                ...ctx,
                depth: ctx.depth + 1,
                inPre: ctx.inPre || tag === 'code'
            });

            if (BLOCK_TAGS.has(tag)) {
                if (!inner.trim()) return '';
                if (/^h[1-6]$/.test(tag) || tag === 'p' || tag === 'blockquote') {
                    return `\n\n${inner.replace(/^\n+|\n+$/g, '')}\n\n`;
                }
                return `\n${inner.replace(/^\n+|\n+$/g, '')}\n`;
            }

            return inner;
        }

        function serializeChildren(parent, ctx) {
            let out = '';
            for (const child of parent.childNodes) {
                out += serialize(child, ctx);
            }
            return out;
        }

        const rawOut = serialize(fragment, { depth: 0, listDepth: 0, inPre: false });

        // 若最终仅包含单个公式且无任何非公式正文，按单公式规则格式化（支持“单公式纯 TeX”模式）
        if (mathCount === 1 && !hasNonMathText && singleMathNode) {
            return {
                text: formatMath(singleMathNode, true),
                mathCount: 1,
                isSingleMath: true
            };
        }

        // 精细清理首尾多余换行与块级空行，不破坏选区正文原本的文字与行内空格
        const cleaned = rawOut
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/^\n+|\n+$/g, '');

        return {
            text: cleaned,
            mathCount,
            isSingleMath: false
        };
    }

    function buildCopyPayload(selection) {
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;

        const parts = [];
        let totalMathCount = 0;
        let singleMathOnly = selection.rangeCount === 1;

        for (let i = 0; i < selection.rangeCount; i++) {
            const range = selection.getRangeAt(i);
            if (range.collapsed) continue;
            if (isEditableContext(range.startContainer) || isEditableContext(range.endContainer)) {
                return null;
            }

            const { singleMath, expandedRange, topListTag, firstOlStart } = normalizeRangeForMath(range);

            if (singleMath) {
                totalMathCount += 1;
                parts.push(formatMath(singleMath, selection.rangeCount === 1));
                continue;
            }

            singleMathOnly = false;
            const fragment = expandedRange.cloneContents();
            // 快速检查片段中是否确实包含公式；纯正文选区完全放行给浏览器原生复制
            const hasMath = !!fragment.querySelector?.('ms-katex, .katex-display, .katex');
            if (!hasMath) {
                parts.push(expandedRange.toString());
                continue;
            }

            const extracted = extractFragment(fragment, { topListTag, firstOlStart });
            totalMathCount += extracted.mathCount;
            if (extracted.isSingleMath && selection.rangeCount === 1) {
                singleMathOnly = true;
            }
            parts.push(extracted.text);
        }

        if (totalMathCount === 0) return null;

        return {
            text: parts.join('\n\n'),
            mathCount: totalMathCount,
            isSingleMath: singleMathOnly
        };
    }

    // ==================== 复制事件拦截与桌面/手机触控双击公式快捷复制 ====================
    document.addEventListener('copy', (event) => {
        if (!settings.enabled) return;
        const selection = window.getSelection();
        const payload = buildCopyPayload(selection);
        if (!payload || !payload.text) return;

        let wrote = false;
        if (event.clipboardData) {
            try {
                event.preventDefault();
                event.stopImmediatePropagation();
                event.clipboardData.setData('text/plain', payload.text);
                wrote = true;
            } catch (_) {
                wrote = false;
            }
        }
        if (!wrote) {
            // 兜底兼容部分安卓浏览器/WebView 的剪贴板写入限制
            writeClipboardText(payload.text);
        }

        if (payload.isSingleMath) {
            showToast(`已复制公式：${payload.text.replace(/\s+/g, ' ').slice(0, 42)}`, true);
        } else {
            showToast(`已还原 ${payload.mathCount} 处公式并复制`, true);
        }
    }, true);

    async function writeClipboardText(text) {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (_) {}
        }
        if (typeof GM_setClipboard === 'function') {
            try {
                GM_setClipboard(text, 'text');
                return true;
            } catch (_) {}
        }
        const host = document.body || document.documentElement;
        if (!host) return false;
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        Object.assign(ta.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '1px',
            height: '1px',
            padding: '0',
            border: '0',
            outline: 'none',
            fontSize: '16px',
            opacity: '0',
            pointerEvents: 'none'
        });
        host.appendChild(ta);
        try {
            ta.focus({ preventScroll: true });
        } catch (_) {
            try { ta.focus(); } catch (_) {}
        }
        ta.select();
        try {
            ta.setSelectionRange(0, text.length);
        } catch (_) {}
        let ok = false;
        try {
            ok = document.execCommand('copy');
        } catch (_) {
            ok = false;
        }
        try { ta.blur(); } catch (_) {}
        ta.remove();
        return ok;
    }

    let lastTouchCopyAt = 0;
    async function copySingleMathRoot(mathRoot, { vibrate = false } = {}) {
        if (!mathRoot || isEditableContext(mathRoot)) return false;
        const formatted = formatMath(mathRoot, true);
        if (!formatted) return false;

        const ok = await writeClipboardText(formatted);
        if (ok) {
            if (vibrate) {
                try { navigator.vibrate?.(12); } catch (_) {}
            }
            showToast(`已复制公式：${formatted.replace(/\s+/g, ' ').slice(0, 42)}`, true);
        }
        return ok;
    }

    document.addEventListener('dblclick', async (event) => {
        if (!settings.enabled || !settings.dblclickCopy) return;
        if (Date.now() - lastTouchCopyAt < 550) return;
        const mathRoot = findMathRoot(event.target);
        if (!mathRoot) return;
        await copySingleMathRoot(mathRoot);
    }, true);

    // 安卓手机端触控双击公式识别器（不干扰正常滑动滚动与长按划词选区）
    let activeTouch = null;
    let lastTap = null;

    document.addEventListener('pointerdown', (event) => {
        if (!settings.enabled || !settings.dblclickCopy) return;
        if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
        if (!event.isPrimary) {
            activeTouch = null;
            return;
        }
        const mathRoot = findMathRoot(event.target);
        if (!mathRoot || isEditableContext(mathRoot)) {
            activeTouch = null;
            return;
        }
        activeTouch = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            time: Date.now(),
            moved: false,
            mathRoot
        };
    }, { capture: true, passive: true });

    document.addEventListener('pointermove', (event) => {
        if (!activeTouch || event.pointerId !== activeTouch.pointerId) return;
        if (Math.hypot(event.clientX - activeTouch.x, event.clientY - activeTouch.y) > 12) {
            activeTouch.moved = true;
        }
    }, { capture: true, passive: true });

    document.addEventListener('pointercancel', (event) => {
        if (activeTouch && event.pointerId === activeTouch.pointerId) {
            activeTouch = null;
        }
    }, { capture: true, passive: true });

    document.addEventListener('pointerup', async (event) => {
        if (!activeTouch || event.pointerId !== activeTouch.pointerId) return;
        const cur = activeTouch;
        activeTouch = null;

        const now = Date.now();
        // 滑动或长按（>380ms，多为原生划词）直接放行
        if (cur.moved || now - cur.time > 380) {
            lastTap = null;
            return;
        }
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
            lastTap = null;
            return;
        }

        if (
            lastTap &&
            lastTap.mathRoot === cur.mathRoot &&
            now - lastTap.time <= 340 &&
            Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) <= 36
        ) {
            lastTap = null;
            lastTouchCopyAt = now;
            await copySingleMathRoot(cur.mathRoot, { vibrate: true });
        } else {
            lastTap = {
                mathRoot: cur.mathRoot,
                x: event.clientX,
                y: event.clientY,
                time: now
            };
        }
    }, { capture: true, passive: true });

    // ==================== 油猴菜单（动态更新状态） ====================
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

        const mode = FORMAT_MODES[settings.format] || FORMAT_MODES.markdown;

        register(`📋 复制格式：${mode.label}（点击切换）`, () => {
            const nextIdx = (FORMAT_ORDER.indexOf(settings.format) + 1) % FORMAT_ORDER.length;
            const nextKey = FORMAT_ORDER[nextIdx];
            saveSettings({ ...settings, format: nextKey });
            showToast(`公式复制格式已切为：${FORMAT_MODES[nextKey].label}`, true);
        });

        register(
            settings.dblclickCopy ? '🖱️ 双击 / 手机轻点两次公式复制：已开启' : '🖱️ 双击 / 手机轻点两次公式复制：已关闭',
            () => {
                saveSettings({ ...settings, dblclickCopy: !settings.dblclickCopy });
                showToast(settings.dblclickCopy ? '已开启双击/轻点两次公式直接复制' : '已关闭双击/轻点两次公式直接复制', true);
            }
        );

        register(
            settings.showToast ? '💬 复制成功轻提示：已开启' : '💬 复制成功轻提示：已关闭',
            () => {
                const next = !settings.showToast;
                saveSettings({ ...settings, showToast: next });
            }
        );

        register(
            settings.enabled ? '⏸ 暂停公式复制还原（当前：已开启）' : '▶️ 启用公式复制还原（当前：已暂停）',
            () => {
                saveSettings({ ...settings, enabled: !settings.enabled });
                showToast(settings.enabled ? '已启用公式复制还原' : '已暂停公式复制还原', true);
            }
        );
    }

    refreshMenuCommands();

    // 暴露轻量全局接口，方便不支持油猴扩展菜单的安卓轻量浏览器控制
    const api = {
        getSettings: () => ({ ...settings }),
        setSettings: (patch) => saveSettings({ ...settings, ...(patch || {}) }),
        cycleFormat: () => {
            const nextIdx = (FORMAT_ORDER.indexOf(settings.format) + 1) % FORMAT_ORDER.length;
            const nextKey = FORMAT_ORDER[nextIdx];
            saveSettings({ ...settings, format: nextKey });
            showToast(`公式复制格式已切为：${FORMAT_MODES[nextKey].label}`, true);
            return nextKey;
        }
    };
    try {
        window.aistudioKatexCopy = api;
        if (typeof unsafeWindow !== 'undefined' && unsafeWindow !== window) {
            unsafeWindow.aistudioKatexCopy = api;
        }
    } catch (_) {}
})();
