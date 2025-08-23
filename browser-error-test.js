/**
 * Browser Console Error Testing Script for PelangiManager
 * Run this in the browser console at localhost:5000 to test error handling
 */

console.log('🚀 PelangiManager Error Handling Test Script Loaded');

// Test functions that work with the current error handling system

async function testAuthenticationError() {
  console.log('\n=== Testing Authentication Error (401) ===');
  
  // Store original token
  const originalToken = localStorage.getItem('auth_token');
  
  // Set invalid token temporarily
  localStorage.setItem('auth_token', 'invalid-token-test-12345');
  
  try {
    const response = await fetch('/api/guest-tokens', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-token-test-12345',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        capsuleNumber: 'C01',
        expiresIn: 2
      }),
      credentials: 'include'
    });
    
    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.status === 401) {
      console.log('✅ 401 Authentication error properly returned from server');
      
      // Test how the error handler would process this
      const { parseApiError } = await import('./client/src/lib/errorHandler.js');
      const detailedError = await parseApiError(response, '/api/guest-tokens', 'POST', {
        capsuleNumber: 'C01',
        expiresIn: 2
      });
      
      console.log('✅ Detailed error parsed:', detailedError);
      console.log('Error code:', detailedError.errorCode);
      console.log('Solution:', detailedError.solution);
      
      return detailedError;
    }
  } catch (error) {
    console.log('Network error caught:', error.message);
  } finally {
    // Restore original token
    if (originalToken) {
      localStorage.setItem('auth_token', originalToken);
    } else {
      localStorage.removeItem('auth_token');
    }
  }
}

async function testValidationError() {
  console.log('\n=== Testing Validation Error ===');
  
  try {
    const response = await fetch('/api/guest-tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        capsuleNumber: '',  // Invalid empty capsule
        expiresIn: -1      // Invalid negative expiration
      }),
      credentials: 'include'
    });
    
    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (!response.ok) {
      console.log('✅ Validation error properly returned from server');
      return { status: response.status, body: responseText };
    }
  } catch (error) {
    console.log('Error caught:', error.message);
  }
}

async function testNetworkError() {
  console.log('\n=== Testing Network Error (Connection Failed) ===');
  
  try {
    // Try to connect to non-existent port
    const response = await fetch('http://localhost:9999/api/test');
    console.log('Unexpected success - should have failed');
  } catch (error) {
    console.log('✅ Network error caught:', error.message);
    console.log('Error type:', error.constructor.name);
    
    // Test how error handler processes network errors
    const { parseApiError } = await import('./client/src/lib/errorHandler.js');
    const detailedError = await parseApiError(error, 'http://localhost:9999/api/test', 'GET');
    
    console.log('✅ Network error processed by handler:', detailedError);
    console.log('Enhanced message:', detailedError.message);
    console.log('Solution:', detailedError.solution);
    console.log('Error code:', detailedError.errorCode);
    
    return detailedError;
  }
}

async function test404Error() {
  console.log('\n=== Testing 404 Endpoint Not Found ===');
  
  try {
    const response = await fetch('/api/non-existent-endpoint-test', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
    
    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.status === 404) {
      console.log('✅ 404 error properly returned from server');
      
      // Test error handler processing
      const { parseApiError } = await import('./client/src/lib/errorHandler.js');
      const detailedError = await parseApiError(response, '/api/non-existent-endpoint-test', 'GET');
      
      console.log('✅ 404 error processed by handler:', detailedError);
      console.log('Enhanced details:', detailedError.details);
      console.log('Solution:', detailedError.solution);
      
      return detailedError;
    }
  } catch (error) {
    console.log('Error caught:', error.message);
  }
}

async function testCheckinValidationError() {
  console.log('\n=== Testing Check-in Validation Error ===');
  
  try {
    const response = await fetch('/api/guests/checkin', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: '',  // Invalid empty name
        phone: 'invalid-phone-format',
        email: 'not-an-email',
        capsuleNumber: 'INVALID_CAPSULE',
        accommodationType: 'nonexistent_type'
      }),
      credentials: 'include'
    });
    
    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (!response.ok) {
      console.log('✅ Check-in validation error properly returned');
      
      // Test specific enhancement for check-in endpoints
      const { parseApiError } = await import('./client/src/lib/errorHandler.js');
      const detailedError = await parseApiError(response, '/api/guests/checkin', 'POST', {
        name: '',
        phone: 'invalid-phone-format',
        email: 'not-an-email'
      });
      
      console.log('✅ Check-in error enhanced:', detailedError);
      console.log('Enhanced details:', detailedError.details);
      console.log('Solution:', detailedError.solution);
      
      return detailedError;
    }
  } catch (error) {
    console.log('Error caught:', error.message);
  }
}

async function testErrorToastCreation() {
  console.log('\n=== Testing Error Toast Creation ===');
  
  const { createErrorToast } = await import('./client/src/lib/errorHandler.js');
  
  // Test different error types
  const errors = [
    {
      message: 'Authentication Required',
      details: 'Your session has expired',
      solution: 'Please log in again',
      statusCode: 401,
      errorCode: 'AUTH_REQUIRED',
      endpoint: '/api/test',
      debugInfo: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        method: 'POST',
        requestData: { test: 'data' }
      }
    },
    {
      message: 'Connection Failed',
      details: 'Unable to connect to server',
      solution: 'Check your internet connection',
      errorCode: 'CONNECTION_FAILED',
      debugInfo: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    }
  ];
  
  errors.forEach((error, index) => {
    const toast = createErrorToast(error);
    console.log(`✅ Toast ${index + 1}:`, {
      title: toast.title,
      description: toast.description,
      variant: toast.variant,
      hasDebugInfo: !!toast.debugDetails
    });
    
    if (toast.debugDetails) {
      console.log(`Debug info for toast ${index + 1}:`, toast.debugDetails);
    }
  });
}

async function testTokenCancellation() {
  console.log('\n=== Testing Token Cancellation Error (404) ===');
  
  const fakeTokenId = 'non-existent-token-id-12345';
  
  try {
    const response = await fetch(`/api/guest-tokens/${fakeTokenId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
    
    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.status === 404) {
      console.log('✅ Token not found error (404) properly returned');
      return { status: response.status, body: responseText };
    }
  } catch (error) {
    console.log('Error caught:', error.message);
  }
}

async function runAllErrorTests() {
  console.log('🧪 Starting Comprehensive Error Handling Tests');
  console.log('Current auth token:', localStorage.getItem('auth_token') ? 'Present ✅' : 'Missing ❌');
  
  const results = {};
  
  try {
    results.authError = await testAuthenticationError();
    results.validationError = await testValidationError();
    results.networkError = await testNetworkError();
    results.notFoundError = await test404Error();
    results.checkinError = await testCheckinValidationError();
    results.tokenCancelError = await testTokenCancellation();
    
    await testErrorToastCreation();
    
    console.log('\n✅ All error handling tests completed successfully!');
    console.log('\n📊 Test Results Summary:');
    console.log(results);
    
    console.log('\n🔍 Next Steps - Test in UI:');
    console.log('1. Try creating a guest token with invalid capsule number');
    console.log('2. Try checking in with incomplete guest information');
    console.log('3. Try cancelling a non-existent token');
    console.log('4. Clear auth token and try any operation');
    console.log('5. Check browser console for detailed error information');
    
    return results;
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

// Make functions available globally
window.testErrorHandling = {
  runAll: runAllErrorTests,
  testAuth: testAuthenticationError,
  testValidation: testValidationError,
  testNetwork: testNetworkError,
  test404: test404Error,
  testCheckin: testCheckinValidationError,
  testToasts: testErrorToastCreation,
  testTokenCancel: testTokenCancellation
};

console.log('\n🎯 Available commands:');
console.log('- testErrorHandling.runAll() - Run all tests');
console.log('- testErrorHandling.testAuth() - Test authentication errors');
console.log('- testErrorHandling.testValidation() - Test validation errors');
console.log('- testErrorHandling.testNetwork() - Test network errors');
console.log('- testErrorHandling.test404() - Test 404 errors');
console.log('- testErrorHandling.testCheckin() - Test check-in errors');
console.log('- testErrorHandling.testToasts() - Test toast creation');
console.log('- testErrorHandling.testTokenCancel() - Test token cancellation');