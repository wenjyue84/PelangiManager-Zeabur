import { describe, it, expect, vi } from 'vitest';
import { _regexClassify } from '../src/intents.js';

describe('Intent Classification — Regex Layer', () => {
  // Greetings
  describe('greeting', () => {
    const greetings = ['hi', 'hello', 'hey', 'hai', 'good morning', 'good afternoon', 'good evening', 'good night', 'assalamualaikum', 'salam', 'selamat pagi', '你好', '嗨'];
    for (const msg of greetings) {
      it(`classifies "${msg}" as greeting`, () => {
        const result = _regexClassify(msg);
        expect(result?.category).toBe('greeting');
        expect(result?.source).toBe('regex');
      });
    }
  });

  // Thanks
  describe('thanks', () => {
    const thanksMessages = ['thanks', 'thank you', 'terima kasih', 'tq', 'ty', '谢谢', '感谢'];
    for (const msg of thanksMessages) {
      it(`classifies "${msg}" as thanks`, () => {
        expect(_regexClassify(msg)?.category).toBe('thanks');
      });
    }
  });

  // WiFi
  describe('wifi', () => {
    const wifiMessages = ['what is the wifi password', 'wifi', 'internet password', '密码是什么'];
    for (const msg of wifiMessages) {
      it(`classifies "${msg}" as wifi`, () => {
        expect(_regexClassify(msg)?.category).toBe('wifi');
      });
    }
  });

  // Directions
  describe('directions', () => {
    const directionMessages = ['how to get there', 'where is the hostel', 'address please', 'google map', 'di mana', '地址', '怎么走'];
    for (const msg of directionMessages) {
      it(`classifies "${msg}" as directions`, () => {
        expect(_regexClassify(msg)?.category).toBe('directions');
      });
    }
  });

  // Check-in
  describe('checkin_info', () => {
    const checkinMessages = ['check in time', 'check-in', 'what time can i arrive', 'daftar masuk', '入住', '几点入住'];
    for (const msg of checkinMessages) {
      it(`classifies "${msg}" as checkin_info`, () => {
        expect(_regexClassify(msg)?.category).toBe('checkin_info');
      });
    }
  });

  // Check-out
  describe('checkout_info', () => {
    const checkoutMessages = ['check out time', 'check-out', 'what time leave', 'daftar keluar', '退房'];
    for (const msg of checkoutMessages) {
      it(`classifies "${msg}" as checkout_info`, () => {
        expect(_regexClassify(msg)?.category).toBe('checkout_info');
      });
    }
  });

  // Pricing
  describe('pricing', () => {
    const pricingMessages = ['how much', 'price', 'rate per night', 'berapa harga', '价格', '多少钱'];
    for (const msg of pricingMessages) {
      it(`classifies "${msg}" as pricing`, () => {
        expect(_regexClassify(msg)?.category).toBe('pricing');
      });
    }
  });

  // Availability
  describe('availability', () => {
    const availMessages = ['any rooms available', 'availability', 'any bed', 'ada bilik', '有没有房', '空房'];
    for (const msg of availMessages) {
      it(`classifies "${msg}" as availability`, () => {
        expect(_regexClassify(msg)?.category).toBe('availability');
      });
    }
  });

  // Booking
  describe('booking', () => {
    const bookingMessages = ['i want to book', 'booking', 'reserve a capsule', 'nak tempah', '预订'];
    for (const msg of bookingMessages) {
      it(`classifies "${msg}" as booking`, () => {
        expect(_regexClassify(msg)?.category).toBe('booking');
      });
    }
  });

  // Complaint
  describe('complaint', () => {
    const complaintMessages = ['the capsule is broken', 'too noisy', 'dirty bathroom', 'complaint', 'masalah', '投诉', '太吵'];
    for (const msg of complaintMessages) {
      it(`classifies "${msg}" as complaint`, () => {
        expect(_regexClassify(msg)?.category).toBe('complaint');
      });
    }
  });

  // Contact staff
  describe('contact_staff', () => {
    const staffMessages = ['talk to staff', 'speak to manager', 'real person', 'contact human', '找人', '工作人员'];
    for (const msg of staffMessages) {
      it(`classifies "${msg}" as contact_staff`, () => {
        expect(_regexClassify(msg)?.category).toBe('contact_staff');
      });
    }
  });

  // Facilities
  describe('facilities', () => {
    const facilityMessages = ['what facilities', 'kitchen', 'laundry', 'parking', '设施', '厨房'];
    for (const msg of facilityMessages) {
      it(`classifies "${msg}" as facilities`, () => {
        expect(_regexClassify(msg)?.category).toBe('facilities');
      });
    }
  });

  // Rules
  describe('rules', () => {
    const rulesMessages = ['house rules', 'smoking allowed?', 'quiet hours', 'peraturan', '规则'];
    for (const msg of rulesMessages) {
      it(`classifies "${msg}" as rules`, () => {
        expect(_regexClassify(msg)?.category).toBe('rules');
      });
    }
  });

  // Unknown
  describe('unknown/unmatched', () => {
    it('returns null for unrecognized messages', () => {
      expect(_regexClassify('random gibberish xyz')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(_regexClassify('')).toBeNull();
    });

    it('returns null for whitespace only', () => {
      expect(_regexClassify('   ')).toBeNull();
    });
  });

  // Confidence
  it('returns 0.85 confidence for regex matches', () => {
    const result = _regexClassify('hello');
    expect(result?.confidence).toBe(0.85);
  });
});
