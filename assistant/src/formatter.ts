type Language = 'en' | 'ms' | 'zh';

// Simple keyword-based language detection
const MS_KEYWORDS = ['apa', 'berapa', 'bila', 'mana', 'saya', 'boleh', 'nak', 'ada', 'ini', 'itu', 'harga', 'bilik', 'masuk', 'keluar', 'terima kasih', 'tolong', 'encik', 'cik'];
const ZH_KEYWORDS = ['你好', '多少', '价格', '房间', '入住', '退房', '谢谢', '请问', '可以', '我要', '什么', '哪里', '怎么', '几点', '有没有'];

export function detectLanguage(text: string): Language {
  const lower = text.toLowerCase();

  // Check Chinese characters first (most distinctive)
  if (/[\u4e00-\u9fff]/.test(text)) {
    return 'zh';
  }

  // Check Malay keywords
  const msCount = MS_KEYWORDS.filter(kw => lower.includes(kw)).length;
  if (msCount >= 2) return 'ms';

  return 'en';
}

// Trilingual template responses
interface TrilingualText {
  en: string;
  ms: string;
  zh: string;
}

const TEMPLATES: Record<string, TrilingualText> = {
  greeting: {
    en: 'Hi there! Welcome to Pelangi Capsule Hostel. How can I help you today?',
    ms: 'Hai! Selamat datang ke Pelangi Capsule Hostel. Bagaimana saya boleh bantu?',
    zh: '你好！欢迎来到Pelangi胶囊旅馆。有什么可以帮到你的吗？'
  },
  thanks: {
    en: "You're welcome! Feel free to ask if you need anything else.",
    ms: 'Sama-sama! Jangan segan untuk bertanya jika perlukan apa-apa lagi.',
    zh: '不客气！如果还有其他问题，请随时问我。'
  },
  unavailable: {
    en: "I'm temporarily unavailable. Please contact staff directly at +60 10-308 4289.",
    ms: 'Maaf, saya tidak dapat membantu buat masa ini. Sila hubungi staf di +60 10-308 4289.',
    zh: '抱歉，我暂时无法服务。请直接联系工作人员 +60 10-308 4289。'
  },
  rate_limited: {
    en: "You're sending messages too quickly. Please wait a moment and try again.",
    ms: 'Anda menghantar mesej terlalu cepat. Sila tunggu sebentar dan cuba lagi.',
    zh: '您发送消息太快了，请稍等片刻再试。'
  },
  error: {
    en: 'Sorry, something went wrong. Please try again or contact staff at +60 10-308 4289.',
    ms: 'Maaf, ada masalah teknikal. Sila cuba lagi atau hubungi staf di +60 10-308 4289.',
    zh: '抱歉，出现了一些问题。请重试或联系工作人员 +60 10-308 4289。'
  },
  escalating: {
    en: "I'm connecting you with our team. Someone will respond shortly!",
    ms: 'Saya menghubungkan anda dengan pasukan kami. Seseorang akan membalas sebentar lagi!',
    zh: '正在为您转接我们的团队，马上会有人回复您！'
  },
  booking_start: {
    en: "I'd love to help you book! When would you like to check in? (e.g., 15 March 2026)",
    ms: 'Saya boleh bantu dengan tempahan! Bila anda ingin daftar masuk? (cth: 15 Mac 2026)',
    zh: '我来帮您预订！请问您想什么时候入住？（例如：2026年3月15日）'
  },
  booking_guests: {
    en: 'How many guests will be staying?',
    ms: 'Berapa ramai tetamu yang akan menginap?',
    zh: '请问有几位客人入住？'
  },
  booking_cancelled: {
    en: 'No problem! Your booking has been cancelled. Let me know if you need anything else.',
    ms: 'Tiada masalah! Tempahan anda telah dibatalkan. Beritahu saya jika perlukan apa-apa lagi.',
    zh: '没问题！您的预订已取消。如果还需要其他帮助，请告诉我。'
  },
  booking_done: {
    en: 'Your booking is confirmed! Check your phone for the check-in link.',
    ms: 'Tempahan anda telah disahkan! Semak telefon anda untuk pautan daftar masuk.',
    zh: '预订已确认！请查看您手机上的入住链接。'
  }
};

export function getTemplate(key: string, lang: Language): string {
  const template = TEMPLATES[key];
  if (!template) return '';
  return template[lang] || template.en;
}

export function formatPrice(amount: number, currency: string = 'MYR'): string {
  return `RM${amount.toFixed(0)}`;
}

export function formatDate(dateStr: string, lang: Language): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const locale = lang === 'ms' ? 'ms-MY' : lang === 'zh' ? 'zh-CN' : 'en-MY';
  return date.toLocaleDateString(locale, options);
}

export function formatPriceBreakdown(
  breakdown: { nights: number; rateType: string; baseRate: number; totalBase: number; deposit: number; total: number; savings?: string; currency: string },
  lang: Language
): string {
  const lines: string[] = [];

  if (lang === 'zh') {
    lines.push(`*价格明细*`);
    lines.push(`${breakdown.nights}晚 x RM${breakdown.baseRate}/晚`);
    lines.push(`小计: RM${breakdown.totalBase}`);
    if (breakdown.deposit > 0) lines.push(`押金: RM${breakdown.deposit}`);
    lines.push(`*总计: RM${breakdown.total}*`);
    if (breakdown.savings) lines.push(`_${breakdown.savings}_`);
  } else if (lang === 'ms') {
    lines.push(`*Pecahan Harga*`);
    lines.push(`${breakdown.nights} malam x RM${breakdown.baseRate}/malam`);
    lines.push(`Subtotal: RM${breakdown.totalBase}`);
    if (breakdown.deposit > 0) lines.push(`Deposit: RM${breakdown.deposit}`);
    lines.push(`*Jumlah: RM${breakdown.total}*`);
    if (breakdown.savings) lines.push(`_${breakdown.savings}_`);
  } else {
    lines.push(`*Price Breakdown*`);
    lines.push(`${breakdown.nights} nights x RM${breakdown.baseRate}/night`);
    lines.push(`Subtotal: RM${breakdown.totalBase}`);
    if (breakdown.deposit > 0) lines.push(`Deposit: RM${breakdown.deposit}`);
    lines.push(`*Total: RM${breakdown.total}*`);
    if (breakdown.savings) lines.push(`_${breakdown.savings}_`);
  }

  return lines.join('\n');
}
