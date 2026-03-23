param(
  [Parameter(Mandatory = $true)]
  [string]$InputHtml,

  [string]$OutputDir = "",

  [string]$Prefix = "",

  [switch]$CaptureImages,

  [double]$ImageScale = 2,

  [int]$Port = 9360
)

[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pyScript = Join-Path $scriptDir "export_html_to_markdown.py"

if (-not $OutputDir) {
  $resolvedInput = Resolve-Path $InputHtml
  $OutputDir = Join-Path (Split-Path -Parent $resolvedInput) "html_to_markdown_output"
}

$argsList = @(
  $pyScript,
  "--input", $InputHtml,
  "--output-dir", $OutputDir,
  "--port", $Port
)

if ($Prefix) {
  $argsList += @("--prefix", $Prefix)
}

if ($CaptureImages) {
  $argsList += @("--capture-images", "--image-scale", $ImageScale)
}

& python @argsList
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
