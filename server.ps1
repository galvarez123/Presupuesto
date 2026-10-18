param(
    [int]$Port = 5080,
    [string]$Root = $PSScriptRoot
)

if (-not $Root) {
    $Root = "c:\Users\galva\antygravity\presupuesto"
}

$lanIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*" -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike "169.254*" }).IPAddress
if (-not $lanIp) {
    $lanIp = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254*" } | Select-Object -First 1).IPAddress
}
if (-not $lanIp) { $lanIp = "127.0.0.1" }

$endpoint = New-Object System.Net.IPEndPoint([System.Net.IPAddress]::Any, $Port)
$listener = New-Object System.Net.Sockets.TcpListener($endpoint)
$listener.Start()

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  SERVIDOR BOVEDA DE PRESUPUESTO Y TUNEL MAGIA ACTIVO (PUERTO $Port)  " -ForegroundColor Green
Write-Host "  Local:   http://localhost:$Port/" -ForegroundColor Yellow
Write-Host "  Red LAN: http://${lanIp}:$Port/" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan

function Send-HttpResponse {
    param(
        $Stream,
        [int]$StatusCode = 200,
        [string]$StatusText = "OK",
        [string]$ContentType = "text/html; charset=utf-8",
        [byte[]]$BodyBytes = @()
    )
    $headerText = "HTTP/1.1 $StatusCode $StatusText`r`n" +
                  "Content-Type: $ContentType`r`n" +
                  "Content-Length: $($BodyBytes.Length)`r`n" +
                  "Access-Control-Allow-Origin: *`r`n" +
                  "Cache-Control: no-cache`r`n" +
                  "Connection: close`r`n`r`n"
    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headerText)
    $Stream.Write($headerBytes, 0, $headerBytes.Length)
    if ($BodyBytes.Length -gt 0) {
        $Stream.Write($BodyBytes, 0, $BodyBytes.Length)
    }
    $Stream.Flush()
}

while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        $client.ReceiveTimeout = 15000
        $client.SendTimeout = 15000
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)

        $reqLine = $reader.ReadLine()
        if ([string]::IsNullOrWhiteSpace($reqLine)) {
            $client.Close()
            continue
        }

        $parts = $reqLine.Split(' ')
        $path = if ($parts.Length -ge 2) { $parts[1].Split('?')[0] } else { "/" }

        while ($true) {
            $line = $reader.ReadLine()
            if ([string]::IsNullOrEmpty($line)) { break }
        }

        $cleanPath = [System.Uri]::UnescapeDataString($path).TrimStart('/')
        if ([string]::IsNullOrEmpty($cleanPath)) { $cleanPath = "index.html" }
        $cleanPath = $cleanPath.Replace('/', [System.IO.Path]::DirectorySeparatorChar)

        $fullPath = [System.IO.Path]::GetFullPath((Join-Path $Root $cleanPath))
        $rootFull = [System.IO.Path]::GetFullPath($Root)

        if (-not $fullPath.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $fullPath -PathType Leaf)) {
            $nfBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            Send-HttpResponse -Stream $stream -StatusCode 404 -StatusText "Not Found" -ContentType "text/plain; charset=utf-8" -BodyBytes $nfBytes
            $client.Close()
            continue
        }

        $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
        $mime = switch ($ext) {
            ".html" { "text/html; charset=utf-8" }
            ".css"  { "text/css; charset=utf-8" }
            ".js"   { "application/javascript; charset=utf-8" }
            ".json" { "application/json; charset=utf-8" }
            ".png"  { "image/png" }
            ".jpg"  { "image/jpeg" }
            ".svg"  { "image/svg+xml" }
            default { "application/octet-stream" }
        }

        $fileBytes = [System.IO.File]::ReadAllBytes($fullPath)
        Send-HttpResponse -Stream $stream -StatusCode 200 -StatusText "OK" -ContentType $mime -BodyBytes $fileBytes
        $client.Close()
    } catch {
        if ($client) { try { $client.Close() } catch {} }
    }
}
