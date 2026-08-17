Set-StrictMode -Version Latest

function Get-FirstExistingDirectory {
    param([string[]]$Candidates)

    foreach ($candidate in $Candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Container)) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    return $null
}

function Get-UkuleleNodeRoot {
    $candidates = @()
    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($nodeCommand) {
        $candidates += Split-Path -Parent $nodeCommand.Source
    }

    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if ($userPath) {
        foreach ($entry in ($userPath -split ';')) {
            if ($entry -and (Test-Path -LiteralPath (Join-Path $entry 'node.exe') -PathType Leaf)) {
                $candidates += $entry
            }
        }
    }

    $programsRoot = Join-Path $env:LOCALAPPDATA 'Programs'
    if (Test-Path -LiteralPath $programsRoot -PathType Container) {
        $candidates += Get-ChildItem -LiteralPath $programsRoot -Directory -Filter 'nodejs-*' -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            ForEach-Object {
                Get-ChildItem -LiteralPath $_.FullName -Directory -Filter 'node-*-win-x64' -ErrorAction SilentlyContinue |
                    Select-Object -ExpandProperty FullName
            }
    }

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath (Join-Path $candidate 'node.exe') -PathType Leaf) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    return $null
}

function Get-UkuleleAndroidToolchain {
    $userJavaHome = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'User')
    $jdkRoot = Join-Path $env:LOCALAPPDATA 'Programs\UkulelePathBuildTools\jdk'
    $jdkFallback = $null
    if (Test-Path -LiteralPath $jdkRoot -PathType Container) {
        $jdkFallback = Get-ChildItem -LiteralPath $jdkRoot -Directory -ErrorAction SilentlyContinue |
            Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'bin\java.exe') -PathType Leaf } |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1 -ExpandProperty FullName
    }

    $javaHome = Get-FirstExistingDirectory @($env:JAVA_HOME, $userJavaHome, $jdkFallback)

    $userAndroidHome = [Environment]::GetEnvironmentVariable('ANDROID_HOME', 'User')
    $userAndroidSdkRoot = [Environment]::GetEnvironmentVariable('ANDROID_SDK_ROOT', 'User')
    $androidHome = Get-FirstExistingDirectory @(
        $env:ANDROID_HOME,
        $env:ANDROID_SDK_ROOT,
        $userAndroidHome,
        $userAndroidSdkRoot,
        (Join-Path $env:LOCALAPPDATA 'Android\Sdk')
    )

    $nodeRoot = Get-UkuleleNodeRoot

    [pscustomobject]@{
        JavaHome = $javaHome
        Java = if ($javaHome) { Join-Path $javaHome 'bin\java.exe' } else { $null }
        AndroidHome = $androidHome
        NodeRoot = $nodeRoot
        Node = if ($nodeRoot) { Join-Path $nodeRoot 'node.exe' } else { $null }
        Npm = if ($nodeRoot) { Join-Path $nodeRoot 'npm.cmd' } else { $null }
        Npx = if ($nodeRoot) { Join-Path $nodeRoot 'npx.cmd' } else { $null }
        BuildTools = if ($androidHome) { Join-Path $androidHome 'build-tools\36.0.0' } else { $null }
    }
}

function Get-UkuleleRequiredToolFiles {
    param([Parameter(Mandatory)]$Toolchain)

    @(
        [pscustomobject]@{ Name = 'Java 17'; Path = $Toolchain.Java },
        [pscustomobject]@{ Name = 'Node.js'; Path = $Toolchain.Node },
        [pscustomobject]@{ Name = 'npm'; Path = $Toolchain.Npm },
        [pscustomobject]@{ Name = 'npx'; Path = $Toolchain.Npx },
        [pscustomobject]@{ Name = 'Android platform-tools'; Path = if ($Toolchain.AndroidHome) { Join-Path $Toolchain.AndroidHome 'platform-tools\adb.exe' } else { $null } },
        [pscustomobject]@{ Name = 'Android Platform 36'; Path = if ($Toolchain.AndroidHome) { Join-Path $Toolchain.AndroidHome 'platforms\android-36\android.jar' } else { $null } },
        [pscustomobject]@{ Name = 'Build Tools 35.0.0'; Path = if ($Toolchain.AndroidHome) { Join-Path $Toolchain.AndroidHome 'build-tools\35.0.0\aapt2.exe' } else { $null } },
        [pscustomobject]@{ Name = 'Build Tools 36.0.0'; Path = if ($Toolchain.AndroidHome) { Join-Path $Toolchain.AndroidHome 'build-tools\36.0.0\aapt2.exe' } else { $null } },
        [pscustomobject]@{ Name = 'NDK 27.1.12297006'; Path = if ($Toolchain.AndroidHome) { Join-Path $Toolchain.AndroidHome 'ndk\27.1.12297006\source.properties' } else { $null } },
        [pscustomobject]@{ Name = 'CMake 3.22.1'; Path = if ($Toolchain.AndroidHome) { Join-Path $Toolchain.AndroidHome 'cmake\3.22.1\bin\cmake.exe' } else { $null } },
        [pscustomobject]@{ Name = 'CMake 3.30.5'; Path = if ($Toolchain.AndroidHome) { Join-Path $Toolchain.AndroidHome 'cmake\3.30.5\bin\cmake.exe' } else { $null } },
        [pscustomobject]@{ Name = 'APK signer'; Path = if ($Toolchain.BuildTools) { Join-Path $Toolchain.BuildTools 'apksigner.bat' } else { $null } },
        [pscustomobject]@{ Name = 'ZIP align'; Path = if ($Toolchain.BuildTools) { Join-Path $Toolchain.BuildTools 'zipalign.exe' } else { $null } }
    )
}

function Assert-UkuleleAndroidToolchain {
    param([Parameter(Mandatory)]$Toolchain)

    $missing = Get-UkuleleRequiredToolFiles $Toolchain |
        Where-Object { -not $_.Path -or -not (Test-Path -LiteralPath $_.Path -PathType Leaf) }

    if ($missing) {
        $names = ($missing | Select-Object -ExpandProperty Name) -join ', '
        throw "Android 构建环境不完整：$names。先运行 tools/android/check-env.ps1 -Json。"
    }
}

function Enable-UkuleleAndroidToolchain {
    param([Parameter(Mandatory)]$Toolchain)

    $env:JAVA_HOME = $Toolchain.JavaHome
    $env:ANDROID_HOME = $Toolchain.AndroidHome
    $env:ANDROID_SDK_ROOT = $Toolchain.AndroidHome
    $pathEntries = @(
        $Toolchain.NodeRoot,
        (Join-Path $Toolchain.JavaHome 'bin'),
        (Join-Path $Toolchain.AndroidHome 'platform-tools'),
        (Join-Path $Toolchain.AndroidHome 'cmdline-tools\latest\bin')
    )
    $env:Path = (($pathEntries + @($env:Path)) -join ';')
}

function Test-UkuleleLocalProxy {
    param(
        [string]$HostName = '127.0.0.1',
        [int]$Port = 10808,
        [int]$TimeoutMilliseconds = 400
    )

    $client = [Net.Sockets.TcpClient]::new()
    try {
        $connection = $client.ConnectAsync($HostName, $Port)
        return $connection.Wait($TimeoutMilliseconds) -and $client.Connected
    }
    catch {
        return $false
    }
    finally {
        $client.Dispose()
    }
}
