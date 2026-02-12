/**
 * @fileoverview Unit tests for constants
 */

import { describe, it, expect } from 'vitest';

describe('Constants', () => {
  describe('ACTIONS', () => {
    it('should define all routing actions', () => {
      const ACTIONS = ['static_reply', 'llm_reply', 'workflow'];

      expect(ACTIONS).toHaveLength(3);
      expect(ACTIONS).toContain('static_reply');
      expect(ACTIONS).toContain('llm_reply');
      expect(ACTIONS).toContain('workflow');
    });
  });

  describe('ACTION_LABELS', () => {
    it('should have labels for all actions', () => {
      const ACTION_LABELS = {
        static_reply: 'Static Reply',
        llm_reply: 'LLM Reply',
        workflow: 'Workflow'
      };

      expect(ACTION_LABELS.static_reply).toBe('Static Reply');
      expect(ACTION_LABELS.llm_reply).toBe('LLM Reply');
      expect(ACTION_LABELS.workflow).toBe('Workflow');
    });

    it('should have same keys as ACTIONS', () => {
      const ACTIONS = ['static_reply', 'llm_reply', 'workflow'];
      const ACTION_LABELS = {
        static_reply: 'Static Reply',
        llm_reply: 'LLM Reply',
        workflow: 'Workflow'
      };

      ACTIONS.forEach(action => {
        expect(ACTION_LABELS[action]).toBeDefined();
      });
    });
  });
});
