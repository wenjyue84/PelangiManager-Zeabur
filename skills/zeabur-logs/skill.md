# Zeabur Deployment Logs Skill

Fetch deployment status and build logs from Zeabur for the PelangiManager project.

## When to use this skill

- Check if a deployment succeeded or failed
- View build logs to diagnose deployment failures
- Monitor deployment status

## How to invoke

```
Load the zeabur-logs skill and check deployment status
```

Or check a specific deployment:
```
Load the zeabur-logs skill and show logs for deployment 697a279e560650e56aac8c95
```

## Usage

Run the PowerShell script:

```powershell
# Show recent deployments and auto-show logs for any failed deployment
powershell -ExecutionPolicy Bypass -File scripts/zeabur-logs.ps1

# Show logs for a specific deployment ID
powershell -ExecutionPolicy Bypass -File scripts/zeabur-logs.ps1 <deployment-id>
```

## What it shows

1. **Project name and services**
2. **Recent deployments** with status:
   - `[OK]` RUNNING - Deployment successful and running
   - `[FAIL]` FAILED - Deployment failed
   - `[BUILD]` BUILDING - Deployment in progress
   - `[QUEUE]` QUEUED - Waiting to deploy
3. **Build logs** for failed deployments (automatically shown)
4. **Error highlighting** - Errors shown in red, warnings in yellow

## Configuration

The script uses these settings (hardcoded for PelangiManager):
- **API**: `https://api.zeabur.com/graphql`
- **Project ID**: `6948c99fced85978abb44563`
- **Token**: Uses `ZEABUR_TOKEN` env var or embedded token

## Troubleshooting

**API Error: Unable to connect**
- Check internet connection
- Verify API endpoint is reachable: `Test-NetConnection api.zeabur.com -Port 443`

**GraphQL Errors**
- Token may have expired - generate new one at https://zeabur.com/account/tokens
- Update token in script or set `$env:ZEABUR_TOKEN`

**No build logs available**
- Some deployments (like database services) don't have build logs
- Logs may be purged after some time

## Example Output

```
============================================================
ZEABUR DEPLOYMENT STATUS
============================================================

Project: PelangiManager

------------------------------------------------------------
Service: pelangi-manager [RUNNING]
------------------------------------------------------------
[FAIL] FAILED     | 2026-01-28T15:13:34.602Z | 697a279e560650e56aac8c95
[FAIL] FAILED     | 2026-01-28T14:25:32.266Z | 697a1c5c560650e56aac8886
[OK]   RUNNING    | 2025-12-23T04:13:55.364Z | 694a17031577eab8d35904fa

============================================================
BUILD LOGS: 697a279e560650e56aac8c95
============================================================

[vite-plugin-pwa:build] "phoneUtils" is not exported by "validation.ts"
error during build:
Build Failed. Reason: build image: build failed
```
