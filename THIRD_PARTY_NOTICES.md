# 第三方组件与素材

本项目的业务代码以 MIT 发布；以下第三方组件/素材保留各自许可。

## Spotify Basic Pitch

- 用途：浏览器内音频转音符（智能扒谱）。
- 源码：https://github.com/spotify/basic-pitch-ts
- 许可：Apache License 2.0
- 文件：
  - `site/vendor/basic-pitch/basic-pitch.js`（由 esbuild 打包，内含 TensorFlow.js）
  - `site/vendor/basic-pitch/model/model.json`
  - `site/vendor/basic-pitch/model/group1-shard1of1.bin`
- 版权：Copyright 2022 Spotify AB

## TensorFlow.js

- 用途：Basic Pitch 的推理运行时，随 bundle 一起分发。
- 源码：https://github.com/tensorflow/tfjs
- 许可：Apache License 2.0
- 版权：Copyright 2018 Google LLC

## Doinu

- 用途：公有领域儿歌旋律数据参考。
- 源码：https://github.com/Endika/doinu
- 许可：MIT
- 版权：Copyright (c) Endika
- 本项目使用/改写了其 `src/content/songs.ts` 中的部分公有领域传统旋律，并翻译了曲名。

## Bach to Basics

- 用途：导入/跟弹/练习交互的参考，不包含其代码。
- 源码：https://github.com/gigliof/bach-to-basics
- 许可：MIT

## 曲目版权

- 所有曲目均为公有领域作品（传统民歌、古典作品）或本项目基于公有领域主题的简化编配。
- 不包含任何现代版权流行曲。
- 古典曲目标注“简化编配 / 主题片段”，不代表原曲完整版。

## 字体 / 图标

- 网站使用系统字体，不加载第三方字体。
- 图标与 OG 图为项目自绘（Pillow 生成）。
