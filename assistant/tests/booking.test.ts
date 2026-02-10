import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initBooking, createBookingState, handleBookingStep } from '../src/booking.js';

// Mock callAPI
const mockCallAPI = vi.fn().mockResolvedValue({ success: true });

describe('Booking State Machine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initBooking(mockCallAPI);
  });

  describe('createBookingState', () => {
    it('creates state with inquiry stage', () => {
      const state = createBookingState();
      expect(state.stage).toBe('inquiry');
    });
  });

  describe('inquiry → dates', () => {
    it('transitions from inquiry to dates stage', async () => {
      const state = createBookingState();
      const result = await handleBookingStep(state, 'I want to book', 'en');
      expect(result.newState.stage).toBe('dates');
      expect(result.response).toContain('check in');
    });
  });

  describe('dates → guests', () => {
    it('parses date and transitions to guests', async () => {
      const state = { stage: 'dates' as const };
      const result = await handleBookingStep(state, '15 March 2026 to 18 March 2026', 'en');
      expect(result.newState.stage).toBe('guests');
      expect(result.newState.checkIn).toBe('2026-03-15');
      expect(result.newState.checkOut).toBe('2026-03-18');
      expect(result.newState.priceBreakdown).toBeTruthy();
      expect(result.response).toContain('guest');
    });

    it('defaults to 1 night if no checkout date', async () => {
      const state = { stage: 'dates' as const };
      const result = await handleBookingStep(state, '2026-03-15', 'en');
      expect(result.newState.stage).toBe('guests');
      expect(result.newState.checkIn).toBe('2026-03-15');
      expect(result.newState.checkOut).toBe('2026-03-16');
    });

    it('rejects invalid dates', async () => {
      const state = { stage: 'dates' as const };
      const result = await handleBookingStep(state, 'next tuesday maybe', 'en');
      expect(result.newState.stage).toBe('dates'); // Stay in same stage
      expect(result.response).toContain("couldn't understand");
    });

    it('rejects checkout before checkin', async () => {
      const state = { stage: 'dates' as const };
      const result = await handleBookingStep(state, '2026-03-18 to 2026-03-15', 'en');
      expect(result.newState.stage).toBe('dates');
      expect(result.response).toContain('after');
    });
  });

  describe('guests → confirm', () => {
    it('accepts guest count and shows summary', async () => {
      const state = {
        stage: 'guests' as const,
        checkIn: '2026-03-15',
        checkOut: '2026-03-18'
      };
      const result = await handleBookingStep(state, '2', 'en');
      expect(result.newState.stage).toBe('confirm');
      expect(result.newState.guests).toBe(2);
      expect(result.response).toContain('Booking Summary');
      expect(result.response).toContain('yes');
    });

    it('rejects invalid guest count', async () => {
      const state = {
        stage: 'guests' as const,
        checkIn: '2026-03-15',
        checkOut: '2026-03-18'
      };
      const result = await handleBookingStep(state, 'abc', 'en');
      expect(result.newState.stage).toBe('guests');
      expect(result.response).toContain('number of guests');
    });
  });

  describe('confirm → done', () => {
    it('confirms booking and calls API', async () => {
      const state = {
        stage: 'confirm' as const,
        checkIn: '2026-03-15',
        checkOut: '2026-03-18',
        guests: 2,
        priceBreakdown: {
          nights: 3, rateType: 'daily' as const, baseRate: 45,
          totalBase: 90, deposit: 0, total: 90, currency: 'MYR'
        }
      };
      const result = await handleBookingStep(state, 'yes', 'en');
      expect(result.newState.stage).toBe('done');
      expect(result.response).toContain('confirmed');
      expect(mockCallAPI).toHaveBeenCalledWith('POST', '/api/guest-tokens', expect.objectContaining({
        autoAssign: true,
        guestCount: 2
      }));
    });

    it('rejects non-confirmation', async () => {
      const state = {
        stage: 'confirm' as const,
        checkIn: '2026-03-15',
        checkOut: '2026-03-18',
        guests: 1
      };
      const result = await handleBookingStep(state, 'maybe', 'en');
      expect(result.newState.stage).toBe('confirm');
      expect(result.response).toContain('yes');
    });

    it('handles API failure gracefully', async () => {
      mockCallAPI.mockRejectedValueOnce(new Error('API down'));
      const state = {
        stage: 'confirm' as const,
        checkIn: '2026-03-15',
        checkOut: '2026-03-18',
        guests: 1,
        priceBreakdown: {
          nights: 3, rateType: 'daily' as const, baseRate: 45,
          totalBase: 45, deposit: 0, total: 45, currency: 'MYR'
        }
      };
      const result = await handleBookingStep(state, 'yes', 'en');
      expect(result.newState.stage).toBe('cancelled');
      expect(result.response).toContain('error');
    });
  });

  describe('cancel at any stage', () => {
    const stages: Array<'dates' | 'guests' | 'confirm'> = ['dates', 'guests', 'confirm'];
    for (const stage of stages) {
      it(`cancels from ${stage} stage`, async () => {
        const state = { stage };
        const result = await handleBookingStep(state, 'cancel', 'en');
        expect(result.newState.stage).toBe('cancelled');
        expect(result.response).toContain('cancelled');
      });
    }

    it('recognizes "batal" as cancel', async () => {
      const state = { stage: 'dates' as const };
      const result = await handleBookingStep(state, 'batal', 'en');
      expect(result.newState.stage).toBe('cancelled');
    });

    it('recognizes "取消" as cancel', async () => {
      const state = { stage: 'guests' as const, checkIn: '2026-03-15', checkOut: '2026-03-18' };
      const result = await handleBookingStep(state, '取消', 'zh');
      expect(result.newState.stage).toBe('cancelled');
    });
  });

  describe('multilingual responses', () => {
    it('responds in Malay', async () => {
      const state = createBookingState();
      const result = await handleBookingStep(state, 'tempah', 'ms');
      expect(result.response).toContain('masuk');
    });

    it('responds in Chinese', async () => {
      const state = createBookingState();
      const result = await handleBookingStep(state, '预订', 'zh');
      expect(result.response).toContain('入住');
    });
  });
});
