$uri = "http://localhost:3001/api/companies/A/records"
$body = @{
    empId = "A001"
    date = "2026-04-12"
    prodKey = "P001"
    batchCode = "B001"
    processes = @(
        @{ name = "测试工序"; qty = 1; price = 0.1 }
    )
} | ConvertTo-Json

Write-Host "发送请求到: $uri"
Write-Host "请求体: $body"

try {
    $response = Invoke-WebRequest -Uri $uri -Method POST -Headers @{"Content-Type"="application/json"} -Body $body
    Write-Host "响应状态: $($response.StatusCode)"
    Write-Host "响应内容: $($response.Content)"
} catch {
    Write-Host "错误: $($_.Exception.Message)"
    Write-Host "响应: $($_.Exception.Response)"
}