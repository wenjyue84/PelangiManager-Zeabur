# 🚀 Ready to Deploy - Pelangi MCP Server

## ✅ Status: Code Pushed to GitHub

**Repository:** https://github.com/wenjyue84/PelangiManager-Zeabur
**Branch:** main
**Commits:** 2 commits with MCP server code + deployment docs

---

## 📋 Quick Deploy Steps

### Step 1: Get API Token (5 minutes)

**Option A: Via PelangiManager UI**
1. Go to https://pelangi.zeabur.app
2. Login as admin
3. Settings → Security → Generate API Token
4. Copy the token

**Option B: Via Command Line**
```bash
curl -X POST https://pelangi.zeabur.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pelangi.com","password":"admin123"}' \
  | jq -r '.token'
```

### Step 2: Deploy to Zeabur (10 minutes)

1. **Login:** https://zeabur.com
2. **Create Service:**
   - Click "Add Service" → "Git Service"
   - Select repository: `PelangiManager-Zeabur`
   - **IMPORTANT:** Set root directory to `mcp-server`
3. **Set Environment Variables:**
   ```
   PELANGI_API_URL=https://pelangi.zeabur.app
   PELANGI_API_TOKEN=<paste-your-token>
   MCP_SERVER_PORT=3001
   NODE_ENV=production
   ```
4. **Configure Domain:**
   - Generate domain or add custom
   - Suggested: `mcp-pelangi.zeabur.app`
5. **Deploy:**
   - Click Deploy or wait for auto-deploy
   - Monitor build logs
   - Wait for "Running" status

### Step 3: Verify Deployment (2 minutes)

**Test health endpoint:**
```bash
curl https://YOUR-DOMAIN.zeabur.app/health
```

**Expected response:**
```json
{"status":"ok","service":"pelangi-mcp-server","version":"1.0.0"}
```

**Test tools count:**
```bash
curl -X POST https://YOUR-DOMAIN.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' \
  | jq '.result.tools | length'
```

**Expected:** `19`

---

## 💬 MCP Client Configuration Prompts

**IMPORTANT:** Replace `YOUR-DOMAIN` with your actual Zeabur domain!

Example: `https://mcp-pelangi.zeabur.app/mcp`

### 🤖 For CLAWDBOT (Copy & Paste)

**Simple Version:**
```
Add MCP server:
- Name: pelangi-mcp
- Type: HTTP
- URL: https://YOUR-DOMAIN.zeabur.app/mcp

This provides 19 tools for hostel management (guests, capsules, problems, analytics).
```

**Detailed Version:**
```
Configure a new MCP server for PelangiManager hostel system.

**Server Configuration:**
- Server ID: pelangi-mcp
- Transport Protocol: HTTP
- Endpoint URL: https://YOUR-DOMAIN.zeabur.app/mcp
- Content-Type: application/json
- Authentication: None (server-side token)

**Server Capabilities:**
This MCP server provides 19 tools organized in 4 categories:

1. **Guest Management (6 tools):**
   - pelangi_list_guests - List checked-in guests
   - pelangi_get_guest - Get guest by ID number
   - pelangi_search_guests - Search guests by criteria
   - pelangi_checkin_guest - Check in new guest
   - pelangi_checkout_guest - Check out guest
   - pelangi_bulk_checkout - Bulk checkout (overdue/today/all)

2. **Capsule Operations (7 tools):**
   - pelangi_list_capsules - List all capsules with status
   - pelangi_get_occupancy - Get occupancy statistics
   - pelangi_check_availability - Get available capsules
   - pelangi_capsule_utilization - Utilization analytics
   - pelangi_mark_cleaned - Mark capsule as cleaned
   - pelangi_bulk_mark_cleaned - Mark all capsules cleaned
   - pelangi_get_dashboard - Bulk dashboard data

3. **Problem Tracking (3 tools):**
   - pelangi_list_problems - List active problems
   - pelangi_get_problem_summary - Problem summary
   - pelangi_export_whatsapp_issues - WhatsApp-formatted issues

4. **Analytics & Reporting (3 tools):**
   - pelangi_get_overdue_guests - List overdue guests
   - pelangi_guest_statistics - Guest statistics with nationality breakdown
   - pelangi_export_guests_csv - Export guest data as CSV

Please add this MCP server to my configuration and confirm when ready.
```

### 💻 For CURSOR (Copy & Paste)

```
I want to add an MCP server to Cursor for hostel management.

Server details:
- Name: pelangi-mcp
- Type: HTTP MCP server
- Endpoint: https://YOUR-DOMAIN.zeabur.app/mcp
- Protocol: JSON-RPC 2.0

This server provides 19 tools for:
1. Guest management (check-in, checkout, search)
2. Capsule operations (occupancy, availability, cleaning)
3. Problem tracking (maintenance issues)
4. Analytics (statistics, reports, CSV exports)

Please add this to my Cursor MCP configuration.

The configuration should use HTTP transport with the endpoint URL above.
No authentication headers are needed as the API token is configured server-side.

Let me know once it's configured so I can test it.
```

### 🔵 For CLAUDE CODE (Copy & Paste)

```
I need you to configure an MCP server for PelangiManager (hostel management system).

Configuration details:
- Server name: pelangi-mcp
- Transport: HTTP
- URL: https://YOUR-DOMAIN.zeabur.app/mcp
- No authentication headers needed (token is server-side)

Add this to my ~/.claude/mcp_settings.json file.

The server provides 19 tools for managing:
- Guests (check-in, checkout, search, statistics)
- Capsules (occupancy, availability, cleaning)
- Problems (maintenance tracking)
- Analytics (reports, CSV exports)

Please confirm the configuration is added correctly.
```

---

## 🧪 Verification Prompts (After Configuration)

**Test in any MCP client:**

**Test 1 - List Tools:**
```
Show me all tools from pelangi-mcp server
```
Expected: List of 19 tools

**Test 2 - Get Occupancy:**
```
What's the current occupancy at Pelangi Hostel?
```
Expected: Occupancy statistics

**Test 3 - List Guests:**
```
Show me all currently checked-in guests
```
Expected: List of 9 guests (or current number)

**Test 4 - Statistics:**
```
Give me guest statistics including nationality breakdown
```
Expected: Statistics with nationality data

**Test 5 - Export:**
```
Export checked-in guests to CSV format
```
Expected: CSV data

---

## 📊 What You Get

**19 Tools Total:**
- **10 Read Tools** (Phase 1): Safe queries, no data modification
- **9 Write/Analytics Tools** (Phase 2): CRUD operations + reporting

**Capabilities:**
✅ Guest check-in/checkout automation
✅ Capsule availability and cleaning management
✅ Occupancy monitoring and analytics
✅ Maintenance problem tracking
✅ CSV data exports
✅ WhatsApp-formatted reports

**Integration Ready:**
✅ Claude Code
✅ Cursor
✅ Clawdbot
✅ Antigravity
✅ n8n workflows
✅ Periskope WhatsApp

---

## 📖 Documentation Files

All documentation is in `mcp-server/` directory:

**Deployment:**
- `ZEABUR-DEPLOYMENT.md` - Complete deployment guide
- `DEPLOY-CHECKLIST.md` - Quick checklist
- `READY-TO-DEPLOY.md` - This file

**Configuration:**
- `MCP-CLIENT-CONFIGS.md` - Detailed client configs
- `CLIENT-PROMPTS.txt` - Plain text prompts

**Reference:**
- `README.md` - Tool documentation
- `QUICK-START.md` - Quick start guide
- `PHASE2-SUMMARY.md` - Implementation details

---

## 🎯 Next Steps

1. ⏳ **Deploy to Zeabur** (follow Step 2 above)
2. ⏳ **Get your deployment URL** (e.g., `mcp-pelangi.zeabur.app`)
3. ⏳ **Replace `YOUR-DOMAIN` in prompts above**
4. ⏳ **Send prompts to clawdbot, Cursor, Claude Code**
5. ⏳ **Test with verification prompts**
6. ✅ **Start using MCP server!**

---

## 💡 Pro Tips

**For Best Results:**
1. Use descriptive queries: "Show me all guests" works better than "list guests"
2. Try natural language: "What's the occupancy?" instead of technical jargon
3. Combine tools: "Get statistics and export to CSV"
4. Save common workflows as templates in your MCP client

**Common Use Cases:**
- Morning routine: Check occupancy, list checkouts, review cleaning needs
- Guest operations: Check-in new guests, checkout completed stays
- Weekly reports: Get statistics, export CSV, analyze trends
- Maintenance: Track problems, update cleaning status

---

## 🆘 Need Help?

**Deployment Issues:**
- See `ZEABUR-DEPLOYMENT.md` → Troubleshooting section
- Check Zeabur build logs for errors
- Verify environment variables are set correctly

**Configuration Issues:**
- See `MCP-CLIENT-CONFIGS.md` → Troubleshooting section
- Verify URL is correct and includes `/mcp` endpoint
- Test health endpoint first: `curl YOUR-DOMAIN/health`

**Tool Errors:**
- "No token provided" = Regenerate API token in PelangiManager
- "API Error" = Check PelangiManager is running
- Slow responses = May need to upgrade Zeabur plan

---

**🎉 You're ready to deploy!**

Total setup time: ~20 minutes
Code status: ✅ Committed and pushed
Documentation: ✅ Complete
Tests: ✅ All passing locally

Just follow the steps above and you'll have a working MCP server in production! 🚀
