# ==============================================================================
# Local HTTP Preview Server (Zero-Dependency PowerShell Socket Engine)
# ==============================================================================
param(
    [int]$Port = 3000
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $ScriptDir) { $ScriptDir = Get-Location }
$DistDir = Join-Path $ScriptDir "dist"
$SrcDir = Join-Path $ScriptDir "src"
$DataDir = Join-Path $ScriptDir "data"

# Initial build to guarantee fresh assets
Write-Host "[Server] Performing initial site compilation..." -ForegroundColor Yellow
& "$ScriptDir\build.ps1"

function Test-NeedsRebuild {
    $refFile = Join-Path $DistDir "css\style.css"
    if (-not (Test-Path $refFile)) { return $true }
    $lastBuild = (Get-Item $refFile).LastWriteTimeUtc

    $sources = Get-ChildItem -Path $SrcDir, $DataDir -Recurse -File -ErrorAction SilentlyContinue
    foreach ($s in $sources) {
        if ($s.LastWriteTimeUtc -gt $lastBuild) {
            return $true
        }
    }
    return $false
}

$MimeMap = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".xml"  = "application/xml; charset=utf-8"
    ".txt"  = "text/plain; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".webp" = "image/webp"
    ".ico"  = "image/x-icon"
    ".woff2"= "font/woff2"
}

$IP = [System.Net.IPAddress]::Loopback
$Server = New-Object System.Net.Sockets.TcpListener($IP, $Port)

try {
    $Server.Start()
} catch {
    Write-Error "Failed to start server on port $Port : $_"
    exit 1
}

Write-Host "==================================================" -ForegroundColor Green
Write-Host " [Local Server] Serving portfolio at:" -ForegroundColor Green
Write-Host "   http://localhost:$Port/" -ForegroundColor Cyan
Write-Host " [Root] Serving files from: $DistDir" -ForegroundColor Gray
Write-Host " Press Ctrl+C in this terminal to stop the server." -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Green

try {
    while ($true) {
        $Client = $Server.AcceptTcpClient()
        $Stream = $Client.GetStream()
        $Reader = New-Object System.IO.StreamReader($Stream, [System.Text.Encoding]::ASCII)
        
        $RequestLine = $Reader.ReadLine()
        if (-not [string]::IsNullOrEmpty($RequestLine)) {
            $Parts = $RequestLine.Split(' ')
            $Method = $Parts[0]
            $RawUrl = if ($Parts.Length -gt 1) { $Parts[1] } else { "/" }
            
            # Consume headers
            while (-not [string]::IsNullOrEmpty($Reader.ReadLine())) {}

            $PathOnly = $RawUrl.Split('?')[0]
            $Query = if ($RawUrl.Contains('?')) { "?" + $RawUrl.Split('?')[1] } else { "" }

            # 1. Automatic 301 Redirect for legacy .html requests (e.g. /about.html -> /about, /index.html -> /)
            if ($PathOnly -eq "/index.html" -or $PathOnly -eq "/index") {
                $RedirectHeader = "HTTP/1.1 301 Moved Permanently`r`n" +
                                  "Location: /$Query`r`n" +
                                  "Content-Length: 0`r`n" +
                                  "Connection: close`r`n`r`n"
                $HeaderBytes = [System.Text.Encoding]::ASCII.GetBytes($RedirectHeader)
                $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)
                $Stream.Flush()
                $Stream.Close()
                $Client.Close()
                continue
            }
            if ($PathOnly -match '^/(.+)\.html$') {
                $CleanSlug = $Matches[1]
                $RedirectHeader = "HTTP/1.1 301 Moved Permanently`r`n" +
                                  "Location: /$CleanSlug$Query`r`n" +
                                  "Content-Length: 0`r`n" +
                                  "Connection: close`r`n`r`n"
                $HeaderBytes = [System.Text.Encoding]::ASCII.GetBytes($RedirectHeader)
                $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)
                $Stream.Flush()
                $Stream.Close()
                $Client.Close()
                continue
            }

            # 2. Auto-rebuild on-demand if any source file in src/ or data/ has changed
            if (Test-NeedsRebuild) {
                Write-Host "`n[Server] Source change detected. Rebuilding..." -ForegroundColor Yellow
                & "$ScriptDir\build.ps1"
            }

            # 3. Resolve Target File with Clean URLs & Directory Index Support
            $Trimmed = $PathOnly.TrimStart('/').TrimEnd('/')
            $TargetFile = $null

            if ($Trimmed -eq "") {
                $TargetFile = Join-Path $DistDir "index.html"
            } else {
                $SafePath = $Trimmed -replace '\.\.', ''
                $DirectPath = Join-Path $DistDir $SafePath
                if (Test-Path $DirectPath -PathType Leaf) {
                    $TargetFile = $DirectPath
                } elseif (Test-Path (Join-Path $DistDir "$SafePath\index.html") -PathType Leaf) {
                    $TargetFile = Join-Path $DistDir "$SafePath\index.html"
                } elseif (Test-Path (Join-Path $DistDir "$SafePath.html") -PathType Leaf) {
                    $TargetFile = Join-Path $DistDir "$SafePath.html"
                }
            }

            if ($TargetFile -and (Test-Path $TargetFile -PathType Leaf)) {
                $Ext = [System.IO.Path]::GetExtension($TargetFile).ToLower()
                $Mime = if ($MimeMap.ContainsKey($Ext)) { $MimeMap[$Ext] } else { "application/octet-stream" }
                $FileBytes = [System.IO.File]::ReadAllBytes($TargetFile)

                $HeaderStr = "HTTP/1.1 200 OK`r`n" +
                             "Content-Type: $Mime`r`n" +
                             "Content-Length: $($FileBytes.Length)`r`n" +
                             "Connection: close`r`n" +
                             "Cache-Control: no-cache, no-store, must-revalidate`r`n" +
                             "Pragma: no-cache`r`n`r`n"
                
                $HeaderBytes = [System.Text.Encoding]::ASCII.GetBytes($HeaderStr)
                $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)
                $Stream.Write($FileBytes, 0, $FileBytes.Length)
            } else {
                $NotFoundFile = Join-Path $DistDir "404.html"
                if (Test-Path $NotFoundFile -PathType Leaf) {
                    $NotFoundBytes = [System.IO.File]::ReadAllBytes($NotFoundFile)
                } else {
                    $NotFoundHtml = "<html><head><title>404 Not Found</title></head><body><h1>404 Not Found</h1><p>The requested URL '$PathOnly' was not found.</p><a href='/'>Return to Home</a></body></html>"
                    $NotFoundBytes = [System.Text.Encoding]::UTF8.GetBytes($NotFoundHtml)
                }

                $HeaderStr = "HTTP/1.1 404 Not Found`r`n" +
                             "Content-Type: text/html; charset=utf-8`r`n" +
                             "Content-Length: $($NotFoundBytes.Length)`r`n" +
                             "Connection: close`r`n`r`n"
                
                $HeaderBytes = [System.Text.Encoding]::ASCII.GetBytes($HeaderStr)
                $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)
                $Stream.Write($NotFoundBytes, 0, $NotFoundBytes.Length)
            }
        }

        $Stream.Flush()
        $Stream.Close()
        $Client.Close()
    }
} finally {
    $Server.Stop()
    Write-Host "`n[Server] Stopped." -ForegroundColor Gray
}
