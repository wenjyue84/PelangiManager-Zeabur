/**
 * common.ts — Reusable field validators, search/bulk schemas, pagination types, and utilities
 *
 * These validators are used across multiple domain files and exported for direct use.
 */
import { z } from "zod";
import {
  PHONE_REGEX,
  NAME_REGEX,
  USERNAME_REGEX,
  IC_FORMATTED_REGEX,
  PASSPORT_REGEX,
  CAPSULE_NUMBER_REGEX,
  PAYMENT_AMOUNT_REGEX,
  DATE_REGEX,
  PASSWORD_LOWERCASE_REGEX,
  PASSWORD_UPPERCASE_REGEX,
  PASSWORD_DIGIT_REGEX,
  PASSWORD_SPECIAL_REGEX,
  AGE_REGEX,
} from "../validation-patterns";

// ─── Reusable Field Validators ───────────────────────────────────────

export const phoneNumberSchema = z.string()
  .regex(PHONE_REGEX, "Please enter a valid phone number (7-20 digits, may include +, spaces, dashes, parentheses)")
  .transform(val => val.replace(/\s/g, ""));

export const emailSchema = z.string()
  .email("Please enter a valid email address")
  .min(5, "Email must be at least 5 characters long")
  .max(254, "Email must not exceed 254 characters")
  .toLowerCase()
  .transform(val => val.trim());

export const capsuleNumberSchema = z.string()
  .min(1, "Capsule number is required")
  .regex(CAPSULE_NUMBER_REGEX, "Capsule number must be in format like C1, C2, C24")
  .transform(val => val.toUpperCase());

export const nameSchema = z.string()
  .min(2, "Name must be at least 2 characters long")
  .max(100, "Name must not exceed 100 characters")
  .regex(NAME_REGEX, "Name can only contain letters, spaces, periods, apostrophes, and hyphens")
  .transform(val => val.trim());

export const passwordStrengthSchema = z.string()
  .min(8, "Password must be at least 8 characters long")
  .max(128, "Password must not exceed 128 characters")
  .regex(PASSWORD_LOWERCASE_REGEX, "Password must contain at least one lowercase letter")
  .regex(PASSWORD_UPPERCASE_REGEX, "Password must contain at least one uppercase letter")
  .regex(PASSWORD_DIGIT_REGEX, "Password must contain at least one number")
  .regex(PASSWORD_SPECIAL_REGEX, "Password must contain at least one special character");

export const malaysianICSchema = z.string()
  .regex(IC_FORMATTED_REGEX, "IC number must be in format XXXXXX-XX-XXXX")
  .refine(val => {
    const datePart = val.substring(0, 6);
    const year = parseInt(datePart.substring(0, 2));
    const month = parseInt(datePart.substring(2, 4));
    const day = parseInt(datePart.substring(4, 6));
    const fullYear = year < 30 ? 2000 + year : 1900 + year;
    const date = new Date(fullYear, month - 1, day);
    return date.getFullYear() === fullYear &&
      date.getMonth() === month - 1 &&
      date.getDate() === day &&
      month >= 1 && month <= 12 &&
      day >= 1 && day <= 31;
  }, "Please enter a valid IC number with a valid birth date");

export const passportNumberSchema = z.string()
  .min(6, "Passport number must be at least 6 characters long")
  .max(15, "Passport number must not exceed 15 characters")
  .regex(PASSPORT_REGEX, "Passport number can only contain uppercase letters and numbers")
  .transform(val => val.toUpperCase());

export const ageSchema = z.string()
  .regex(AGE_REGEX, "Age must be a number")
  .refine(val => {
    const age = parseInt(val);
    return age >= 0 && age <= 120;
  }, "Age must be between 0 and 120");

export const checkoutDateSchema = z.string()
  .regex(DATE_REGEX, "Date must be in YYYY-MM-DD format")
  .refine(val => {
    const date = new Date(val);
    const today = new Date();
    const maxDate = new Date();
    maxDate.setFullYear(today.getFullYear() + 1);
    return date >= today && date <= maxDate;
  }, "Date must be between today and 1 year from now");

export const paymentAmountSchema = z.string()
  .regex(PAYMENT_AMOUNT_REGEX, "Payment amount must be a valid monetary value")
  .refine(val => {
    const num = parseFloat(val || "0");
    return !isNaN(num) && num >= 0 && num <= 9999.99;
  }, "Payment amount must be between 0 and 9999.99");

// ─── Bulk & Search Schemas ───────────────────────────────────────────

export const bulkActionSchema = z.object({
  ids: z.array(z.string().min(1, "ID cannot be empty")).min(1, "At least one item must be selected"),
  action: z.enum(["delete", "archive", "activate", "deactivate"], {
    required_error: "Action is required"
  }),
});

export const searchQuerySchema = z.object({
  query: z.string().max(100, "Search query must not exceed 100 characters").optional(),
  status: z.enum(["active", "inactive", "all"]).optional(),
  dateFrom: z.string().regex(DATE_REGEX).optional(),
  dateTo: z.string().regex(DATE_REGEX).optional(),
  capsuleNumber: capsuleNumberSchema.optional(),
}).refine((data) => {
  if (data.dateFrom && data.dateTo) {
    return new Date(data.dateFrom) <= new Date(data.dateTo);
  }
  return true;
}, {
  message: "From date must be before or equal to To date",
  path: ["dateFrom"]
});

// ─── Pagination Types ────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ─── Validation Utilities ────────────────────────────────────────────

export const validationUtils = {
  isValidEmail: (email: string): boolean => {
    try { emailSchema.parse(email); return true; } catch { return false; }
  },
  isValidPhone: (phone: string): boolean => {
    try { phoneNumberSchema.parse(phone); return true; } catch { return false; }
  },
  isValidCapsuleNumber: (capsuleNumber: string): boolean => {
    try { capsuleNumberSchema.parse(capsuleNumber); return true; } catch { return false; }
  },
  isValidMalaysianIC: (ic: string): boolean => {
    try { malaysianICSchema.parse(ic); return true; } catch { return false; }
  },
  isValidPassportNumber: (passport: string): boolean => {
    try { passportNumberSchema.parse(passport); return true; } catch { return false; }
  },
  formatPhoneNumber: (phone: string): string => {
    return phone.replace(/\s/g, "");
  },
  formatName: (name: string): string => {
    return name.trim().replace(/\s+/g, " ");
  },
  sanitizeString: (str: string): string => {
    return str.trim().replace(/[<>"'&]/g, "");
  }
};

// ─── Schema-derived Types ────────────────────────────────────────────

export type BulkAction = z.infer<typeof bulkActionSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
