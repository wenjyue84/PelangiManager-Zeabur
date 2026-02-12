# Rainbow AI Dashboard - Interface Guide

> **Last Updated:** 2026-02-12
> **Version:** 2.0 (Major Redesign)

## Overview

The Rainbow AI Dashboard is your command center for managing the WhatsApp AI assistant. The new interface features a **categorical 4-section navigation** designed for intuitive workflow and reduced cognitive load.

---

## Navigation Structure

### Design Philosophy

The navigation is organized by **user workflow phases** rather than technical categories:

1. **📱 Connect** - Set up your WhatsApp connection
2. **🧠 Train** - Teach the AI how to respond
3. **🧪 Test** - Verify AI behavior
4. **📊 Monitor** - Track performance and configure
5. **❓ Help** - Access comprehensive documentation (standalone)

Each section uses color coding for quick visual identification:
- **Blue** (Connect) - Foundation layer
- **Green** (Train) - Learning layer
- **Yellow** (Test) - Validation layer
- **Gray** (Monitor) - Operations layer
- **Purple** (Help) - Support layer

---

## Section 1: 📱 Connect (Blue)

**Purpose:** Establish and monitor WhatsApp connections

### Dashboard
- **Real-time Overview**: WhatsApp connection status, today's message count, AI provider health
- **Quick Actions**: One-click access to common tasks
- **System Health**: Visual indicators for all critical services

### WhatsApp Accounts
- **Instance Management**: Add/remove WhatsApp numbers
- **QR Code Scanning**: Direct phone linking with 60-second QR codes
- **Connection Status**: Live monitoring with auto-reconnect
- **Multi-instance Support**: Manage multiple WhatsApp numbers simultaneously

### System Status
- **Service Health**: Express server, Baileys, AI providers
- **Error Logs**: Real-time error tracking with filtering
- **Performance Metrics**: Response times, uptime, resource usage

**Typical Workflow:**
1. Start here on first use
2. Add WhatsApp number
3. Scan QR code
4. Verify connection (green status indicator)
5. Move to Train section

---

## Section 2: 🧠 Train (Green)

**Purpose:** Configure AI intelligence and behavior

### Understanding (Intent Detection)

**4-Tier Intent Classification System:**

| Tier | Name | Speed | When to Use | UI State |
|------|------|-------|-------------|----------|
| T1 🚨 | Emergency Regex | ~0.1ms | Critical emergencies (fire, theft, ambulance) | Collapsible |
| T2 ⚡ | Keywords (Fuzzy) | ~1ms | Direct keywords, abbreviations, common queries | Collapsible |
| T3 🔬 | Training Examples | ~50ms | Natural language variations, paraphrases | Collapsible |
| T4 🧠 | LLM Fallback | ~100-500ms | Complex queries, edge cases | Collapsible |

**Collapsible Sections:**
- Each tier has an **▶ Expand** button to show configuration
- Click **▼ Collapse** to hide when not editing
- **Default state:** All sections collapsed (clean interface)
- **Test Console:** Always visible at top for quick testing

**How to Use:**
1. Click **▶ Expand** on the tier you want to configure
2. Add keywords/examples/patterns
3. Click **Save** for that tier
4. Use **Test Console** to verify
5. Click **▼ Collapse** when done

### Responses (Static Messages)

Pre-written responses for instant replies:
- **Greeting messages** - Welcome guests
- **WiFi information** - Network credentials
- **Check-in times** - Operational hours
- **Location details** - Directions and maps
- **Emergency contacts** - Reception numbers

**Formatting:**
- Supports WhatsApp markdown (bold, italic)
- Emoji-friendly 😊
- Line breaks preserved
- Link support for maps/websites

### Smart Routing (Intent Actions)

Define what happens when each intent is detected:
- **Static Reply** - Send pre-written message (fastest)
- **LLM Reply** - Generate AI response from Knowledge Base
- **Start Booking** - Trigger booking workflow
- **Escalate** - Notify staff immediately
- **Forward Payment** - Send payment instructions

**Phase Categorization:**
- **Inquiry** - Information requests
- **Booking** - Reservation process
- **Support** - Problem resolution
- **Emergency** - Critical situations

---

## Section 3: 🧪 Test (Yellow)

**Purpose:** Validate AI behavior before production deployment

### Chat Simulator

Interactive testing environment:
- **Real-time Testing**: Type messages, see AI responses instantly
- **Intent Visualization**: Shows which tier matched and confidence score
- **Multi-turn Conversations**: Test contextual understanding
- **Language Switching**: Verify English/Malay/Chinese support

**Use Cases:**
- Test new keywords before adding to production
- Verify static messages render correctly
- Check intent routing logic
- Validate knowledge base content

### Automated Tests

Unit test suite for Rainbow AI:
- **161 unit tests** across 13 test suites (~2 seconds runtime)
- **Coverage reports** for code quality
- **Regression testing** after changes
- **CI/CD integration** ready

**Test Categories:**
- Intent classification accuracy
- Knowledge base search
- Conversation state management
- Emergency detection
- Language routing

---

## Section 4: 📊 Monitor (Gray)

**Purpose:** Track performance and configure system settings

### Performance

Real-time analytics dashboard:
- **Response Time Metrics**: Average, P95, P99 latencies
- **Intent Distribution**: Which intents are most common
- **Tier Usage**: How often each tier (T1-T4) matches
- **AI Provider Stats**: Success rates, fallback frequency
- **Message Volume**: Hourly/daily conversation trends

**Optimization Insights:**
- High T4 usage → Add more T2 keywords/T3 examples
- Slow responses → Use more static replies
- High fallback rate → Improve intent training

### Settings

System configuration:
- **AI Providers**: Configure OpenAI, Anthropic, Gemini, NVIDIA, Ollama
- **API Keys**: Secure credential management
- **Confidence Thresholds**: T2/T3/T4 matching sensitivity (default: 80%/70%/60%)
- **Rate Limiting**: Prevent abuse (default: 10 messages/minute/user)
- **Logging**: Enable debug mode, export logs

**Advanced Settings:**
- Context window size (default: 20 messages)
- Repeat intent detection (default: 5 minutes)
- Emergency keywords (always matched first)
- Staff phone numbers (exempt from rate limits)

---

## Section 5: ❓ Help (Purple) - Standalone

**Purpose:** Comprehensive user documentation

### Quick Navigation

Table of contents with anchor links:
- Getting Started
- WhatsApp Setup
- 4-Tier Intent System
- Intent Manager Guide (step-by-step)
- Knowledge Base Training
- Static Messages
- AI Provider Settings
- Workflow Management
- Troubleshooting

### Content Structure

Each help section includes:
- **Overview** - What it is and why it matters
- **Step-by-step Guide** - How to use it
- **Best Practices** - Pro tips for optimization
- **Troubleshooting** - Common issues and fixes
- **Visual Examples** - Screenshots and diagrams (where applicable)

### Search & Accessibility

- **Anchor Links**: Jump to specific sections (`#help-getting-started`)
- **Collapsible Cards**: Click headers to expand/collapse
- **Color-coded Alerts**: Success (green), Warning (yellow), Error (red), Info (blue)

---

## Key Improvements Over Previous Interface

### Before (Old Design)
- Single-level tab navigation (cluttered)
- Help buried in dropdown menu
- Intent manager always expanded (overwhelming)
- No workflow grouping
- Mixed technical and user-facing terminology

### After (New Design - 2026-02-12)
✅ **Categorical navigation** by workflow phase (Connect → Train → Test → Monitor)
✅ **Standalone Help tab** for easy access
✅ **Collapsible Intent Manager** (T1-T4 sections) - reduces visual clutter
✅ **Color-coded sections** for quick visual identification
✅ **User-friendly terminology** (e.g., "Understanding" instead of "Intent Classification")
✅ **Progressive disclosure** - show only what's needed
✅ **Mobile-responsive** design with Tailwind CSS

---

## Usage Patterns

### First-Time Setup
1. 📱 **Connect** → Dashboard → Add WhatsApp number → Scan QR
2. 🧠 **Train** → Understanding → Add T2 keywords for common queries
3. 🧠 **Train** → Responses → Add static messages for greetings/WiFi/FAQ
4. 🧪 **Test** → Chat Simulator → Verify responses
5. 📊 **Monitor** → Settings → Configure AI providers

### Daily Operations
1. 📱 **Connect** → Dashboard → Check message volume and status
2. 📊 **Monitor** → Performance → Review response times
3. 🧠 **Train** → Responses → Update static messages as needed
4. 🧪 **Test** → Automated Tests → Run regression tests

### Optimization Workflow
1. 📊 **Monitor** → Performance → Identify high T4 usage
2. 🧠 **Train** → Understanding → Add T2 keywords for those queries
3. 🧪 **Test** → Chat Simulator → Verify improvements
4. 📊 **Monitor** → Performance → Confirm T4 usage dropped

### Troubleshooting Flow
1. 📱 **Connect** → System Status → Check service health
2. ❓ **Help** → Troubleshooting → Find common issues
3. 📊 **Monitor** → Settings → Adjust configuration
4. 🧪 **Test** → Chat Simulator → Validate fix

---

## Technical Details

### Frontend Architecture
- **Single Page Application (SPA)** with vanilla JavaScript
- **Template-based rendering** - each tab loads from `/public/templates/tabs/*.html`
- **Modular JS** - functionality split into `/public/js/modules/*.js`
- **State management** via `state.js` (no framework dependencies)
- **Tailwind CSS** for styling (CDN-loaded)

### API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/rainbow/config` | GET/POST | Retrieve/update configuration |
| `/api/rainbow/intents` | GET/POST | Manage intent routing |
| `/api/rainbow/kb/*` | GET/POST | Knowledge base CRUD |
| `/api/rainbow/tests/run` | POST | Run automated tests |
| `/api/rainbow/whatsapp/qr` | POST | Generate QR code |
| `/api/rainbow/whatsapp/status` | GET | Check connection status |

### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile: iOS Safari 14+, Android Chrome 90+

---

## Best Practices

### Intent Management
✅ **Keep sections collapsed** when not editing (clean UI)
✅ **Add T2 keywords first** for fast matching
✅ **Use T3 examples** for natural language variations
✅ **Reserve T1 regex** for critical emergencies only
✅ **Test frequently** after every change

### Knowledge Base
✅ **Use clear headings** for organization
✅ **Write in conversational tone** (friendly, helpful)
✅ **Include specific details** (prices, times, phone numbers)
✅ **Update regularly** when information changes
✅ **Split into topic files** for faster loading

### Performance
✅ **Prefer static replies** for instant responses
✅ **Monitor T4 usage** - high usage means insufficient training
✅ **Set appropriate thresholds** - balance accuracy vs coverage
✅ **Use faster AI providers** (Gemini) for simple queries

---

## Migration Guide (Old → New Interface)

If you're upgrading from the old interface:

1. **Navigation:** Help is now a standalone purple tab (was inside Monitor dropdown)
2. **Intent Manager:** Click **▶ Expand** to edit each tier (all collapsed by default)
3. **Knowledge Base:** Files are now granular (pricing.md, wifi.md, etc.) instead of monolithic
4. **Tabs:** Grouped into 4 workflow sections (Connect, Train, Test, Monitor)
5. **Terminology:** User-friendly names (e.g., "Understanding" vs "Intent Classification")

**No data migration needed** - all existing configurations are preserved.

---

## Support & Feedback

- **Documentation:** This guide + in-app Help tab
- **GitHub Issues:** Report bugs at [PelangiManager-Zeabur Issues](https://github.com/yourusername/PelangiManager-Zeabur/issues)
- **Developer Console:** Press F12 for browser DevTools (check for errors)
- **Logs:** Available in Monitor → Settings → Export Logs

**Last Updated:** 2026-02-12 (Major interface redesign)
