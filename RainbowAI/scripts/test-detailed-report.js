#!/usr/bin/env node
/**
 * Detailed Autotest Report Generator
 *
 * Runs autotest scenarios through the same API the dashboard uses
 * (/preview/chat) and generates a detailed report with validation rules.
 * This ensures results match exactly what Rainbow AI would produce in production.
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

// Run single scenario through preview API (same as dashboard)
async function runScenario(scenario) {
  const turns = [];
  const history = [];

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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
        ruleResults: []
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
    ruleResults
  };
}

// Print detailed results
function printDetailedResults(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 DETAILED TEST RESULTS');
  console.log('='.repeat(80));

  // Group by category
  const byCategory = {};
  results.forEach(r => {
    const cat = r.scenario.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(r);
  });

  Object.entries(byCategory).forEach(([category, catResults]) => {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📂 ${category}`);
    console.log('─'.repeat(80));

    catResults.forEach(result => {
      const statusIcon = result.status === 'pass' ? '✅ PASS' :
                        result.status === 'warn' ? '⚠️  WARN' : '❌ FAIL';
      const passRate = result.ruleResults.length > 0
        ? ((result.ruleResults.filter(r => r.passed).length / result.ruleResults.length) * 100).toFixed(0)
        : '0';

      console.log(`\n${statusIcon}  ${result.scenario.name}  (${passRate}% rules passed)`);
      console.log(`Category: ${result.scenario.category}`);

      if (result.error) {
        console.log(`❌ Error: ${result.error}`);
      }

      result.turns.forEach((turn, idx) => {
        console.log(`\n  Turn ${idx + 1}:`);
        console.log(`    👤 Guest: "${turn.userMessage}"`);
        console.log(`    🤖 Rainbow: "${turn.response}"`);
        console.log(`    📊 Detection: ${turn.source} | Intent: ${turn.intent} | Routed: ${turn.routedAction}`);
        console.log(`    ⚙️  Type: ${turn.messageType} | Model: ${turn.model || 'none'} | Time: ${(turn.responseTime / 1000).toFixed(1)}s | Confidence: ${(turn.confidence * 100).toFixed(0)}%`);
        if (turn.kbFiles && turn.kbFiles.length > 0) {
          console.log(`    📚 KB: ${turn.kbFiles.join(', ')}`);
        }
      });

      if (result.ruleResults.length > 0) {
        console.log(`\n  Validation Rules:`);
        result.ruleResults.forEach(rr => {
          const icon = rr.passed ? '  ✓' : (rr.rule.critical ? '  ✗' : '  ⚠');
          const typeLabel = rr.rule.type.replace(/_/g, ' ');
          console.log(`    ${icon} ${typeLabel}: ${rr.detail}`);
        });
      }
    });
  });

  // Summary
  const passed = results.filter(r => r.status === 'pass').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log('\n' + '='.repeat(80));
  console.log('📈 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total:    ${total} tests`);
  console.log(`✅ Passed: ${passed} (${passRate}%)`);
  console.log(`⚠️  Warned: ${warned}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(80));
}

// Main
async function main() {
  console.log('🌈 Rainbow AI Detailed Test Report\n');

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
  console.log(`Running ${testScenarios.length} scenarios through /preview/chat API\n`);
  console.log('⏳ This may take a few minutes (using real LLM responses)...\n');

  const results = [];
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    process.stdout.write(`\r[${i + 1}/${testScenarios.length}] Testing: ${scenario.name.slice(0, 40).padEnd(40)} `);

    const result = await runScenario(scenario);
    results.push(result);
  }

  console.log('\n');
  printDetailedResults(results);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
