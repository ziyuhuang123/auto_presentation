param(
  [Parameter(Position = 0)]
  [string]$DiagramPath = $env:AUTO_DRAWIO_TARGET,
  [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $rootDir "config\target.json"
$statePath = Join-Path $rootDir "config\bridge-state.json"
$stdoutPath = Join-Path $rootDir ".bridge.stdout.log"
$stderrPath = Join-Path $rootDir ".bridge.stderr.log"

function Read-JsonFile {
  param([string]$Path)

  return Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Write-JsonFile {
  param(
    [string]$Path,
    [object]$Value
  )

  $json = ($Value | ConvertTo-Json -Depth 10) + [Environment]::NewLine
  $encoding = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($Path, $json, $encoding)
}

function Get-BridgeConfig {
  param([int]$Port)

  $url = "http://127.0.0.1:$Port/api/config"
  $response = Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 2
  return $response.Content | ConvertFrom-Json
}

function Wait-ForBridge {
  param(
    [int]$Port,
    [string]$ExpectedDiagramPath,
    [int]$TimeoutSeconds = 15
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    try {
      $payload = Get-BridgeConfig -Port $Port

      if ($payload.port -eq $Port -and $payload.diagramPath -eq $ExpectedDiagramPath) {
        return $payload
      }
    } catch {
    }

    Start-Sleep -Milliseconds 500
  }

  throw "Bridge did not become ready on http://127.0.0.1:$Port/"
}

function Stop-TrackedBridge {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return
  }

  try {
    $state = Read-JsonFile -Path $Path
  } catch {
    return
  }

  if (-not $state.pid) {
    return
  }

  try {
    $process = Get-Process -Id ([int]$state.pid) -ErrorAction Stop

    if ($process.ProcessName -eq "node") {
      Stop-Process -Id $process.Id -Force -ErrorAction Stop
      Start-Sleep -Milliseconds 500
    }
  } catch {
  }
}

$config = Read-JsonFile -Path $configPath

if ($DiagramPath) {
  $resolvedPath = [System.IO.Path]::GetFullPath($DiagramPath)

  if (-not (Test-Path -LiteralPath $resolvedPath -PathType Leaf)) {
    throw "Diagram file not found: $resolvedPath"
  }

  if ([System.IO.Path]::GetExtension($resolvedPath).ToLowerInvariant() -ne ".drawio") {
    throw "Target file must end with .drawio"
  }

  $config.diagramPath = $resolvedPath
  Write-JsonFile -Path $configPath -Value $config
}

$port = [int]$config.port
$targetPath = $config.diagramPath

try {
  $runningConfig = Get-BridgeConfig -Port $port

  if ($runningConfig.diagramPath -eq $targetPath) {
    if ($OpenBrowser) {
      Start-Process "http://127.0.0.1:$port/" | Out-Null
    }

    Write-Output "Bridge already ready: http://127.0.0.1:$port/"
    Write-Output "Diagram: $targetPath"
    exit 0
  }

  $runningConfig = Wait-ForBridge -Port $port -ExpectedDiagramPath $targetPath -TimeoutSeconds 5

  if ($OpenBrowser) {
    Start-Process "http://127.0.0.1:$port/" | Out-Null
  }

  Write-JsonFile -Path $statePath -Value @{
    pid = $null
    port = $port
    diagramPath = $runningConfig.diagramPath
    startedAt = (Get-Date).ToString("o")
  }

  Write-Output "Bridge retargeted: http://127.0.0.1:$port/"
  Write-Output "Diagram: $($runningConfig.diagramPath)"
  exit 0
} catch {
}

Stop-TrackedBridge -Path $statePath

$nodePath = (Get-Command node -ErrorAction Stop).Source
$process = Start-Process `
  -FilePath $nodePath `
  -ArgumentList "server.mjs" `
  -WorkingDirectory $rootDir `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdoutPath `
  -RedirectStandardError $stderrPath `
  -PassThru

$readyConfig = Wait-ForBridge -Port $port -ExpectedDiagramPath $targetPath

Write-JsonFile -Path $statePath -Value @{
  pid = $process.Id
  port = $port
  diagramPath = $readyConfig.diagramPath
  startedAt = (Get-Date).ToString("o")
}

if ($OpenBrowser) {
  Start-Process "http://127.0.0.1:$port/" | Out-Null
}

Write-Output "Bridge ready: http://127.0.0.1:$port/"
Write-Output "Diagram: $($readyConfig.diagramPath)"
Write-Output "PID: $($process.Id)"
