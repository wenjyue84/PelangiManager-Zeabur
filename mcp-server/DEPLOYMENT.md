# Pelangi MCP Server - Deployment Guide

## Phase 1: Minimal HTTP MCP Server (COMPLETE ✅)

### What's Implemented

**10 Core Tools:**
1. `pelangi_list_guests` - List all checked-in guests with pagination
2. `pelangi_get_guest` - Get specific guest details by ID
3. `pelangi_search_guests` - Search guests by name, capsule, or nationality
4. `pelangi_list_capsules` - List all capsules with status
5. `pelangi_get_occupancy` - Get current occupancy statistics
6. `pelangi_check_availability` - Get available capsules for assignment
7. `pelangi_get_dashboard` - Bulk fetch dashboard data
8. `pelangi_get_overdue_guests` - List guests past expected checkout date
9. `pelangi_list_problems` - List active maintenance problems
10. `pelangi_export_whatsapp_issues` - Export maintenance issues in WhatsApp format

**Architecture:**
- HTTP-based JSON-RPC server
- Calls existing PelangiManager API on Zeabur
- Ready for remote MCP clients

### Local Testing (Verified ✅)

```bash
# Health check
curl http://localhost:3001/health

# List all tools
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Call a tool (example: get occupancy)
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{
      "name":"pelangi_get_occupancy",
      "arguments":{}
    },
    "id":2
  }'
```

### Zeabur Deployment Steps

#### 1. Prepare Zeabur Project

1. Go to Zeabur dashboard
2. Create new service from Git repository
3. Select `mcp-server` directory as root path

#### 2. Configure Build Settings

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm start
```

**Port:** 3001

#### 3. Set Environment Variables

In Zeabur dashboard, add these environment variables:

```
PELANGI_API_URL=https://pelangi.zeabur.app
PELANGI_API_TOKEN=<your-admin-token-from-pelangi-settings>
MCP_SERVER_PORT=3001
NODE_ENV=production
```

**Getting the API Token:**
1. Open PelangiManager app: https://pelangi.zeabur.app
2. Go to Settings → Security → API Tokens
3. Generate a new admin token
4. Copy and paste into `PELANGI_API_TOKEN`

#### 4. Deploy

1. Push code to repository
2. Zeabur will auto-deploy
3. Assign domain (e.g., `mcp.pelangi.zeabur.app`)
4. Verify deployment:
   ```bash
   curl https://mcp.pelangi.zeabur.app/health
   ```

### MCP Client Configuration

#### Claude Code

Add to `~/.claude/mcp_settings.json`:

```json
{
  "mcpServers": {
    "pelangi": {
      "transport": "http",
      "url": "https://mcp.pelangi.zeabur.app/mcp",
      "headers": {
        "Content-Type": "application/json"
      }
    }
  }
}
```

#### Cursor

Add to Cursor settings:

```json
{
  "mcp": {
    "servers": {
      "pelangi": {
        "url": "https://mcp.pelangi.zeabur.app/mcp"
      }
    }
  }
}
```

#### n8n Workflows

Use HTTP Request node:

- **URL:** `https://mcp.pelangi.zeabur.app/mcp`
- **Method:** POST
- **Body:**
  ```json
  {
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "pelangi_list_guests",
      "arguments": {}
    },
    "id": 1
  }
  ```

### Verification Checklist

- [x] Server builds successfully
- [x] Server starts on port 3001
- [x] Health endpoint returns 200 OK
- [x] Tools/list returns all 10 tools
- [x] Tools can be called successfully
- [ ] Deployed to Zeabur
- [ ] Domain configured
- [ ] API token set
- [ ] Accessible from remote clients
- [ ] Integrated with n8n
- [ ] Integrated with Periskope/WhatsApp

### Next Steps (Phase 2)

**Direct Storage Access:**
1. Import StorageFactory from main project
2. Add write operations (check-in, checkout, update)
3. Implement high-level workflows
4. Expand to 30 tools

**Timeline:** 4-6 days

### Troubleshooting

**Issue: 500 Error on tool calls**
- Check PELANGI_API_TOKEN is set correctly
- Verify PelangiManager API is accessible
- Check API token has admin permissions

**Issue: Connection refused**
- Verify server is running: `curl http://localhost:3001/health`
- Check port 3001 is not blocked by firewall
- Ensure correct port in environment variables

**Issue: Tool returns empty data**
- Check PelangiManager database has data
- Verify API endpoints are working
- Test API directly: `curl https://pelangi.zeabur.app/api/occupancy`
