// Test script to check the capsule API endpoint
const fetch = require('node-fetch');

async function testCapsuleAPI() {
  try {
    console.log('Testing /api/capsules/available-with-status endpoint...');
    
    // Test without authentication
    const response1 = await fetch('http://localhost:5000/api/capsules/available-with-status');
    console.log('Without auth - Status:', response1.status);
    console.log('Without auth - Response:', await response1.text());
    
    // Test with fake authentication
    const response2 = await fetch('http://localhost:5000/api/capsules/available-with-status', {
      headers: {
        'Authorization': 'Bearer fake-token'
      }
    });
    console.log('With fake auth - Status:', response2.status);
    console.log('With fake auth - Response:', await response2.text());
    
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testCapsuleAPI();
