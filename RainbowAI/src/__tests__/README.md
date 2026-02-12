# Rainbow Dashboard Tests

Unit tests for Rainbow dashboard modules using Vitest.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:ui

# Run with coverage report
npm run test:coverage

# Run tests once (CI mode)
npm run test:run
```

## Test Structure

```
src/__tests__/
├── setup.js              # Global test setup and mocks
├── core/                 # Tests for core infrastructure
│   ├── utils.test.js
│   ├── constants.test.js
│   └── state.test.js
└── modules/              # Tests for feature modules
    ├── config.test.js
    ├── status.test.js
    └── instances.test.js
```

## Writing Tests

### Example Test

```javascript
import { describe, it, expect, vi } from 'vitest';

describe('MyModule', () => {
  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

### Mocking API Calls

```javascript
const mockApi = vi.fn();
vi.mock('../../public/js/api.js', () => ({
  api: mockApi
}));

// In test
mockApi.mockResolvedValue({ data: 'test' });
```

## Coverage

Coverage reports are generated in `coverage/` directory.

Target: >80% coverage for core modules
