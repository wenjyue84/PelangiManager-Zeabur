import { eld } from 'eld/medium';

export type SupportedLanguage = 'en' | 'ms' | 'zh' | 'unknown';

/** Our 3 supported languages — ELD subset improves speed and accuracy for short text */
const SUPPORTED_CODES: SupportedLanguage[] = ['en', 'ms', 'zh'];

// Restrict ELD to en/ms/zh only (faster + better accuracy for mixed/colloquial)
eld.setLanguageSubset(SUPPORTED_CODES);

/**
 * Language Router - Detects message language and routes to appropriate keywords
 *
 * Supports: English (en), Malay (ms), Chinese (zh)
 * Uses ELD (Efficient Language Detector) for fast, accurate short-text detection;
 * pattern-based fast path for Chinese script and strong Malay/English signals.
 */
export class LanguageRouter {
  // Common patterns for quick detection (fast path; used when ELD is uncertain or text is very short)
  private readonly patterns = {
    zh: /[\u4e00-\u9fff\u3400-\u4dbf]/,  // Chinese characters
    ms: /\b(saya|anda|adalah|dengan|untuk|dari|yang|ini|itu|ada|tidak|boleh|bole|awal|lewat|nak|berapa|mana|apa|assalamualaikum|selamat|terima|kasih)\b/i,
    en: /\b(the|is|are|was|were|have|has|had|do|does|did|can|will|would|hello|hi|hai|hey|thanks|thank|tq|tqvm|thx|wifi|password|check|world)\b/i,
  };

  /** Short Malay-only phrases (avoid ELD/pattern tie or misclassification) */
  private readonly msPhraseOnly = /^password\s+wifi\s*[?.]?$/i;
  private readonly msColloquial = /\b(bole|boleh)\b.*\b(awal|lewat)\b|\b(awal|lewat)\b.*\b(bole|boleh)\b/i;

  /**
   * Detect language from text
   * @param text Input text to analyze
   * @param minLength Minimum text length for statistical detection (default: 3)
   * @returns Detected language code
   */
  detectLanguage(text: string, minLength = 3): SupportedLanguage {
    const cleaned = text.trim();

    // Fast path: Chinese script and strong Malay/English keyword signals
    const patternResult = this.detectByPattern(cleaned);
    if (patternResult !== 'unknown') {
      return patternResult;
    }

    if (cleaned.length < minLength) {
      return 'unknown';
    }

    try {
      const result = eld.detect(cleaned);
      const code = result.language;
      if (code && SUPPORTED_CODES.includes(code as SupportedLanguage)) {
        return code as SupportedLanguage;
      }
      // ELD returned empty or language outside en/ms/zh — fall back to pattern (e.g. short text, abbreviations)
      const patternFallback = this.detectByPattern(cleaned);
      return patternFallback;
    } catch (error) {
      console.warn('[LanguageRouter] Detection error:', error);
      return this.detectByPattern(cleaned);
    }
  }

  /**
   * Fast pattern-based detection for obvious cases
   * @param text Input text
   * @returns Language code or 'unknown'
   */
  private detectByPattern(text: string): SupportedLanguage {
    if (this.patterns.zh.test(text)) return 'zh';
    if (this.msPhraseOnly.test(text) || this.msColloquial.test(text)) return 'ms';

    const malayMatches = (text.match(this.patterns.ms) || []).length;
    const englishMatches = (text.match(this.patterns.en) || []).length;

    if (malayMatches > englishMatches && malayMatches > 0) return 'ms';
    if (englishMatches > malayMatches && englishMatches > 0) return 'en';
    return 'unknown';
  }

  /**
   * Detect language with confidence score
   * @param text Input text
   * @returns { language, confidence } object
   */
  detectWithConfidence(text: string): { language: SupportedLanguage; confidence: number } {
    const cleaned = text.trim();

    if (this.patterns.zh.test(cleaned)) {
      return { language: 'zh', confidence: 0.95 };
    }

    try {
      const result = eld.detect(cleaned);
      const code = result.language as SupportedLanguage;
      if (!code || !SUPPORTED_CODES.includes(code)) {
        return { language: 'unknown', confidence: 0 };
      }
      const scores = result.getScores?.();
      const confidence = scores && typeof scores[code] === 'number' ? scores[code] : (result.isReliable?.() ? 0.9 : 0.5);
      return { language: code, confidence };
    } catch {
      return { language: 'unknown', confidence: 0 };
    }
  }

  /**
   * Get language-specific keywords for better matching
   * @param allKeywords All keyword groups
   * @param detectedLang Detected language
   * @returns Filtered keyword groups
   */
  filterKeywordsByLanguage<T extends { language?: string }>(
    allKeywords: T[],
    detectedLang: SupportedLanguage
  ): T[] {
    // If unknown, return all keywords
    if (detectedLang === 'unknown') {
      return allKeywords;
    }

    // Filter by detected language + English fallback
    return allKeywords.filter(keyword =>
      keyword.language === detectedLang ||
      keyword.language === 'en' ||       // Always include English as fallback
      !keyword.language                   // Include language-agnostic keywords
    );
  }

  /**
   * Get language name for display
   * @param code Language code
   * @returns Human-readable language name
   */
  getLanguageName(code: SupportedLanguage): string {
    const names: Record<SupportedLanguage, string> = {
      'en': 'English',
      'ms': 'Malay',
      'zh': 'Chinese',
      'unknown': 'Unknown'
    };
    return names[code];
  }

  /**
   * Detect if message contains multiple languages (code-switching)
   * @param text Input text
   * @returns Array of detected languages
   */
  detectMixedLanguages(text: string): SupportedLanguage[] {
    const detected: Set<SupportedLanguage> = new Set();

    // Check for Chinese
    if (this.patterns.zh.test(text)) {
      detected.add('zh');
    }

    // Check for Malay patterns
    if (this.patterns.ms.test(text)) {
      detected.add('ms');
    }

    // Check for English patterns
    if (this.patterns.en.test(text)) {
      detected.add('en');
    }

    return Array.from(detected);
  }
}

// Singleton instance
export const languageRouter = new LanguageRouter();
