# 🐟 Aqua DeepSeek HD — DeepSeek Harness 鱼缸浮窗插件

在 [DeepSeek Harness (HD)](https://deepseek.com) 界面右下角注入一条像素鱼缸浮窗，实时显示 DeepSeek API 峰谷价格。白底深色鱼蓝水，自动匹配 HD 浅色主题。

> 独立网页用户请使用 [aqua-deepseek](https://github.com/xiaoyu7044/aqua-deepseek)。

<details>
<summary>🌐 English</summary>

A pixel-fish aquarium that appears in DeepSeek Harness's bottom-right corner,
showing real-time [DeepSeek API](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/)
pricing with peak/off-peak visual feedback. Matches HD's light theme automatically.

> Standalone webpage users: use [aqua-deepseek](https://github.com/xiaoyu7044/aqua-deepseek) instead.

</details>

---

## 安装

```bash
dsh plugin --profile web add aqua-deepseek-hd
dsh plugin --profile headless add aqua-deepseek-hd
systemctl --user restart dsh-web
```

刷新 HD 页面，右下角出现鱼缸浮窗。

## 效果

| HD 内效果 | 说明 |
|:---:|:---|
| ![HD 鱼缸](docs/preview-hd.png) | 白底深色鱼蓝水，自动匹配 HD 浅色主题 |

## 插件做了什么

1. **注入鱼缸浮窗** — 通过 `webserver/index-inject` 把浮窗脚本注入 HD 页面
2. **注入主题 CSS** — 覆盖 CSS 变量让浮窗匹配 HD 的白色主题（`--card`, `--text`, `--accent` 等）
3. **注册 `aqua_price` 工具** — AI 可调用查询 DeepSeek 实时价格

## AI 工具：aqua_price

HD 内的 AI 可调用此工具：

| action | 功能 |
|---|---|
| `pricing`（默认） | 查询 DeepSeek 官网实时峰谷价格 |
| `widget` | 返回浮窗嵌入说明 |
| `theme` | 设置主题（default/winter/autumn/spring） |

## 主题

插件默认注入 HD 专属主题（`hd`）：深色鱼 `#1a1121` + 蓝水 `65,118,230`。

切换其他主题：在浏览器控制台执行 `window.__AQUA_THEME__ = 'winter'` 后刷新。

## 依赖

- `aqua-deepseek` — 独立浮窗组件（npm 自动安装）
- `@deepseek-ai/dsh-tools` — HD 工具注册 API（HD 运行时自带）

## 许可

[MIT License](LICENSE) · © 2026 LiJiaChuan
