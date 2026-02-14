# Neon PostgreSQL Database Backup to S3
# Runs weekly, keeps last 4 backups (1 month retention)

param(
    [string]$ProjectRoot = "C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur"
)

# Configuration
$S3_BUCKET = "jay-pc-critical-backup-704444257237"
$S3_PREFIX = "database-backups/pelangi-manager"
$BACKUP_DIR = Join-Path $ProjectRoot "backups"
$LOG_FILE = Join-Path $ProjectRoot "logs\backup.log"
$RETENTION_COUNT = 4 # Keep last 4 weekly backups

# Ensure directories exist
New-Item -ItemType Directory -Force -Path $BACKUP_DIR | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path $LOG_FILE) | Out-Null

# Logging function
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage
    Add-Content -Path $LOG_FILE -Value $logMessage
}

Write-Log "=== Starting database backup ==="

try {
    # Load environment variables from .env
    $envFile = Join-Path $ProjectRoot ".env"
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^([^=]+)=(.*)$') {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim()
                [Environment]::SetEnvironmentVariable($key, $value, "Process")
            }
        }
        Write-Log "Loaded .env file"
    }

    # Get database connection string
    $DATABASE_URL = $env:DATABASE_URL
    if (-not $DATABASE_URL) {
        throw "DATABASE_URL not found in .env file"
    }

    # Generate backup filename with timestamp
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $backupFile = Join-Path $BACKUP_DIR "pelangi-db-$timestamp.sql"
    $compressedFile = "$backupFile.gz"

    Write-Log "Creating backup: $backupFile"

    # Run pg_dump
    $pgDumpPath = "C:\pgsql\bin\pg_dump.exe"
    $pgDumpArgs = @(
        "--no-owner",
        "--no-acl",
        "--clean",
        "--if-exists",
        "--format=plain",
        "--file=$backupFile",
        $DATABASE_URL
    )

    $process = Start-Process -FilePath $pgDumpPath -ArgumentList $pgDumpArgs -NoNewWindow -Wait -PassThru
    if ($process.ExitCode -ne 0) {
        throw "pg_dump failed with exit code $($process.ExitCode)"
    }

    Write-Log "Database dumped successfully"

    # Compress the backup
    Write-Log "Compressing backup..."

    # Use .NET compression (built-in, no external dependency)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $fileToCompress = Get-Item $backupFile
    $gzipStream = [System.IO.File]::Create($compressedFile)
    $compressionStream = New-Object System.IO.Compression.GZipStream($gzipStream, [System.IO.Compression.CompressionMode]::Compress)
    $fileStream = [System.IO.File]::OpenRead($backupFile)

    $fileStream.CopyTo($compressionStream)

    $compressionStream.Close()
    $fileStream.Close()
    $gzipStream.Close()

    # Remove uncompressed file
    Remove-Item $backupFile -Force

    $compressedSize = (Get-Item $compressedFile).Length / 1MB
    Write-Log "Backup compressed: $([math]::Round($compressedSize, 2)) MB"

    # Upload to S3
    Write-Log "Uploading to S3..."
    $s3Key = "$S3_PREFIX/pelangi-db-$timestamp.sql.gz"

    $uploadArgs = @(
        "s3", "cp",
        $compressedFile,
        "s3://$S3_BUCKET/$s3Key",
        "--region", "us-east-1",
        "--storage-class", "STANDARD_IA"  # Infrequent Access for cost savings
    )

    $awsProcess = Start-Process -FilePath "aws" -ArgumentList $uploadArgs -NoNewWindow -Wait -PassThru
    if ($awsProcess.ExitCode -ne 0) {
        throw "S3 upload failed with exit code $($awsProcess.ExitCode)"
    }

    Write-Log "Uploaded to s3://$S3_BUCKET/$s3Key"

    # Clean up local backup
    Remove-Item $compressedFile -Force
    Write-Log "Local backup cleaned up"

    # Apply retention policy - keep only last N backups in S3
    Write-Log "Applying retention policy (keep last $RETENTION_COUNT backups)..."

    # List all backups in S3
    $listOutput = aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/" --recursive | Out-String
    $backups = $listOutput -split "`n" | Where-Object { $_ -match "\.sql\.gz$" } | ForEach-Object {
        if ($_ -match "(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+\d+\s+(.+)$") {
            [PSCustomObject]@{
                Date = [DateTime]::Parse($matches[1])
                Key = $matches[2]
            }
        }
    } | Sort-Object Date -Descending

    # Delete old backups
    $backupsToDelete = $backups | Select-Object -Skip $RETENTION_COUNT
    foreach ($backup in $backupsToDelete) {
        Write-Log "Deleting old backup: $($backup.Key)"
        aws s3 rm "s3://$S3_BUCKET/$($backup.Key)" --region us-east-1 | Out-Null
    }

    Write-Log "Retention policy applied: $($backupsToDelete.Count) old backups deleted"
    Write-Log "=== Backup completed successfully ==="

} catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    Write-Log "Stack trace: $($_.ScriptStackTrace)"
    exit 1
}
