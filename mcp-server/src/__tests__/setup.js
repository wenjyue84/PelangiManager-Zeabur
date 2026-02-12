/**
 * Vitest Test Setup
 * Global mocks and test utilities
 */

import { beforeEach, vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

// Mock localStorage
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock document methods used by modules
global.document.getElementById = vi.fn((id) => ({
  innerHTML: '',
  textContent: '',
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
    contains: vi.fn(),
  },
  dataset: {},
}));

global.document.querySelector = vi.fn();
global.document.querySelectorAll = vi.fn(() => []);

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
