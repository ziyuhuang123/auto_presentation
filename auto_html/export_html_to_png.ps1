param(
  [Parameter(Mandatory = $true)]
  [string]$InputHtml,

  [string]$OutputDir = "",

  [string]$Prefix = "",

  [int]$Width = 1400,

  [int]$DelayMs = 1500,

  [int]$Port = 9340,

  [string]$Chrome = "",

  [string]$Preset = "default",

  [switch]$ExportZhihuJpg,

  [int]$ZhihuWidth = 1080,

  [int]$JpegQuality = 92
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeScript = Join-Path $scriptDir "export_html_to_png.js"

$argsList = @(
  $nodeScript,
  "--input", $InputHtml,
  "--width", $Width,
  "--delay-ms", $DelayMs,
  "--port", $Port,
  "--preset", $Preset
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

if ($ExportZhihuJpg) {
  $convertScript = Join-Path $scriptDir "convert_png_variants.ps1"
  $resolvedInput = Resolve-Path $InputHtml
  $finalOutputDir = if ($OutputDir) { $OutputDir } else { Split-Path -Parent $resolvedInput }
  $effectivePrefix = if ($Prefix) { $Prefix } else { [System.IO.Path]::GetFileNameWithoutExtension($resolvedInput) }
  & $convertScript -InputDir $finalOutputDir -Prefix $effectivePrefix -TargetWidth $ZhihuWidth -JpegQuality $JpegQuality
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}
