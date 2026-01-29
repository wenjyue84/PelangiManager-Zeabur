# Pelangi MCP Server - Quick Start

## 🚀 Local Development

```bash
# Install dependencies
cd mcp-server
npm install

# Configure environment
cp .env.example .env
# Edit .env and add PELANGI_API_TOKEN

# Start dev server
npm run dev

# Test
curl http://localhost:3001/health
./test-mcp.sh
```

## 📦 Zeabur Deployment

**1. Environment Variables (Required):**
```
PELANGI_API_URL=https://pelangi.zeabur.app
PELANGI_API_TOKEN=<get-from-pelangi-settings>
MCP_SERVER_PORT=3001
NODE_ENV=production
```

**2. Build Configuration:**
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Port: 3001

**3. Get API Token:**
1. Open https://pelangi.zeabur.app
2. Go to Settings → Security → API Tokens
3. Generate admin token
4. Copy to PELANGI_API_TOKEN

## 🔌 MCP Client Setup

**Claude Code (`~/.claude/mcp_settings.json`):**
```json
{
  "mcpServers": {
    "pelangi": {
      "transport": "http",
      "url": "https://mcp.pelangi.zeabur.app/mcp"
    }
  }
}
```

## 🛠️ Available Tools

**Guests:**
- `pelangi_list_guests` - List guests
- `pelangi_get_guest` - Get guest by ID
- `pelangi_search_guests` - Search guests

**Capsules:**
- `pelangi_list_capsules` - List capsules
- `pelangi_get_occupancy` - Get stats
- `pelangi_check_availability` - Available capsules

**Dashboard:**
- `pelangi_get_dashboard` - Bulk data
- `pelangi_get_overdue_guests` - Overdue list

**Maintenance:**
- `pelangi_list_problems` - Active issues
- `pelangi_export_whatsapp_issues` - WhatsApp format

## 🧪 Quick Test

```bash
# Health check
curl https://mcp.pelangi.zeabur.app/health

# List tools
curl -X POST https://mcp.pelangi.zeabur.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Get occupancy
curl -X POST https://mcp.pelangi.zeabur.app/mcp \
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

## 📚 Documentation

- `README.md` - Full setup guide
- `DEPLOYMENT.md` - Deployment steps
- `IMPLEMENTATION-SUMMARY.md` - Technical details
- `test-mcp.sh` - Automated tests
