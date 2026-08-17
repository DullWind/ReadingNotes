# Android APK 本地构建工具链

本文档面向接手项目的 AI 与开发者。当前 Windows 电脑已经安装完整 Android 构建环境；不要在每次构建前重复安装 JDK、Android Studio、SDK、NDK 或 CMake。

## 最短路径

在项目根目录执行：

```powershell
npm.cmd run build:apk
```

构建成功后，统一产物位于：

```text
dist/android/UkulelePath-<version>-release.apk
dist/android/latest-build.json
```

`latest-build.json` 包含产物绝对路径、包名、版本、大小、SHA-256、签名状态和本次使用的工具路径，适合 AI 直接读取。

## 何时刷新原生工程

普通 TypeScript、样式、图片和业务逻辑修改直接运行 `npm.cmd run build:apk`，复用现有 `android/` 与 Gradle 缓存。

只有以下情况使用：

```powershell
npm.cmd run build:apk:refresh
```

- 修改 `app.json` 或 config plugin；
- 增删包含原生代码的 Expo/React Native 依赖；
- `android/` 不存在或确认需要重新生成。

`build:apk:refresh` 会执行 `expo prebuild --clean`，因此会重建被 `.gitignore` 忽略的 `android/`。不要在存在未迁移的手工原生修改时使用。

## 已安装环境

| 工具 | 版本/路径 |
| --- | --- |
| Node.js | 24.18.0，用户级 Node 目录 |
| JDK | Eclipse Temurin 17.0.20+8，`%LOCALAPPDATA%\Programs\UkulelePathBuildTools\jdk\jdk-17.0.20+8` |
| Android SDK | `%LOCALAPPDATA%\Android\Sdk` |
| Platform Tools | 37.0.1 |
| Android Platform | API 36 revision 2 |
| Build Tools | 35.0.0、36.0.0 |
| NDK | 27.1.12297006 |
| CMake | 3.22.1、3.30.5 |

工具下载目录已经整理为：

```text
%LOCALAPPDATA%\Programs\UkulelePathBuildTools\
├─ archives\             # 完整、已校验的离线安装包
├─ download-fragments\   # 保留的分段下载与重复文件
├─ downloads\            # 后续下载暂存区
├─ install-temp\         # 保留的安装期解压文件
└─ jdk\                  # 正在使用的 JDK 17
```

用户级 `JAVA_HOME`、`ANDROID_HOME`、`ANDROID_SDK_ROOT` 和 `Path` 已持久配置。脚本仍会自行解析用户环境和已知安装目录，因此不依赖调用 AI 当前终端是否已刷新环境变量。

机器可读版本清单见 `tools/android/toolchain-manifest.json`。环境自检脚本不会修改电脑：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/android/check-env.ps1 -Json
```

## 构建脚本行为

`tools/android/build-apk.ps1` 会依次：

1. 检查 JDK、Node、Android Platform、Build Tools、NDK、CMake、签名与对齐工具；
2. 检查 npm 依赖并运行 TypeScript 类型检查；
3. 按需运行 Expo Prebuild；
4. 执行 `app:assembleRelease`；
5. 用 `zipalign`、`apksigner` 和 `aapt2` 验证 APK；
6. 将产物复制到 `dist/android/` 并写出 JSON 清单。

如果 `127.0.0.1:10808` 可连接，脚本会自动把 Gradle 指向本地代理；代理未运行时直接联网。也可显式传入 `-Proxy On` 或 `-Proxy Off`。

常用参数：

```powershell
# 自动恢复 node_modules 后构建
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/android/build-apk.ps1 -InstallDependencies

# 构建 Debug APK
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/android/build-apk.ps1 -Configuration Debug

# 原生配置变化后重建 android/ 再构建
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/android/build-apk.ps1 -RefreshNative
```

## 离线归档与边界

两份经过官方哈希校验的基础归档保存在：

```text
%LOCALAPPDATA%\Programs\UkulelePathBuildTools\archives
```

它们用于恢复 JDK 与 Android command-line tools。Android Platform、Build Tools、NDK 与 CMake 已安装在 SDK 目录中；若这些组件被删除，应按 `toolchain-manifest.json` 的固定版本通过官方 Android 工具重新安装。

当前 Release APK 使用 Debug Keystore，仅适合本机安装和内部测试，不能作为应用商店正式签名。正式发布仍需要独立 upload key 和 AAB 工作流。

历史故障、镜像下载和已验证解决方案见 `docs/BUILD_TROUBLESHOOTING.md`。
