param(
  [Parameter(Mandatory = $true)]
  [string]$InputHtml,

  [string]$OutputDir = "",

  [string]$Prefix = "",

  [int]$Width = 1080,

  [double]$Scale = 2,

  [int]$DelayMs = 1500,

  [int]$Port = 9360,

  [string]$Chrome = ""
)

[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeScript = Join-Path $scriptDir "capture_svg_boxes.js"

$argsList = @(
  $nodeScript,
  "--input", $InputHtml,
  "--width", $Width,
  "--scale", $Scale,
  "--delay-ms", $DelayMs,
  "--port", $Port
)

if ($OutputDir) {
  $argsList += @("--output-dir", $OutputDir)
}

if ($Prefix) {
  $argsList += @("--prefix", $Prefix)
}

if ($Chrome) {
  $argsList += @("--chrome", $Chrome)
}

& node @argsList
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
