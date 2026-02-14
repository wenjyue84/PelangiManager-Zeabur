#!/usr/bin/env node
/**
 * Concurrent Multilingual Testing Script for Rainbow AI
 *
 * Tests the new multilingual intent examples (en/ms/zh) by simulating guest messages
 * and validating Rainbow AI responses. Runs tests concurrently for speed.
 *
 * Usage:
 *   node scripts/test-multilingual-concurrent.js
 *   node scripts/test-multilingual-concurrent.js --port 3002
 *   node scripts/test-multilingual-concurrent.js --concurrency 10
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line args
const args = process.argv.slice(2);
const PORT = args.find(a => a.startsWith('--port='))?.split('=')[1] || '3002';
const CONCURRENCY = parseInt(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] || '5');
const API_BASE = `http://localhost:${PORT}/api/rainbow`;

// Test scenarios focusing on multilingual examples
const MULTILINGUAL_TEST_SCENARIOS = [
  // ═══════════════════════════════════════════════════════════
  // TIER 2 FUZZY MATCHING TESTS (Malay + Chinese)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'ms-wifi-t2',
    name: 'Malay WiFi (T2 Fuzzy)',
    category: 'T2_FUZZY',
    language: 'ms',
    messages: [{ text: 'password wifi' }],
    expectedIntent: 'wifi',
    expectedTier: ['T2', 'T3'],
    validate: [{ turn: 0, rules: [
      { type: 'not_empty', critical: true },
      { type: 'contains_any', values: ['wifi', 'password', 'pelangi capsule', 'ilovestaycapsule'], critical: true },
      { type: 'intent_match', expected: 'wifi', critical: true }
    ]}]
  },
  {
    id: 'ms-pricing-t2',
    name: 'Malay Pricing (T2 Fuzzy)',
    category: 'T2_FUZZY',
    language: 'ms',
    messages: [{ text: 'berapa harga' }],
    expectedIntent: 'pricing',
    expectedTier: ['T2', 'T3'],
    validate: [{ turn: 0, rules: [
      { type: 'not_empty', critical: true },
      { type: 'contains_any', values: ['RM', 'harga', 'rm45', 'sehari'], critical: true },
      { type: 'intent_match', expected: 'pricing', critical: true }
    ]}]
  },
  {
    id: 'zh-wifi-t2',
    name: 'Chinese WiFi (T2 Fuzzy)',
    category: 'T2_FUZZY',
    language: 'zh',
    messages: [{ text: 'wifi密码' }],
    expectedIntent: 'wifi',
    expectedTier: ['T2', 'T3'],
    validate: [{ turn: 0, rules: [
      { type: 'not_empty', critical: true },
      { type: 'contains_any', values: ['wifi', 'pelangi', 'ilovestaycapsule', '密码'], critical: true },
      { type: 'intent_match', expected: 'wifi', critical: true }
    ]}]
  },
  {
    id: 'zh-pricing-t2',
    name: 'Chinese Pricing (T2 Fuzzy)',
    category: 'T2_FUZZY',
    language: 'zh',
    messages: [{ text: '多少钱' }],
    expectedIntent: 'pricing',
    expectedTier: ['T2', 'T3'],
    validate: [{ turn: 0, rules: [
      { type: 'not_empty', critical: true },
      { type: 'contains_any', values: ['RM', 'rm45', '价格', '钱'], critical: true },
      { type: 'intent_match', expected: 'pricing', critical: true }
    ]}]
  },

  // ═══════════════════════════════════════════════════════════
  // TIER 3 SEMANTIC MATCHING TESTS (Colloquial Malay + Chinese)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'ms-greeting-t3',
    name: 'Malay Greeting (T3 Semantic)',
    category: 'T3_SEMANTIC',
    language: 'ms',
    messages: [{ text: 'apa khabar' }],
    expectedIntent: 'greeting',
    expectedTier: ['T2', 'T3'],
    validate: [{ turn: 0, rules: [
      { type: 'not_empty', critical: true },
      { type: 'contains_any', values: ['selamat', 'hai', 'welcome', 'Pelangi'], critical: false },
      { type: 'intent_match', expected: 'greeting', critical: false }
    ]}]
  },
  {
    id: 'ms-thanks-t3',
    name: 'Malay Thanks (T3 Semantic)',
    category: 'T3_SEMANTIC',
    language: 'ms',
    messages: [{ text: 'terima kasih' }],
    expectedIntent: 'thanks',
    expectedTier: ['T2', 'T3'],
    validate: [{ turn: 0, rules: [
      { type: 'not_empty', critical: true },
      { type: 'contains_any', values: ['sama-sama', 'welcome', 'terima kasih'], critical: false },
      { type: 'intent_match', expected: 'thanks', critical: false }
    ]}]
  },
  {
    id: 'ms-checkin-t3',
    name: 'Malay Check-in (T3 Semantic)',
    category: 'T3_SEMANTIC',
    language: 'ms',
    messages: [{ text: 'bila boleh check in' }],
    expectedIntent: 'checkin_info',
    expectedTier: ['T2', 'T3'],
    validate: [{ turn: 0, rules: [
      { type: 'not_empty', critical: true },
      { type: 'contains_any', values: ['2', 'pm', 'PM', 'check-in', 'daftar masuk'], critical: true },
      { type: 'intent_match', expected: 'checkin_info', critical: false }
    ]}]
  },
  {
    id: 'zh-greeting-t3',
    name: 'Chinese Greeting (T3 Semantic)',
    category: 'T3_SEMANTIC',
    language: 'zh',
    messages: [{ text: '你好' }],
    expectedIntent: 'greeting',
    expectedTier: ['T2', 'T3'],
    validate: [{ turn: 0, rules: [
      { type: 'not_empty', critical: true },
      { type: 'contains_any', values: ['您好', '欢迎', '彩虹', 'Pelangi'], critical: false },
      { type: 'intent_match', expected: 'greeting', critical: false }
    ]}]
  },
  {
    id: 'zh-thanks-t3',
    name: 'Chinese Thanks (T3 Semantic)',
    category: 'T3_SEMANTIC',
    language: 'zh',
    messages: [{ text: '谢谢' }],
    expectedIntent: 'thanks',
    expectedTier: ['T2', 'T3'],
    validate: [{ turn: 0, rules: [
      { type: 'not_empty', critical: true },
      { type: 'contains_any', values: ['不客气', '不謝', 'welcome', '谢谢'], critical: false },
      { type: 'intent_match', expected: 'thanks', critical: false }
    ]}]
  },
  {
    id: 'zh-availability-t3',
    name: 'Chinese Availability (T3 Semantic)',
    category: 'T3_SEMANTIC',
    language: 'zh',
    messages: [{ text: '有没有房' }],
    expectedIntent: 'availability',
    expectedTier: ['T2', 'T3'],
    validate: [{ turn: 0, rules: [
      { type: 'not_empty', critical: true },
      { type: 'contains_any', values: ['有', '房', '床位', 'available', 'capsule'], critical: true },
      { type: 'intent_match', expected: 'availability', critical: false }
    ]}]
  },

  // ═══════════════════════════════════════════════════════════
  // COMMON INTENTS (High Priority)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'ms-booking',
    name: 'Malay Booking',
    category: 'COMMON_INTENTS',
    language: 'ms',
    messages: [{ text: 'nak book bilik' }],
    expectedIntent: 'booking',
    expectedTier: ['T2', 'T3', 'T4'],
    validate: [{ turn: 0, rules: [
      { type: 'not_empty', critical: true },
      { type: 'contains_any', values: ['book', 'tempah', 'booking', 'tarikh', 'date'], critical: true },
      { type: 'intent_match', expected: 'booking', critical: false }
    ]}]
  },
  {
    id: 'zh-booking',
    name: 'Chinese Booking',
    category: 'COMMON_INTENTS',
    language: 'zh',
    messages: [{ text: '我要订房' }],
    expectedIntent: 'booking',
    expectedTier: ['T2', 'T3', 'T4'],
    validate: [{ turn: 0, rules: [
      { type: 'not_empty', critical: true },
      { type: 'contains_any', values: ['订', '预订', 'book', 'booking', '日期'], critical: true },
      { type: 'intent_match', expected: 'booking', critical: false }
    ]}]
  },
  {
    id: 'ms-directions',
    name: 'Malay Directions',
    category: 'COMMON_INTENTS',
    language: 'ms',
    messages: [{ text: 'di mana lokasi' }],
    expectedIntent: 'directions',
    expectedTier: ['T2', 'T3', 'T4'],
    validate: [{ turn: 0, rules: [
      { type: 'not_empty', critical: true },
      { type: 'contains_any', values: ['Jalan Perang', 'Taman Pelangi', 'alamat', 'lokasi', 'map'], critical: true },
      { type: 'intent_match', expected: 'directions', critical: false }
    ]}]
  },
  {
    id: 'zh-directions',
    name: 'Chinese Directions',
    category: 'COMMON_INTENTS',
    language: 'zh',
    messages: [{ text: '地址在哪' }],
    expectedIntent: 'directions',
    expectedTier: ['T2', 'T3', 'T4'],
    validate: [{ turn: 0, rules: [
      { type: 'not_empty', critical: true },
      { type: 'contains_any', values: ['Jalan Perang', 'Taman Pelangi', '地址', '位置', '地图'], critical: true },
      { type: 'intent_match', expected: 'directions', critical: false }
    ]}]
  },
  {
    id: 'ms-checkout',
    name: 'Malay Checkout',
    category: 'COMMON_INTENTS',
    language: 'ms',
    messages: [{ text: 'masa check out' }],
    expectedIntent: 'checkout_info',
    expectedTier: ['T2', 'T3'],
    validate: [{ turn: 0, rules: [
      { type: 'not_empty', critical: true },
      { type: 'contains_any', values: ['12', 'noon', 'tengah hari', 'check-out', 'keluar'], critical: true },
      { type: 'intent_match', expected: 'checkout_info', critical: false }
    ]}]
  },
  {
    id: 'zh-checkout',
    name: 'Chinese Checkout',
    category: 'COMMON_INTENTS',
    language: 'zh',
    messages: [{ text: '几点退房' }],
    expectedIntent: 'checkout_info',
    expectedTier: ['T2', 'T3'],
    validate: [{ turn: 0, rules: [
      { type: 'not_empty', critical: true },
      { type: 'contains_any', values: ['12', '中午', 'noon', '退房', '离开'], critical: true },
      { type: 'intent_match', expected: 'checkout_info', critical: false }
    ]}]
  },

  // ═══════════════════════════════════════════════════════════
  // CODE-SWITCHING (Mixed Language)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'mixed-wifi-ms-en',
    name: 'Mixed (MS+EN) WiFi',
    category: 'CODE_SWITCHING',
    language: 'mixed',
    messages: [{ text: 'wifi password apa' }],
    expectedIntent: 'wifi',
    expectedTier: ['T2', 'T3'],
    validate: [{ turn: 0, rules: [
      { type: 'not_empty', critical: true },
      { type: 'contains_any', values: ['wifi', 'password', 'pelangi'], critical: true },
      { type: 'intent_match', expected: 'wifi', critical: false }
    ]}]
  },
  {
    id: 'mixed-booking-ms-en',
    name: 'Mixed (MS+EN) Booking',
    category: 'CODE_SWITCHING',
    language: 'mixed',
    messages: [{ text: 'nak book untuk 2 nights' }],
    expectedIntent: 'booking',
    expectedTier: ['T2', 'T3', 'T4'],
    validate: [{ turn: 0, rules: [
      { type: 'not_empty', critical: true },
      { type: 'contains_any', values: ['book', 'booking', 'nights', 'malam'], critical: true },
      { type: 'intent_match', expected: 'booking', critical: false }
    ]}]
  }
];

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

    const passed = batchResults.filter(r => r.success).length;
    const warned = batchResults.filter(r => r.warning).length;
    const failed = batchResults.filter(r => !r.success && !r.warning).length;

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
<title>Rainbow AI Multilingual Test Report</title>
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
  <h1>🌈 Rainbow AI Multilingual Test Report</h1>
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
      <span style="font-size:12px;color:#888;margin-left:auto">${result.scenario.language.toUpperCase()} | ${(result.responseTime / 1000).toFixed(1)}s</span>
    </div>
    <div class="test-body">
      <div style="margin-bottom:8px">
        <div style="font-size:11px;color:#888;margin-bottom:4px">Guest Message:</div>
        <div style="background:#e0f2fe;border:1px solid #bae6fd;padding:6px 12px;border-radius:12px;font-size:13px">${result.scenario.messages[0].text}</div>
      </div>
`;

      if (result.error) {
        html += `      <div style="color:#dc2626;font-size:12px;margin:8px 0">❌ Error: ${result.error}</div>\n`;
      } else {
        html += `      <div style="margin-bottom:8px">
        <div style="font-size:11px;color:#888;margin-bottom:4px">Rainbow Response:</div>
        <div class="message-bubble">${result.response.message || '(empty)'}</div>
      </div>
      <div class="metadata">
        Detection: <b>${result.response.source || 'unknown'}</b>
         | Intent: <b>${result.response.intent || 'none'}</b>
         | Routed to: <b>${result.response.routedAction || 'unknown'}</b>
         | Model: <b>${result.response.model || 'none'}</b>
         | Time: <b>${(result.responseTime / 1000).toFixed(1)}s</b>
         | Confidence: <b>${result.response.confidence ? (result.response.confidence * 100).toFixed(0) + '%' : 'N/A'}</b>
      </div>
`;

        if (result.validationResults && result.validationResults.length > 0) {
          html += `      <div class="validation">
        <div class="validation-title">Validation Rules</div>
`;
          result.validationResults.forEach(vr => {
            const icon = vr.passed ? '✓' : (vr.critical ? '✗' : '⚠');
            const ruleClass = vr.passed ? 'rule-pass' : (vr.critical ? 'rule-fail' : 'rule-warn');
            html += `        <div class="validation-rule ${ruleClass}">${icon} <b>${vr.rule}</b>: ${vr.message}</div>\n`;
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
  console.log('🌈 Rainbow AI Multilingual Concurrent Testing\n');
  console.log(`API Base: ${API_BASE}`);
  console.log(`Concurrency: ${CONCURRENCY} tests at a time`);
  console.log(`Total tests: ${MULTILINGUAL_TEST_SCENARIOS.length}\n`);

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
  const results = await runAllTests(MULTILINGUAL_TEST_SCENARIOS, CONCURRENCY);
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
  console.log(`⏱️  Duration: ${totalTime}s`);
  console.log('='.repeat(60));

  // Generate HTML report
  const html = generateHTMLReport(results);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '-');
  const reportDir = path.join(__dirname, '../reports/autotest');
  const reportPath = path.join(reportDir, `rainbow-multilingual-${timestamp}.html`);

  // Ensure directory exists
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, html, 'utf8');

  // Also copy to public reports for web access
  const publicReportDir = path.join(__dirname, '../src/public/reports/autotest');
  const publicReportPath = path.join(publicReportDir, `rainbow-multilingual-${timestamp}.html`);
  fs.mkdirSync(publicReportDir, { recursive: true });
  fs.writeFileSync(publicReportPath, html, 'utf8');

  console.log(`\n📄 Report saved to:`);
  console.log(`   ${reportPath}`);
  console.log(`   ${publicReportPath}`);
  console.log(`\n🌐 View in browser: http://localhost:${PORT}/public/reports/autotest/rainbow-multilingual-${timestamp}.html`);
  console.log(`\n✨ Auto-imported to Test History!`);
  console.log(`   Open dashboard → Chat Simulator → Test History to view\n`);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
