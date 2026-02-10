import type { BookingState, BookingStepResult, CallAPIFn, PriceBreakdown } from './types.js';
import { calculatePrice, formatPriceSummary } from './pricing.js';
import { formatPriceBreakdown, formatDate, getTemplate } from './formatter.js';

type Language = 'en' | 'ms' | 'zh';

let callAPIFn: CallAPIFn | null = null;

export function initBooking(callAPI: CallAPIFn): void {
  callAPIFn = callAPI;
}

export function createBookingState(): BookingState {
  return { stage: 'inquiry' };
}

// Parse date from various formats
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(input: string): string | null {
  const trimmed = input.trim();

  // Try ISO format first (YYYY-MM-DD)
  const isoMatch = trimmed.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1]);
    const m = parseInt(isoMatch[2]) - 1;
    const day = parseInt(isoMatch[3]);
    const d = new Date(y, m, day);
    if (!isNaN(d.getTime())) return toLocalDateStr(d);
  }

  // Try DD/MM/YYYY
  const dmyMatch = trimmed.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1]);
    const m = parseInt(dmyMatch[2]) - 1;
    const y = parseInt(dmyMatch[3]);
    const d = new Date(y, m, day);
    if (!isNaN(d.getTime())) return toLocalDateStr(d);
  }

  // Try natural language "15 March 2026" or "March 15, 2026"
  const date = new Date(trimmed);
  if (!isNaN(date.getTime()) && date.getFullYear() >= 2025) {
    return toLocalDateStr(date);
  }

  return null;
}

function parseGuestCount(input: string): number | null {
  const match = input.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    if (num >= 1 && num <= 20) return num;
  }
  return null;
}

function isCancelMessage(text: string): boolean {
  return /\b(cancel|batal|no|nevermind|stop)\b/i.test(text) || /取消/.test(text);
}

export async function handleBookingStep(
  state: BookingState,
  input: string,
  lang: Language
): Promise<BookingStepResult> {
  // Check for cancel at any stage
  if (isCancelMessage(input) && state.stage !== 'done') {
    return {
      response: getTemplate('booking_cancelled', lang),
      newState: { ...state, stage: 'cancelled' }
    };
  }

  switch (state.stage) {
    case 'inquiry':
      return {
        response: getTemplate('booking_start', lang),
        newState: { ...state, stage: 'dates' }
      };

    case 'dates': {
      // Try to parse check-in and check-out dates
      // Split on "to", "until", "~" etc, but NOT on "-" inside dates (YYYY-MM-DD)
      const parts = input.split(/\s+(?:to|until|til|sampai)\s+|(?:到)|(?:\s+~\s+)/i);
      const checkIn = parseDate(parts[0]);

      if (!checkIn) {
        const msgs: Record<Language, string> = {
          en: "I couldn't understand that date. Please use a format like *15 March 2026* or *2026-03-15*.",
          ms: 'Maaf, saya tidak faham tarikh itu. Sila gunakan format seperti *15 Mac 2026* atau *2026-03-15*.',
          zh: '抱歉，我无法识别该日期。请使用 *2026年3月15日* 或 *2026-03-15* 格式。'
        };
        return { response: msgs[lang], newState: state };
      }

      let checkOut: string | null = null;
      if (parts.length > 1) {
        checkOut = parseDate(parts[1]);
      }

      if (!checkOut) {
        // Default to 1 night
        const coDate = new Date(checkIn);
        coDate.setDate(coDate.getDate() + 1);
        checkOut = coDate.toISOString().split('T')[0];
      }

      // Validate dates
      const ciDate = new Date(checkIn);
      const coDate = new Date(checkOut);
      if (coDate <= ciDate) {
        const msgs: Record<Language, string> = {
          en: 'Check-out date must be after check-in date. Please try again.',
          ms: 'Tarikh daftar keluar mesti selepas tarikh daftar masuk. Sila cuba lagi.',
          zh: '退房日期必须在入住日期之后。请重试。'
        };
        return { response: msgs[lang], newState: state };
      }

      const breakdown = calculatePrice(checkIn, checkOut);
      const priceText = formatPriceBreakdown(breakdown, lang);
      const guestPrompt = getTemplate('booking_guests', lang);

      const response = [
        `📅 ${formatDate(checkIn, lang)} → ${formatDate(checkOut, lang)}`,
        '',
        priceText,
        '',
        guestPrompt
      ].join('\n');

      return {
        response,
        newState: {
          ...state,
          stage: 'guests',
          checkIn,
          checkOut,
          priceBreakdown: breakdown
        }
      };
    }

    case 'guests': {
      const guestCount = parseGuestCount(input);
      if (!guestCount) {
        const msgs: Record<Language, string> = {
          en: 'Please enter the number of guests (1-20).',
          ms: 'Sila masukkan bilangan tetamu (1-20).',
          zh: '请输入客人人数（1-20人）。'
        };
        return { response: msgs[lang], newState: state };
      }

      // Recalculate price with guest count
      const breakdown = calculatePrice(state.checkIn!, state.checkOut!, guestCount);
      const priceText = formatPriceBreakdown(breakdown, lang);

      const confirmMsgs: Record<Language, string> = {
        en: `*Booking Summary*\n\n📅 ${formatDate(state.checkIn!, lang)} → ${formatDate(state.checkOut!, lang)}\n👥 ${guestCount} guest${guestCount > 1 ? 's' : ''}\n\n${priceText}\n\nReply *yes* to confirm or *cancel* to cancel.`,
        ms: `*Ringkasan Tempahan*\n\n📅 ${formatDate(state.checkIn!, lang)} → ${formatDate(state.checkOut!, lang)}\n👥 ${guestCount} tetamu\n\n${priceText}\n\nBalas *ya* untuk sahkan atau *batal* untuk membatalkan.`,
        zh: `*预订摘要*\n\n📅 ${formatDate(state.checkIn!, lang)} → ${formatDate(state.checkOut!, lang)}\n👥 ${guestCount}位客人\n\n${priceText}\n\n回复 *是* 确认或 *取消* 取消。`
      };

      return {
        response: confirmMsgs[lang],
        newState: {
          ...state,
          stage: 'confirm',
          guests: guestCount,
          priceBreakdown: breakdown
        }
      };
    }

    case 'confirm': {
      const isConfirm = /\b(yes|ya|confirm|ok|sure|是|确认|好)\b/i.test(input);
      if (!isConfirm) {
        const msgs: Record<Language, string> = {
          en: 'Please reply *yes* to confirm your booking or *cancel* to cancel.',
          ms: 'Sila balas *ya* untuk sahkan atau *batal* untuk membatalkan.',
          zh: '请回复 *是* 确认预订或 *取消* 取消。'
        };
        return { response: msgs[lang], newState: state };
      }

      // Create booking via API
      if (callAPIFn) {
        try {
          await callAPIFn('POST', '/api/guest-tokens', {
            autoAssign: true,
            guestCount: state.guests,
            checkIn: state.checkIn,
            checkOut: state.checkOut,
            source: 'whatsapp_bot'
          });
        } catch (err: any) {
          console.error('[Booking] API error:', err.message);
          const msgs: Record<Language, string> = {
            en: 'Sorry, there was an error creating your booking. Please contact staff at +60 10-308 4289.',
            ms: 'Maaf, ada masalah membuat tempahan anda. Sila hubungi staf di +60 10-308 4289.',
            zh: '抱歉，创建预订时出错。请联系工作人员 +60 10-308 4289。'
          };
          return { response: msgs[lang], newState: { ...state, stage: 'cancelled' } };
        }
      }

      return {
        response: getTemplate('booking_done', lang),
        newState: { ...state, stage: 'done' }
      };
    }

    case 'done':
    case 'cancelled':
      // Reset — start fresh
      return {
        response: getTemplate('booking_start', lang),
        newState: createBookingState()
      };

    default:
      return {
        response: getTemplate('booking_start', lang),
        newState: createBookingState()
      };
  }
}
