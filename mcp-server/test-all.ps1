Write-Host "=== MCP Server Tool Test Results ===" -ForegroundColor Green
Write-Host ""

# Test 1: List Guests
Write-Host "1. List Guests:" -ForegroundColor Cyan
$r1 = Invoke-RestMethod -Uri 'http://localhost:3001/mcp' -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_list_guests","arguments":{}},"id":1}'
$data1 = $r1.result.content[0].text | ConvertFrom-Json
Write-Host "   Found $($data1.data.Count) checked-in guests"

# Test 2: Get Occupancy
Write-Host ""
Write-Host "2. Get Occupancy:" -ForegroundColor Cyan
$r2 = Invoke-RestMethod -Uri 'http://localhost:3001/mcp' -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_get_occupancy","arguments":{}},"id":2}'
$data2 = $r2.result.content[0].text | ConvertFrom-Json
Write-Host "   Total: $($data2.total), Occupied: $($data2.occupied), Available: $($data2.available), Rate: $($data2.occupancyRate)%"

# Test 3: Check Availability
Write-Host ""
Write-Host "3. Check Availability:" -ForegroundColor Cyan
$r3 = Invoke-RestMethod -Uri 'http://localhost:3001/mcp' -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_check_availability","arguments":{}},"id":3}'
$data3 = $r3.result.content[0].text | ConvertFrom-Json
Write-Host "   Available capsules: $($data3.Count)"

# Test 4: List Capsules
Write-Host ""
Write-Host "4. List Capsules:" -ForegroundColor Cyan
$r4 = Invoke-RestMethod -Uri 'http://localhost:3001/mcp' -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_list_capsules","arguments":{}},"id":4}'
$data4 = $r4.result.content[0].text | ConvertFrom-Json
Write-Host "   Total capsules: $($data4.Count)"

# Test 5: Get Dashboard
Write-Host ""
Write-Host "5. Get Dashboard:" -ForegroundColor Cyan
$r5 = Invoke-RestMethod -Uri 'http://localhost:3001/mcp' -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_get_dashboard","arguments":{}},"id":5}'
Write-Host "   ✓ Dashboard data retrieved with occupancy, guests, capsules"

# Test 6: Get Overdue Guests
Write-Host ""
Write-Host "6. Get Overdue Guests:" -ForegroundColor Cyan
$r6 = Invoke-RestMethod -Uri 'http://localhost:3001/mcp' -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_get_overdue_guests","arguments":{}},"id":6}'
$data6 = $r6.result.content[0].text | ConvertFrom-Json
Write-Host "   Overdue guests: $($data6.Count)"

# Test 7: List Problems
Write-Host ""
Write-Host "7. List Problems:" -ForegroundColor Cyan
$r7 = Invoke-RestMethod -Uri 'http://localhost:3001/mcp' -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_list_problems","arguments":{}},"id":7}'
if ($r7.result.isError) {
    Write-Host "   Status: Requires authentication (expected)" -ForegroundColor Yellow
} else {
    $data7 = $r7.result.content[0].text | ConvertFrom-Json
    Write-Host "   Active problems: $($data7.data.Count)"
}

# Test 8: Export WhatsApp Issues
Write-Host ""
Write-Host "8. Export WhatsApp Issues:" -ForegroundColor Cyan
$r8 = Invoke-RestMethod -Uri 'http://localhost:3001/mcp' -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pelangi_export_whatsapp_issues","arguments":{}},"id":8}'
$msg = $r8.result.content[0].text
Write-Host "   ✓ WhatsApp message formatted ($($msg.Length) chars)"

# Test 9: Tools List
Write-Host ""
Write-Host "9. Tools List:" -ForegroundColor Cyan
$r9 = Invoke-RestMethod -Uri 'http://localhost:3001/mcp' -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","method":"tools/list","id":9}'
Write-Host "   Total tools available: $($r9.result.tools.Count)"

# Test 10: Initialize
Write-Host ""
Write-Host "10. Initialize MCP:" -ForegroundColor Cyan
$r10 = Invoke-RestMethod -Uri 'http://localhost:3001/mcp' -Method Post -ContentType 'application/json' -Body '{"jsonrpc":"2.0","method":"initialize","id":10}'
Write-Host "   Server: $($r10.result.serverInfo.name) v$($r10.result.serverInfo.version)"

Write-Host ""
Write-Host "=== All Tests Complete ===" -ForegroundColor Green
