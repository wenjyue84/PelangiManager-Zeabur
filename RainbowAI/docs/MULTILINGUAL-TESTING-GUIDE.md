# Multilingual Testing Guide

**Created**: 2026-02-13
**Purpose**: Fast concurrent testing of Rainbow AI's multilingual capabilities

---

## 🚀 Quick Start

```bash
# Start the server first
cd RainbowAI
npm run dev

# In another terminal, run the tests
node scripts/test-multilingual-concurrent.js
```

**Expected output:**
```
🌈 Rainbow AI Multilingual Concurrent Testing

API Base: http://localhost:3002/api/rainbow
Concurrency: 5 tests at a time
Total tests: 18

✅ Server is running

Running 18 tests in 4 batches (concurrency: 5)

Batch 1/4: Running 5 tests... ✅ 5 | ⚠️  0 | ❌ 0
Batch 2/4: Running 5 tests... ✅ 5 | ⚠️  0 | ❌ 0
Batch 3/4: Running 5 tests... ✅ 5 | ⚠️  0 | ❌ 0
Batch 4/4: Running 3 tests... ✅ 3 | ⚠️  0 | ❌ 0

============================================================
📊 TEST SUMMARY
============================================================
Total:     18 tests
✅ Passed:  18 (100.0%)
⚠️  Warned:  0
❌ Failed:  0
⏱️  Duration: 5.8s
============================================================

📄 Report saved to:
   reports/autotest/rainbow-multilingual-2026-02-13-09-42-02.html

🌐 View in browser:
   http://localhost:3002/reports/autotest/rainbow-multilingual-2026-02-13-09-42-02.html
```

---

## 📊 What Gets Tested

### 18 Tests Across 4 Categories

**1. T2 Fuzzy Matching (4 tests)** - Keyword matching
- ✅ Malay: `password wifi`, `berapa harga`
- ✅ Chinese: `wifi密码`, `多少钱`

**2. T3 Semantic Matching (6 tests)** - Colloquial phrases
- ✅ Malay: `apa khabar`, `terima kasih`, `bila boleh check in`
- ✅ Chinese: `你好`, `谢谢`, `有没有房`

**3. Common Intents (6 tests)** - High-frequency queries
- ✅ Booking, directions, checkout (Malay + Chinese)

**4. Code-Switching (2 tests)** - Mixed language
- ✅ `wifi password apa`, `nak book untuk 2 nights`

---

## ⚡ Performance

**Speed Comparison:**

| Method | Duration | Tests | Speed |
|--------|----------|-------|-------|
| **Automated Script** | **6s** | **18** | **3 tests/sec** |
| Manual Chat Simulator | ~5 min | 18 | 0.06 tests/sec |
| Built-in Autotest | ~60s | 58 | 1 test/sec |

**Why it's faster:**
- ✅ Concurrent execution (5 tests at a time)
- ✅ Direct API calls (no browser overhead)
- ✅ Focused test suite (18 vs 58 tests)

---

## 🎯 Use Cases

### Daily Development
```bash
# Quick sanity check after code changes
node scripts/test-multilingual-concurrent.js
```

### Before Deployment
```bash
# Full test with higher concurrency
node scripts/test-multilingual-concurrent.js --concurrency 10
```

### CI/CD Pipeline
```bash
# Exit code 0 = all pass, 1 = failures
node scripts/test-multilingual-concurrent.js || exit 1
```

### After Updating Examples
```bash
# Test after editing intent-examples.json
node scripts/test-multilingual-concurrent.js
```

---

## 📄 Report Features

The HTML report includes:

✅ **Summary Cards**
- Total tests, passed, warnings, failed
- Average response time

✅ **Grouped by Category**
- T2_FUZZY, T3_SEMANTIC, COMMON_INTENTS, CODE_SWITCHING

✅ **Detailed Test Results**
- Guest message (highlighted in blue)
- Rainbow response (with full text)
- Metadata (intent, tier, model, confidence, time)
- Validation rules (✓ pass, ⚠ warn, ✗ fail)

✅ **Color-Coded Status**
- 🟢 Green = All passed
- 🟡 Yellow = Warnings (non-critical failures)
- 🔴 Red = Failed (critical failures)

✅ **Saved in History**
- Appears in Testing tab's History list
- Accessible via web: `http://localhost:3002/reports/autotest/`

---

## 🔧 Advanced Options

### Adjust Concurrency
```bash
# Run 10 tests at once (faster, but more load)
node scripts/test-multilingual-concurrent.js --concurrency 10

# Run 1 test at a time (slower, but safer)
node scripts/test-multilingual-concurrent.js --concurrency 1
```

### Test Different Port
```bash
# If server is on different port
node scripts/test-multilingual-concurrent.js --port 3001
```

### Combine Options
```bash
node scripts/test-multilingual-concurrent.js --port 3002 --concurrency 8
```

---

## 📝 Adding Custom Tests

Edit `scripts/test-multilingual-concurrent.js`:

```javascript
MULTILINGUAL_TEST_SCENARIOS.push({
  id: 'my-test',
  name: 'My Custom Test',
  category: 'CUSTOM',
  language: 'ms', // or 'zh', 'en', 'mixed'
  messages: [{ text: 'your test message here' }],
  expectedIntent: 'wifi',
  expectedTier: ['T2', 'T3'],
  validate: [{ turn: 0, rules: [
    { type: 'not_empty', critical: true },
    { type: 'contains_any', values: ['wifi', 'password'], critical: true },
    { type: 'intent_match', expected: 'wifi', critical: false },
    { type: 'response_time', max: 10000, critical: false }
  ]}]
});
```

**Available Validation Rules:**

| Rule | Purpose | Example |
|------|---------|---------|
| `not_empty` | Response must not be empty | Required |
| `contains_any` | Response must contain keywords | `['wifi', 'password']` |
| `not_contains` | Response must NOT contain text | `['error', 'undefined']` |
| `response_time` | Response time limit (ms) | `max: 10000` |
| `intent_match` | Correct intent classification | `expected: 'wifi'` |

---

## 🐛 Troubleshooting

### Server Not Running
```
❌ Cannot connect to server at http://localhost:3002
```

**Fix:**
```bash
cd RainbowAI
npm run dev
```

### All Tests Failing

**Check:**
1. Server is running: `netstat -ano | findstr ":3002"`
2. API endpoint: `curl http://localhost:3002/api/health`
3. No errors in server logs

### Low Pass Rate (<80%)

**Investigate:**
1. Which category is failing? (T2, T3, Common, Code-Switching)
2. Check intent classification accuracy
3. Verify semantic matcher initialized
4. Test individual messages in Chat Simulator

### Report Not Saved

**Check:**
1. Write permissions: `mkdir -p reports/autotest`
2. Disk space available
3. Look for error messages at end of test run

---

## 📊 Interpreting Results

### Pass Rate Targets

| Pass Rate | Status | Action |
|-----------|--------|--------|
| 90-100% | ✅ Excellent | Ready for production |
| 80-89% | ⚠️ Good | Review warnings |
| 70-79% | ⚠️ Fair | Investigate failures |
| <70% | ❌ Poor | Debug issues |

### Common Failure Patterns

**T2 Fuzzy Failures** → Missing keywords in `intent-keywords.json`
**T3 Semantic Failures** → Missing examples in `intent-examples.json`
**Intent Mismatch** → Ambiguous message OR missing training data
**Response Time >10s** → LLM provider slow OR fallback chain triggered

---

## 🔄 Comparison with Existing Tools

### vs Chat Simulator (Manual)
- ✅ **50× faster** (6s vs 5min)
- ✅ **Reproducible** (same tests every time)
- ✅ **Automated validation** (no eyeballing)
- ✅ **Saved reports** (history tracking)

### vs Built-in Autotest
- ✅ **Focused** on multilingual testing
- ✅ **Faster** (concurrent by default)
- ✅ **Language-specific** validation rules
- ✅ **T2/T3 tier** validation
- ✅ **CLI-ready** (CI/CD integration)
- ⚠️ **Fewer tests** (18 vs 58)

---

## 🎓 Learning from Results

### Good T2 Match (Keyword)
```
Guest: "password wifi"
Intent: wifi (T2 Fuzzy)
Confidence: 95%
```
→ Keyword matching working perfectly

### Good T3 Match (Semantic)
```
Guest: "apa khabar"
Intent: greeting (T3 Semantic)
Confidence: 82%
```
→ Semantic embeddings working

### T4/T5 Fallback (LLM)
```
Guest: "nak book untuk 2 nights"
Intent: booking (LLM)
Confidence: 90%
```
→ Mixed language → LLM needed (expected)

### Intent Mismatch
```
Guest: "谢谢"
Intent: wifi (WRONG - should be thanks)
```
→ **Action**: Add more Chinese examples for "thanks" intent

---

## 📚 Related Documentation

- **Script Source**: `scripts/test-multilingual-concurrent.js`
- **Skill Manifest**: `.claude/skills/test-rainbow-multilingual/SKILL.md`
- **Implementation Summary**: `docs/LANGUAGE-DETECTION-IMPLEMENTATION-SUMMARY.md`
- **Intent Examples**: `src/assistant/data/intent-examples.json`
- **Intent Keywords**: `src/assistant/data/intent-keywords.json`
- **Autotest Scenarios**: `src/public/js/data/autotest-scenarios.js`

---

## 🚀 Next Steps

1. **Run baseline test** to establish current performance
2. **Add custom tests** for your specific use cases
3. **Schedule regular runs** (e.g., after each deployment)
4. **Track trends** by comparing reports over time
5. **Integrate with CI/CD** to catch regressions early

---

**End of Guide**
