# 落音 PianoFall

零基础也能弹一首像样的曲子。一个纯前端、零框架的在线钢琴与练习工具。

**在线地址：** https://yangfanwudi.github.io/luoyin-pianofall/

## 功能

- 🎹 三个八度钢琴键床，鼠标、触摸、电脑键盘都能弹，支持刮奏与延音。
- 🌱 **新手 / 高手** 双模式：新手慢速 + 宽判定 + 幽灵手补音 + 键盘提示；高手原速 + 严格判定。
- 🎵 **114 首公有领域曲目**：儿歌、中国民歌、古典主题、圣诞颂歌、世界民谣与基础练习；支持搜索、难度/分类筛选、排序、收藏和随机一首。曲库默认只列 8 首，点“显示全部 114 首”展开。
- 🎼 **演奏模式**：默认 3 首当前难度精选，点“查看全部 114 首”才展开长列表；下落方块 + Perfect/Good/Miss 判定 + 连击 + 评级 + 成绩分享卡。
- 🎧 **本地音频伴奏**：导入 mp3 / wav / m4a / ogg / flac，播放 / 循环 / 调速 / 音量，全部在浏览器内处理，不上传。
- 🎼 **MIDI 导入**：拖入 `.mid` / `.midi`，自动提取主旋律并生成可练习谱。
- ✨ **智能扒谱**：基于 Spotify Basic Pitch，在浏览器内把独奏/清唱音频识别成可练习旋律（首次需加载约 1 MB 模型）。
- 📱 **PWA / App**：可安装到桌面/手机，二次打开离线可用；顶栏「安装 App」按提示操作。
- 🧩 **微信小程序壳**：`miniprogram/` 提供 WebView 外壳，填入 AppID + 配置业务域名后可在微信开发者工具导入（详见 `miniprogram/README.md`）。
- 🎨 **音名体系**：小字组（中央C = c1，默认）、科学音高（C4）、Yamaha（C3）、唱名（do re mi）随时切换。
- 🎚️ **音准**：十二平均律，A4=440Hz 可微调；提供 A4 试听与 C 大调音阶自检。

> 自由演奏里的「试听」只放主旋律，不自动叠加和声/伴奏；伴奏只在「演奏模式」和「自动伴奏」中出现。


## 本地运行

```powershell
# 任选一个静态服务器
python -m http.server 8765
# 打开 http://127.0.0.1:8765/
```

直接双击 `index.html` 也能弹琴；PWA/Service Worker 只在 HTTPS 或 localhost 下生效。

## 键盘映射

白键：`Z X C V B N M` + `Q W E R T Y U I O P`
黑键：`1 2 3 4 5` | `6 7 8 9 0` | `- =`
覆盖两个八度 + C/D/E。琴键下方有独立提示条，设置里可隐藏。

## 隐私

- 音频、MIDI、扒谱全部在浏览器本地处理，不会上传。
- 没有账号、没有统计、没有第三方追踪。
- 设置只保存在 `localStorage`。

## 开发

- 纯 HTML/CSS/JavaScript，无构建步骤；`site/` 即部署根目录。
- Basic Pitch 的浏览器 bundle 由 `tools/bp` 下的 esbuild 脚本生成，放在 `site/vendor/basic-pitch/`，仅在使用智能扒谱时懒加载。
- 曲库在 `site/js/songs.js`（原有 10 首）、`site/js/songs-extra.js`（17 首）、`site/js/songs-more.js`（14 首）和 `site/js/songs-library.js`（73 首），共 114 首。分类为儿歌 / 民歌 / 古典 / 圣诞 / 世界 / 练习。

### 目录

```
site/
├─ index.html
├─ js/config.js        音名 / 设置 / 难度 / 键位数据源
├─ js/songs.js         曲库（10）
├─ js/songs-extra.js   扩充曲库（17）
├─ js/songs-more.js    第二批扩充（14）
├─ js/songs-library.js 第三批扩充（73：民歌/古典/圣诞/世界/练习）
├─ js/import.js        音频伴奏 / MIDI / Basic Pitch
├─ vendor/basic-pitch/ 懒加载扒谱 bundle + 模型
├─ assets/             图标 / OG 图 / favicon
├─ manifest.webmanifest
├─ sw.js
└─ miniprogram/        微信小程序 WebView 外壳
```

## App / 小程序

- **PWA（推荐）**：手机/桌面浏览器打开站点，点顶栏「安装 App」或浏览器菜单“安装应用/添加到主屏幕”，即可像 App 一样全屏打开，二次打开可离线。
- **微信小程序**：仓库内的 `miniprogram/` 是 WebView 外壳，需要你自己的 AppID 和“业务域名”配置，详见 [miniprogram/README.md](miniprogram/README.md)。纯套壳可能过不了审核，需按实际类目评估。
- **原生 App**：当前交付为 PWA；如需 APK/IPA，可用 Capacitor 等工具把线上 URL 包进 WebView，再走签名/上架流程。

## 曲目与版权

所有曲目均为 **公有领域作品 / 民歌**，或由本项目做简化编配；不包含现代版权流行曲。
第三批 73 首以民歌通行旋律、圣诞颂歌、世界民谣和古典主题的单声部简化编配为主；古典与部分长曲只保留最容易被认出的段落，不冒充原曲完整版。
新手曲目旋律参考了 [Doinu](https://github.com/Endika/doinu)（MIT）的公有领域曲库，特此致谢。

## 第三方

- [Spotify Basic Pitch](https://github.com/spotify/basic-pitch-ts) — Apache-2.0（模型与浏览器端推理）
- [TensorFlow.js](https://www.tensorflow.org/js) — Apache-2.0（随 Basic Pitch bundle）
- [Doinu](https://github.com/Endika/doinu) — MIT（部分公有领域旋律数据）
- [Bach to Basics](https://github.com/gigliof/bach-to-basics) — MIT（导入/练习交互参考）

完整许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## License

代码以 MIT 协议发布，见 [LICENSE](LICENSE)。
