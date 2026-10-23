# 落音 PianoFall · 微信小程序壳

这是一个**最小可用的 WebView 外壳**：小程序打开后直接加载线上 H5 站点，钢琴、音频、导入、扒谱全部在 H5 里运行，不在小程序里重复实现一遍。

> 这是“最快上架”的方案，但微信对 `web-view` 有硬性要求，必须先做完下面两件事，否则真机打开会白屏。

## 必须完成的两件事

1. **换成你自己的小程序 AppID**
   - 打开 `project.config.json`，把 `"appid": "touristappid"` 换成你在微信公众平台申请的小程序 AppID。
   - 游客模式只能本地预览，不能真机发布。

2. **配置业务域名**
   - 小程序后台 → 开发 → 开发管理 → 开发设置 → **业务域名**。
   - 添加 `yangfanwudi.github.io`（或你自己的 H5 域名），按提示下载校验文件放到 H5 根目录。
   - GitHub Pages 需要可被微信校验；如果校验/访问不稳定，建议把 `site/` 部署到国内可访问的 HTTPS 静态托管（腾讯云 COS、阿里云 OSS、CloudBase 等），再改 `pages/index/index.js` 里的 `url`。

## 本地预览

1. 安装微信开发者工具。
2. 导入本目录 `miniprogram/`。
3. 修改 `project.config.json` 的 AppID、`pages/index/index.js` 的 `url`。
4. 编译，真机预览。

## 限制

- 小程序 `web-view` 内不能使用部分浏览器能力；音频播放、PWA 安装、剪贴板分享等以微信 WebView 实际支持为准。
- 小程序审核对“纯 WebView 套壳”有内容/类目要求，请按你的实际类目提交；如果被拒，需要把核心页面原生重写（成本高得多）。
- 更轻的替代方案：直接让用户把 H5 站点“添加到主屏幕”（PWA），无需审核、无需 AppID。

## 目录

```
miniprogram/
├─ app.js / app.json / app.wxss
├─ project.config.json
├─ sitemap.json
└─ pages/index/
   ├─ index.js     ← 改这里的线上 URL
   ├─ index.wxml   ← web-view
   ├─ index.json
   └─ index.wxss
```
