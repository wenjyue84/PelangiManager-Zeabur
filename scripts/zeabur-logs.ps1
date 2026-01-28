# Zeabur Deployment Logs Fetcher
# Run: powershell -ExecutionPolicy Bypass -File scripts/zeabur-logs.ps1 [deploymentId]
#
# Examples:
#   scripts/zeabur-logs.ps1                           # Show recent deployments
#   scripts/zeabur-logs.ps1 697a279e560650e56aac8c95  # Show logs for specific deployment

param(
    [string]$DeploymentId = ""
)

$ZEABUR_TOKEN = if ($env:ZEABUR_TOKEN) { $env:ZEABUR_TOKEN } else { "sk-3rnuwvuwf33q7l44txghfkujzf2yz" }
$PROJECT_ID = "6948c99fced85978abb44563"
$API_URL = "https://api.zeabur.com/graphql"

function Invoke-ZeaburQuery {
    param([string]$Query)

    $headers = @{
        "Authorization" = "Bearer $ZEABUR_TOKEN"
        "Content-Type" = "application/json"
    }

    $body = @{ query = $Query } | ConvertTo-Json -Depth 10

    try {
        $response = Invoke-RestMethod -Uri $API_URL -Method POST -Headers $headers -Body $body -TimeoutSec 60
        return $response
    } catch {
        Write-Host "API Error: $_" -ForegroundColor Red
        return $null
    }
}

function Get-RecentDeployments {
    $query = @"
query {
  project(_id: "$PROJECT_ID") {
    name
    services {
      _id
      name
      status
      deployments {
        _id
        status
        createdAt
      }
    }
  }
}
"@
    return Invoke-ZeaburQuery -Query $query
}

function Get-BuildLogs {
    param([string]$DepId)

    $query = @"
query {
  buildLogs(projectID: "$PROJECT_ID", deploymentID: "$DepId") {
    message
    timestamp
  }
}
"@
    return Invoke-ZeaburQuery -Query $query
}

# Main execution
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "ZEABUR DEPLOYMENT STATUS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$result = Get-RecentDeployments

if (-not $result) {
    Write-Host "Failed to fetch deployment data" -ForegroundColor Red
    exit 1
}

if ($result.errors) {
    Write-Host "GraphQL Errors:" -ForegroundColor Red
    $result.errors | ForEach-Object { Write-Host $_.message -ForegroundColor Red }
    exit 1
}

$project = $result.data.project
if (-not $project) {
    Write-Host "No project data found" -ForegroundColor Yellow
    exit 1
}

Write-Host "Project: $($project.name)" -ForegroundColor Green
Write-Host ""

$latestFailedId = $null

foreach ($service in $project.services) {
    if ($service.deployments.Count -eq 0) { continue }

    Write-Host "------------------------------------------------------------" -ForegroundColor Gray
    Write-Host "Service: $($service.name) [$($service.status)]" -ForegroundColor Yellow
    Write-Host "------------------------------------------------------------" -ForegroundColor Gray

    $count = 0
    foreach ($dep in $service.deployments) {
        $count++
        if ($count -gt 5) { break }  # Show only last 5

        $statusIcon = switch ($dep.status) {
            "RUNNING" { "[OK]" }
            "FAILED" { "[FAIL]" }
            "BUILDING" { "[BUILD]" }
            "QUEUED" { "[QUEUE]" }
            "REMOVED" { "[DEL]" }
            default { "[?]" }
        }

        $statusColor = switch ($dep.status) {
            "RUNNING" { "Green" }
            "FAILED" { "Red" }
            "BUILDING" { "Yellow" }
            default { "Gray" }
        }

        Write-Host "$statusIcon " -ForegroundColor $statusColor -NoNewline
        Write-Host "$($dep.status.PadRight(10)) | $($dep.createdAt) | $($dep._id)"

        # Track first failed deployment
        if ($dep.status -eq "FAILED" -and -not $latestFailedId) {
            $latestFailedId = $dep._id
        }
    }
    Write-Host ""
}

# Determine which deployment to show logs for
$targetId = if ($DeploymentId) { $DeploymentId } else { $latestFailedId }

if ($targetId) {
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "BUILD LOGS: $targetId" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""

    $logResult = Get-BuildLogs -DepId $targetId

    if ($logResult -and $logResult.data.buildLogs) {
        $logs = $logResult.data.buildLogs
        Write-Host "Total log entries: $($logs.Count)" -ForegroundColor Gray
        Write-Host ""

        # Get first 60 entries (logs are in reverse order, first = end of build)
        $endLogs = $logs | Select-Object -First 60

        foreach ($log in $endLogs) {
            $msg = $log.message
            if ($msg -match "error|Error|ERROR|failed|Failed|FAILED|Build Failed") {
                Write-Host $msg -ForegroundColor Red
            } elseif ($msg -match "warning|Warning|WARNING") {
                Write-Host $msg -ForegroundColor Yellow
            } elseif ($msg -match "DONE|success|Success|SUCCESS") {
                Write-Host $msg -ForegroundColor Green
            } else {
                Write-Host $msg
            }
        }
    } else {
        Write-Host "No build logs available" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Done!" -ForegroundColor Green
