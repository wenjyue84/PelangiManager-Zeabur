# Agent Build Instructions — Rainbow AI Speed Optimization

## Project Setup
```bash
cd C:\Users\Jyue\Desktop\Projects\PelangiManager-Zeabur

# Install all dependencies
npm install
cd RainbowAI && npm install && cd ..
```

## Running All Servers
```bash
# Start all 3 servers (recommended)
start-all.bat

# Or individually:
# Terminal 1: Frontend (port 3000)
npm run dev

# Terminal 2: Backend API (port 5000) — started by npm run dev

# Terminal 3: Rainbow AI MCP (port 3002)
cd RainbowAI && npm run dev
```

## Running Tests
```bash
# Intent accuracy test (main test for AI pipeline changes)
node RainbowAI/scripts/intent-accuracy-test.js

# TypeScript type checking
npm run check

# Push DB schema changes
npm run db:push
```

## Key File Locations

### Server Infrastructure
- `RainbowAI/src/index.ts` — MCP server entry (port 3002)
- `server/index.ts` — Backend entry (port 5000)
- `RainbowAI/src/lib/http-client.ts` — Axios client (MCP → Backend)
- `RainbowAI/src/lib/db.ts` — Database connection pool
- `vite.config.ts` — Proxy configuration

### AI Message Pipeline
- `RainbowAI/src/assistant/message-router.ts` — Main pipeline
- `RainbowAI/src/assistant/fuzzy-matcher.ts` — T2 intent matching (regexes here)
- `RainbowAI/src/assistant/semantic-matcher.ts` — T3 semantic matching
- `RainbowAI/src/assistant/knowledge-base.ts` — KB loading + system prompt building
- `RainbowAI/src/assistant/conversation-logger.ts` — DB logging (N+1 issue here)
- `RainbowAI/src/assistant/conversation.ts` — Conversation state management

### Database Schema
- `shared/schema-tables.ts` — All table definitions + indexes
- Run `npm run db:push` after any changes

### Frontend Dashboard
- `RainbowAI/src/public/rainbow-admin.html` — Main HTML (script loading here)
- `RainbowAI/src/public/js/modules/dashboard.js` — Dashboard tab
- `RainbowAI/src/public/js/modules/real-chat-core.js` — Real Chat (polling here)
- `RainbowAI/src/public/js/modules/performance-stats.js` — Performance tab
- `RainbowAI/src/public/js/modules/dashboard-helpers.js` — Activity stream + speed test
- `RainbowAI/src/public/js/core/tabs.js` — Tab switching logic

### Admin API Routes
- `RainbowAI/src/routes/admin/index.ts` — Route mounting + cache headers
- `RainbowAI/src/routes/admin/feedback.ts` — Feedback stats (4 queries → optimize)
- `RainbowAI/src/routes/admin/intent-analytics.ts` — Intent accuracy + bulk update

## Verification Commands
```bash
# Check compression headers
curl -H 'Accept-Encoding: gzip' -I http://localhost:3002/api/rainbow/status

# Check feedback stats
curl http://localhost:3002/api/rainbow/feedback/stats

# Check conversations API
curl http://localhost:3002/api/rainbow/conversations

# Run intent accuracy
node RainbowAI/scripts/intent-accuracy-test.js
```

## Key Learnings
- Update this section when you learn new patterns
- Document any gotchas encountered during optimization
