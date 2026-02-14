# Install Weekly Database Backup Task in Windows Task Scheduler
# Run as Administrator

param(
    [string]$ProjectRoot = "C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur"
)

$taskName = "PelangiManager-Weekly-DB-Backup"
$scriptPath = Join-Path $ProjectRoot "scripts\backup-to-s3.ps1"

# Check if running as Administrator
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "Installing scheduled task: $taskName" -ForegroundColor Cyan

# Create task action - run PowerShell script
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`""

# Create trigger - weekly on Sunday at 3:00 AM
$trigger = New-ScheduledTaskTrigger `
    -Weekly `
    -DaysOfWeek Sunday `
    -At "3:00AM"

# Task settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -MultipleInstances IgnoreNew

# Create principal - run as current user
$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType S4U `
    -RunLevel Highest

# Register the task
try {
    # Remove existing task if present
    $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Host "Removing existing task..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }

    # Register new task
    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description "Weekly backup of PelangiManager Neon database to S3 (jay-pc-critical-backup-704444257237)"

    Write-Host "`nTask installed successfully!" -ForegroundColor Green
    Write-Host "`nTask details:" -ForegroundColor Cyan
    Write-Host "  Name: $taskName"
    Write-Host "  Schedule: Every Sunday at 3:00 AM"
    Write-Host "  Script: $scriptPath"
    Write-Host "  S3 Bucket: jay-pc-critical-backup-704444257237"
    Write-Host "  Retention: Last 4 backups (1 month)"

    Write-Host "`nTo test the backup immediately, run:" -ForegroundColor Yellow
    Write-Host "  Start-ScheduledTask -TaskName '$taskName'"

    Write-Host "`nTo view task status:" -ForegroundColor Yellow
    Write-Host "  Get-ScheduledTask -TaskName '$taskName' | Get-ScheduledTaskInfo"

    Write-Host "`nTo view backup logs:" -ForegroundColor Yellow
    Write-Host "  Get-Content '$ProjectRoot\logs\backup.log' -Tail 50"

} catch {
    Write-Host "ERROR: Failed to install task" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
