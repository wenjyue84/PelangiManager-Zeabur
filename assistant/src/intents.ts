import type { IntentResult, IntentCategory, ChatMessage } from './types.js';
import { classifyIntent as llmClassify } from './ai-client.js';

// ─── Regex Patterns (Layer 1 — instant, free) ──────────────────────
interface RegexPattern {
  category: IntentCategory;
  patterns: RegExp[];
}

const REGEX_PATTERNS: RegexPattern[] = [
  {
    category: 'greeting',
    patterns: [
      /^(hi|hello|hey|helo|hai|apa khabar|你好|嗨|good\s?(morning|afternoon|evening|night))/i,
      /^(assalamualaikum|salam|selamat\s?(pagi|petang|malam))/i,
    ]
  },
  {
    category: 'thanks',
    patterns: [
      /\b(thanks?|thank\s?you|terima\s?kasih|tq|ty|appreciate)\b/i,
      /(谢谢|感谢)/i,
    ]
  },
  {
    category: 'wifi',
    patterns: [
      /\b(wifi|wi-fi|internet|password|ssid)\b/i,
      /(网络|密码|无线)/i,
    ]
  },
  {
    category: 'directions',
    patterns: [
      /\b(direction|where|location|address|map|how\s?to\s?(get|go|reach|find)|google\s?map|navigate|alamat|di\s?mana|lokasi)\b/i,
      /(地址|位置|怎么走|在哪|路线)/i,
    ]
  },
  {
    category: 'checkin_info',
    patterns: [
      /\b(check[\s-]?in|daftar\s?masuk|what\s?time.*arrive|when.*come|masa\s?masuk)\b/i,
      /(入住|几点.*入)/i,
    ]
  },
  {
    category: 'checkout_info',
    patterns: [
      /\b(check[\s-]?out|daftar\s?keluar|what\s?time.*leave|when.*leave|masa\s?keluar)\b/i,
      /(退房|几点.*退)/i,
    ]
  },
  {
    category: 'pricing',
    patterns: [
      /\b(price|pricing|rate|cost|how\s?much|berapa|harga|kadar|rm\s?\d+)\b/i,
      /(价格|多少钱|费用)/i,
    ]
  },
  {
    category: 'availability',
    patterns: [
      /\b(available|availability|any\s?(room|capsule|bed)|vacancy|ada\s?(bilik|katil|kosong))\b/i,
      /(有没有.*房|空房|还有.*位)/i,
    ]
  },
  {
    category: 'booking',
    patterns: [
      /\b(book|booking|reserve|reservation|tempah|tempahan|i\s?want\s?to\s?(book|stay|reserve))\b/i,
      /(预[订定]|我要.*[订定])/i,
    ]
  },
  {
    category: 'complaint',
    patterns: [
      /\b(complain|complaint|broken|dirty|noisy|loud|uncomfortable|issue|problem|not\s?working|aduan|rosak|kotor|bising|masalah)\b/i,
      /(投诉|坏了|脏|太吵|有问题)/i,
    ]
  },
  {
    category: 'contact_staff',
    patterns: [
      /\b(staff|manager|human|person|real\s?person|talk\s?to|speak\s?to|contact|call|pekerja|pengurus|manusia)\b/i,
      /(联系|工作人员|找人|真人)/i,
    ]
  },
  {
    category: 'facilities',
    patterns: [
      /\b(facilit\w*|kitchen|laundry|bathroom|shower|towel|parking|locker|kemudahan|dapur|dobi|bilik\s?air|tuala)\b/i,
      /(设施|厨房|洗衣|浴室|毛巾|停车)/i,
    ]
  },
  {
    category: 'rules',
    patterns: [
      /\b(rules?|policy|regulation|smoking|quiet\s?hours?|pet|peraturan|dasar|merokok)\b/i,
      /(规则|规定|可以吗|允许)/i,
    ]
  },
];

function regexClassify(text: string): IntentResult | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  for (const { category, patterns } of REGEX_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        return {
          category,
          confidence: 0.85,
          entities: {},
          source: 'regex'
        };
      }
    }
  }
  return null;
}

export async function classifyMessage(
  text: string,
  history: ChatMessage[] = []
): Promise<IntentResult> {
  // Layer 1: Regex (instant, free)
  const regexResult = regexClassify(text);
  if (regexResult) return regexResult;

  // Layer 2: LLM fallback (Groq)
  try {
    const llmResult = await llmClassify(text, history);
    return {
      ...llmResult,
      source: 'llm'
    };
  } catch {
    return {
      category: 'unknown',
      confidence: 0,
      entities: {},
      source: 'llm'
    };
  }
}

// Export for testing
export { regexClassify as _regexClassify };
