Add-Type -AssemblyName System.Windows.Forms
$cpolarFile = "$env:TEMP\cpolar_out.txt"
$url = ""
$lan = ""

# 获取局域网IP
$ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "WLAN","以太网","Ethernet" -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike "127.*" } | Select-Object -First 1).IPAddress
if (-not $ip) { $ip = "127.0.0.1" }
$lan = "http://$ip:3001/index.html"

# 轮询等待日志文件出现外网地址（最多等20秒）
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $cpolarFile) {
        try {
            $match = Select-String -Path $cpolarFile -Pattern "Tunnel established at (https://[^\s\x22]+)" -Encoding UTF8 -ErrorAction SilentlyContinue | Select-Object -Last 1
            if ($match -and $match.Matches.Groups[1].Value) {
                $url = $match.Matches.Groups[1].Value + "/index.html"
                break
            }
        } catch {}
    }
}

$copyText = if ($url) { $url } else { $lan }
[System.Windows.Forms.Clipboard]::SetText($copyText)
Write-Host "已复制到剪贴板: $copyText"
[System.Windows.Forms.MessageBox]::Show("访问地址已复制到剪贴板:`n$copyText", "产量登记系统已启动", "OK", "Information") | Out-Null