# Import temp data to factory system
$baseUrl = "http://localhost:3001"
$company = "default"

# Data to import
$data = @(
    @{ Product="X3"; Color=""; Qty=1000; Price=0.63; Date="2025-03-07" },
    @{ Product="Bluetooth LED"; Color=""; Qty=200; Price=1.2; Date="2025-03-07" },
    @{ Product="X3"; Color=""; Qty=187; Price=0.47; Date="2025-03-08" },
    @{ Product="F9 Headband"; Color="Pink"; Qty=294; Price=0.8; Date="2025-03-12" },
    @{ Product="F9 Headband"; Color="Pink"; Qty=294; Price=0.8; Date="2025-03-12" },
    @{ Product="F9 Headband"; Color="Black"; Qty=170; Price=0.8; Date="2025-03-16" },
    @{ Product="F9 Headband"; Color="Black"; Qty=128; Price=0.8; Date="2025-03-17" },
    @{ Product="F9 Headband"; Color="Beige"; Qty=200; Price=0.8; Date="2025-03-18" },
    @{ Product="F9 Headband"; Color="Beige"; Qty=300; Price=0.8; Date="2025-03-19" },
    @{ Product="F9 Headband"; Color="Beige"; Qty=300; Price=0.8; Date="2025-03-21" },
    @{ Product="F9 Headband"; Color="Beige"; Qty=195; Price=0.8; Date="2025-03-22" },
    @{ Product="F9 Headband"; Color="Pink"; Qty=404; Price=0.5; Date="2025-03-24" },
    @{ Product="P9 Headband"; Color="Black"; Qty=486; Price=0.5; Date="2025-03-29" }
)

Write-Host "Importing $($data.Count) records..." -ForegroundColor Green

$productMap = @{}
$success = 0
$failed = 0

foreach ($item in $data) {
    $prodName = $item.Product
    $color = $item.Color
    $qty = $item.Qty
    $price = $item.Price
    $date = $item.Date
    
    Write-Host "Processing: $prodName $color x$qty @ $price on $date"
    
    # Create product if not exists
    if (-not $productMap.ContainsKey($prodName)) {
        $prodKey = ($prodName -replace "[^a-zA-Z0-9]", "_").ToLower()
        $productMap[$prodName] = $prodKey
        
        try {
            $body = @{ key = $prodKey; name = $prodName; processes = @(@{ name = "Assembly"; price = 0 }) } | ConvertTo-Json -Compress
            Invoke-RestMethod -Uri "$baseUrl/api/companies/$company/products" -Method POST -Body $body -ContentType "application/json" -ErrorAction SilentlyContinue | Out-Null
            Write-Host "  Created product: $prodName" -ForegroundColor Cyan
        } catch {
            Write-Host "  Product exists: $prodName" -ForegroundColor Yellow
        }
    }
    
    $prodKey = $productMap[$prodName]
    
    # Create batch (inbound)
    try {
        $batchBody = @{ prodKey = $prodKey; color = $color; qty = $qty; price = $price } | ConvertTo-Json -Compress
        $batch = Invoke-RestMethod -Uri "$baseUrl/api/companies/$company/batches" -Method POST -Body $batchBody -ContentType "application/json"
        $batchId = $batch.id
        Write-Host "  Inbound OK: Batch ID=$batchId" -ForegroundColor Green
        
        # Create outbound record immediately
        Start-Sleep -Milliseconds 100
        
        $outBody = @{ qty = $qty } | ConvertTo-Json -Compress
        $outResult = Invoke-RestMethod -Uri "$baseUrl/api/companies/$company/batches/$batchId/out" -Method POST -Body $outBody -ContentType "application/json"
        Write-Host "  Outbound OK: Qty=$qty" -ForegroundColor Green
        $success++
        
    } catch {
        Write-Host "  ERROR: $_" -ForegroundColor Red
        $failed++
    }
    
    Start-Sleep -Milliseconds 50
}

Write-Host "`nDone! Success: $success, Failed: $failed" -ForegroundColor Green
