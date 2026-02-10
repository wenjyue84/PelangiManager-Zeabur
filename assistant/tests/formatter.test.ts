import { describe, it, expect } from 'vitest';
import { detectLanguage, getTemplate, formatPrice, formatDate, formatPriceBreakdown } from '../src/formatter.js';

describe('Language Detection', () => {
  it('detects English by default', () => {
    expect(detectLanguage('What is the wifi password?')).toBe('en');
  });

  it('detects Malay from keywords', () => {
    expect(detectLanguage('Saya nak tahu harga bilik')).toBe('ms');
  });

  it('detects Chinese from characters', () => {
    expect(detectLanguage('你好，请问价格多少')).toBe('zh');
  });

  it('defaults to English for ambiguous text', () => {
    expect(detectLanguage('ok')).toBe('en');
  });
});

describe('Templates', () => {
  it('returns greeting in English', () => {
    const text = getTemplate('greeting', 'en');
    expect(text).toContain('Welcome');
  });

  it('returns greeting in Malay', () => {
    const text = getTemplate('greeting', 'ms');
    expect(text).toContain('Selamat datang');
  });

  it('returns greeting in Chinese', () => {
    const text = getTemplate('greeting', 'zh');
    expect(text).toContain('欢迎');
  });

  it('returns empty string for unknown template', () => {
    expect(getTemplate('nonexistent', 'en')).toBe('');
  });

  it('returns unavailable message', () => {
    const text = getTemplate('unavailable', 'en');
    expect(text).toContain('temporarily unavailable');
    expect(text).toContain('+60 10-308 4289');
  });

  it('returns rate limited message', () => {
    const text = getTemplate('rate_limited', 'en');
    expect(text).toContain('too quickly');
  });
});

describe('Price Formatting', () => {
  it('formats price with RM prefix', () => {
    expect(formatPrice(45)).toBe('RM45');
    expect(formatPrice(270)).toBe('RM270');
  });
});

describe('Date Formatting', () => {
  it('formats date in English', () => {
    const formatted = formatDate('2026-03-15', 'en');
    expect(formatted).toContain('15');
    expect(formatted).toContain('2026');
  });
});

describe('Price Breakdown Formatting', () => {
  it('formats a breakdown in English', () => {
    const breakdown = {
      nights: 3,
      rateType: 'daily',
      baseRate: 45,
      totalBase: 135,
      deposit: 0,
      total: 135,
      currency: 'MYR'
    };
    const text = formatPriceBreakdown(breakdown, 'en');
    expect(text).toContain('Price Breakdown');
    expect(text).toContain('3 nights');
    expect(text).toContain('RM45');
    expect(text).toContain('RM135');
  });

  it('includes deposit when present', () => {
    const breakdown = {
      nights: 30,
      rateType: 'monthly',
      baseRate: 19.8,
      totalBase: 594,
      deposit: 200,
      total: 794,
      currency: 'MYR'
    };
    const text = formatPriceBreakdown(breakdown, 'en');
    expect(text).toContain('Deposit');
    expect(text).toContain('RM200');
  });

  it('includes savings when present', () => {
    const breakdown = {
      nights: 7,
      rateType: 'weekly',
      baseRate: 38.57,
      totalBase: 270,
      deposit: 0,
      total: 270,
      savings: 'Save RM45 vs daily rate!',
      currency: 'MYR'
    };
    const text = formatPriceBreakdown(breakdown, 'en');
    expect(text).toContain('Save RM45');
  });

  it('formats in Chinese', () => {
    const breakdown = {
      nights: 3,
      rateType: 'daily',
      baseRate: 45,
      totalBase: 135,
      deposit: 0,
      total: 135,
      currency: 'MYR'
    };
    const text = formatPriceBreakdown(breakdown, 'zh');
    expect(text).toContain('价格明细');
  });
});
