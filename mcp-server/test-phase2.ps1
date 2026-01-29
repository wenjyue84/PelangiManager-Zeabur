Write-Host "=== Phase 2 Tools Testing ===" -ForegroundColor Green
Write-Host ""

# Test 1: Capsule Utilization
Write-Host "1. Capsule Utilization:" -ForegroundColor Cyan
$r1 = Invoke-RestMethod -Uri 'http://localhost:3001/mcp' -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_capsule_utilization","arguments":{}},"id":1}'
$data1 = $r1.result.content[0].text | ConvertFrom-Json
Write-Host "   Total: $($data1.total), Occupied: $($data1.occupied), Available: $($data1.available)"
Write-Host "   Needs Cleaning: $($data1.needsCleaning), Utilization: $($data1.utilizationRate)%"

# Test 2: Guest Statistics
Write-Host ""
Write-Host "2. Guest Statistics:" -ForegroundColor Cyan
$r2 = Invoke-RestMethod -Uri 'http://localhost:3001/mcp' -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_guest_statistics","arguments":{}},"id":2}'
$data2 = $r2.result.content[0].text | ConvertFrom-Json
Write-Host "   Current Guests: $($data2.currentGuests), Total All Time: $($data2.totalGuestsAllTime)"

# Test 3: CSV Export
Write-Host ""
Write-Host "3. CSV Export:" -ForegroundColor Cyan
$r3 = Invoke-RestMethod -Uri 'http://localhost:3001/mcp' -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_export_guests_csv","arguments":{"checkedIn":true}},"id":3}'
$csv = $r3.result.content[0].text
$lines = ($csv -split "`n").Count
Write-Host "   CSV generated: $lines lines"

# Test 4: Bulk Checkout (dry run)
Write-Host ""
Write-Host "4. Bulk Checkout Preview:" -ForegroundColor Cyan
Write-Host "   Available types: overdue, today, all"
Write-Host "   (Test skipped - would modify data)"

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Green
Write-Host "Total tools: 19 (10 Phase 1 + 9 Phase 2)"
Write-Host ""
Write-Host "Phase 2 Tools (9):" -ForegroundColor Cyan
Write-Host "  Guest Operations (3): checkin, checkout, bulk_checkout"
Write-Host "  Capsule Operations (2): mark_cleaned, bulk_mark_cleaned"
Write-Host "  Problem Tracking (1): get_problem_summary"
Write-Host "  Analytics (3): utilization, statistics, export_csv"
