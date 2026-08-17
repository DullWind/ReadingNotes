# 木弦成风（Android）

从音乐节拍、TAB、基础和弦和简单练习曲开始，逐步走向《幻化成风》指弹目标的尤克里里学习应用。

长期产品、架构、路线图和质量约定见 [docs/PRODUCT_DEVELOPMENT.md](docs/PRODUCT_DEVELOPMENT.md)。后续开发应优先更新该文档，避免关键决策只保留在对话中。

## 已实现

- 温暖木质视觉主题
- 六节音乐与尤克里里基础课
- 内置基础练习曲与结构化 TAB
- 逐音符、逐和弦按弦动画
- 有声、视觉与振动节拍器，可分别关闭声音或振动
- 六阶段目标学习路线
- 根据练习反馈动态生成每日计划
- BPM 分级练习与练习结果记录
- 用户本机音频导入、播放和变速
- SQLite 本地持久化

## 本地运行

1. 安装依赖：npm install
2. 启动 Android：npx expo start --android

SDK 57 使用开发构建时，可执行 npx expo prebuild 后再运行 npx expo run:android。

## 一键构建 APK

当前电脑已经配置好 JDK、Android SDK、NDK、CMake 和 Gradle 缓存。后续 AI 或开发者不需要重复安装环境：

```powershell
npm.cmd run build:apk
```

APK 与机器可读构建清单统一输出到 `dist/android/`。修改 `app.json`、config plugin 或原生依赖后，改用 `npm.cmd run build:apk:refresh`。完整工具版本、路径、参数和边界见 [docs/ANDROID_BUILD_TOOLCHAIN.md](docs/ANDROID_BUILD_TOOLCHAIN.md)。

## 内容说明

应用不内置受版权保护的原曲。用户通过系统文件选择器导入自己合法取得的音频，文件只在本机使用。

`src/data/foundations.ts` 保存基础课程、练习曲、TAB 事件和 C、Am、F、G7 和弦手型。

`src/data/song.ts` 当前保存《幻化成风》的教学段落骨架。下一步仍需将目标 PDF 中的小节、音符、弦号、品位和段落时间点录入为经过演奏校对的结构化歌曲包。在达到 90 BPM 前，应用不使用被大幅降速的完整原曲作为基础伴奏。

节拍器使用的 `assets/audio/metronome-click.wav` 来自 OpenGameArt，由 qubodup 发布为 CC0；完整来源、哈希和许可记录见 `assets/audio/README.md`。
