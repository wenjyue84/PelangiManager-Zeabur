# Database Backup to S3 - Setup Guide

Automated weekly backups of the PelangiManager Neon PostgreSQL database to AWS S3.

## Quick Start

### 1. Install the Scheduled Task (One-time setup)

Run PowerShell as **Administrator**:

```powershell
cd C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur
.\scripts\install-backup-task.ps1
```

This will create a Windows Task Scheduler task that runs every **Sunday at 3:00 AM**.

### 2. Test the Backup Immediately

```powershell
# Run the backup script manually
.\scripts\backup-to-s3.ps1

# Or trigger the scheduled task
Start-ScheduledTask -TaskName "PelangiManager-Weekly-DB-Backup"
```

### 3. View Backup Logs

```powershell
# View recent logs
Get-Content .\logs\backup.log -Tail 50

# View full log
notepad .\logs\backup.log
```

## Configuration

### Backup Settings

- **S3 Bucket**: `jay-pc-critical-backup-704444257237`
- **S3 Path**: `database-backups/pelangi-manager/`
- **Schedule**: Weekly, Sunday 3:00 AM
- **Retention**: Last 4 backups (1 month)
- **Storage Class**: STANDARD_IA (cost-optimized for infrequent access)

### What Gets Backed Up

- Full database dump (schema + data)
- Compressed with gzip (typically 90%+ compression)
- Named with timestamp: `pelangi-db-YYYY-MM-DD_HH-mm-ss.sql.gz`

### Retention Policy

The script automatically:
1. Uploads new backup to S3
2. Lists all backups in S3
3. Deletes backups older than the 4 most recent
4. Result: Always maintains last 4 weekly backups (~1 month history)

## Manual Operations

### Run Backup On-Demand

```powershell
.\scripts\backup-to-s3.ps1
```

### List Backups in S3

```powershell
aws s3 ls s3://jay-pc-critical-backup-704444257237/database-backups/pelangi-manager/ --recursive --human-readable
```

### Download a Backup

```powershell
# List available backups first
aws s3 ls s3://jay-pc-critical-backup-704444257237/database-backups/pelangi-manager/

# Download specific backup
aws s3 cp s3://jay-pc-critical-backup-704444257237/database-backups/pelangi-manager/pelangi-db-2026-02-14_03-00-00.sql.gz ./restore/
```

### Restore from Backup

```powershell
# 1. Download backup
aws s3 cp s3://jay-pc-critical-backup-704444257237/database-backups/pelangi-manager/pelangi-db-YYYY-MM-DD_HH-mm-ss.sql.gz ./restore/

# 2. Decompress
cd restore
gunzip pelangi-db-YYYY-MM-DD_HH-mm-ss.sql.gz

# 3. Restore to database
$env:DATABASE_URL = "postgresql://..." # Your target database URL
C:\pgsql\bin\psql.exe $env:DATABASE_URL -f pelangi-db-YYYY-MM-DD_HH-mm-ss.sql
```

## Task Management

### View Task Status

```powershell
Get-ScheduledTask -TaskName "PelangiManager-Weekly-DB-Backup" | Get-ScheduledTaskInfo
```

### Check Last Run Result

```powershell
Get-ScheduledTask -TaskName "PelangiManager-Weekly-DB-Backup" | Get-ScheduledTaskInfo | Select-Object LastRunTime, LastTaskResult
```

### Modify Schedule

Open Task Scheduler GUI:
1. Press `Win + R`, type `taskschd.msc`, press Enter
2. Find "PelangiManager-Weekly-DB-Backup" in Task Scheduler Library
3. Right-click → Properties → Triggers → Edit

Or modify and re-run `install-backup-task.ps1`.

### Disable/Enable Task

```powershell
# Disable
Disable-ScheduledTask -TaskName "PelangiManager-Weekly-DB-Backup"

# Enable
Enable-ScheduledTask -TaskName "PelangiManager-Weekly-DB-Backup"
```

### Uninstall Task

```powershell
Unregister-ScheduledTask -TaskName "PelangiManager-Weekly-DB-Backup" -Confirm:$false
```

## Troubleshooting

### Backup Fails - Check Logs

```powershell
Get-Content .\logs\backup.log -Tail 100
```

Common issues:
- **DATABASE_URL not found**: Missing `.env` file or `DATABASE_URL` variable
- **pg_dump failed**: PostgreSQL client tools not installed or wrong path
- **S3 upload failed**: AWS CLI not configured or no internet connection
- **Permission denied**: Run as Administrator (for Task Scheduler operations)

### Test Components Individually

```powershell
# Test database connection
C:\pgsql\bin\psql.exe $env:DATABASE_URL -c "SELECT version();"

# Test AWS S3 access
aws s3 ls s3://jay-pc-critical-backup-704444257237/

# Test Neon API (optional)
$headers = @{ "Authorization" = "Bearer $env:NEON_API_KEY" }
Invoke-RestMethod -Uri "https://console.neon.tech/api/v2/projects" -Headers $headers
```

### Manual Backup (No Script)

```powershell
# Set variables
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFile = "pelangi-db-$timestamp.sql"

# Dump database
C:\pgsql\bin\pg_dump.exe --no-owner --no-acl $env:DATABASE_URL > $backupFile

# Compress
gzip $backupFile

# Upload
aws s3 cp "$backupFile.gz" s3://jay-pc-critical-backup-704444257237/database-backups/pelangi-manager/
```

## Cost Optimization

**Current Setup:**
- Storage Class: `STANDARD_IA` (Infrequent Access)
- Retention: 4 backups
- Estimated cost: ~$0.01-0.05/month (depends on database size)

**If Cost is a Concern:**
- Reduce retention to 2 backups: Change `$RETENTION_COUNT = 2` in `backup-to-s3.ps1`
- Use GLACIER storage: Add `--storage-class GLACIER` to aws s3 cp (but slower retrieval)
- Compress more: Database dumps are already highly compressible

## Monitoring

### Set Up Email Notifications (Optional)

Modify `backup-to-s3.ps1` to send email on failure:

```powershell
# Add this at the end of the catch block
Send-MailMessage `
    -From "backup@yourdomain.com" `
    -To "admin@yourdomain.com" `
    -Subject "PelangiManager Backup Failed" `
    -Body "Backup failed: $($_.Exception.Message)" `
    -SmtpServer "smtp.gmail.com" `
    -Port 587 `
    -UseSsl `
    -Credential (Get-Credential)
```

### CloudWatch Logs (Advanced)

For centralized logging, upload logs to CloudWatch:

```powershell
# After backup completes, send logs to CloudWatch
aws logs put-log-events `
    --log-group-name "/aws/backups/pelangi-manager" `
    --log-stream-name "weekly-backup" `
    --log-events timestamp=$(Get-Date -UFormat %s),message="$(Get-Content $LOG_FILE -Raw)"
```

## Security Notes

- ✅ Database credentials stored in `.env` (gitignored)
- ✅ S3 bucket uses IAM credentials from AWS CLI config
- ✅ Neon API key stored in `.env` (gitignored)
- ✅ Backups encrypted at rest in S3 (default AWS encryption)
- ⚠️ Consider enabling S3 bucket versioning for extra protection
- ⚠️ Consider MFA Delete on S3 bucket for critical data

## Next Steps

1. ✅ Install task (done if you ran `install-backup-task.ps1`)
2. ✅ Test backup manually
3. ⏳ Wait for first scheduled run (Sunday 3 AM)
4. ⏳ Verify backup appears in S3
5. ⏳ Test restore procedure (optional but recommended)

---

**Questions?** Check logs first, then review troubleshooting section above.
