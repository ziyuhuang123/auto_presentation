param(
  [Parameter(Mandatory = $true)]
  [string]$HtmlFragmentPath,

  [Parameter(Mandatory = $true)]
  [string]$TextPath
)

[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

Add-Type -AssemblyName System.Windows.Forms

function Convert-ToHtmlClipboardFormat {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Fragment
  )

  $startFragmentToken = "<!--StartFragment-->"
  $endFragmentToken = "<!--EndFragment-->"
  $htmlBody = "<html><body>$startFragmentToken$Fragment$endFragmentToken</body></html>"
  $headerTemplate = "Version:1.0`r`nStartHTML:{0:D10}`r`nEndHTML:{1:D10}`r`nStartFragment:{2:D10}`r`nEndFragment:{3:D10}`r`n"
  $placeholderHeader = [string]::Format($headerTemplate, 0, 0, 0, 0)
  $encoding = [System.Text.Encoding]::UTF8

  $startHtml = $encoding.GetByteCount($placeholderHeader)
  $startFragment = $startHtml + $encoding.GetByteCount("<html><body>$startFragmentToken")
  $endFragment = $startFragment + $encoding.GetByteCount($Fragment)
  $endHtml = $startHtml + $encoding.GetByteCount($htmlBody)
  $header = [string]::Format($headerTemplate, $startHtml, $endHtml, $startFragment, $endFragment)

  return $header + $htmlBody
}

$htmlFragment = Get-Content -Raw -Encoding utf8 $HtmlFragmentPath
$text = Get-Content -Raw -Encoding utf8 $TextPath
$htmlClipboard = Convert-ToHtmlClipboardFormat -Fragment $htmlFragment

$dataObject = New-Object System.Windows.Forms.DataObject
$dataObject.SetData([System.Windows.Forms.DataFormats]::Html, $htmlClipboard)
$dataObject.SetData([System.Windows.Forms.DataFormats]::UnicodeText, $text)
[System.Windows.Forms.Clipboard]::SetDataObject($dataObject, $true)

Write-Output "clipboard updated: html + text"
