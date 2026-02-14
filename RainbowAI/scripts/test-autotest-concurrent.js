#!/usr/bin/env node
/**
 * Concurrent Full Autotest Suite for Rainbow AI
 *
 * Runs all 58 autotest scenarios concurrently (same tests as the built-in autotest)
 * but MUCH faster using concurrent execution.
 *
 * Usage:
 *   node scripts/test-autotest-concurrent.js
 *   node scripts/test-autotest-concurrent.js --concurrency 10
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line args
const args = process.argv.slice(2);
const PORT = args.find(a => a.startsWith('--port='))?.split('=')[1] || '3002';
const CONCURRENCY = parseInt(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] || '8');
const API_BASE = `http://localhost:${PORT}/api/rainbow`;

// Load autotest scenarios from the existing file
const scenariosPath = path.join(__dirname, '../src/public/js/data/autotest-scenarios.js');
const scenariosContent = fs.readFileSync(scenariosPath, 'utf8');

// Extract the AUTOTEST_SCENARIOS array from the JS file
const scenariosMatch = scenariosContent.match(/const AUTOTEST_SCENARIOS = (\[[\s\S]*?\]);/);
if (!scenariosMatch) {
  console.error('❌ Failed to parse autotest scenarios');
  process.exit(1);
}

const AUTOTEST_SCENARIOS = eval(scenariosMatch[1]);

// Validation functions
function validateRule(rule, response, intent, responseTime, metadata) {
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

// Run single test scenario
async function runTest(scenario) {
  const startTime = Date.now();

  try {
    // Send message to API
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
          responseTime,
          data
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

// Run tests concurrently with limit
async function runAllTests(scenarios, concurrency) {
  const results = [];
  const batches = [];

  // Split into batches
  for (let i = 0; i < scenarios.length; i += concurrency) {
    batches.push(scenarios.slice(i, i + concurrency));
  }

  console.log(`Running ${scenarios.length} tests in ${batches.length} batches (concurrency: ${concurrency})\n`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    process.stdout.write(`Batch ${i + 1}/${batches.length}: Running ${batch.length} tests... `);

    const batchResults = await Promise.all(batch.map(runTest));
    results.push(...batchResults);

    const passed = batchResults.filter(r => r.success && !r.warning).length;
    const warned = batchResults.filter(r => r.warning).length;
    const failed = batchResults.filter(r => !r.success).length;

    console.log(`✅ ${passed} | ⚠️  ${warned} | ❌ ${failed}`);
  }

  return results;
}

// Generate HTML report
function generateHTMLReport(results) {
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
<title>Rainbow AI Autotest Report (Concurrent)</title>
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
  .message-bubble{background:#f5f5f5;border:1px solid #e5e5e5;padding:8px 12px;border-radius:12px;font-size:13px;margin:8px 0;white-space:pre-wrap}
  .metadata{font-size:11px;color:#888;margin:8px 0}
  .validation{border-top:1px solid #e5e5e5;margin-top:8px;padding-top:8px}
  .validation-title{font-size:12px;font-weight:600;color:#555;margin-bottom:4px}
  .validation-rule{font-size:12px;padding:2px 0}
  .rule-pass{color:#16a34a}
  .rule-warn{color:#ca8a04}
  .rule-fail{color:#dc2626}
  @media print{body{padding:12px} .summary{gap:8px}}
</style>
</head>
<body>
  <h1>🌈 Rainbow AI Autotest Report (Concurrent)</h1>
  <p style="color:#888;font-size:14px">${timestamp.toLocaleString()} | Pass rate: <b>${passRate}%</b></p>

  <div class="summary">
    <div class="summary-card"><div class="num" style="color:#333">${total}</div><div class="label">Total</div></div>
    <div class="summary-card"><div class="num" style="color:#16a34a">${passed}</div><div class="label">Passed</div></div>
    <div class="summary-card"><div class="num" style="color:#ca8a04">${warned}</div><div class="label">Warnings</div></div>
    <div class="summary-card"><div class="num" style="color:#dc2626">${failed}</div><div class="label">Failed</div></div>
    <div class="summary-card"><div class="num" style="color:#6366f1">${avgTime}s</div><div class="label">Avg Time</div></div>
  </div>
`;

  // Group results by category
  const byCategory = {};
  results.forEach(r => {
    const cat = r.scenario.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(r);
  });

  // Render each category
  Object.entries(byCategory).forEach(([category, catResults]) => {
    html += `\n  <h2 style="font-size:18px;margin:24px 0 12px;color:#666">${category}</h2>\n`;

    catResults.forEach(result => {
      const status = !result.success ? 'fail' : result.warning ? 'warn' : 'pass';
      const bgClass = `${status}-bg`;
      const badgeClass = `${status}-badge`;
      const badgeText = status === 'fail' ? 'FAIL' : status === 'warn' ? 'WARN' : 'PASS';

      html += `
  <div class="test-card">
    <div class="test-header ${bgClass}">
      <span class="badge ${badgeClass}">${badgeText}</span>
      <b style="font-size:14px">${result.scenario.name}</b>
      <span style="font-size:12px;color:#888;margin-left:auto">${result.scenario.category} | ${(result.responseTime / 1000).toFixed(1)}s</span>
    </div>
    <div class="test-body">
      <div style="margin-bottom:12px">
        <div style="text-align:right;margin-bottom:4px">
          <span style="background:#6366f1;color:#fff;padding:6px 12px;border-radius:16px;font-size:13px;display:inline-block;max-width:70%">${result.scenario.messages[0].text}</span>
        </div>
`;

      if (result.error) {
        html += `        <div style="color:#dc2626;font-size:12px;margin:8px 0">❌ Error: ${result.error}</div>\n`;
      } else {
        html += `        <div style="text-align:left;margin-bottom:4px">
          <span style="background:#f5f5f5;border:1px solid #e5e5e5;padding:6px 12px;border-radius:16px;font-size:13px;display:inline-block;max-width:80%;white-space:pre-wrap">${result.response.message || '(empty)'}</span>
        </div>
        <div style="font-size:11px;color:#888;margin-left:8px">
          Detection: <b>${result.response.source || 'unknown'}</b>
           | Intent: <b>${result.response.intent || 'none'}</b>
           | Routed to: <b>${result.response.routedAction || 'unknown'}</b>
           | Type: <b>${result.response.messageType || 'unknown'}</b>
           | Model: <b>${result.response.model || 'none'}</b>
           | Time: <b>${(result.responseTime / 1000).toFixed(1)}s</b>
           | Confidence: <b>${result.response.confidence ? (result.response.confidence * 100).toFixed(0) + '%' : 'N/A'}</b>
           | KB: <b>${result.response.kbFiles?.join(', ') || 'none'}</b>
        </div>
`;

        if (result.validationResults && result.validationResults.length > 0) {
          html += `      </div>
      <div style="border-top:1px solid #e5e5e5;margin-top:8px;padding-top:8px">
        <div style="font-size:12px;font-weight:600;color:#555;margin-bottom:4px">Validation Rules</div>
`;
          result.validationResults.forEach(vr => {
            const icon = vr.passed ? '✓' : (vr.critical ? '✗' : '⚠');
            const ruleClass = vr.passed ? 'rule-pass' : (vr.critical ? 'rule-fail' : 'rule-warn');
            html += `        <div class="validation-rule ${ruleClass}">${icon} <b>${vr.rule}</b> (turn 0): ${vr.message}</div>\n`;
          });
          html += `      </div>\n`;
        }
      }

      html += `    </div>
  </div>
`;
    });
  });

  html += `\n</body>\n</html>`;
  return html;
}

// Main function
async function main() {
  console.log('🌈 Rainbow AI Full Autotest Suite (Concurrent)\n');
  console.log(`API Base: ${API_BASE}`);
  console.log(`Concurrency: ${CONCURRENCY} tests at a time`);
  console.log(`Total tests: ${AUTOTEST_SCENARIOS.length}\n`);

  // Check if server is running
  try {
    const healthCheck = await fetch(`http://localhost:${PORT}/health`);
    if (!healthCheck.ok) {
      console.error(`❌ Server not responding at http://localhost:${PORT}`);
      console.error('   Please start the server with: npm run dev\n');
      process.exit(1);
    }
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error(`❌ Cannot connect to server at http://localhost:${PORT}`);
    console.error('   Please start the server with: npm run dev\n');
    process.exit(1);
  }

  // Run tests
  const startTime = Date.now();
  const results = await runAllTests(AUTOTEST_SCENARIOS, CONCURRENCY);
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  // Calculate stats
  const passed = results.filter(r => r.success && !r.warning).length;
  const warned = results.filter(r => r.warning).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total:     ${total} tests`);
  console.log(`✅ Passed:  ${passed} (${passRate}%)`);
  console.log(`⚠️  Warned:  ${warned}`);
  console.log(`❌ Failed:  ${failed}`);
  console.log(`⏱️  Duration: ${totalTime}s (vs ~60s sequential)`);
  console.log(`🚀 Speed:    ${(total / parseFloat(totalTime)).toFixed(1)} tests/sec`);
  console.log('='.repeat(60));

  // Generate HTML report
  const html = generateHTMLReport(results);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '-');
  const reportDir = path.join(__dirname, '../reports/autotest');
  const reportPath = path.join(reportDir, `rainbow-autotest-concurrent-${timestamp}.html`);

  // Ensure directory exists
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, html, 'utf8');

  // Also copy to public reports for web access
  const publicReportDir = path.join(__dirname, '../src/public/reports/autotest');
  const publicReportPath = path.join(publicReportDir, `rainbow-autotest-concurrent-${timestamp}.html`);
  fs.mkdirSync(publicReportDir, { recursive: true });
  fs.writeFileSync(publicReportPath, html, 'utf8');

  console.log(`\n📄 Report saved to:`);
  console.log(`   ${reportPath}`);
  console.log(`   ${publicReportPath}`);
  console.log(`\n🌐 View in browser: http://localhost:${PORT}/reports/autotest/rainbow-autotest-concurrent-${timestamp}.html\n`);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
