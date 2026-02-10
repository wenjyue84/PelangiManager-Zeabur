# MCP Server Deployment Guide - Frankfurt

This guide ensures the **Web App**, **MCP Server**, and **AI Assistant** are all deployed successfully to Zeabur Frankfurt.

## 📊 Current Status

✅ **Main Web App**: Deployed and running
   - URL: https://pelangi-manager-2.zeabur.app
   - Status: RUNNING

❌ **MCP Server**: Not yet deployed
   - Needs to be deployed as separate service
   - Port: 3001
   - Contains AI Assistant functionality

## 🎯 Deployment Options

### Option 1: Deploy via Zeabur Dashboard (Recommended - Most Reliable)

#### Step 1: Add New Service

1. Go to Frankfurt project: https://dash.zeabur.com/projects/6988ba46ea91e8e06ef1420c
2. Click **"Add Service"** button
3. Select **"Git"** as the source
4. Choose repository: **wenjyue84/PelangiManager-Zeabur**
5. Click **"Deploy"**

#### Step 2: Configure Root Directory

After service is created:

1. Go to service **Settings**
2. Find **"Root Directory"** setting
3. Set to: `mcp-server`
4. Save changes

#### Step 3: Configure Build Settings (if needed)

Zeabur should auto-detect the Dockerfile. If not:

1. Go to **Build & Deploy** settings
2. Build Command: `npm install && npm run build`
3. Start Command: `npm start`
4. Port: `3001`

#### Step 4: Set Environment Variables

Go to **Variables** tab and add:

```env
PELANGI_API_URL=https://pelangi-manager-2.zeabur.app
PELANGI_API_TOKEN=<your-api-token-from-local-env>
MCP_SERVER_PORT=3001
NODE_ENV=production
NVIDIA_API_KEY=<your-nvidia-api-key>
GROQ_API_KEY=<your-groq-api-key>
OPENROUTER_API_KEY=<your-openrouter-api-key>
```

**Get your actual API keys from**: `mcp-server/.env` file

⚠️ **IMPORTANT**: After setting variables, click **"Redeploy"**

#### Step 5: Get MCP Server Domain

1. After deployment completes (2-3 minutes)
2. Zeabur will assign a domain like: `pelangi-mcp-server-xxx.zeabur.app`
3. Note this domain for testing

#### Step 6: Update Main Web App

If the main web app needs to connect to the MCP server:

1. Go to main web app service settings
2. Add environment variable:
   ```
   MCP_SERVER_URL=https://[mcp-server-domain]
   ```
3. Redeploy main web app

---

### Option 2: Deploy via API Script (Advanced)

Run the deployment script:

```bash
node scripts/deploy-mcp-server-frankfurt.js
```

This will:
- Create a new service in Frankfurt project
- Configure GitHub repository with `mcp-server` root directory
- Set all environment variables
- Trigger deployment

**Note**: This is experimental. If it fails, use Option 1 (Dashboard).

---

## 🧪 Verification Steps

After deployment completes:

### 1. Check Service Status

```bash
# Via dashboard
Visit: https://dash.zeabur.com/projects/6988ba46ea91e8e06ef1420c

# Via script
node scripts/check-service-status.js
```

Expected: Service shows **RUNNING** status

### 2. Test MCP Server Health Endpoint

```bash
# Replace [domain] with your MCP server domain
curl https://[mcp-server-domain]/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "pelangi-mcp-server",
  "timestamp": "2026-02-10T..."
}
```

### 3. Test AI Assistant

```bash
curl -X POST https://[mcp-server-domain]/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, what can you help me with?",
    "conversationId": "test-123"
  }'
```

Expected: JSON response with AI-generated message

### 4. Test MCP Tools

```bash
# Test guest lookup
curl -X POST https://[mcp-server-domain]/api/mcp/tools/search_guests \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
```

Expected: JSON response with guest search results

### 5. Test Main Web App Integration

Visit: https://pelangi-manager-2.zeabur.app/admin/rainbow

Expected: AI assistant interface loads and can send messages

---

## 🔧 Troubleshooting

### Issue: Service keeps crashing

**Check runtime logs** in Zeabur dashboard for error messages.

Common issues:
- Missing environment variables
- Wrong PELANGI_API_URL (should match main app domain)
- Database connection issues (if DATABASE_URL is set)

**Fix**:
1. Verify all environment variables are set correctly
2. Ensure `PELANGI_API_URL` points to Frankfurt main app: `https://pelangi-manager-2.zeabur.app`
3. Redeploy after fixing

### Issue: 502 Bad Gateway

**Possible causes**:
- Service still starting up (wait 1-2 minutes)
- Service crashed (check logs)
- Port mismatch (ensure MCP_SERVER_PORT=3001)

**Fix**:
1. Check service status in dashboard
2. Review runtime logs
3. Verify PORT environment variable

### Issue: AI Assistant not responding

**Check**:
1. NVIDIA_API_KEY is set correctly
2. GROQ_API_KEY is set (fallback)
3. Network connectivity from Zeabur to external APIs

**Fix**:
1. Test API keys locally first
2. Check MCP server logs for AI request errors
3. Verify firewall/network settings

### Issue: Cannot connect to main web app API

**Check**:
1. PELANGI_API_URL is correct: `https://pelangi-manager-2.zeabur.app`
2. PELANGI_API_TOKEN matches the token in main app
3. Main app is RUNNING

**Fix**:
1. Verify main app health: `curl https://pelangi-manager-2.zeabur.app/api/health`
2. Update PELANGI_API_URL if needed
3. Check PELANGI_API_TOKEN in main app settings

---

## 📝 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frankfurt Project                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────┐      ┌───────────────────┐   │
│  │   Main Web App       │      │   MCP Server      │   │
│  │  pelangi-manager     │◄────►│ pelangi-mcp-      │   │
│  │                      │      │   server          │   │
│  │  - React Frontend    │      │                   │   │
│  │  - Express Backend   │      │ - AI Assistant    │   │
│  │  - PostgreSQL        │      │ - MCP Tools       │   │
│  │  - Guest Management  │      │ - WhatsApp        │   │
│  │                      │      │ - Knowledge Base  │   │
│  │  Port: 8080 (auto)   │      │                   │   │
│  │                      │      │ Port: 3001        │   │
│  └──────────────────────┘      └───────────────────┘   │
│           ▲                              ▲              │
│           │                              │              │
└───────────┼──────────────────────────────┼──────────────┘
            │                              │
            │                              │
     ┌──────▼──────┐              ┌────────▼────────┐
     │   Users     │              │   AI APIs       │
     │  (Browser)  │              │ - NVIDIA NIM    │
     │             │              │ - Groq          │
     │             │              │ - OpenRouter    │
     └─────────────┘              └─────────────────┘
```

**Communication Flow:**
1. User accesses main web app
2. Main web app serves AI interface at `/admin/rainbow`
3. Frontend connects to MCP server for AI features
4. MCP server queries main app API for guest data
5. MCP server calls AI APIs (NVIDIA/Groq) for responses

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Frankfurt project has 2 services (main app + MCP server)
- [ ] Both services show **RUNNING** status
- [ ] Main web app health endpoint returns 200 OK
- [ ] MCP server health endpoint returns 200 OK
- [ ] AI assistant interface loads at `/admin/rainbow`
- [ ] Can send test message to AI assistant
- [ ] AI assistant responds correctly
- [ ] MCP tools work (guest search, capsule lookup)
- [ ] Environment variables are set on both services
- [ ] No errors in service logs

---

## 🚀 Next Steps After Deployment

1. **Test thoroughly**: Try all AI assistant features
2. **Monitor logs**: Check for any errors or warnings
3. **Update documentation**: Note the MCP server domain
4. **Configure custom domain** (optional): Add custom domain for MCP server
5. **Set up monitoring**: Configure health checks and alerts
6. **Backup configuration**: Save environment variables securely

---

## 📚 Related Documentation

- Zeabur Dashboard: https://dash.zeabur.com
- MCP Server Code: `./mcp-server/`
- Main Web App: `./client/` and `./server/`
- Deployment Logs: Available in Zeabur dashboard
- Troubleshooting: See `.claude/skills/zeabur-deployment/SKILL.md`

---

**Last Updated**: 2026-02-10
**Project**: PelangiManager-Zeabur
**Region**: Frankfurt (Developer Tier)
