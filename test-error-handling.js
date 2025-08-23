/**
 * Error Handling Test Script for PelangiManager
 * This script tests various error scenarios to verify enhanced error handling
 */

// Test Authentication Errors (401)
async function testAuthenticationError() {
  console.log('=== Testing Authentication Error (401) ===');
  
  // Store original token
  const originalToken = localStorage.getItem('auth_token');
  
  // Set invalid token
  localStorage.setItem('auth_token', 'invalid-token-12345');
  
  try {
    const response = await fetch('http://localhost:5000/api/guest-tokens', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-token-12345',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        capsuleNumber: 'C01',
        expiresIn: 2
      }),
      credentials: 'include'
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (!response.ok) {
      console.log('✅ Authentication error properly detected');
      console.log('Status Code:', response.status);
      console.log('Error Response:', responseText);
    }
  } catch (error) {
    console.log('Network error:', error.message);
  }
  
  // Restore original token
  if (originalToken) {
    localStorage.setItem('auth_token', originalToken);
  } else {
    localStorage.removeItem('auth_token');
  }
}

// Test Validation Errors (400)
async function testValidationError() {
  console.log('\n=== Testing Validation Error (400) ===');
  
  try {
    const response = await fetch('http://localhost:5000/api/guest-tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Missing required fields or invalid data
        capsuleNumber: '',  // Invalid capsule number
        expiresIn: -1       // Invalid expiration
      }),
      credentials: 'include'
    });
    
    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.status === 400) {
      console.log('✅ Validation error properly detected');
    }
  } catch (error) {
    console.log('Network error:', error.message);
  }
}

// Test Network Connection Issues
async function testConnectionError() {
  console.log('\n=== Testing Connection Error (Network Failure) ===');
  
  try {
    // Try to connect to non-existent server
    const response = await fetch('http://localhost:9999/api/test', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
    
    console.log('Unexpected success - server responded');
  } catch (error) {
    console.log('✅ Connection error properly detected');
    console.log('Error type:', error.constructor.name);
    console.log('Error message:', error.message);
    console.log('Network error should be handled by error handler');
  }
}

// Test API Endpoint Not Found (404)
async function testEndpointError() {
  console.log('\n=== Testing Endpoint Error (404) ===');
  
  try {
    const response = await fetch('http://localhost:5000/api/non-existent-endpoint', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
    
    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.status === 404) {
      console.log('✅ 404 error properly detected');
    }
  } catch (error) {
    console.log('Network error:', error.message);
  }
}

// Test Guest Check-in with Invalid Data
async function testCheckinValidationError() {
  console.log('\n=== Testing Check-in Validation Error ===');
  
  try {
    const response = await fetch('http://localhost:5000/api/guests/checkin', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Invalid guest data
        name: '',  // Empty name
        phone: 'invalid-phone',  // Invalid phone format
        email: 'invalid-email',  // Invalid email format
        capsuleNumber: 'INVALID',  // Invalid capsule
        accommodationType: 'invalid_type'
      }),
      credentials: 'include'
    });
    
    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (!response.ok) {
      console.log('✅ Check-in validation error properly detected');
    }
  } catch (error) {
    console.log('Network error:', error.message);
  }
}

// Test Token Cancellation with Non-existent Token
async function testTokenCancellationError() {
  console.log('\n=== Testing Token Cancellation Error ===');
  
  const fakeTokenId = 'non-existent-token-id-12345';
  
  try {
    const response = await fetch(`http://localhost:5000/api/guest-tokens/${fakeTokenId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
    
    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.status === 404) {
      console.log('✅ Token not found error properly detected');
    }
  } catch (error) {
    console.log('Network error:', error.message);
  }
}

// Run all tests
async function runErrorHandlingTests() {
  console.log('🧪 Starting Enhanced Error Handling Tests\n');
  console.log('Current auth token:', localStorage.getItem('auth_token') ? 'Present' : 'Missing');
  
  await testAuthenticationError();
  await testValidationError();
  await testConnectionError();
  await testEndpointError();
  await testCheckinValidationError();
  await testTokenCancellationError();
  
  console.log('\n✅ All error handling tests completed');
  console.log('\n🔍 Now test the frontend UI to see how errors are displayed:');
  console.log('1. Try creating a guest token with invalid data');
  console.log('2. Try checking in with missing fields');
  console.log('3. Try cancelling a non-existent token');
  console.log('4. Check browser developer tools console for debug info');
}

// Export for browser console use
window.runErrorHandlingTests = runErrorHandlingTests;
window.testAuthenticationError = testAuthenticationError;
window.testValidationError = testValidationError;
window.testConnectionError = testConnectionError;

console.log('🚀 Error Handling Test Script Loaded');
console.log('Run: runErrorHandlingTests() to start all tests');
console.log('Or run individual tests like: testAuthenticationError()');