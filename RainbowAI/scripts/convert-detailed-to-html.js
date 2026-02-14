#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const textFile = process.argv[2];
if (!textFile) {
  console.error('Usage: node convert-detailed-to-html.js <text-report>');
  process.exit(1);
}

const content = fs.readFileSync(textFile, 'utf8');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '-');

// Convert text report to HTML
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rainbow AI Detailed Test Report</title>
<style>
  body{font-family:'Monaco','Courier New',monospace;max-width:1200px;margin:0 auto;padding:24px;color:#333;background:#1e1e1e;font-size:13px;line-height:1.6}
  pre{background:#2d2d2d;color:#d4d4d4;padding:16px;border-radius:8px;overflow-x:auto;white-space:pre-wrap;word-wrap:break-word}
  .pass{color:#4ade80;font-weight:bold}
  .fail{color:#f87171;font-weight:bold}
  .warn{color:#fbbf24;font-weight:bold}
  h1{color:#60a5fa;font-size:20px}
  .summary{background:#374151;padding:12px;border-radius:8px;margin:16px 0;color:#d4d4d4}
</style>
</head>
<body>
<h1>🌈 Rainbow AI Detailed Test Report</h1>
<div class="summary">
<strong>Generated:</strong> ${new Date().toLocaleString()}<br>
<strong>View:</strong> Full validation rules and LLM responses
</div>
<pre>${content
  .replace(/✅ PASS/g, '<span class="pass">✅ PASS</span>')
  .replace(/❌ FAIL/g, '<span class="fail">❌ FAIL</span>')
  .replace(/⚠️  WARN/g, '<span class="warn">⚠️  WARN</span>')
  .replace(/✓/g, '<span class="pass">✓</span>')
  .replace(/✗/g, '<span class="fail">✗</span>')
}</pre>
</body>
</html>`;

const htmlPath = path.join(path.dirname(textFile), `../src/public/reports/autotest/detailed-report-${timestamp}.html`);
fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
fs.writeFileSync(htmlPath, html, 'utf8');

console.log(`✅ HTML report created: ${htmlPath}`);
console.log(`🌐 View: http://localhost:3002/public/reports/autotest/detailed-report-${timestamp}.html`);
