param([int]$Port = 3000)

$rootDir = Join-Path $PSScriptRoot "dist"
if (-not (Test-Path (Join-Path $rootDir "index.html"))) {
    if (Test-Path (Join-Path $PSScriptRoot "dist.zip")) {
        Write-Host "[SETUP] Extracting production build from dist.zip..." -ForegroundColor Cyan
        Expand-Archive -Path (Join-Path $PSScriptRoot "dist.zip") -DestinationPath $PSScriptRoot -Force
    }
}

if (-not (Test-Path (Join-Path $rootDir "index.html"))) {
    Write-Host "[ERROR] Could not find dist/index.html or dist.zip." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$listener = $null
for ($i = 0; $i -lt 5; $i++) {
    try {
        $listener = New-Object System.Net.HttpListener
        $listener.Prefixes.Add("http://localhost:$Port/")
        $listener.Prefixes.Add("http://127.0.0.1:$Port/")
        $listener.Start()
        break
    } catch {
        $Port++
        $listener = $null
    }
}

if (-not $listener -or -not $listener.IsListening) {
    Write-Host "[ERROR] Could not bind to port $Port." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$url = "http://localhost:$Port/"
Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  BabySQL Enterprise Hypothesis Testing Platform (PowerShell Engine)" -ForegroundColor Cyan
Write-Host "  Running locally at: $url" -ForegroundColor Green
Write-Host "  Serving from: $rootDir" -ForegroundColor DarkGray
Write-Host "  100% Local • Zero Cloud • Instant Stats" -ForegroundColor DarkGray
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "Press Ctrl+C in this window to stop.`n"

Start-Process $url

$mimeMap = @{
    ".html" = "text/html";
    ".js"   = "application/javascript";
    ".mjs"  = "application/javascript";
    ".css"  = "text/css";
    ".wasm" = "application/wasm";
    ".json" = "application/json";
    ".svg"  = "image/svg+xml";
    ".png"  = "image/png";
    ".ico"  = "image/x-icon"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response

        $path = $req.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($path)) { $path = "index.html" }
        $localFile = Join-Path $rootDir $path

        if (-not (Test-Path $localFile -PathType Leaf)) {
            $localFile = Join-Path $rootDir "index.html"
        }

        if (Test-Path $localFile -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($localFile).ToLower()
            $contentType = $mimeMap[$ext]
            if (-not $contentType) { $contentType = "application/octet-stream" }
            $res.ContentType = $contentType
            $bytes = [System.IO.File]::ReadAllBytes($localFile)
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
        }
        $res.OutputStream.Close()
    }
} finally {
    if ($listener -and $listener.IsListening) {
        $listener.Stop()
    }
}
