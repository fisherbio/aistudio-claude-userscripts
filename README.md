# AI Studio · Claude 暖纸主题与默认设置

让 Google AI Studio 更适合专注阅读与对话：Claude 风格的暖纸界面，以及 Gemini 4 Argon / High / 无闪烁侧栏启动。

![Claude 暖纸主题实际效果](docs/preview.png)

## 安装：两个脚本，按需选择

先在 Chrome 安装 [Tampermonkey](https://www.tampermonkey.net/)，再点击所需脚本并在油猴安装页确认。两者可以一起启用，也可以只安装其中一个。

| 脚本 | 版本 | 安装 |
|---|---|---|
| 默认 Gemini 4 Argon、High 思考、启动折叠右侧栏 | 3.1.0 | [安装默认设置脚本](https://raw.githubusercontent.com/fisherbio/aistudio-claude-userscripts/main/aistudio-argon-defaults.user.js) |
| Claude 暖纸主题 | 1.2.6 | [安装主题脚本](https://raw.githubusercontent.com/fisherbio/aistudio-claude-userscripts/main/aistudio-claude-theme.user.js) |

安装后刷新 [AI Studio Playground](https://aistudio.google.com/prompts/new_chat)。若链接只显示源码，可在油猴中新建脚本、粘贴完整源码并保存。Chrome 中若油猴提示脚本执行权限，请按扩展自己的引导开启。

**已有同名脚本的用户**：确认油猴是在更新原脚本；不要同时启用多份默认设置脚本。其他自动关闭 Run settings 的脚本也应停用，以免争抢面板。

## 默认设置脚本：后台配置，再显示完成的页面

- 在 `document-start` 安装启动遮罩，隐藏 Run settings 与模型选择弹层，避免可见的展开、切换和折叠动画。
- 通过 AI Studio 原生控件选择 **Gemini 4 Argon** 和 **High**，读回确认后折叠侧栏、解除遮罩。
- 支持 `/prompts/` 下的刷新、新建对话和 SPA 导航。
- 配置失败时解除遮罩并显示提示，保留面板供检查；油猴菜单可重试、查看状态或切换侧栏。

每次打开或新建对话时会重新应用默认设置，包括打开已有对话。初始化完成后仍可手动换模型；下一次刷新或新建对话会恢复 Argon / High。要长期使用别的默认模型，可停用此脚本。

**账户必须能使用该模型和 High 选项。** 脚本只操作现有界面，不提供模型权限，也不会自动发送请求。

## 主题：保留原生功能，重做阅读体验

- 暖白、燕麦色、陶土色配色，衬线回答正文，居中的阅读栏和圆角输入框。
- 简洁首页、用户消息气泡，以及统一的 Markdown 表格、引用和代码块样式。
- 输入框旁的模型名称打开原生模型选择器；保留附件、工具、麦克风、发送与停止控件。
- “写作 / 学习 / 编程 / 分析”仅在草稿为空时填入提示，**不会自动发送，也不覆盖已有草稿**。
- 油猴菜单“切换 Claude 暖纸主题 / 原版”临时切换当前页；停用主题脚本可长期恢复原版。

主题不改变回答原文，不替换 Markdown / KaTeX 解析器。可在源码顶部的 `--cs-*` CSS 变量中调整配色，字体使用本机可用字体。

## 公式与排版实测

2026-11-01，在 Chrome / Tampermonkey 5.5.1 中使用 Gemini 3.8 Flash 完成两次真实对话测试：

| 内容 | 结果 |
|---|---|
| 中文、粗体、斜体、列表、引用、Markdown 表格 | 正常 |
| Python / TeX 代码围栏 | 保留源码，不误渲染成公式 |
| `$…$`、`\(…\)` 行内公式 | 正常；已修复主题造成的空白和拆行 |
| `$$…$$` 独立公式、积分、上下标、矩阵 | 正常 |
| `$$` 内的 `aligned` 多行环境 | 正常对齐 |
| `\[…\]` 包裹的 `aligned` | 本次 AI Studio 原生未识别，显示源码；同一公式改用 `$$…$$` 后正常 |

推荐独立公式使用 `$$…$$`，例如：

```latex
$$
\begin{aligned}
S(t)&=e^{-\lambda t}\\
H(t)&=\int_0^t h(u)\,du
\end{aligned}
$$
```

这里验证的是 AI Studio 的原生数学渲染，不是完整 `.tex` 文档或宏包的 LaTeX 编译。

## 权限、兼容性与反馈

两份脚本均只匹配 `https://aistudio.google.com/*`，使用 `GM_registerMenuCommand` 添加本地菜单；不包含 API 密钥、遥测或向第三方上传对话的逻辑。模型请求仍由 AI Studio 本身处理。

脚本依赖 AI Studio 当前 DOM 与控件标签，上游改版后可能需要更新。遇到问题，请在 [Issues](https://github.com/fisherbio/aistudio-claude-userscripts/issues) 提供脚本版本、复现步骤和已去除隐私信息的截图。不要上传 API 密钥或私人对话。

## 开发

无需构建或依赖安装。修改 `.user.js` 后在油猴中保存并刷新 AI Studio。Node.js 可做基础语法检查：

```sh
node --check aistudio-argon-defaults.user.js
node --check aistudio-claude-theme.user.js
```

语法检查不代替真实页面的交互与视觉验证。

## 许可与致谢

[MIT](LICENSE)。默认设置脚本保留原有 `Antigravity` 作者标注。主题的暖纸配色参考了用户提供的个人 TeX 样式，仓库不分发该参考文件。

这是第三方用户脚本项目，与 Google 或 Anthropic 无隶属关系；产品名称与商标归各自权利人所有。
