# AI Provider Troubleshooting Guide

## Rate Limit Detection (Enhanced 2026-02-11)

The MCP server now shows **clear warnings** when AI providers hit rate limits.

### Example Log Output

**When Moonshot Kimi hits rate limit (429):**
```
[AI] ⚠️  RATE LIMIT HIT - Moonshot Kimi 2.5
[AI] Provider: moonshot-kimi (openai-compatible)
[AI] Status: 429 - Rate limit exceeded
[AI] Details: {"error":{"message":"Your account org-... request reached organization TPD rate limit, current: 1500009"}}
[AI] 💡 Tip: Disable this provider or wait for limit reset (usually 24h)
[AI] ⚠️  Moonshot Kimi 2.5 RATE LIMITED — falling back to next provider
[AI] ✅ Success using: Groq Llama 3.3 70B (groq-llama)
```

**When all providers fail:**
```
[AI] Groq Llama 3.3 70B failed, trying next: Network error
[AI] Ollama GPT-OSS 20B failed, trying next: Connection refused
[AI] ❌ All providers failed - no response generated
```

## Quick Fixes

### 1. Disable Rate-Limited Provider

**Via Admin Dashboard:**
1. Open `http://localhost:3002/admin/rainbow`
2. Go to **Settings** tab
3. Find the rate-limited provider
4. Toggle **Enabled** to OFF
5. Click **Save Settings**

**Via Config File:**
Edit `mcp-server/src/assistant/data/settings.json`:
```json
{
  "id": "moonshot-kimi",
  "enabled": false,  // ← Change to false
  "priority": 10     // ← Lower priority
}
```

### 2. Change Provider Priority

Lower the rate-limited provider's priority so it's only used as a last resort:

```json
{
  "id": "moonshot-kimi",
  "priority": 10  // ← Higher number = lower priority
}
```

## Provider Status Check

Check which providers are configured:

```bash
curl -s http://localhost:3002/api/rainbow/settings | jq '.ai.providers[] | {id, name, enabled, priority}'
```

## Common Rate Limits

| Provider | Free Tier Limit | Reset Period |
|----------|-----------------|--------------|
| Moonshot Kimi | 1.5M tokens/day | 24 hours (midnight UTC) |
| Groq | 14,400 requests/day | Rolling 24h |
| Ollama Cloud | Unknown | N/A (very high) |
| OpenRouter (free) | Varies by model | Varies |

## Logs Location

When the MCP server runs, check console output for AI provider logs:
- All logs start with `[AI]`
- Rate limit warnings have `⚠️` emoji
- Successes have `✅` emoji
- Complete failures have `❌` emoji

## Prevention

1. **Set proper priority order** (lowest number = highest priority):
   - Priority 1-2: Unlimited providers (Ollama, high-limit Groq)
   - Priority 3-5: Medium-limit providers
   - Priority 6+: Low-limit or premium providers

2. **Enable multiple providers** as fallbacks

3. **Monitor logs** for rate limit warnings

## API Key Issues

If a provider shows "no key" in startup logs:

```
[AI] Provider "Moonshot Kimi 2.5" (priority 0) — no key
```

**Fix:**
1. Check `.env` file has the required key:
   ```
   MOONSHOT_API_KEY=your-key-here
   ```
2. Restart the server: `npm run dev`

## See Also

- [mcp-server/README.md](README.md) - AI provider configuration
- [Settings JSON](src/assistant/data/settings.json) - Provider definitions
