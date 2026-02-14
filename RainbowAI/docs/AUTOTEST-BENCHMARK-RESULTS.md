# Rainbow AI Autotest Benchmark Results

**Date**: 2026-02-13
**Test Suite**: 56 autotest scenarios from `autotest-scenarios.js`
**Script**: `scripts/test-autotest-optimized.js`
**Pattern**: Rolling queue (worker pool) - maintains constant N tests running

## Executive Summary

**✅ Optimal Setting: Concurrency 2**
- **Pass Rate**: 69.6% (39 passed, 2 warned, 15 failed)
- **Duration**: 293.1 seconds (~5.2s per test)
- **Speed**: 0.19 tests/sec

**❌ Higher Concurrency = Rate Limiting**
- Concurrency 4: Only 17.9% pass rate
- Concurrency 6+: 0% pass rate (instant failures)

## Full Benchmark Results

| Concurrency | Duration | Pass Rate | Tests/Sec | Passed | Warned | Failed | Notes |
|------------|----------|-----------|-----------|--------|--------|--------|-------|
| **2** ⭐ | 293.1s   | **69.6%** | 0.19      | 39     | 2      | 15     | **Optimal** |
| 4 | 22.8s    | 17.9%     | 2.46      | 10     | 1      | 45     | Rate limited |
| 6 | 0.1s     | 0.0%      | 708.86    | 0      | 0      | 56     | All instant failures |
| 8 | 0.1s     | 0.0%      | 583.33    | 0      | 0      | 56     | All instant failures |
| 10 | 0.1s     | 0.0%      | 700.00    | 0      | 0      | 56     | All instant failures |
| 12 | 0.1s     | 0.0%      | 666.67    | 0      | 0      | 56     | All instant failures |

## Key Findings

### 1. Rate Limiting Threshold
- **Below concurrency 4**: Acceptable (some requests succeed)
- **At concurrency 4**: Heavy rate limiting (75% failure rate)
- **Above concurrency 6**: Complete rejection (100% failure rate)

### 2. Provider Behavior
- Groq Llama 3.3 70B (primary provider in settings.json) has aggressive rate limits
- Higher concurrency triggers instant rejection before requests even start
- The 0.1s duration at concurrency 6+ indicates immediate HTTP 429 responses

### 3. Rolling Queue Performance
The rolling queue pattern works correctly:
- Maintains constant N tests running at all times
- Starts new test immediately when one completes
- Real-time progress tracking shows worker utilization

The bottleneck is **not** the queue implementation, but LLM provider rate limits.

## Recommendations

### For Production Use
```bash
# Use default (concurrency 2 for best reliability)
node scripts/test-autotest-optimized.js

# View benchmark anytime
node scripts/test-autotest-optimized.js --benchmark
```

### For Development Testing
If you need faster feedback during development, consider:
1. **Test fewer scenarios** - use multilingual test (18 tests, 6s)
2. **Use concurrency 3** - slightly faster than 2, may still be reliable
3. **Add delays between batches** - artificial throttling to stay under rate limit

### Rate Limit Solutions
To improve pass rates at higher concurrency:
1. **Switch primary provider** to one with higher limits (e.g., Ollama Cloud models)
2. **Implement retry logic** with exponential backoff
3. **Add rate limit headers** inspection (X-RateLimit-Remaining)
4. **Use multiple API keys** with round-robin rotation

## Usage Examples

### Run with Optimal Settings
```bash
cd RainbowAI
node scripts/test-autotest-optimized.js
# Uses concurrency 2 (default)
# Takes ~5 minutes
# 69.6% pass rate
```

### Run Benchmark (Test All Levels)
```bash
node scripts/test-autotest-optimized.js --benchmark
# Tests concurrency: 2, 4, 6, 8, 10, 12
# Takes ~6 minutes total
# Provides comparison table
```

### Force Different Concurrency
```bash
# Try concurrency 3 (untested, may be sweet spot)
node scripts/test-autotest-optimized.js --concurrency 3

# Ultra-slow but reliable (if 2 still fails)
node scripts/test-autotest-optimized.js --concurrency 1
```

## Technical Details

### Winner Selection Algorithm
The script was updated to prioritize **pass rate** over speed:

```javascript
// Find best: prioritize pass rate, then speed
const best = results.reduce((best, curr) => {
  // Prioritize higher pass rate
  if (parseFloat(curr.passRate) > parseFloat(best.passRate)) return curr;
  if (parseFloat(curr.passRate) < parseFloat(best.passRate)) return best;
  // If pass rates equal, choose faster duration
  return curr.duration < best.duration ? curr : best;
});
```

**Previous Bug**: Script selected concurrency 6 as "winner" based on speed (0.1s) alone, ignoring 0% pass rate. This has been fixed.

### Rolling Queue Implementation
```javascript
async function runTestsWithQueue(scenarios, concurrency, showProgress = true) {
  const results = [];
  let completed = 0;
  let running = 0;
  let queued = [...scenarios];

  return new Promise((resolve) => {
    function startNext() {
      if (queued.length === 0 && running === 0) {
        resolve(results);
        return;
      }

      // Start tests up to concurrency limit
      while (running < concurrency && queued.length > 0) {
        const scenario = queued.shift();
        running++;

        runTest(scenario).then(result => {
          results.push(result);
          running--;
          completed++;

          // Real-time progress
          process.stdout.write(`\r[${completed}/${total}] ...`);

          // Immediately start next test
          startNext();
        });
      }
    }
    startNext();
  });
}
```

## Related Files

- **Script**: `RainbowAI/scripts/test-autotest-optimized.js`
- **Test Data**: `RainbowAI/src/public/js/data/autotest-scenarios.js`
- **Reports**: `RainbowAI/reports/autotest/rainbow-autotest-optimized-{timestamp}.html`
- **API Config**: `RainbowAI/src/assistant/data/settings.json` (provider configuration)

## Comparison: Autotest Scripts

| Script | Tests | Pattern | Default Concurrency | Speed | Use Case |
|--------|-------|---------|---------------------|-------|----------|
| `test-multilingual-concurrent.js` | 18 | Batch-based | 5 | ~6s | Quick multilingual verification |
| `test-autotest-concurrent.js` | 56 | Batch-based | 8 | ~50s | Full suite, batch processing |
| `test-autotest-optimized.js` ⭐ | 56 | Rolling queue | 2 | ~293s | Full suite, optimal reliability |

## Future Improvements

1. **Adaptive concurrency** - start high, reduce if rate limited
2. **Provider health check** - test rate limit before benchmark
3. **Retry logic** - exponential backoff for failed requests
4. **Multiple API keys** - round-robin to increase effective rate limit
5. **Historical trending** - track pass rate over time, detect regressions
6. **Per-intent metrics** - which intents fail most at high concurrency

---

**Last Updated**: 2026-02-13
**Tested By**: Claude Code (automated benchmark)
**Rainbow AI Version**: Latest (7-tier intent pipeline)
