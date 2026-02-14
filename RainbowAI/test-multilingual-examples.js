/**
 * Test script to verify multilingual intent examples load correctly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INTENT_EXAMPLES_PATH = path.join(__dirname, 'src/assistant/data/intent-examples.json');

console.log('🧪 Testing Multilingual Intent Examples\n');

try {
  // Read the file
  const data = JSON.parse(fs.readFileSync(INTENT_EXAMPLES_PATH, 'utf8'));

  let totalExamples = 0;
  let totalEn = 0;
  let totalMs = 0;
  let totalZh = 0;
  const intentStats = [];

  // Analyze each intent
  for (const { intent, examples } of data.intents) {
    const stats = {
      intent,
      en: 0,
      ms: 0,
      zh: 0,
      total: 0,
      format: 'unknown'
    };

    if (Array.isArray(examples)) {
      // Legacy flat array format
      stats.format = 'flat';
      stats.en = examples.length;
      stats.total = examples.length;
      totalEn += examples.length;
    } else if (typeof examples === 'object') {
      // Language-keyed format
      stats.format = 'language-keyed';
      stats.en = examples.en?.length || 0;
      stats.ms = examples.ms?.length || 0;
      stats.zh = examples.zh?.length || 0;
      stats.total = stats.en + stats.ms + stats.zh;

      totalEn += stats.en;
      totalMs += stats.ms;
      totalZh += stats.zh;
    }

    totalExamples += stats.total;
    intentStats.push(stats);
  }

  // Report results
  console.log('📊 Summary:');
  console.log(`Total intents: ${data.intents.length}`);
  console.log(`Total examples: ${totalExamples}`);
  console.log(`  English (en): ${totalEn}`);
  console.log(`  Malay (ms): ${totalMs}`);
  console.log(`  Chinese (zh): ${totalZh}`);
  console.log();

  // Check for issues
  const issues = [];
  const languageKeyedCount = intentStats.filter(s => s.format === 'language-keyed').length;
  const flatCount = intentStats.filter(s => s.format === 'flat').length;

  console.log(`📋 Format distribution:`);
  console.log(`  Language-keyed: ${languageKeyedCount} intents`);
  console.log(`  Flat array: ${flatCount} intents`);
  console.log();

  // Check for intents missing examples in any language
  const missingExamples = intentStats.filter(s =>
    s.format === 'language-keyed' && (s.en === 0 || s.ms === 0 || s.zh === 0)
  );

  if (missingExamples.length > 0) {
    console.log('⚠️  Intents missing examples in some languages:');
    missingExamples.forEach(({ intent, en, ms, zh }) => {
      const missing = [];
      if (en === 0) missing.push('en');
      if (ms === 0) missing.push('ms');
      if (zh === 0) missing.push('zh');
      console.log(`  - ${intent}: missing ${missing.join(', ')}`);
    });
    console.log();
  }

  // Check for imbalanced examples (not all languages have same count)
  const imbalanced = intentStats.filter(s =>
    s.format === 'language-keyed' &&
    (s.en !== s.ms || s.ms !== s.zh || s.en !== s.zh)
  );

  if (imbalanced.length > 0) {
    console.log('ℹ️  Intents with different example counts per language:');
    imbalanced.forEach(({ intent, en, ms, zh }) => {
      console.log(`  - ${intent}: en=${en}, ms=${ms}, zh=${zh}`);
    });
    console.log();
  }

  // Show detailed stats for first 3 intents
  console.log('📝 Sample intent details (first 3):');
  intentStats.slice(0, 3).forEach(({ intent, en, ms, zh, format }) => {
    console.log(`  ${intent}:`);
    console.log(`    Format: ${format}`);
    console.log(`    Examples: en=${en}, ms=${ms}, zh=${zh}`);
  });
  console.log();

  // Final verdict
  if (missingExamples.length === 0 && totalMs > 0 && totalZh > 0) {
    console.log('✅ SUCCESS: All intents have multilingual examples!');
    console.log(`   Expected: 24 intents × 10 examples × 3 languages = 720 examples`);
    console.log(`   Actual: ${totalExamples} examples`);
    process.exit(0);
  } else {
    console.log('❌ ISSUES FOUND: Some intents are missing multilingual examples.');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ ERROR loading intent examples:');
  console.error(error.message);
  process.exit(1);
}
