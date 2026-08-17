[CmdletBinding()]
param(
    [ValidateSet('Release', 'Debug')]
    [string]$Configuration = 'Release',
    [switch]$RefreshNative,
    [switch]$InstallDependencies,
    [switch]$SkipTypeCheck,
    [switch]$SkipVerification,
    [ValidateSet('Auto', 'On', 'Off')]
    [string]$Proxy = 'Auto'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot 'toolchain.ps1')

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory)][string]$FilePath,
        [Parameter(Mandatory)][string[]]$ArgumentList,
        [Parameter(Mandatory)][string]$Label
    )

    Write-Output "`n==> $Label"
    & $FilePath @ArgumentList
    if ($LASTEXITCODE -ne 0) {
        throw "$Label 失败，退出码 $LASTEXITCODE。"
    }
}

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$toolchain = Get-UkuleleAndroidToolchain
Assert-UkuleleAndroidToolchain $toolchain
Enable-UkuleleAndroidToolchain $toolchain

$useProxy = $false
if ($Proxy -eq 'On') { $useProxy = $true }
if ($Proxy -eq 'Auto') { $useProxy = Test-UkuleleLocalProxy }

$gradleOptions = @(
    '-Dorg.gradle.internal.http.connectionTimeout=120000',
    '-Dorg.gradle.internal.http.socketTimeout=120000'
)
if ($useProxy) {
    $gradleOptions += @(
        '-Dhttps.proxyHost=127.0.0.1',
        '-Dhttps.proxyPort=10808',
        '-Dhttp.proxyHost=127.0.0.1',
        '-Dhttp.proxyPort=10808'
    )
}
$env:GRADLE_OPTS = (($gradleOptions + @($env:GRADLE_OPTS)) | Where-Object { $_ }) -join ' '

Push-Location $projectRoot
try {
    & $toolchain.Npm ls --depth=0
    if ($LASTEXITCODE -ne 0) {
        if (-not $InstallDependencies) {
            throw 'npm 依赖不完整。需要自动恢复时追加 -InstallDependencies。'
        }
        Invoke-CheckedCommand $toolchain.Npm @('ci') '安装 npm 依赖'
    }

    if (-not $SkipTypeCheck) {
        Invoke-CheckedCommand $toolchain.Npx @('tsc', '--noEmit') 'TypeScript 类型检查'
    }

    $androidRoot = Join-Path $projectRoot 'android'
    $gradleWrapper = Join-Path $androidRoot 'gradlew.bat'
    if ($RefreshNative) {
        Invoke-CheckedCommand $toolchain.Npx @('expo', 'prebuild', '--platform', 'android', '--clean', '--no-install') '重新生成 Android 原生工程'
    }
    elseif (-not (Test-Path -LiteralPath $gradleWrapper -PathType Leaf)) {
        Invoke-CheckedCommand $toolchain.Npx @('expo', 'prebuild', '--platform', 'android', '--no-install') '生成 Android 原生工程'
    }

    if (-not (Test-Path -LiteralPath $gradleWrapper -PathType Leaf)) {
        throw "Gradle Wrapper 不存在：$gradleWrapper"
    }

    $configurationLower = $Configuration.ToLowerInvariant()
    $env:NODE_ENV = if ($Configuration -eq 'Release') { 'production' } else { 'development' }
    $gradleTask = if ($Configuration -eq 'Release') { 'app:assembleRelease' } else { 'app:assembleDebug' }

    Push-Location $androidRoot
    try {
        Invoke-CheckedCommand $gradleWrapper @($gradleTask, '--no-daemon', '--stacktrace') "Gradle $Configuration APK 构建"
    }
    finally {
        Pop-Location
    }

    $sourceApk = Join-Path $androidRoot "app\build\outputs\apk\$configurationLower\app-$configurationLower.apk"
    if (-not (Test-Path -LiteralPath $sourceApk -PathType Leaf)) {
        throw "Gradle 成功但未找到 APK：$sourceApk"
    }

    $buildTools = $toolchain.BuildTools
    $badging = & (Join-Path $buildTools 'aapt2.exe') dump badging $sourceApk
    if ($LASTEXITCODE -ne 0) { throw 'aapt2 无法读取 APK 元数据。' }
    $packageLine = $badging | Where-Object { $_ -match '^package:' } | Select-Object -First 1
    $packageName = if ($packageLine -match "name='([^']+)'") { $Matches[1] } else { $null }
    $versionCode = if ($packageLine -match "versionCode='([^']+)'") { $Matches[1] } else { $null }
    $versionName = if ($packageLine -match "versionName='([^']+)'") { $Matches[1] } else { $null }

    $signatureOutput = @()
    if (-not $SkipVerification) {
        Invoke-CheckedCommand (Join-Path $buildTools 'zipalign.exe') @('-c', '4', $sourceApk) 'APK ZIP 对齐验证'
        Write-Output "`n==> APK 签名验证"
        $signatureOutput = & (Join-Path $buildTools 'apksigner.bat') verify --verbose --print-certs $sourceApk
        if ($LASTEXITCODE -ne 0) { throw 'APK 签名验证失败。' }
        $signatureOutput | Write-Output
    }

    $distRoot = Join-Path $projectRoot 'dist\android'
    New-Item -ItemType Directory -Force -Path $distRoot | Out-Null
    $artifactName = "UkulelePath-$versionName-$configurationLower.apk"
    $artifactPath = Join-Path $distRoot $artifactName
    Copy-Item -LiteralPath $sourceApk -Destination $artifactPath -Force

    $artifact = Get-Item -LiteralPath $artifactPath
    $hash = Get-FileHash -LiteralPath $artifactPath -Algorithm SHA256
    $signer = $signatureOutput | Where-Object { $_ -match '^Signer #1 certificate DN:' } | Select-Object -First 1
    $signatureV2 = $signatureOutput | Where-Object { $_ -match '^Verified using v2 scheme' } | Select-Object -First 1

    $manifest = [ordered]@{
        schemaVersion = 1
        builtAt = [DateTimeOffset]::Now.ToString('o')
        configuration = $Configuration
        packageName = $packageName
        versionName = $versionName
        versionCode = $versionCode
        artifact = $artifactPath
        sourceApk = $sourceApk
        bytes = $artifact.Length
        sha256 = $hash.Hash
        zipAligned = -not $SkipVerification
        signatureV2 = [bool]($signatureV2 -match ': true$')
        signer = if ($signer) { $signer -replace '^Signer #1 certificate DN:\s*', '' } else { $null }
        toolchain = [ordered]@{
            javaHome = $toolchain.JavaHome
            androidHome = $toolchain.AndroidHome
            nodeRoot = $toolchain.NodeRoot
            proxyUsed = $useProxy
        }
    }

    $manifestPath = Join-Path $distRoot 'latest-build.json'
    $manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

    Write-Output "`nBUILD SUCCESS"
    Write-Output ("APK: " + $artifactPath)
    Write-Output ("SHA256: " + $hash.Hash)
    Write-Output ("Manifest: " + $manifestPath)
}
finally {
    Pop-Location
}
