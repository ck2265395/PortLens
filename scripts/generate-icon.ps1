$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$build = Join-Path $root 'build'
$output = Join-Path $build 'icon.png'
New-Item -ItemType Directory -Path $build -Force | Out-Null

$size = 512
$bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.Clear([System.Drawing.Color]::Transparent)

$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$radius = 108
$diameter = $radius * 2
$path.AddArc(18, 18, $diameter, $diameter, 180, 90)
$path.AddArc($size - 18 - $diameter, 18, $diameter, $diameter, 270, 90)
$path.AddArc($size - 18 - $diameter, $size - 18 - $diameter, $diameter, $diameter, 0, 90)
$path.AddArc(18, $size - 18 - $diameter, $diameter, $diameter, 90, 90)
$path.CloseFigure()

$background = New-Object System.Drawing.Drawing2D.LinearGradientBrush((New-Object System.Drawing.Point(40, 30)), (New-Object System.Drawing.Point(470, 490)), ([System.Drawing.Color]::FromArgb(255, 37, 99, 235)), ([System.Drawing.Color]::FromArgb(255, 15, 55, 155)))
$graphics.FillPath($background, $path)

$font = New-Object System.Drawing.Font('Segoe UI', 270, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$graphics.DrawString('P', $font, $textBrush, 82, 78)

$lensPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 125, 211, 252), 34)
$lensPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$lensPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$graphics.DrawEllipse($lensPen, 300, 280, 118, 118)
$graphics.DrawLine($lensPen, 395, 378, 455, 438)
$dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$graphics.FillEllipse($dotBrush, 342, 322, 34, 34)

$bitmap.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)
$dotBrush.Dispose(); $lensPen.Dispose(); $textBrush.Dispose(); $font.Dispose(); $background.Dispose(); $path.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
Write-Output $output
