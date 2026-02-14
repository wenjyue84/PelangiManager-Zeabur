#!/usr/bin/env node
/**
 * Optimized Concurrent Autotest with Rolling Queue
 *
 * Uses a worker pool pattern: maintains N tests running at all times.
 * As soon as one finishes, immediately starts the next one.
 * Can auto-benchmark to find optimal concurrency level.
 *
 * Benchmark Results (2026-02-13, 56 tests):
 *   Concurrency 2: 69.6% pass rate (293s) ⭐ OPTIMAL
 *   Concurrency 4: 17.9% pass rate (23s) - rate limited
 *   Concurrency 6+: 0% pass rate (instant failures)
 *
 * Usage:
 *   node scripts/test-autotest-optimized.js                    # Use default (2) ⭐
 *   node scripts/test-autotest-optimized.js --concurrency 3    # Test specific level
 *   node scripts/test-autotest-optimized.js --benchmark        # Re-run benchmark
 *
 * See docs/AUTOTEST-BENCHMARK-RESULTS.md for full analysis
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line args
const args = process.argv.slice(2);
const PORT = args.find(a => a.startsWith('--port='))?.split('=')[1] || '3002';
const CONCURRENCY = parseInt(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] || '2');
const BENCHMARK_MODE = args.includes('--benchmark');
const API_BASE = `http://localhost:${PORT}/api/rainbow`;

// Load autotest scenarios
const scenariosPath = path.join(__dirname, '../src/public/js/data/autotest-scenarios.js');
const scenariosContent = fs.readFileSync(scenariosPath, 'utf8');
const scenariosMatch = scenariosContent.match(/const AUTOTEST_SCENARIOS = (\[[\s\S]*?\]);/);
if (!scenariosMatch) {
  console.error('❌ Failed to parse autotest scenarios');
  process.exit(1);
}
const AUTOTEST_SCENARIOS = eval(scenariosMatch[1]);

// Validation functions
function validateRule(rule, response, intent, responseTime) {
  const result = { rule: rule.type, passed: false, message: '' };

  switch (rule.type) {
    case 'not_empty':
      result.passed = response && response.trim().length > 0;
      result.message = result.passed ? 'Response is non-empty' : 'Response is empty';
      break;

    case 'contains_any':
      const lowerResponse = response.toLowerCase();
      const matches = rule.values.filter(v => lowerResponse.includes(v.toLowerCase()));
      result.passed = matches.length > 0;
      result.message = result.passed
        ? `Matched: ${matches.join(', ')}`
        : `None of [${rule.values.join(', ')}] found`;
      break;

    case 'not_contains':
      const lowerResponseNeg = response.toLowerCase();
      const foundBad = rule.values.filter(v => lowerResponseNeg.includes(v.toLowerCase()));
      result.passed = foundBad.length === 0;
      result.message = result.passed
        ? `None of [${rule.values.join(', ')}] found (good)`
        : `Found forbidden: ${foundBad.join(', ')}`;
      break;

    case 'response_time':
      result.passed = responseTime <= rule.max;
      result.message = result.passed
        ? `${responseTime}ms ≤ ${rule.max}ms`
        : `${responseTime}ms > ${rule.max}ms`;
      break;

    case 'intent_match':
      result.passed = intent === rule.expected;
      result.message = result.passed
        ? `Intent matched: ${intent}`
        : `Expected ${rule.expected}, got ${intent}`;
      break;

    default:
      result.message = `Unknown rule type: ${rule.type}`;
  }

  return result;
}

// Run single test
async function runTest(scenario) {
  const startTime = Date.now();

  try {
    const response = await fetch(`${API_BASE}/preview/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: scenario.messages[0].text,
        history: []
      })
    });

    if (!response.ok) {
      return {
        scenario,
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        responseTime: Date.now() - startTime
      };
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    // Validate rules
    const validationResults = [];
    let criticalPass = true;
    let totalPass = true;

    for (const validation of scenario.validate) {
      for (const rule of validation.rules) {
        const result = validateRule(
          rule,
          data.message || '',
          data.intent || '',
          responseTime
        );

        validationResults.push({
          ...result,
          critical: rule.critical
        });

        if (!result.passed) {
          totalPass = false;
          if (rule.critical) {
            criticalPass = false;
          }
        }
      }
    }

    return {
      scenario,
      success: criticalPass,
      warning: !totalPass && criticalPass,
      response: data,
      responseTime,
      validationResults
    };

  } catch (error) {
    return {
      scenario,
      success: false,
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Rolling concurrent queue - maintains N tests running at all times
 * As soon as one finishes, immediately starts the next one
 */
async function runTestsWithQueue(scenarios, concurrency, showProgress = true) {
  const results = [];
  let completed = 0;
  let running = 0;
  let queued = [...scenarios]; // Copy array
  const total = scenarios.length;

  return new Promise((resolve) => {
    function startNext() {
      if (queued.length === 0 && running === 0) {
        // All done
        resolve(results);
        return;
      }

      // Start tests up to concurrency limit
      while (running < concurrency && queued.length > 0) {
        const scenario = queued.shift();
        running++;

        // Run test and handle completion
        runTest(scenario).then(result => {
          results.push(result);
          running--;
          completed++;

          // Progress indicator
          if (showProgress) {
            const passed = results.filter(r => r.success && !r.warning).length;
            const warned = results.filter(r => r.warning).length;
            const failed = results.filter(r => !r.success).length;
            const percent = ((completed / total) * 100).toFixed(0);

            process.stdout.write(`\r[${completed}/${total}] ${percent}% | ✅ ${passed} ⚠️ ${warned} ❌ ${failed} | Running: ${running}/${concurrency}   `);
          }

          // Start next test
          startNext();
        }).catch(error => {
          console.error(`\n❌ Fatal error in test:`, error);
          running--;
          completed++;
          startNext();
        });
      }
    }

    // Kick off initial batch
    startNext();
  });
}

// Generate HTML report (same as before)
function generateHTMLReport(results, concurrency, duration) {
  const timestamp = new Date();
  const passed = results.filter(r => r.success && !r.warning).length;
  const warned = results.filter(r => r.warning).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);
  const avgTime = (results.reduce((sum, r) => sum + r.responseTime, 0) / total / 1000).toFixed(1);

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rainbow AI Autotest Report (Optimized)</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:900px;margin:0 auto;padding:24px;color:#333;background:#fafafa}
  h1{font-size:24px;margin:0 0 4px}
  .summary{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:20px 0}
  .summary-card{background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:16px;text-align:center}
  .summary-card .num{font-size:28px;font-weight:700}
  .summary-card .label{font-size:12px;color:#888}
  .test-card{border:1px solid #e5e5e5;border-radius:12px;margin-bottom:16px;overflow:hidden}
  .test-header{padding:12px 16px;display:flex;align-items:center;gap:12px}
  .test-body{padding:16px}
  .badge{color:#fff;padding:2px 10px;border-radius:8px;font-size:12px;font-weight:700}
  .pass-badge{background:#16a34a}
  .warn-badge{background:#ca8a04}
  .fail-badge{background:#dc2626}
  .pass-bg{background:#f0fdf4}
  .warn-bg{background:#fefce8}
  .fail-bg{background:#fef2f2}
  @media print{body{padding:12px} .summary{gap:8px}}
</style>
</head>
<body>
  <h1>🌈 Rainbow AI Autotest Report (Optimized Queue)</h1>
  <p style="color:#888;font-size:14px">${timestamp.toLocaleString()} | Pass rate: <b>${passRate}%</b> | Concurrency: ${concurrency}</p>

  <div class="summary">
    <div class="summary-card"><div class="num" style="color:#333">${total}</div><div class="label">Total</div></div>
    <div class="summary-card"><div class="num" style="color:#16a34a">${passed}</div><div class="label">Passed</div></div>
    <div class="summary-card"><div class="num" style="color:#ca8a04">${warned}</div><div class="label">Warnings</div></div>
    <div class="summary-card"><div class="num" style="color:#dc2626">${failed}</div><div class="label">Failed</div></div>
    <div class="summary-card"><div class="num" style="color:#6366f1">${duration.toFixed(1)}s</div><div class="label">Duration</div></div>
  </div>
`;

  // Group by category and render (abbreviated for brevity)
  const byCategory = {};
  results.forEach(r => {
    const cat = r.scenario.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(r);
  });

  Object.entries(byCategory).forEach(([category, catResults]) => {
    html += `\n  <h2 style="font-size:18px;margin:24px 0 12px;color:#666">${category}</h2>\n`;
    catResults.forEach(result => {
      const status = !result.success ? 'fail' : result.warning ? 'warn' : 'pass';
      html += `  <div class="test-card">
    <div class="test-header ${status}-bg">
      <span class="badge ${status}-badge">${status.toUpperCase()}</span>
      <b>${result.scenario.name}</b>
      <span style="font-size:12px;color:#888;margin-left:auto">${(result.responseTime / 1000).toFixed(1)}s</span>
    </div>
  </div>\n`;
    });
  });

  html += `\n</body>\n</html>`;
  return html;
}

// Benchmark different concurrency levels
async function runBenchmark() {
  console.log('🔬 BENCHMARK MODE: Testing different concurrency levels\n');
  console.log('This will run the full test suite multiple times to find the optimal setting.');
  console.log('Each run tests all 56 scenarios. This may take several minutes...\n');

  const levels = [2, 4, 6, 8, 10, 12];
  const results = [];

  for (const level of levels) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing concurrency: ${level}`);
    console.log('='.repeat(60));

    const startTime = Date.now();
    const testResults = await runTestsWithQueue(AUTOTEST_SCENARIOS, level, true);
    const duration = (Date.now() - startTime) / 1000;

    const passed = testResults.filter(r => r.success && !r.warning).length;
    const warned = testResults.filter(r => r.warning).length;
    const failed = testResults.filter(r => !r.success).length;
    const passRate = ((passed / testResults.length) * 100).toFixed(1);

    results.push({
      concurrency: level,
      duration,
      passed,
      warned,
      failed,
      passRate,
      testsPerSec: (testResults.length / duration).toFixed(2)
    });

    console.log(`\n✅ Complete: ${duration.toFixed(1)}s | Pass rate: ${passRate}% | Speed: ${(testResults.length / duration).toFixed(1)} tests/sec`);
  }

  // Print comparison table
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 BENCHMARK RESULTS');
  console.log('='.repeat(80));
  console.log('Concurrency | Duration | Pass Rate | Tests/Sec | Passed | Warned | Failed');
  console.log('-'.repeat(80));

  results.forEach(r => {
    const line = `${String(r.concurrency).padEnd(11)} | ${String(r.duration.toFixed(1) + 's').padEnd(8)} | ${String(r.passRate + '%').padEnd(9)} | ${String(r.testsPerSec).padEnd(9)} | ${String(r.passed).padEnd(6)} | ${String(r.warned).padEnd(6)} | ${r.failed}`;
    console.log(line);
  });

  // Find best: prioritize pass rate, then speed
  const best = results.reduce((best, curr) => {
    // Prioritize higher pass rate
    if (parseFloat(curr.passRate) > parseFloat(best.passRate)) return curr;
    if (parseFloat(curr.passRate) < parseFloat(best.passRate)) return best;
    // If pass rates equal, choose faster duration
    return curr.duration < best.duration ? curr : best;
  });

  console.log('='.repeat(80));
  console.log(`\n🏆 OPTIMAL: Concurrency ${best.concurrency} (${best.duration.toFixed(1)}s)`);
  console.log(`   Pass rate: ${best.passRate}% ⭐`);
  console.log(`   Speed: ${best.testsPerSec} tests/sec`);
  console.log(`   Results: ${best.passed} passed, ${best.warned} warned, ${best.failed} failed`);
  console.log(`\n💡 Recommended: Use --concurrency ${best.concurrency} for best reliability\n`);

  return best.concurrency;
}

// Main function
async function main() {
  console.log('🌈 Rainbow AI Autotest (Optimized Rolling Queue)\n');

  // Check server
  try {
    const healthCheck = await fetch(`http://localhost:${PORT}/health`);
    if (!healthCheck.ok) {
      console.error(`❌ Server not responding at http://localhost:${PORT}`);
      process.exit(1);
    }
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error(`❌ Cannot connect to server at http://localhost:${PORT}`);
    process.exit(1);
  }

  // Benchmark mode or normal run
  if (BENCHMARK_MODE) {
    await runBenchmark();
    return;
  }

  // Normal run
  console.log(`API Base: ${API_BASE}`);
  console.log(`Concurrency: ${CONCURRENCY} tests at a time (rolling queue)`);
  console.log(`Total tests: ${AUTOTEST_SCENARIOS.length}\n`);

  const startTime = Date.now();
  const results = await runTestsWithQueue(AUTOTEST_SCENARIOS, CONCURRENCY, true);
  const duration = (Date.now() - startTime) / 1000;

  console.log('\n'); // New line after progress

  // Calculate stats
  const passed = results.filter(r => r.success && !r.warning).length;
  const warned = results.filter(r => r.warning).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  // Print summary
  console.log('='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total:       ${total} tests`);
  console.log(`✅ Passed:    ${passed} (${passRate}%)`);
  console.log(`⚠️  Warned:    ${warned}`);
  console.log(`❌ Failed:    ${failed}`);
  console.log(`⏱️  Duration:  ${duration.toFixed(1)}s`);
  console.log(`🚀 Speed:     ${(total / duration).toFixed(1)} tests/sec`);
  console.log(`⚙️  Concurrency: ${CONCURRENCY} (rolling queue)`);
  console.log('='.repeat(60));

  // Generate HTML report
  const html = generateHTMLReport(results, CONCURRENCY, duration);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '-');
  const reportDir = path.join(__dirname, '../reports/autotest');
  const reportPath = path.join(reportDir, `rainbow-autotest-optimized-${timestamp}.html`);

  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, html, 'utf8');

  const publicReportDir = path.join(__dirname, '../src/public/reports/autotest');
  const publicReportPath = path.join(publicReportDir, `rainbow-autotest-optimized-${timestamp}.html`);
  fs.mkdirSync(publicReportDir, { recursive: true});
  fs.writeFileSync(publicReportPath, html, 'utf8');

  console.log(`\n📄 Report saved to:`);
  console.log(`   ${publicReportPath}`);
  console.log(`\n✨ Auto-imported to Test History!`);
  console.log(`   Open dashboard → Chat Simulator → Test History to view`);
  console.log(`\n🌐 View: http://localhost:${PORT}/public/reports/autotest/rainbow-autotest-optimized-${timestamp}.html\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
