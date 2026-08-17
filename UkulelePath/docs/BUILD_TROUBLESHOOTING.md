# Android 构建错误日志

> 项目：木弦日课（UkulelePath）  
> 首次记录：2026-08-17  
> 用途：保存可复现、可全文搜索的 Android 构建故障。查询时可搜索错误编号、错误原文、组件名或标签。

## 查询方式

在项目根目录执行：

    rg -n "JAVA_HOME|jbr" docs/BUILD_TROUBLESHOOTING.md
    rg -n "AND-BUILD-006|Platform 36|ext19" docs/BUILD_TROUBLESHOOTING.md
    rg -n "timeout|0 字节|下载慢" docs/BUILD_TROUBLESHOOTING.md

## 快速索引

| 编号 | 关键词 | 状态 |
| --- | --- | --- |
| AND-BUILD-001 | JAVA_HOME、jre、jbr | 已解决 |
| AND-BUILD-002 | Gradle 9.3.1、timeout、镜像 | 已解决 |
| AND-BUILD-003 | SDK Manager、0 字节、SHA-1 | 已绕过 |
| AND-BUILD-004 | NDK 27.1.12297006、r27b | 已解决 |
| AND-BUILD-005 | Build Tools 35.0.0、36.0.0 | 已解决 |
| AND-BUILD-006 | Platform 36、revision 2、ext19 | 已解决 |
| AND-BUILD-007 | CMake 3.22.1、3.30.5 | 已解决 |
| AND-BUILD-008 | Maven Central、Prefab、fbjni | 已解决 |
| AND-BUILD-009 | Hard link failed、跨磁盘 | 可忽略 |
| AND-BUILD-010 | NODE_ENV、Debug、Metro、Release | 已解决 |
| AND-BUILD-011 | Debug Keystore、v2 签名 | 测试可用 |
| AND-BUILD-012 | deprecated、Gradle 10 | 待升级处理 |

## AND-BUILD-001：JAVA_HOME 指向失效的 JRE

- 日期：2026-08-17
- 标签：JAVA_HOME、Android Studio、jre、jbr、JDK 17
- 错误原文：ERROR: JAVA_HOME is set to an invalid directory: C:\Program Files\Android\Android Studio\jre
- 症状：gradlew 和 apksigner 无法启动。
- 原因：旧环境变量指向 jre，当前 Android Studio 使用 jbr。
- 解决：当前进程设置 JAVA_HOME=C:\Program Files\Android\Android Studio\jbr。
- 长期建议：更新系统 JAVA_HOME，Android Studio 升级后重新确认路径。
- 验证：Gradle 9.3.1 和 apksigner 正常运行。
- 复发条件：升级或重装 Android Studio。

## AND-BUILD-002：Gradle Wrapper 下载超时

- 日期：2026-08-17
- 标签：Gradle 9.3.1、networkTimeout、services.gradle.org、阿里云
- 错误原文：Downloading gradle-9.3.1-bin.zip failed: timeout (10000ms)；Connection timed out
- 症状：下载到约 50% 后失败。
- 原因：默认 10 秒读取超时，当前网络到官方站不稳定。
- 解决：networkTimeout 改为 120000；distributionUrl 改为阿里云同版本镜像。
- 验证：Gradle 9.3.1 下载并构建成功。
- 复发条件：重新生成 android 目录或升级 Gradle。

## AND-BUILD-003：SDK Manager 下载停在 0 字节

- 日期：2026-08-17
- 标签：SDK Manager、0 bytes、dl.google.com、SHA-1、并行分段
- 症状：显示 Preparing Install，但 SDK .temp 中 ZIP 长时间为 0 字节。
- 影响：NDK、Build Tools、Platform、CMake。
- 原因：SDK Manager 无法稳定开始下载，但 Google 官方直链可访问。
- 解决：从官方 repository2-1.xml 读取文件名、大小和 SHA-1；并行分段下载；合并校验；验证 source.properties 和关键工具后安装。
- 验证：全部手工安装包与官方清单一致，Gradle成功识别。
- 注意：禁止安装来源不明或未经哈希校验的 SDK/NDK 包。

## AND-BUILD-004：缺少 NDK 27.1.12297006

- 日期：2026-08-17
- 标签：NDK、27.1.12297006、r27b、clang
- 安装目录：C:\Users\wuyuzhen\AppData\Local\Android\Sdk\ndk\27.1.12297006
- 官方文件：android-ndk-r27b-windows.zip
- 官方校验：781495902 字节；SHA-1 3BB7EFC850CD0AF7707854B7E0D5C3B6A7153703。
- 验证：source.properties 版本正确，clang.exe 存在。

## AND-BUILD-005：缺少 Build Tools 35.0.0 和 36.0.0

- 日期：2026-08-17
- 标签：Build Tools、35.0.0、36.0.0、aapt2、apksigner
- 症状：主项目要求 36.0.0，部分模块还触发 35.0.0。
- 官方校验：
  - 35.0.0：59878107 字节；SHA-1 AF059BB67CF7786F45EE0DB85E2D24985DF1B4B6
  - 36.0.0：58699878 字节；SHA-1 F16CCFFD34DE8790DEDE813A6C7D8E2C11A27B50
- 验证：source.properties、aapt2.exe、apksigner.bat 均存在。

## AND-BUILD-006：Platform 36 基础平台与 ext19 混淆

- 日期：2026-08-17
- 标签：Platform 36、revision 2、ext19、inconsistent location
- 警告原文：Observed package id 'platforms;android-36-ext19' in inconsistent location
- 原因：API 36 同时有基础平台和 Extension 19，首次命中了 ext19。
- 正确目录：
  - platforms\android-36：基础平台 revision 2，IsBaseSdk=true
  - platforms\android-36-ext19：Extension Level 19
- 官方校验：
  - 基础平台：65878410 字节；SHA-1 2C1A80DD4D9F7D0E6DD336EC603D9B5C55A6F576
  - ext19：66057671 字节；SHA-1 52E240C229CF2AD561EE262EBDFFF266E180C585
- 验证：基础平台 android.jar 存在，source.properties 显示 API 36、revision 2、IsBaseSdk=true。

## AND-BUILD-007：同时需要两个 CMake 版本

- 日期：2026-08-17
- 标签：CMake 3.22.1、3.30.5、expo-modules-core、React Native
- 原因：React Native 0.86.2 要求 3.30.5，expo-modules-core 要求 3.22.1。
- 解决：保留 Android\Sdk\cmake\3.22.1 和 Android\Sdk\cmake\3.30.5。
- 官方校验：
  - 3.22.1：16116742 字节；SHA-1 292778F32A7D5183E1C49C7897B870653F2D2C1B
  - 3.30.5：19898983 字节；SHA-1 308C94365EDB2760F38EEF8F745E313E36908A18
- 验证：两个版本的 cmake.exe、ninja.exe、source.properties 均通过检查。

## AND-BUILD-008：Maven Central 原生依赖下载过慢

- 日期：2026-08-17
- 标签：Maven Central、Prefab、fbjni、react-android、阿里云
- 症状：Gradle 长时间停在 CMake 配置前，CPU几乎不增长但仍保持 HTTPS 连接。
- 原因：React Native AAR、Prefab、fbjni 等原生依赖下载缓慢。
- 解决：在 android/build.gradle 的两处 repositories 前加入阿里云 google、central 镜像，同时保留 google()、mavenCentral() 回退。
- 验证：重试后快速越过下载和 transform，Debug/Release 构建成功。
- 复发条件：expo prebuild 可能覆盖镜像配置。

## AND-BUILD-009：跨磁盘硬链接失败

- 日期：2026-08-17
- 标签：Hard link failed、Doing a slower copy instead、C盘、G盘
- 日志原文：Hard link ... failed. Doing a slower copy instead.
- 原因：Gradle 缓存在 C 盘，项目位于 G 盘，Windows不能跨卷硬链接。
- 影响：仅降低速度；Gradle自动改为复制，产物不受影响。
- 处理：无需修复。

## AND-BUILD-010：Debug 与独立运行的 Release

- 日期：2026-08-17
- 标签：NODE_ENV、Debug APK、Metro、Release APK、JS bundle
- 警告原文：The NODE_ENV environment variable is required but was not specified.
- 说明：Debug APK 主要用于联调，通常需要 Metro。
- 解决：Release 构建前设置 NODE_ENV=production，再执行 gradlew assembleRelease。
- 验证：Metro 打包 631 个模块并写入 index.android.bundle，Release APK 可脱离 Metro。

## AND-BUILD-011：Release 使用 Debug Keystore

- 日期：2026-08-17
- 标签：Debug Keystore、Release signing、APK Signature Scheme v2、上架
- 当前配置：release 使用 signingConfigs.debug。
- 验证：apksigner 校验通过，使用 v2 签名，签名者为 CN=Android Debug。
- 结论：可用于本地安装和内测，不可作为应用商店正式签名。
- 发布前：创建正式 Keystore，配置 Release Signing，生成正式 APK/AAB。

## AND-BUILD-012：依赖弃用警告

- 日期：2026-08-17
- 标签：deprecated、RawPropsParser、UIManagerModule、Gradle 10
- 示例：RawPropsParser is deprecated；UIManagerModule is deprecated；Deprecated Gradle features were used。
- 来源：Expo SDK 57、React Native 0.86.2 和对应 Gradle 插件。
- 当前影响：不阻止 Gradle 9.3.1 构建，Debug/Release 均成功。
- 后续：升级 Expo/React Native 时复查，不要脱离 Expo 兼容矩阵单独强升组件。

## 已验证产物

| 产物 | 路径 | 结果 |
| --- | --- | --- |
| Debug APK | android/app/build/outputs/apk/debug/app-debug.apk | 构建成功，主要用于 Metro 联调 |
| 本地测试 Release APK | android/app/build/outputs/apk/release/app-release.apk | 内置 JS bundle，v2 签名通过 |

## 新增日志规范

以后追加问题时必须包含：唯一编号、日期、标签、错误原文、环境、症状、根因、解决步骤、验证证据和复发条件。

只有经过实际构建或检查验证的问题才能标记“已解决”；推测性方案必须标为“待验证”。