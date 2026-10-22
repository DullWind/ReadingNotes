# 当前设备 Android 构建说明

> 设备标识：当前开发设备（2026-08-18）。本文仅记录本机差异，不修改或替代 `tools/android/` 中为另一台设备维护的共享构建脚本。

## 本机 Java 17

本机可用的 Java 17 随 Android Studio 安装：

```text
C:\Program Files\Android\Android Studio\jbr
```

共享脚本当前优先读取用户级 `JAVA_HOME`，但本机该变量仍指向已失效的：

```text
C:\Program Files\Android\Android Studio\jre
```

因此，在本机终端构建前，仅为当前 PowerShell 会话设置：

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
```

不要把这个绝对路径写入共享构建脚本，也不要修改用户级环境变量。

## 原生配置刷新

修改 `app.json` 或 config plugin 后，本机仍使用项目标准命令：

```powershell
npm.cmd run build:apk:refresh
```

普通 TypeScript 或样式修改使用：

```powershell
npm.cmd run build:apk
```

2026-08-18 为录音权限刷新原生工程时，Gradle 需要下载 `gradle-9.3.1-bin.zip`；该次构建按用户要求在下载阶段停止，未生成新的 APK。
