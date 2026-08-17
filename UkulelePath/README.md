# 木弦日课（Android）

围绕《幻化成风》指弹目标设计的尤克里里学习应用。

长期产品、架构、路线图和质量约定见 [docs/PRODUCT_DEVELOPMENT.md](docs/PRODUCT_DEVELOPMENT.md)。后续开发应优先更新该文档，避免关键决策只保留在对话中。

## 已实现

- 温暖木质视觉主题
- 六阶段目标学习路线
- 根据练习反馈动态生成每日计划
- BPM 分级练习与练习结果记录
- 用户本机音频导入、播放和变速
- SQLite 本地持久化

## 本地运行

1. 安装依赖：npm install
2. 启动 Android：npx expo start --android

SDK 57 使用开发构建时，可执行 npx expo prebuild 后再运行 npx expo run:android。

## 内容说明

应用不内置受版权保护的原曲。用户通过系统文件选择器导入自己合法取得的音频，文件只在本机使用。

src/data/song.ts 当前保存教学段落骨架。下一步需要将目标 PDF 中的小节、音符、弦号、品位和段落时间点录入为结构化歌曲包。
