param(
  [Parameter(Mandatory = $true)]
  [string]$MarkdownPath,

  [Parameter(Mandatory = $true)]
  [string]$AssetsDir,

  [Parameter(Mandatory = $true)]
  [string]$OutputDir,

  [Parameter(Mandatory = $true)]
  [string]$Prefix,

  [string]$GitHubPagesRepo = "",

  [string]$SiteBaseUrl = "https://ziyuhuang123.github.io",

  [string]$SiteAssetsSubdir = "paper_reading_notes/assets",

  [string]$SitePublishSubdir = "paper_reading_notes/publish"
)

[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pyScript = Join-Path $scriptDir "prepare_zhihu_publish.py"

if (-not $GitHubPagesRepo) {
  $repoRoot = Split-Path -Parent $scriptDir
  $workspaceRoot = Split-Path -Parent $repoRoot
  $GitHubPagesRepo = Join-Path $workspaceRoot "ziyuhuang123.github.io"
}

$argsList = @(
  $pyScript,
  "--markdown", $MarkdownPath,
  "--assets-dir", $AssetsDir,
  "--output-dir", $OutputDir,
  "--prefix", $Prefix,
  "--pages-repo", $GitHubPagesRepo,
  "--site-base-url", $SiteBaseUrl,
  "--site-assets-subdir", $SiteAssetsSubdir,
  "--site-publish-subdir", $SitePublishSubdir
)

& python @argsList
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
