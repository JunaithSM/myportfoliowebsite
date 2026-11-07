Add-Type -AssemblyName System.Drawing

$width = 1200
$height = 630

$bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gfx = [System.Drawing.Graphics]::FromImage($bmp)

$gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gfx.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# 1. Base Canvas Background (#0D0D0D)
$bgColor = [System.Drawing.ColorTranslator]::FromHtml("#0D0D0D")
$bgBrush = New-Object System.Drawing.SolidBrush($bgColor)
$gfx.FillRectangle($bgBrush, 0, 0, $width, $height)

# 2. Framing Card Surface (#161616)
$cardColor = [System.Drawing.ColorTranslator]::FromHtml("#161616")
$cardBrush = New-Object System.Drawing.SolidBrush($cardColor)
$cardPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#242424"), 2)
$gfx.FillRectangle($cardBrush, 40, 40, 1120, 550)
$gfx.DrawRectangle($cardPen, 40, 40, 1120, 550)

# 3. Crimson Accent Top Stripe (#F62440)
$accentColor = [System.Drawing.ColorTranslator]::FromHtml("#F62440")
$accentBrush = New-Object System.Drawing.SolidBrush($accentColor)
$gfx.FillRectangle($accentBrush, 40, 40, 1120, 6)

# 4. Systems Portfolio Tag Badge
$badgeBg = [System.Drawing.ColorTranslator]::FromHtml("#1F1315")
$badgeBgBrush = New-Object System.Drawing.SolidBrush($badgeBg)
$badgePen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#591822"), 1.5)
$gfx.FillRectangle($badgeBgBrush, 90, 95, 230, 36)
$gfx.DrawRectangle($badgePen, 90, 95, 230, 36)

$badgeFont = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$gfx.DrawString("SYSTEMS PORTFOLIO", $badgeFont, $accentBrush, 105, 103)

# 5. Author Name Title (#F5F2EB)
$ivoryColor = [System.Drawing.ColorTranslator]::FromHtml("#F5F2EB")
$ivoryBrush = New-Object System.Drawing.SolidBrush($ivoryColor)
$titleFont = New-Object System.Drawing.Font("Georgia", 40, [System.Drawing.FontStyle]::Bold)
$gfx.DrawString("S Mohammed Junaith", $titleFont, $ivoryBrush, 90, 160)

# 6. Accent Divider
$gfx.FillRectangle($accentBrush, 92, 245, 80, 4)

# 7. Subtitle (#B5B0A6)
$subColor = [System.Drawing.ColorTranslator]::FromHtml("#B5B0A6")
$subBrush = New-Object System.Drawing.SolidBrush($subColor)
$subFont = New-Object System.Drawing.Font("Segoe UI", 19, [System.Drawing.FontStyle]::Regular)
$gfx.DrawString("Game Developer & Systems Software Engineer", $subFont, $subBrush, 90, 270)

# 8. Competency Pills (Two Balanced Rows to give Brand Logo spacious right stage)
$tagBg = [System.Drawing.ColorTranslator]::FromHtml("#1C1C1C")
$tagBgBrush = New-Object System.Drawing.SolidBrush($tagBg)
$tagBorderPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#303030"), 1)
$tagFont = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Regular)
$tagBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#D8D4CC"))

$row1Tags = @("C++ / Unreal Engine", "Custom Math & Splines")
$tagX = 90
$tagY = 345
foreach ($tag in $row1Tags) {
    $tagSize = $gfx.MeasureString($tag, $tagFont)
    $pillWidth = [int]$tagSize.Width + 24
    $gfx.FillRectangle($tagBgBrush, $tagX, $tagY, $pillWidth, 34)
    $gfx.DrawRectangle($tagBorderPen, $tagX, $tagY, $pillWidth, 34)
    $gfx.DrawString($tag, $tagFont, $tagBrush, ($tagX + 12), ($tagY + 7))
    $tagX += $pillWidth + 12
}

$row2Tags = @("Low-Latency Architecture", "Zero-Bloat Systems")
$tagX = 90
$tagY = 392
foreach ($tag in $row2Tags) {
    $tagSize = $gfx.MeasureString($tag, $tagFont)
    $pillWidth = [int]$tagSize.Width + 24
    $gfx.FillRectangle($tagBgBrush, $tagX, $tagY, $pillWidth, 34)
    $gfx.DrawRectangle($tagBorderPen, $tagX, $tagY, $pillWidth, 34)
    $gfx.DrawString($tag, $tagFont, $tagBrush, ($tagX + 12), ($tagY + 7))
    $tagX += $pillWidth + 12
}

# 9. Brand Logo Showcase (Official logo polygon from src/assets/logo.svg)
$logoBoxX = 810
$logoBoxY = 95
$logoBoxW = 310
$logoBoxH = 360

# Dark frame surface for logo
$logoBgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#161616"))
$logoBorderPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#282828"), 1.5)
$gfx.FillRectangle($logoBgBrush, $logoBoxX, $logoBoxY, $logoBoxW, $logoBoxH)
$gfx.DrawRectangle($logoBorderPen, $logoBoxX, $logoBoxY, $logoBoxW, $logoBoxH)

# Subtle top accent on logo frame
$logoTopAccentPen = New-Object System.Drawing.Pen($accentColor, 3)
$gfx.DrawLine($logoTopAccentPen, $logoBoxX, $logoBoxY, ($logoBoxX + $logoBoxW), $logoBoxY)

# Logo polygon points scaled and centered
# Original logo bounding box: X [163, 887] (width 724), Y [112, 897] (height 785)
$logoScale = 0.33
$logoTargetW = 724 * $logoScale   # 238.9
$logoTargetH = 785 * $logoScale   # 259.0
$logoOffsetX = $logoBoxX + ($logoBoxW - $logoTargetW) / 2
$logoOffsetY = $logoBoxY + ($logoBoxH - $logoTargetH) / 2

$logoRaw = @(
    @(235, 112),
    @(887, 112),
    @(465, 897),
    @(163, 897),
    @(163, 693),
    @(287, 693),
    @(382, 790),
    @(683, 231),
    @(168, 231)
)

$polygonPoints = [System.Drawing.PointF[]]@(
    $logoRaw | ForEach-Object {
        $px = $logoOffsetX + ($_[0] - 163) * $logoScale
        $py = $logoOffsetY + ($_[1] - 112) * $logoScale
        New-Object System.Drawing.PointF($px, $py)
    }
)

$gfx.FillPolygon($accentBrush, $polygonPoints)

# Crisp edge outline
$logoStrokePen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#FF4D64"), 1.5)
$gfx.DrawPolygon($logoStrokePen, $polygonPoints)

# 10. Branding Domain & Category
$domainFont = New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Bold)
$domainColor = [System.Drawing.ColorTranslator]::FromHtml("#F5F2EB")
$domainBrush = New-Object System.Drawing.SolidBrush($domainColor)
$gfx.DrawString("junaith.dev", $domainFont, $domainBrush, 90, 520)

$footerDescFont = New-Object System.Drawing.Font("Segoe UI", 13, [System.Drawing.FontStyle]::Regular)
$footerDescBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#7A756D"))
$bulletChar = [char]0x2022
$gfx.DrawString("$bulletChar  Interactive Canvas & Computational Portfolio", $footerDescFont, $footerDescBrush, 195, 522)

# 10. Write Canonical Target
$outDir = Join-Path (Split-Path -Parent $PSScriptRoot) "src\assets"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
$outPath = Join-Path $outDir "og-image.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$gfx.Dispose()
$bmp.Dispose()

$fileInfo = Get-Item $outPath
Write-Host "Generated: $($fileInfo.FullName) ($([math]::Round($fileInfo.Length / 1KB, 2)) KB)" -ForegroundColor Green
