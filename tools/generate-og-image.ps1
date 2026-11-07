Add-Type -AssemblyName System.Drawing

$width = 1200
$height = 630

$bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gfx = [System.Drawing.Graphics]::FromImage($bmp)

$gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# 1. Base Canvas Background (#0D0D0D)
$bgColor = [System.Drawing.ColorTranslator]::FromHtml("#0D0D0D")
$bgBrush = New-Object System.Drawing.SolidBrush($bgColor)
$gfx.FillRectangle($bgBrush, 0, 0, $width, $height)

# 2. Centered Brand Logo (Official polygon from src/assets/logo.svg)
# Original logo bounding box: X [163, 887] (width 724), Y [112, 897] (height 785)
$accentColor = [System.Drawing.ColorTranslator]::FromHtml("#F62440")
$accentBrush = New-Object System.Drawing.SolidBrush($accentColor)

$logoTargetH = 380
$logoScale = $logoTargetH / 785
$logoTargetW = 724 * $logoScale

$logoOffsetX = ($width - $logoTargetW) / 2
$logoOffsetY = ($height - $logoTargetH) / 2

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

# 3. Write Canonical Target
$outDir = Join-Path (Split-Path -Parent $PSScriptRoot) "src\assets"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
$outPath = Join-Path $outDir "og-image.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$bgBrush.Dispose()
$accentBrush.Dispose()
$gfx.Dispose()
$bmp.Dispose()

$fileInfo = Get-Item $outPath
Write-Host "Generated: $($fileInfo.FullName) ($([math]::Round($fileInfo.Length / 1KB, 2)) KB)" -ForegroundColor Green
