#!/usr/bin/env node
/**
 * Detailed HTML Report Generator
 * Generates HTML reports with full validation details like the dashboard autorun
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.argv.find(a => a.startsWith('--port='))?.split('=')[1] || '3002';
const API_BASE = `http://localhost:${PORT}/api/rainbow`;
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '10');

// Load autotest scenarios
const scenariosPath = path.join(__dirname, '../src/public/js/data/autotest-scenarios.js');
const scenariosContent = fs.readFileSync(scenariosPath, 'utf8');
const scenariosMatch = scenariosContent.match(/const AUTOTEST_SCENARIOS = (\[[\s\S]*?\]);/);
if (!scenariosMatch) {
  console.error('❌ Failed to parse autotest scenarios');
  process.exit(1);
}
const AUTOTEST_SCENARIOS = eval(scenariosMatch[1]);

// Escape HTML
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Run single scenario
async function runScenario(scenario) {
  const turns = [];
  const history = [];
  const startTime = Date.now();

  for (const msg of scenario.messages) {
    history.push({ role: 'user', content: msg.text });

    try {
      const response = await fetch(`${API_BASE}/preview/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg.text,
          history: history.slice(0, -1)
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      history.push({ role: 'assistant', content: result.message });

      turns.push({
        userMessage: msg.text,
        response: result.message,
        intent: result.intent,
        source: result.source,
        confidence: result.confidence,
        messageType: result.messageType || 'info',
        responseTime: result.responseTime || 0,
        model: result.model,
        kbFiles: result.kbFiles || [],
        routedAction: result.routedAction
      });
    } catch (err) {
      return {
        scenario,
        status: 'fail',
        turns: [],
        error: err.message,
        ruleResults: [],
        time: Date.now() - startTime
      };
    }
  }

  // Validate rules
  const ruleResults = [];
  let hasFailure = false;
  let hasWarning = false;

  for (let i = 0; i < scenario.validate.length; i++) {
    const validation = scenario.validate[i];
    const turn = turns[i];

    if (!turn) {
      ruleResults.push({
        rule: { type: 'missing_turn', critical: true },
        passed: false,
        detail: `Turn ${i + 1} failed`
      });
      hasFailure = true;
      continue;
    }

    for (const rule of validation.rules) {
      let passed = false;
      let detail = '';

      switch (rule.type) {
        case 'not_empty':
          passed = turn.response && turn.response.trim().length > 0;
          detail = passed ? 'Response is non-empty' : 'Response is empty';
          break;

        case 'contains_any':
          const lowerResponse = turn.response.toLowerCase();
          const matches = rule.values.filter(v => lowerResponse.includes(v.toLowerCase()));
          passed = matches.length > 0;
          detail = passed
            ? `Matched: ${matches.join(', ')}`
            : `None of [${rule.values.join(', ')}] found`;
          break;

        case 'not_contains':
          const lowerResp = turn.response.toLowerCase();
          const foundBad = rule.values.filter(v => lowerResp.includes(v.toLowerCase()));
          passed = foundBad.length === 0;
          detail = passed
            ? `None of [${rule.values.join(', ')}] found (good)`
            : `Found forbidden: ${foundBad.join(', ')}`;
          break;

        case 'response_time':
          passed = turn.responseTime <= rule.max;
          detail = `${(turn.responseTime / 1000).toFixed(1)}s ${passed ? '≤' : '>'} ${rule.max / 1000}s`;
          break;

        case 'intent_match':
          passed = turn.intent === rule.expected;
          detail = passed
            ? `Intent matched: ${turn.intent}`
            : `Expected ${rule.expected}, got ${turn.intent}`;
          break;

        default:
          detail = `Unknown rule type: ${rule.type}`;
      }

      ruleResults.push({
        rule,
        passed,
        detail
      });

      if (!passed) {
        if (rule.critical) hasFailure = true;
        else hasWarning = true;
      }
    }
  }

  return {
    scenario,
    status: hasFailure ? 'fail' : (hasWarning ? 'warn' : 'pass'),
    turns,
    ruleResults,
    time: Date.now() - startTime
  };
}

// Generate detailed HTML report
function generateHTML(results, duration) {
  const timestamp = new Date();
  const passed = results.filter(r => r.status === 'pass').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rainbow AI Detailed Test Report</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:1200px;margin:0 auto;padding:24px;color:#333;background:#fafafa}
  h1{font-size:24px;margin:0 0 4px}
  .summary{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:20px 0}
  .summary-card{background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:16px;text-align:center}
  .summary-card .num{font-size:28px;font-weight:700}
  .summary-card .label{font-size:12px;color:#888;text-transform:uppercase}
  .category-title{font-size:18px;font-weight:600;color:#666;margin:32px 0 16px;padding-bottom:8px;border-bottom:2px solid #e5e5e5}
  .test-card{border:1px solid #e5e5e5;border-radius:12px;margin-bottom:16px;overflow:hidden;background:#fff}
  .test-header{padding:12px 16px;display:flex;align-items:center;gap:12px}
  .test-body{padding:16px;border-top:1px solid #e5e5e5}
  .badge{color:#fff;padding:3px 12px;border-radius:6px;font-size:11px;font-weight:700;text-transform:uppercase}
  .pass-badge{background:#16a34a}
  .warn-badge{background:#ca8a04}
  .fail-badge{background:#dc2626}
  .pass-bg{background:#f0fdf4}
  .warn-bg{background:#fefce8}
  .fail-bg{background:#fef2f2}
  .message-box{background:#f9fafb;padding:12px;border-radius:8px;margin:8px 0;border-left:3px solid #6366f1}
  .guest-msg{border-left-color:#6366f1}
  .bot-msg{border-left-color:#10b981;background:#f0fdf4}
  .meta{font-size:12px;color:#6b7280;margin:8px 0}
  .meta-item{display:inline-block;margin-right:16px}
  .kb-files{font-size:11px;color:#7c3aed;background:#faf5ff;padding:4px 8px;border-radius:4px;display:inline-block;margin-top:4px}
  .rules{margin-top:12px;padding-top:12px;border-top:1px solid #e5e5e5}
  .rule-item{padding:6px 0;font-size:13px}
  .rule-pass{color:#16a34a}
  .rule-fail{color:#dc2626}
  .rule-warn{color:#ca8a04}
  @media print{body{padding:12px}}
</style>
</head>
<body>
  <h1>🌈 Rainbow AI Detailed Test Report</h1>
  <p style="color:#888;font-size:14px">${timestamp.toLocaleString()} | Pass rate: <b>${passRate}%</b> | ${total} tests</p>

  <div class="summary">
    <div class="summary-card"><div class="num" style="color:#333">${total}</div><div class="label">Total</div></div>
    <div class="summary-card"><div class="num" style="color:#16a34a">${passed}</div><div class="label">Passed</div></div>
    <div class="summary-card"><div class="num" style="color:#ca8a04">${warned}</div><div class="label">Warnings</div></div>
    <div class="summary-card"><div class="num" style="color:#dc2626">${failed}</div><div class="label">Failed</div></div>
    <div class="summary-card"><div class="num" style="color:#6366f1">${(duration / 1000).toFixed(1)}s</div><div class="label">Duration</div></div>
  </div>
`;

  // Group by category
  const byCategory = {};
  results.forEach(r => {
    const cat = r.scenario.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(r);
  });

  Object.entries(byCategory).forEach(([category, catResults]) => {
    html += `\n  <div class="category-title">📂 ${esc(category)}</div>\n`;

    catResults.forEach(result => {
      const status = result.status === 'pass' ? 'pass' : (result.status === 'warn' ? 'warn' : 'fail');
      const statusBadge = status === 'pass' ? 'PASS' : (status === 'warn' ? 'WARN' : 'FAIL');

      html += `  <div class="test-card">
    <div class="test-header ${status}-bg">
      <span class="badge ${status}-badge">${statusBadge}</span>
      <strong>${esc(result.scenario.name)}</strong>
      <span style="font-size:12px;color:#888;margin-left:auto">${(result.time / 1000).toFixed(1)}s</span>
    </div>
    <div class="test-body">
`;

      if (result.error) {
        html += `      <div style="color:#dc2626;padding:8px;background:#fef2f2;border-radius:6px">❌ Error: ${esc(result.error)}</div>\n`;
      }

      result.turns.forEach((turn, idx) => {
        html += `      <div class="message-box guest-msg">
        <div style="font-size:11px;color:#6366f1;font-weight:600;margin-bottom:4px">👤 GUEST (Turn ${idx + 1})</div>
        <div>${esc(turn.userMessage)}</div>
      </div>
      <div class="message-box bot-msg">
        <div style="font-size:11px;color:#10b981;font-weight:600;margin-bottom:4px">🤖 RAINBOW</div>
        <div>${esc(turn.response)}</div>
      </div>
      <div class="meta">
        <span class="meta-item">📊 Detection: <strong>${esc(turn.source)}</strong></span>
        <span class="meta-item">🎯 Intent: <strong>${esc(turn.intent)}</strong></span>
        <span class="meta-item">🔀 Routed: <strong>${esc(turn.routedAction)}</strong></span>
      </div>
      <div class="meta">
        <span class="meta-item">📝 Type: ${esc(turn.messageType)}</span>
        <span class="meta-item">⚙️ Model: ${esc(turn.model || 'none')}</span>
        <span class="meta-item">⏱ Time: ${(turn.responseTime / 1000).toFixed(1)}s</span>
        <span class="meta-item">📈 Confidence: ${(turn.confidence * 100).toFixed(0)}%</span>
      </div>
`;
        if (turn.kbFiles && turn.kbFiles.length > 0) {
          html += `      <div class="kb-files">📚 KB: ${turn.kbFiles.map(f => esc(f)).join(', ')}</div>\n`;
        }
      });

      if (result.ruleResults.length > 0) {
        html += `      <div class="rules">
        <div style="font-size:12px;font-weight:600;color:#666;margin-bottom:8px">Validation Rules:</div>
`;
        result.ruleResults.forEach(rr => {
          const ruleClass = rr.passed ? 'rule-pass' : (rr.rule.critical ? 'rule-fail' : 'rule-warn');
          const icon = rr.passed ? '✓' : (rr.rule.critical ? '✗' : '⚠');
          const typeLabel = rr.rule.type.replace(/_/g, ' ');
          html += `        <div class="rule-item ${ruleClass}">${icon} <strong>${esc(typeLabel)}:</strong> ${esc(rr.detail)}</div>\n`;
        });
        html += `      </div>\n`;
      }

      html += `    </div>
  </div>\n`;
    });
  });

  html += `\n</body>\n</html>`;
  return html;
}

// Main
async function main() {
  console.log('🌈 Rainbow AI Detailed HTML Report Generator\n');

  // Check server
  try {
    const healthCheck = await fetch(`http://localhost:${PORT}/health`);
    if (!healthCheck.ok) throw new Error('Server not responding');
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error(`❌ Cannot connect to server at http://localhost:${PORT}`);
    process.exit(1);
  }

  const testScenarios = AUTOTEST_SCENARIOS.slice(0, LIMIT);
  console.log(`Running ${testScenarios.length} scenarios...\n`);

  const startTime = Date.now();
  const results = [];

  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    process.stdout.write(`\r[${i + 1}/${testScenarios.length}] Testing: ${scenario.name.slice(0, 50).padEnd(50)} `);
    const result = await runScenario(scenario);
    results.push(result);
  }

  const duration = Date.now() - startTime;
  console.log('\n');

  // Generate HTML
  const html = generateHTML(results, duration);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '-');

  // Save to both locations
  const reportDir = path.join(__dirname, '../reports/autotest');
  const reportPath = path.join(reportDir, `rainbow-detailed-${timestamp}.html`);
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, html, 'utf8');

  const publicReportDir = path.join(__dirname, '../src/public/reports/autotest');
  const publicReportPath = path.join(publicReportDir, `rainbow-detailed-${timestamp}.html`);
  fs.mkdirSync(publicReportDir, { recursive: true });
  fs.writeFileSync(publicReportPath, html, 'utf8');

  // Summary
  const passed = results.filter(r => r.status === 'pass').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const passRate = ((passed / testScenarios.length) * 100).toFixed(1);

  console.log('='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total:    ${testScenarios.length} tests`);
  console.log(`✅ Passed: ${passed} (${passRate}%)`);
  console.log(`⚠️  Warned: ${warned}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log('='.repeat(60));

  console.log(`\n📄 Report saved to:`);
  console.log(`   ${publicReportPath}`);
  console.log(`\n✨ Auto-imported to Test History!`);
  console.log(`   Open dashboard → Chat Simulator → Test History to view`);
  console.log(`\n🌐 Direct link: http://localhost:${PORT}/public/reports/autotest/rainbow-detailed-${timestamp}.html\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
