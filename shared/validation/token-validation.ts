/**
 * token-validation.ts — Self-checkin token schemas
 */
import { z } from "zod";
import {
  PHONE_REGEX_LENIENT,
  NAME_REGEX,
  CAPSULE_NUMBER_REGEX,
  DATE_REGEX,
} from "../validation-patterns";

// ─── Token Schemas ───────────────────────────────────────────────────

export const createTokenSchema = z.object({
  capsuleNumber: z.string()
    .min(1, "Capsule number is required")
    .regex(CAPSULE_NUMBER_REGEX, "Capsule number must be in format like C1, C11, C25")
    .transform(val => val.toUpperCase())
    .optional(),
  autoAssign: z.boolean().optional(),
  guestName: z.string()
    .min(2, "Guest name must be at least 2 characters long")
    .max(100, "Guest name must not exceed 100 characters")
    .regex(NAME_REGEX, "Guest name can only contain letters, spaces, periods, apostrophes, and hyphens")
    .transform(val => val?.trim())
    .optional(),
  phoneNumber: z.string()
    .regex(PHONE_REGEX_LENIENT, "Please enter a valid phone number (7-50 digits, may include +, spaces, dashes, parentheses)")
    .transform(val => val?.replace(/\s/g, ""))
    .optional(),
  email: z.string()
    .email("Please enter a valid email address")
    .transform(val => val?.toLowerCase().trim())
    .optional(),
  expectedCheckoutDate: z.string()
    .regex(DATE_REGEX, "Expected checkout date must be in YYYY-MM-DD format")
    .refine(val => {
      if (!val) return true;
      const date = new Date(val);
      const today = new Date();
      const maxDate = new Date();
      maxDate.setFullYear(today.getFullYear() + 1);
      return date >= today && date <= maxDate;
    }, "Expected checkout date must be between today and 1 year from now")
    .optional(),
  checkInDate: z.string()
    .regex(DATE_REGEX, "Check-in date must be in YYYY-MM-DD format")
    .refine(val => {
      if (!val) return true;
      const date = new Date(val);
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      return date <= maxDate;
    }, "Check-in date cannot be more than 1 year in the future")
    .optional(),
  expiresInHours: z.number()
    .min(1, "Token must expire in at least 1 hour")
    .max(168, "Token cannot expire later than 168 hours (7 days)")
    .default(24),
  guideOverrideEnabled: z.boolean().optional(),
  guideShowIntro: z.boolean().optional(),
  guideShowAddress: z.boolean().optional(),
  guideShowWifi: z.boolean().optional(),
  guideShowCheckin: z.boolean().optional(),
  guideShowOther: z.boolean().optional(),
  guideShowFaq: z.boolean().optional(),
}).refine((data) => {
  const hasCapsuleNumber = data.capsuleNumber && data.capsuleNumber.length > 0;
  const hasAutoAssign = data.autoAssign === true;
  return (hasCapsuleNumber && !hasAutoAssign) || (!hasCapsuleNumber && hasAutoAssign);
}, {
  message: "Either specify a capsule number or choose auto assign (but not both)",
  path: ["capsuleNumber"],
});

export const updateGuestTokenCapsuleSchema = z.object({
  capsuleNumber: z.string()
    .min(1, "Capsule number is required")
    .regex(CAPSULE_NUMBER_REGEX, "Capsule number must be in format like C1, C11, C25")
    .transform(val => val.toUpperCase())
    .optional(),
  autoAssign: z.boolean().optional(),
}).refine((data) => {
  const hasCapsuleNumber = data.capsuleNumber && data.capsuleNumber.length > 0;
  const hasAutoAssign = data.autoAssign === true;
  return (hasCapsuleNumber && !hasAutoAssign) || (!hasCapsuleNumber && hasAutoAssign);
}, {
  message: "Either specify a capsule number or choose auto assign (but not both)",
  path: ["capsuleNumber"],
});

// ─── Schema-derived Types ────────────────────────────────────────────

export type CreateToken = z.infer<typeof createTokenSchema>;
export type UpdateGuestTokenCapsule = z.infer<typeof updateGuestTokenCapsuleSchema>;
