[CmdletBinding()]
param([switch]$Json)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot 'toolchain.ps1')

$toolchain = Get-UkuleleAndroidToolchain
$checks = @(Get-UkuleleRequiredToolFiles $toolchain | ForEach-Object {
    [pscustomobject]@{
        name = $_.Name
        path = $_.Path
        exists = [bool]($_.Path -and (Test-Path -LiteralPath $_.Path -PathType Leaf))
    }
})

$healthy = ($checks | Where-Object { -not $_.exists }).Count -eq 0
$result = [ordered]@{
    healthy = $healthy
    javaHome = $toolchain.JavaHome
    androidHome = $toolchain.AndroidHome
    nodeRoot = $toolchain.NodeRoot
    proxy = [ordered]@{
        address = 'http://127.0.0.1:10808'
        reachable = Test-UkuleleLocalProxy
    }
    checks = $checks
}

if ($Json) {
    $result | ConvertTo-Json -Depth 6
}
else {
    Write-Output ("Android toolchain: " + $(if ($healthy) { 'READY' } else { 'INCOMPLETE' }))
    Write-Output ("JAVA_HOME: " + $toolchain.JavaHome)
    Write-Output ("ANDROID_HOME: " + $toolchain.AndroidHome)
    Write-Output ("Node root: " + $toolchain.NodeRoot)
    $checks | Format-Table name, exists, path -AutoSize
}

if (-not $healthy) { exit 1 }
