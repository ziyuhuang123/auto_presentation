param(
  [Parameter(Mandatory = $true)]
  [string]$InputHtml,

  [string]$OutputDir = "",

  [string]$Prefix = "",

  [double]$ImageScale = 3,

  [string]$GitHubPagesRepo = "",

  [string]$SiteBaseUrl = "https://ziyuhuang123.github.io",

  [string]$SiteAssetsSubdir = "paper_reading_notes/assets",

  [string]$SitePublishSubdir = "paper_reading_notes/publish",

  [switch]$CopyToClipboard,

  [switch]$PushPages,

  [string]$CommitMessage = ""
)

[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$exportScript = Join-Path $scriptDir "export_html_to_markdown.ps1"
$prepareScript = Join-Path $scriptDir "prepare_zhihu_publish.ps1"
$clipboardScript = Join-Path $scriptDir "copy_zhihu_clipboard.ps1"

$resolvedHtml = (Resolve-Path $InputHtml).Path
if (-not $Prefix) {
  $Prefix = [System.IO.Path]::GetFileNameWithoutExtension($resolvedHtml)
}

if (-not $OutputDir) {
  $OutputDir = Join-Path $scriptDir ("outputs\" + $Prefix)
}

if (-not $GitHubPagesRepo) {
  $repoRoot = Split-Path -Parent $scriptDir
  $workspaceRoot = Split-Path -Parent $repoRoot
  $GitHubPagesRepo = Join-Path $workspaceRoot "ziyuhuang123.github.io"
}

if (-not $CommitMessage) {
  $CommitMessage = "Add zhihu publish assets for $Prefix"
}

& $exportScript `
  -InputHtml $resolvedHtml `
  -OutputDir $OutputDir `
  -Prefix $Prefix `
  -CaptureImages `
  -ImageScale $ImageScale
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

$markdownPath = Join-Path $OutputDir "$Prefix.md"
$assetsDir = Join-Path $OutputDir "assets"

& $prepareScript `
  -MarkdownPath $markdownPath `
  -AssetsDir $assetsDir `
  -OutputDir $OutputDir `
  -Prefix $Prefix `
  -GitHubPagesRepo $GitHubPagesRepo `
  -SiteBaseUrl $SiteBaseUrl `
  -SiteAssetsSubdir $SiteAssetsSubdir `
  -SitePublishSubdir $SitePublishSubdir
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

if ($PushPages) {
  $resolvedRepo = (Resolve-Path $GitHubPagesRepo).Path
  $stagePaths = @(
    (Join-Path $SiteAssetsSubdir $Prefix),
    (Join-Path $SitePublishSubdir "$Prefix.md"),
    (Join-Path $SitePublishSubdir "$Prefix.html")
  )

  & git -C $resolvedRepo add -- @stagePaths
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  $status = & git -C $resolvedRepo status --porcelain -- @stagePaths
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  if ($status) {
    & git -C $resolvedRepo commit -m $CommitMessage
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }

    & git -C $resolvedRepo push
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  }
}

if ($CopyToClipboard) {
  $htmlFragmentPath = Join-Path $OutputDir "$Prefix.clipboard.fragment.html"
  $publicMarkdownPath = Join-Path $OutputDir "$Prefix.public.md"
  & $clipboardScript -HtmlFragmentPath $htmlFragmentPath -TextPath $publicMarkdownPath
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

$summary = [ordered]@{
  input_html = $resolvedHtml
  output_dir = (Resolve-Path $OutputDir).Path
  markdown = $markdownPath
  public_markdown = (Join-Path $OutputDir "$Prefix.public.md")
  clipboard_html = (Join-Path $OutputDir "$Prefix.clipboard.html")
  clipboard_fragment = (Join-Path $OutputDir "$Prefix.clipboard.fragment.html")
  pages_repo = (Resolve-Path $GitHubPagesRepo).Path
  publish_page = ($SiteBaseUrl.TrimEnd('/') + "/" + $SitePublishSubdir.Trim('/') + "/" + $Prefix + ".html")
  image_base = ($SiteBaseUrl.TrimEnd('/') + "/" + $SiteAssetsSubdir.Trim('/') + "/" + $Prefix + "/")
  pushed = [bool]$PushPages
  copied_to_clipboard = [bool]$CopyToClipboard
}

$summary | ConvertTo-Json -Depth 4
