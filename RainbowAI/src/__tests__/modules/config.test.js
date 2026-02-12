/**
 * @fileoverview Unit tests for config module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock API module
const mockApi = vi.fn();
const mockToast = vi.fn();

vi.mock('../../public/js/api.js', () => ({
  api: mockApi
}));

vi.mock('../../public/js/toast.js', () => ({
  toast: mockToast
}));

describe('Config Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.document.querySelector = vi.fn();
  });

  describe('reloadConfig', () => {
    it('should call reload API endpoint', async () => {
      mockApi.mockResolvedValue({ success: true });
      global.document.querySelector.mockReturnValue({
        dataset: { tab: 'status' }
      });

      // Dynamically import to apply mocks
      const { reloadConfig } = await import('../../public/js/modules/config.js');

      await reloadConfig();

      expect(mockApi).toHaveBeenCalledWith('/reload', { method: 'POST' });
      expect(mockToast).toHaveBeenCalledWith('Config reloaded from disk');
    });

    it('should show error toast on failure', async () => {
      mockApi.mockRejectedValue(new Error('Network error'));
      global.document.querySelector.mockReturnValue({
        dataset: { tab: 'status' }
      });

      const { reloadConfig } = await import('../../public/js/modules/config.js');

      await reloadConfig();

      expect(mockToast).toHaveBeenCalledWith('Network error', 'error');
    });
  });
});
