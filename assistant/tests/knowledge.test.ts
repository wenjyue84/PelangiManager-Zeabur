import { describe, it, expect } from 'vitest';
import { getAnswer } from '../src/knowledge.js';

describe('Knowledge Base', () => {
  it('returns WiFi info in English', () => {
    const answer = getAnswer('wifi', 'en');
    expect(answer).toContain('pelangi capsule');
    expect(answer).toContain('ilovestaycapsule');
  });

  it('returns WiFi info in Malay', () => {
    const answer = getAnswer('wifi', 'ms');
    expect(answer).toContain('pelangi capsule');
  });

  it('returns WiFi info in Chinese', () => {
    const answer = getAnswer('wifi', 'zh');
    expect(answer).toContain('pelangi capsule');
  });

  it('returns directions with Google Maps link', () => {
    const answer = getAnswer('directions', 'en');
    expect(answer).toContain('26A Jalan Perang');
    expect(answer).toContain('maps.app.goo.gl');
  });

  it('returns check-in info with time and door code', () => {
    const answer = getAnswer('checkin_info', 'en');
    expect(answer).toContain('2:00 PM');
    expect(answer).toContain('1270#');
  });

  it('returns check-out info', () => {
    const answer = getAnswer('checkout_info', 'en');
    expect(answer).toContain('12:00 PM');
  });

  it('returns pricing info', () => {
    const answer = getAnswer('pricing', 'en');
    expect(answer).toContain('RM45');
    expect(answer).toContain('RM270');
    expect(answer).toContain('RM594');
  });

  it('returns facilities info', () => {
    const answer = getAnswer('facilities', 'en');
    expect(answer).toContain('24 capsules');
    expect(answer).toContain('kitchen');
  });

  it('returns house rules', () => {
    const answer = getAnswer('rules', 'en');
    expect(answer).toContain('smoking');
    expect(answer).toContain('Quiet hours');
  });

  it('returns null for unknown intent', () => {
    const answer = getAnswer('general', 'en');
    expect(answer).toBeNull();
  });

  it('falls back to English for missing language', () => {
    const en = getAnswer('wifi', 'en');
    expect(en).toBeTruthy();
  });
});
