param(
  [Parameter(Mandatory = $true)]
  [string]$InputDir,

  [string]$Prefix = "",

  [int]$TargetWidth = 1080,

  [int]$JpegQuality = 92
)

Add-Type -AssemblyName System.Drawing

$resolvedDir = Resolve-Path $InputDir
$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
if (-not $encoder) {
  throw "JPEG encoder not found."
}

$jpgDir = Join-Path $resolvedDir "jpg_zhihu"
New-Item -ItemType Directory -Path $jpgDir -Force | Out-Null

$files = Get-ChildItem -Path $resolvedDir -Filter '*.png' | Where-Object {
  if ([string]::IsNullOrWhiteSpace($Prefix)) { return $true }
  return $_.BaseName -like "$Prefix*"
}

foreach ($file in $files) {
  $img = [System.Drawing.Image]::FromFile($file.FullName)
  try {
    $destWidth = [Math]::Min($TargetWidth, $img.Width)
    $destHeight = [int][Math]::Round($img.Height * $destWidth / $img.Width)

    $bmp = New-Object System.Drawing.Bitmap($destWidth, $destHeight)
    try {
      $gfx = [System.Drawing.Graphics]::FromImage($bmp)
      try {
        $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $gfx.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $gfx.Clear([System.Drawing.Color]::White)
        $gfx.DrawImage($img, 0, 0, $destWidth, $destHeight)
      } finally {
        $gfx.Dispose()
      }

      $destFile = Join-Path $jpgDir ($file.BaseName + "_${destWidth}w.jpg")
      $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
      $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$JpegQuality)
      try {
        $bmp.Save($destFile, $encoder, $encoderParams)
      } finally {
        $encoderParams.Dispose()
      }
    } finally {
      $bmp.Dispose()
    }
  } finally {
    $img.Dispose()
  }
}

Get-ChildItem -Path $jpgDir | Select-Object Name, Length, LastWriteTime
