param(
  [Parameter(Position = 0)]
  [string]$DiagramPath = $env:AUTO_DRAWIO_TARGET,
  [int]$Port,
  [string]$ConfigPath,
  [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $PSScriptRoot
$defaultConfigPath = Join-Path $rootDir "config\target.json"

function Read-JsonFile {
  param([string]$Path)

  return Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Write-JsonFile {
  param(
    [string]$Path,
    [object]$Value
  )

  $parent = Split-Path -Parent $Path
  if ($parent) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }

  $json = ($Value | ConvertTo-Json -Depth 10) + [Environment]::NewLine
  $encoding = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($Path, $json, $encoding)
}

function Copy-ConfigObject {
  param([object]$Source)

  $copy = [ordered]@{}

  if ($null -eq $Source) {
    return $copy
  }

  foreach ($property in $Source.PSObject.Properties) {
    $copy[$property.Name] = $property.Value
  }

  return $copy
}

function Test-SamePath {
  param(
    [string]$Left,
    [string]$Right
  )

  return [string]::Equals(
    [System.IO.Path]::GetFullPath($Left),
    [System.IO.Path]::GetFullPath($Right),
    [System.StringComparison]::OrdinalIgnoreCase
  )
}

function Resolve-BridgeConfigPath {
  param(
    [string]$RootDir,
    [string]$DefaultConfigPath,
    [string]$ConfigPath,
    [int]$Port,
    [bool]$HasExplicitPort
  )

  if ($ConfigPath) {
    return [System.IO.Path]::GetFullPath($ConfigPath)
  }

  if ($HasExplicitPort) {
    $instanceDir = Join-Path $RootDir "config\instances"
    New-Item -ItemType Directory -Force -Path $instanceDir | Out-Null
    return Join-Path $instanceDir ("port-{0}.json" -f $Port)
  }

  return $DefaultConfigPath
}

function Resolve-StatePath {
  param(
    [string]$ResolvedConfigPath,
    [string]$DefaultConfigPath
  )

  if (Test-SamePath -Left $ResolvedConfigPath -Right $DefaultConfigPath) {
    return Join-Path $rootDir "config\bridge-state.json"
  }

  $parent = Split-Path -Parent $ResolvedConfigPath
  $stem = [System.IO.Path]::GetFileNameWithoutExtension($ResolvedConfigPath)
  return Join-Path $parent "$stem.state.json"
}

function Resolve-LogPath {
  param(
    [string]$ResolvedConfigPath,
    [string]$DefaultConfigPath,
    [string]$Kind
  )

  if (Test-SamePath -Left $ResolvedConfigPath -Right $DefaultConfigPath) {
    return Join-Path $rootDir ".bridge.$Kind.log"
  }

  $stem = [System.IO.Path]::GetFileNameWithoutExtension($ResolvedConfigPath)
  return Join-Path $rootDir ".bridge.$stem.$Kind.log"
}

function Ensure-BridgeConfig {
  param(
    [string]$ResolvedConfigPath,
    [string]$DefaultConfigPath,
    [int]$Port,
    [bool]$HasExplicitPort
  )

  if (Test-Path -LiteralPath $ResolvedConfigPath -PathType Leaf) {
    $config = Copy-ConfigObject (Read-JsonFile -Path $ResolvedConfigPath)
  } elseif (Test-Path -LiteralPath $DefaultConfigPath -PathType Leaf) {
    $config = Copy-ConfigObject (Read-JsonFile -Path $DefaultConfigPath)
  } else {
    $config = [ordered]@{
      diagramPath = ""
      port = 4318
    }
  }

  if ($HasExplicitPort) {
    $config.port = $Port
  } elseif (-not $config.port) {
    $config.port = 4318
  }

  return $config
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

$hasExplicitPort = $PSBoundParameters.ContainsKey("Port")

$resolvedConfigPath = Resolve-BridgeConfigPath `
  -RootDir $rootDir `
  -DefaultConfigPath $defaultConfigPath `
  -ConfigPath $ConfigPath `
  -Port $Port `
  -HasExplicitPort $hasExplicitPort

$statePath = Resolve-StatePath -ResolvedConfigPath $resolvedConfigPath -DefaultConfigPath $defaultConfigPath
$stdoutPath = Resolve-LogPath -ResolvedConfigPath $resolvedConfigPath -DefaultConfigPath $defaultConfigPath -Kind "stdout"
$stderrPath = Resolve-LogPath -ResolvedConfigPath $resolvedConfigPath -DefaultConfigPath $defaultConfigPath -Kind "stderr"
$config = Ensure-BridgeConfig `
  -ResolvedConfigPath $resolvedConfigPath `
  -DefaultConfigPath $defaultConfigPath `
  -Port $Port `
  -HasExplicitPort $hasExplicitPort

if ($DiagramPath) {
  $resolvedPath = [System.IO.Path]::GetFullPath($DiagramPath)

  if (-not (Test-Path -LiteralPath $resolvedPath -PathType Leaf)) {
    throw "Diagram file not found: $resolvedPath"
  }

  if ([System.IO.Path]::GetExtension($resolvedPath).ToLowerInvariant() -ne ".drawio") {
    throw "Target file must end with .drawio"
  }

  $config.diagramPath = $resolvedPath
}

Write-JsonFile -Path $resolvedConfigPath -Value $config

$port = [int]$config.port
$targetPath = $config.diagramPath

if (-not $targetPath) {
  throw "Bridge config must define diagramPath"
}

try {
  $runningConfig = Get-BridgeConfig -Port $port

  if ($runningConfig.diagramPath -eq $targetPath) {
    if ($OpenBrowser) {
      Start-Process "http://127.0.0.1:$port/" | Out-Null
    }

    Write-Output "Bridge already ready: http://127.0.0.1:$port/"
    Write-Output "Diagram: $targetPath"
    Write-Output "Config: $resolvedConfigPath"
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
    configPath = $resolvedConfigPath
    startedAt = (Get-Date).ToString("o")
  }

  Write-Output "Bridge retargeted: http://127.0.0.1:$port/"
  Write-Output "Diagram: $($runningConfig.diagramPath)"
  Write-Output "Config: $resolvedConfigPath"
  exit 0
} catch {
}

Stop-TrackedBridge -Path $statePath

$nodePath = (Get-Command node -ErrorAction Stop).Source
$process = Start-Process `
  -FilePath $nodePath `
  -ArgumentList @("server.mjs", "--config", $resolvedConfigPath) `
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
  configPath = $resolvedConfigPath
  startedAt = (Get-Date).ToString("o")
}

if ($OpenBrowser) {
  Start-Process "http://127.0.0.1:$port/" | Out-Null
}

Write-Output "Bridge ready: http://127.0.0.1:$port/"
Write-Output "Diagram: $($readyConfig.diagramPath)"
Write-Output "Config: $resolvedConfigPath"
Write-Output "PID: $($process.Id)"
