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

# === 自动更新跳转页面的默认地址并推送到 GitHub ===
$redirectPage = "$PSScriptRoot\redirect-page\index.html"
$repoPath = $PSScriptRoot
if (Test-Path $redirectPage -and $url) {
    try {
        $content = Get-Content $redirectPage -Raw -Encoding UTF8
        # 替换 defaultUrl 为当前 Cpolar 地址（去掉 /index.html 后缀）
        $cpolarBase = $url -replace "/index.html$", ""
        $newContent = $content -replace "defaultUrl:\s*'[^']*'", "defaultUrl: '$cpolarBase'"
        Set-Content $redirectPage $newContent -Encoding UTF8 -NoNewline
        Write-Host "已更新跳转页面默认地址: $cpolarBase"
        
        # 推送到 GitHub
        Write-Host "正在推送到 GitHub..."
        $gitOutput = & git -C $repoPath add redirect-page/index.html 2>&1
        $gitOutput = & git -C $repoPath commit -m "auto: update cpolar url to $cpolarBase" 2>&1
        $gitOutput = & git -C $repoPath push 2>&1
        Write-Host "推送完成"
        $pushMsg = "GitHub 跳转页面已更新，约1分钟后生效"
    } catch {
        Write-Host "更新或推送失败: $_"
        $pushMsg = "本地文件已更新，但推送到 GitHub 失败"
    }
} else {
    $pushMsg = "未能获取 Cpolar 地址"
}

[System.Windows.Forms.MessageBox]::Show("访问地址已复制到剪贴板:`n$copyText`n`n$pushMsg", "产量登记系统已启动", "OK", "Information") | Out-Null