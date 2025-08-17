# Port 5000 EADDRINUSE Error Troubleshooting Guide

## Issue Description
When running `npm run dev`, the following error occurs:
```
Error: listen EADDRINUSE: address already in use 0.0.0.0:5000
```

## Root Cause
Port 5000 was already being used by another process, preventing the development server from starting.

## Solution Steps

### 1. Identify the Process Using Port 5000
```bash
netstat -ano | findstr :5000
```
This will show output like:
```
TCP    0.0.0.0:5000           0.0.0.0:0              LISTENING       9880
```
Note the PID (Process ID) in the last column (9880 in this example).

### 2. Kill the Process
```bash
taskkill /PID 9880 /F
```
Replace `9880` with the actual PID from step 1.

Expected output:
```
SUCCESS: The process with PID 9880 has been terminated.
```

### 3. Start the Development Server
```bash
npm run dev
```

### 4. Verify Success
The server should start successfully with output showing:
```
[express] serving on port 5000
✅ Configuration service initialized
```

## Prevention
- Always properly stop the development server using `Ctrl+C`
- If the terminal is closed abruptly, check for running processes before restarting
- Consider using different ports if port 5000 conflicts with other applications

## Alternative Solutions
If the process cannot be killed or keeps restarting:
1. Restart your computer
2. Change the port in your application configuration
3. Use `npx kill-port 5000` if you have the kill-port package installed

## Date Resolved
January 2025 - Successfully resolved EADDRINUSE error on Windows development environment.
