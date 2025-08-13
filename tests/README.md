# Playwright E2E Tests for PelangiManager

This directory contains comprehensive end-to-end tests for the PelangiManager application using Playwright.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Your application running on `http://localhost:5000`

### Running Tests

```bash
# Run all tests in headless mode
npm run test:e2e

# Run tests with UI (interactive mode)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug
```

## 📁 Test Structure

### Main Test Files
- `check-in.spec.ts` - Comprehensive test suite for the Check In page
- `check-in-simple.spec.ts` - Simplified tests using helper functions
- `check-in-working.spec.ts` - Tests for error handling and token validation
- `check-in-basic.spec.ts` - Basic page loading tests

### Helper Files
- `utils/test-helpers.ts` - Common test utilities and mock data generators

## 🧪 Test Coverage

### Check In Page Tests

#### 1. **Form Display Tests**
- ✅ Verify all form sections are visible
- ✅ Check required field indicators
- ✅ Validate form structure

#### 2. **Data Entry Tests**
- ✅ Fill all form fields with random data
- ✅ Test personal information (name, phone, gender, nationality)
- ✅ Test date selection (check-in/check-out)
- ✅ Test identity documents (IC/Passport)
- ✅ Test emergency contact information
- ✅ Test additional notes

#### 3. **Form Validation Tests**
- ✅ Test required field validation
- ✅ Test date validation (check-out after check-in)
- ✅ Test document upload requirements
- ✅ Test form submission validation

#### 4. **Interactive Elements Tests**
- ✅ Test nationality search functionality
- ✅ Test quick note selection
- ✅ Test payment method selection
- ✅ Test FAQ accordion
- ✅ Test language switching

#### 5. **Responsive Design Tests**
- ✅ Test mobile viewport (375x667)
- ✅ Test tablet viewport (768x1024)
- ✅ Test desktop viewport (1920x1080)
- ✅ Verify mobile-specific elements

#### 6. **Advanced Features Tests**
- ✅ Test form autosave functionality
- ✅ Test localStorage draft saving
- ✅ Test document upload interface
- ✅ Test payment method variations

## 🎯 Test Data Generation

The tests use realistic random data generators:

### Personal Information
- **Names**: Random combinations of common first/last names
- **Phone Numbers**: Malaysian format (01X-XXXXXXX)
- **IC Numbers**: Valid Malaysian IC format (YYMMDD-SS-XXXX)
- **Passport Numbers**: International format (AANNNNNN)

### Dates
- **Check-in**: Today's date (editable)
- **Check-out**: Random future date (required)

### Payment Methods
- **Cash**: With description field
- **Bank Transfer**: Shows account details
- **Online Platform**: Booking.com, Agoda, etc.

## 🔧 Configuration

### Playwright Config (`playwright.config.ts`)
- **Base URL**: `http://localhost:5000`
- **Browsers**: Chromium, Firefox, WebKit
- **Devices**: Desktop, Mobile Chrome, Mobile Safari
- **Auto-start**: Development server with `npm run dev`

### Test Environment
- **Timeout**: 120 seconds for server startup
- **Retries**: 2 retries in CI, 0 in development
- **Screenshots**: On failure only
- **Videos**: Retained on failure

## 🚨 Important Notes

### Authentication & Token Requirements
- **Current Limitation**: Tests use mock tokens (`test-token-123`) which are invalid
- **In-Memory Storage**: Using in-memory storage for testing, so no real database tokens exist
- **Form Testing**: Cannot test actual form submission without valid tokens

### Getting Real Tokens for Testing
When you're ready to test the actual form functionality with real data, you'll need to:

1. **Ask Replit's AI Agent** to help create valid guest tokens in the database
2. **Request tokens that**:
   - Exist in the `guest_tokens` table
   - Are not expired
   - Have not been used
   - Include valid capsule/guest information

3. **The AI Agent can help**:
   - Create test data with valid tokens
   - Provide token values for testing
   - Set up proper test scenarios

### Document Upload
- Tests verify upload interface presence
- Actual file uploads are not tested (requires backend setup)
- Document validation is tested through form fields

### Backend Dependencies
- Tests assume your backend is running
- Form submission tests verify UI state, not actual submission
- Adjust expectations based on your backend implementation

## 🐛 Troubleshooting

### Common Issues

1. **Server Not Running**
   ```bash
   # Start your development server first
   npm run dev
   ```

2. **Port Conflicts**
   - Ensure port 5000 is available
   - Update `playwright.config.ts` if using different port

3. **Authentication Errors**
   - Check if your app requires valid tokens
   - Consider mocking authentication in tests

4. **Element Not Found**
   - Verify element selectors match your actual HTML
   - Check if elements are conditionally rendered

### Debug Mode
```bash
# Run tests with debug information
npm run test:e2e:debug

# This will:
# - Open browser in headed mode
# - Pause on failures
# - Show step-by-step execution
```

## 📊 Test Reports

After running tests, view detailed reports:

```bash
# Open HTML report
npx playwright show-report

# Reports include:
# - Test results summary
# - Screenshots on failure
# - Video recordings
# - Trace files for debugging
```

## 🔄 Continuous Integration

### GitHub Actions Example
```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run Playwright tests
  run: npm run test:e2e
```

## 📝 Adding New Tests

### 1. Create Test File
```typescript
import { test, expect } from '@playwright/test';

test.describe('New Feature Tests', () => {
  test('should test new functionality', async ({ page }) => {
    // Your test code here
  });
});
```

### 2. Add Helper Functions
```typescript
// In utils/test-helpers.ts
export async function newTestHelper(page: Page) {
  // Common test actions
}
```

### 3. Update Configuration
- Add new test files to `playwright.config.ts` if needed
- Update test patterns or exclusions

## 🤝 Contributing

When adding new tests:
- Use descriptive test names
- Follow the existing pattern structure
- Add appropriate assertions
- Include error handling
- Test both positive and negative scenarios

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)

---

**Happy Testing! 🧪✨**
