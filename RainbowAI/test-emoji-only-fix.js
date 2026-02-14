// Test script for emoji-only message handling fix
// Verifies that emoji-only input returns valid response instead of "fetch failed" error

const API_URL = 'http://localhost:3002/api/rainbow/preview/chat';

const testCases = [
  {
    name: 'Emoji only - thumbs up and smiley',
    message: '👍😊',
    shouldPass: true
  },
  {
    name: 'Emoji only - single emoji',
    message: '😊',
    shouldPass: true
  },
  {
    name: 'Emoji only - multiple emojis',
    message: '🎉🎊🥳🎈',
    shouldPass: true
  },
  {
    name: 'Emoji with spaces',
    message: '  👍  😊  ',
    shouldPass: true
  },
  {
    name: 'Normal text (control test)',
    message: 'Hello, how are you?',
    shouldPass: true
  },
  {
    name: 'Empty string',
    message: '',
    shouldPass: false // Should return 400 error
  }
];

async function runTest(testCase) {
  const { name, message, shouldPass } = testCase;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: [] })
    });

    const data = await response.json();

    if (!shouldPass && response.status >= 400) {
      console.log(`✅ ${name}: Correctly rejected (${response.status})`);
      return true;
    }

    if (shouldPass && response.ok && data.message && !data.error) {
      console.log(`✅ ${name}: Valid response received`);
      console.log(`   - Intent: ${data.intent}`);
      console.log(`   - Source: ${data.source}`);
      console.log(`   - Sentiment: ${data.sentiment}`);
      console.log(`   - Response: ${data.message.substring(0, 80)}...`);
      return true;
    }

    console.log(`❌ ${name}: Unexpected response`);
    console.log(`   - Status: ${response.status}`);
    console.log(`   - Data:`, JSON.stringify(data, null, 2).substring(0, 200));
    return false;

  } catch (error) {
    console.log(`❌ ${name}: Fetch failed`);
    console.log(`   - Error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Testing Emoji-Only Message Handling Fix\n');
  console.log('Target: POST /api/rainbow/preview/chat');
  console.log(`API URL: ${API_URL}\n`);

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const result = await runTest(testCase);
    if (result) passed++;
    else failed++;
    console.log(''); // Empty line between tests
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Test Results: ${passed}/${testCases.length} passed`);

  if (failed === 0) {
    console.log('✅ All tests passed! Emoji-only fix is working correctly.');
    process.exit(0);
  } else {
    console.log(`❌ ${failed} test(s) failed.`);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
