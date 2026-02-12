# Rainbow AI Dashboard - Quick Reference Card

> **Print this page** or keep it open for quick access while using the dashboard

---

## 🎨 Navigation at a Glance

| Section | Icon | Color | Purpose | Key Tabs |
|---------|------|-------|---------|----------|
| **Connect** | 📱 | Blue | Setup WhatsApp | Dashboard, Accounts, Status |
| **Train** | 🧠 | Green | Teach AI | Understanding, Responses, Routing |
| **Test** | 🧪 | Yellow | Verify behavior | Chat Simulator, Tests |
| **Monitor** | 📊 | Gray | Track & configure | Performance, Settings |
| **Help** | ❓ | Purple | Documentation | User Guide |

---

## ⚡ Quick Actions

### Adding WhatsApp Number
1. 📱 Connect → WhatsApp Accounts → **+ Add Number**
2. Enter phone number (e.g., `167052004` for 016-705 2004)
3. Scan QR code with WhatsApp app (Settings → Linked Devices)
4. Wait for green ✓ Connected status

### Adding Keywords for Intent
1. 🧠 Train → Understanding → **▶ Expand T2 Section**
2. Select intent from left panel (e.g., "wifi")
3. Type keyword → Press Enter (e.g., "password", "wifi", "internet")
4. Click **Save Keywords**
5. Test in console at top

### Creating Static Reply
1. 🧠 Train → Responses → Select intent
2. Switch language tab (EN/MS/ZH)
3. Type reply text (use *bold*, _italic_, emojis 😊)
4. Click **Save**
5. Test in Chat Simulator

### Testing AI Response
1. 🧪 Test → Chat Simulator
2. Type test message → Send
3. Check intent detected and tier used (T1-T4)
4. Verify response accuracy

---

## 🎯 4-Tier Intent System

| Tier | Icon | Speed | Use For | Example |
|------|------|-------|---------|---------|
| **T1** | 🚨 | 0.1ms | Emergencies | `/fire\|kebakaran\|着火/i` |
| **T2** | ⚡ | 1ms | Keywords | "wifi", "password", "internet" |
| **T3** | 🔬 | 50ms | Variations | "what's the wifi", "how to connect" |
| **T4** | 🧠 | 100-500ms | Complex queries | Automatic fallback |

**Remember:** Always add T2 keywords first! They're fastest and most reliable.

---

## 🔧 Common Tasks

### Change WiFi Password Response
1. 🧠 Train → Responses → Select "wifi_inquiry"
2. Edit text: `Our WiFi is XYZ, password: ABC123`
3. Click **Save**

### Add New Intent
1. 🧠 Train → Smart Routing → **+ Add Intent**
2. Enter intent name (e.g., `laundry_inquiry`)
3. Set action (static_reply / llm_reply / workflow)
4. Add T2 keywords: "laundry", "wash", "clothes"
5. Create static reply if needed

### View Today's Performance
1. 📊 Monitor → Performance
2. Check:
   - Total messages today
   - Average response time
   - Intent distribution chart
   - Tier usage (optimize if T4 > 20%)

### Export Logs for Debugging
1. 📊 Monitor → Settings → **Export Logs**
2. Save to file → Share with support

---

## ⚠️ Troubleshooting Quick Fixes

| Problem | Quick Fix |
|---------|-----------|
| **WhatsApp not connecting** | 📱 Connect → Accounts → Click "Reconnect" → Scan new QR |
| **Bot not responding** | 📱 Connect → System Status → Check all services are "Online" |
| **Wrong intent detected** | 🧠 Train → Understanding → Add more T2 keywords for correct intent |
| **Slow responses** | Use more static replies (🧠 Train → Responses) instead of AI |
| **"Unknown intent" errors** | Lower T4 threshold in 📊 Monitor → Settings (default 60% → try 50%) |

---

## 💡 Pro Tips

✅ **Keep Intent Manager sections collapsed** - Reduces visual clutter, expand only when editing
✅ **Test in Chat Simulator first** - Always verify before deploying to production
✅ **Monitor T4 usage** - High T4 = need more keywords/examples in T2/T3
✅ **Use static replies for FAQ** - WiFi, check-in times, location (instant response)
✅ **Add multilingual keywords** - EN: "wifi", MS: "kata laluan", ZH: "密码"
✅ **Update Knowledge Base weekly** - Keep prices, hours, and info current

---

## 📞 Emergency Contacts

| Issue Type | Action |
|------------|--------|
| **WhatsApp down** | 📱 Connect → System Status → Check Baileys service |
| **Server offline** | Check `http://localhost:3002/health` or contact admin |
| **Data loss** | Configs auto-saved to `.rainbow-kb/` - restore from there |
| **Bug report** | Screenshot + error message → GitHub Issues |

---

## 🔑 Keyboard Shortcuts

| Key Combo | Action |
|-----------|--------|
| `Ctrl+R` | Reload Config (same as Reload Config button) |
| `Ctrl+Shift+I` | Open browser DevTools (for debugging) |
| `Esc` | Close all dropdowns |

---

## 📊 Performance Benchmarks

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Response Time | < 500ms | 500ms - 2s | > 2s |
| T4 Usage % | < 10% | 10% - 30% | > 30% |
| Uptime | > 99% | 95% - 99% | < 95% |
| Error Rate | < 1% | 1% - 5% | > 5% |

---

## 🎓 Learning Path (First Week)

### Day 1: Setup
- Add WhatsApp number
- Scan QR code
- Verify connection

### Day 2: Train Basic Intents
- Add T2 keywords for: greeting, wifi, pricing, location
- Create static replies for each
- Test in Chat Simulator

### Day 3: Knowledge Base
- Add facility information (WiFi, amenities, hours)
- Add house rules (quiet hours, smoking)
- Add location/directions

### Day 4: Advanced Intents
- Add T3 examples for natural variations
- Configure Smart Routing (booking, escalate workflows)
- Test multi-turn conversations

### Day 5: Optimization
- Monitor Performance metrics
- Identify high T4 usage queries
- Add T2 keywords to reduce T4 fallback

### Day 6-7: Fine-tuning
- Update responses based on guest feedback
- Add edge case handling
- Configure AI provider fallbacks

---

## 📖 Full Documentation

- **Interface Guide:** `mcp-server/docs/INTERFACE-GUIDE.md` (25+ pages)
- **In-app Help:** ❓ Help tab (comprehensive with examples)
- **API Reference:** `mcp-server/README.md` (MCP tools, endpoints)
- **Project Root:** Main README for architecture overview

---

**Version:** 2.0 (Interface Redesign - 2026-02-12)
**Print this page** for quick desk reference! 🖨️
