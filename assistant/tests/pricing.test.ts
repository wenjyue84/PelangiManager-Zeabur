import { describe, it, expect, beforeAll } from 'vitest';
import { initPricing, calculatePrice, isHoliday, getPricingConfig, formatPriceSummary } from '../src/pricing.js';

describe('Pricing Calculator', () => {
  beforeAll(() => {
    initPricing();
  });

  describe('getPricingConfig', () => {
    it('loads pricing configuration', () => {
      const config = getPricingConfig();
      expect(config.daily).toBe(45);
      expect(config.weekly).toBe(270);
      expect(config.monthly).toBe(594);
      expect(config.deposit).toBe(200);
      expect(config.currency).toBe('MYR');
    });
  });

  describe('calculatePrice — daily rate', () => {
    it('calculates 1 night correctly', () => {
      const result = calculatePrice('2026-03-15', '2026-03-16');
      expect(result.nights).toBe(1);
      expect(result.rateType).toBe('daily');
      expect(result.baseRate).toBe(45);
      expect(result.totalBase).toBe(45);
      expect(result.deposit).toBe(0);
      expect(result.total).toBe(45);
    });

    it('calculates 3 nights correctly', () => {
      const result = calculatePrice('2026-03-15', '2026-03-18');
      expect(result.nights).toBe(3);
      expect(result.totalBase).toBe(135);
      expect(result.total).toBe(135);
    });

    it('calculates 6 nights at daily rate', () => {
      const result = calculatePrice('2026-03-15', '2026-03-21');
      expect(result.nights).toBe(6);
      expect(result.rateType).toBe('daily');
      expect(result.totalBase).toBe(270);
    });
  });

  describe('calculatePrice — weekly rate', () => {
    it('applies weekly rate for 7 nights', () => {
      const result = calculatePrice('2026-03-15', '2026-03-22');
      expect(result.nights).toBe(7);
      expect(result.rateType).toBe('weekly');
      expect(result.totalBase).toBe(270);
      expect(result.savings).toBeTruthy();
    });

    it('applies weekly + daily for 10 nights', () => {
      const result = calculatePrice('2026-03-15', '2026-03-25');
      expect(result.nights).toBe(10);
      expect(result.rateType).toBe('weekly');
      // 1 week (270) + 3 days (135) = 405
      expect(result.totalBase).toBe(405);
    });

    it('applies weekly rate for 14 nights (2 weeks)', () => {
      const result = calculatePrice('2026-03-15', '2026-03-29');
      expect(result.nights).toBe(14);
      expect(result.totalBase).toBe(540); // 2 * 270
    });
  });

  describe('calculatePrice — monthly rate', () => {
    it('applies monthly rate for 30 nights', () => {
      const result = calculatePrice('2026-03-01', '2026-03-31');
      expect(result.nights).toBe(30);
      expect(result.rateType).toBe('monthly');
      expect(result.totalBase).toBe(594);
      expect(result.deposit).toBe(200);
      expect(result.total).toBe(794);
    });

    it('applies monthly + daily for 35 nights', () => {
      const result = calculatePrice('2026-03-01', '2026-04-05');
      expect(result.nights).toBe(35);
      expect(result.rateType).toBe('monthly');
      // 1 month (594) + 5 days (225) = 819
      expect(result.totalBase).toBe(819);
      expect(result.deposit).toBe(200);
    });
  });

  describe('calculatePrice — multi-guest', () => {
    it('multiplies base price by guest count', () => {
      const result = calculatePrice('2026-03-15', '2026-03-16', 2);
      expect(result.totalBase).toBe(90); // 45 * 2
      expect(result.total).toBe(90);
    });

    it('multiplies weekly price by guest count', () => {
      const result = calculatePrice('2026-03-15', '2026-03-22', 3);
      expect(result.totalBase).toBe(810); // 270 * 3
    });
  });

  describe('calculatePrice — edge cases', () => {
    it('handles same-day check-in/out as 1 night minimum', () => {
      const result = calculatePrice('2026-03-15', '2026-03-15');
      expect(result.nights).toBeGreaterThanOrEqual(1);
    });

    it('returns MYR as currency', () => {
      const result = calculatePrice('2026-03-15', '2026-03-16');
      expect(result.currency).toBe('MYR');
    });
  });

  describe('isHoliday', () => {
    it('identifies Chinese New Year as holiday', () => {
      const result = isHoliday('2026-02-17');
      expect(result).toBe('Chinese New Year');
    });

    it('identifies Merdeka Day', () => {
      expect(isHoliday('2026-08-31')).toBe('Merdeka Day');
    });

    it('returns null for non-holidays', () => {
      expect(isHoliday('2026-06-15')).toBeNull();
    });
  });

  describe('formatPriceSummary', () => {
    it('formats a simple summary', () => {
      const breakdown = {
        nights: 3,
        rateType: 'daily' as const,
        baseRate: 45,
        totalBase: 135,
        deposit: 0,
        total: 135,
        currency: 'MYR'
      };
      const text = formatPriceSummary(breakdown);
      expect(text).toContain('3 nights');
      expect(text).toContain('RM135');
    });

    it('includes deposit info', () => {
      const breakdown = {
        nights: 30,
        rateType: 'monthly' as const,
        baseRate: 19.8,
        totalBase: 594,
        deposit: 200,
        total: 794,
        currency: 'MYR'
      };
      const text = formatPriceSummary(breakdown);
      expect(text).toContain('RM200 deposit');
    });

    it('uses singular night for 1 night', () => {
      const breakdown = {
        nights: 1,
        rateType: 'daily' as const,
        baseRate: 45,
        totalBase: 45,
        deposit: 0,
        total: 45,
        currency: 'MYR'
      };
      const text = formatPriceSummary(breakdown);
      expect(text).toContain('1 night:');
    });
  });
});
