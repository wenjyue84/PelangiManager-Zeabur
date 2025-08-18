# Build & Development Server Troubleshooting Guide

## Overview
This guide documents common issues encountered when starting the PelangiManager application and their solutions, based on real troubleshooting experience.

## Common Issue: Missing dist/public/index.html

### Error Message
```
{"message":"ENOENT: no such file or directory, stat 'C:\\Users\\Jyue\\Desktop\\PelangiManager\\dist\\public\\index.html'"}
```

### Root Cause
The application expects built assets in the `dist/public` directory, but the build process hasn't been run or completed successfully.

### Solution Steps

#### 1. Check Project Structure
First, verify the project setup and available scripts:
```bash
# Check package.json for build scripts
cat package.json | grep -A 10 "scripts"

# Verify project directory structure
ls -la
```

#### 2. Run Build Process
Execute the build command to generate required assets:
```bash
npm run build
```

**Expected Output:**
- Vite builds the client-side React application
- esbuild bundles the server-side code
- Creates `dist/public/index.html` and other assets
- Generates `dist/index.js` for the server

#### 3. Handle Port Conflicts
If you encounter `EADDRINUSE` errors:
```bash
# Kill existing process on port 5000
npx kill-port 5000

# Alternative methods
# Windows: netstat -ano | findstr :5000
# Linux/Mac: lsof -ti:5000 | xargs kill
```

#### 4. Start Development Server
```bash
# Start in background to monitor output
npm run dev

# Monitor server startup
# Look for: "serving on port 5000"
```

## Technical Details

### Build Process Components
1. **Vite Build**: Compiles React frontend to `dist/public/`
2. **esbuild**: Bundles Node.js server to `dist/index.js`
3. **Asset Processing**: Handles images, CSS, and other static files

### Development vs Production
- **Development**: Uses Vite middleware for hot reloading
- **Production**: Serves pre-built static files from `dist/public/`
- **Hybrid**: Some routes expect built files even in development mode

### Project Structure After Build
```
dist/
├── public/
│   ├── index.html              # Main HTML entry point
│   └── assets/
│       ├── index-[hash].css    # Compiled styles
│       ├── index-[hash].js     # Main React bundle
│       └── [various assets]    # Images, fonts, etc.
└── index.js                    # Server bundle
```

## Prevention Strategies

### 1. Always Build First
- Run `npm run build` when setting up the project
- Build after major changes to static assets
- Include build step in deployment workflows

### 2. Port Management
- Use `npx kill-port 5000` before starting development
- Consider using different ports for different environments
- Check for hanging Node.js processes

### 3. Environment Validation
- Verify `NODE_ENV` settings
- Check for proper environment variables
- Ensure all dependencies are installed (`npm install`)

## Troubleshooting Checklist

- [ ] Project dependencies installed (`npm install`)
- [ ] Build process completed (`npm run build`)
- [ ] No port conflicts (port 5000 available)
- [ ] `dist/public/index.html` exists
- [ ] Server starts without errors
- [ ] Application accessible at `http://localhost:5000`

## Additional Commands

### Useful Debugging Commands
```bash
# Check Node.js processes
ps aux | grep node

# Verify build output
ls -la dist/public/

# Check server logs
npm run dev 2>&1 | tee server.log

# Validate package integrity
npm audit
```

### Quick Recovery Script
```bash
#!/bin/bash
# Quick recovery for common build issues
npx kill-port 5000
npm run build
npm run dev
```

## Related Issues

### Component Loading Problems
- **TEST_COMPONENT.tsx**: Ensure new components are properly exported
- **Nationality dropdowns**: Build process includes all required assets

### Asset Path Issues
- Check Vite configuration for asset handling
- Verify public directory structure
- Ensure proper import paths in React components

## Success Indicators

When everything works correctly, you should see:
1. ✅ Build completes without errors
2. ✅ Server starts on port 5000
3. ✅ Application loads in browser
4. ✅ Test components display correctly
5. ✅ Dropdown components populate with data

---

*This guide is based on actual troubleshooting experience and should be updated as new issues are discovered and resolved.*