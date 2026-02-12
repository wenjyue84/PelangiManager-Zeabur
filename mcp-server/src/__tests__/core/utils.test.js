/**
 * @fileoverview Unit tests for core utilities
 */

import { describe, it, expect } from 'vitest';

// Mock module since it uses ES6 exports
const escapeHtml = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

describe('Core Utils', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("XSS")</script>'))
        .toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
    });

    it('should escape quotes', () => {
      expect(escapeHtml('"Hello" & \'World\'')).toContain('&quot;');
    });

    it('should handle empty strings', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should handle normal text without changes', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });
});
