# Pelangi MCP Server

HTTP-based MCP server for PelangiManager hostel management system.

## Features

- **10 Core Tools** for guest, capsule, dashboard, and problem management
- **HTTP Transport** for remote MCP clients (Claude Code, Cursor, Antigravity, clawdbot)
- **REST API Integration** calls existing PelangiManager API on Zeabur
- **WhatsApp Export** for maintenance issues (Periskope integration)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

3. Configure environment variables:
   ```
   PELANGI_API_URL=https://pelangi.zeabur.app
   PELANGI_API_TOKEN=your-admin-token-here
   MCP_SERVER_PORT=3001
   NODE_ENV=production
   ```

## Development

```bash
npm run dev
```

Server runs on `http://localhost:3001`

## Production

```bash
npm run build
npm start
```

## Testing

Health check:
```bash
curl http://localhost:3001/health
```

List tools:
```bash
curl http://localhost:3001/mcp -H "Content-Type: application/json" -d '{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}'
```

Call tool:
```bash
curl http://localhost:3001/mcp -H "Content-Type: application/json" -d '{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "pelangi_get_occupancy",
    "arguments": {}
  },
  "id": 2
}'
```

## Available Tools

### Guest Management
- `pelangi_list_guests` - List all checked-in guests
- `pelangi_get_guest` - Get guest by ID
- `pelangi_search_guests` - Search guests

### Capsule Operations
- `pelangi_list_capsules` - List all capsules
- `pelangi_get_occupancy` - Get occupancy stats
- `pelangi_check_availability` - Get available capsules

### Dashboard & Reporting
- `pelangi_get_dashboard` - Bulk dashboard data
- `pelangi_get_overdue_guests` - List overdue guests

### Problem Tracking
- `pelangi_list_problems` - List maintenance problems
- `pelangi_export_whatsapp_issues` - WhatsApp-formatted issues

## MCP Client Configuration

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

## Deployment

Deploy to Zeabur:
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Port: 3001
- Environment variables: Set in Zeabur dashboard

## License

ISC
