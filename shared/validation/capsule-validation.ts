/**
 * capsule-validation.ts — Capsule CRUD, cleaning, and problem schemas
 */
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
  CAPSULE_NUMBER_REGEX,
} from "../validation-patterns";
import { capsules } from "../schema-tables";

// ─── Capsule Schemas ─────────────────────────────────────────────────

export const insertCapsuleSchema = createInsertSchema(capsules).omit({
  id: true,
}).extend({
  number: z.string()
    .min(1, "Capsule number is required")
    .regex(CAPSULE_NUMBER_REGEX, "Capsule number must be in format like C1, C2, C24")
    .transform(val => val.toUpperCase()),
  section: z.enum(["back", "middle", "front"], {
    required_error: "Section must be 'back', 'middle', or 'front'",
  }),
  isAvailable: z.boolean().default(true),
  cleaningStatus: z.enum(["cleaned", "to_be_cleaned"], {
    required_error: "Cleaning status must be 'cleaned' or 'to_be_cleaned'",
  }).default("cleaned"),
  toRent: z.boolean().default(true),
  lastCleanedAt: z.date().optional(),
  lastCleanedBy: z.string().max(50, "Cleaner name must not exceed 50 characters").optional(),
  color: z.string().max(50, "Color must not exceed 50 characters").optional(),
  purchaseDate: z.date().optional(),
  position: z.enum(["top", "bottom"]).optional(),
  remark: z.string().max(500, "Remark must not exceed 500 characters").optional(),
  problemDescription: z.string()
    .max(500, "Problem description must not exceed 500 characters")
    .transform(val => val?.trim())
    .optional(),
});

export const updateCapsuleSchema = z.object({
  number: z.string()
    .min(1, "Capsule number is required")
    .regex(CAPSULE_NUMBER_REGEX, "Capsule number must be in format like C1, C2, C24")
    .transform(val => val.toUpperCase())
    .optional(),
  section: z.enum(["back", "middle", "front"], {
    required_error: "Section must be 'back', 'middle', or 'front'",
  }).optional(),
  isAvailable: z.boolean().optional(),
  cleaningStatus: z.enum(["cleaned", "to_be_cleaned"], {
    required_error: "Cleaning status must be 'cleaned' or 'to_be_cleaned'",
  }).optional(),
  toRent: z.boolean().optional(),
  color: z.string().max(50, "Color must not exceed 50 characters").optional(),
  purchaseDate: z.date().optional(),
  position: z.enum(["top", "bottom"]).optional(),
  remark: z.string().max(500, "Remark must not exceed 500 characters").optional(),
  problemDescription: z.string()
    .max(500, "Problem description must not exceed 500 characters")
    .transform(val => val?.trim())
    .optional(),
});

export const markCapsuleCleanedSchema = z.object({
  capsuleNumber: z.string()
    .min(1, "Capsule number is required")
    .regex(CAPSULE_NUMBER_REGEX, "Capsule number must be in format like C1, C11, C25"),
  cleanedBy: z.string()
    .min(1, "Cleaner name is required")
    .max(50, "Cleaner name must not exceed 50 characters")
    .transform(val => val.trim()),
});

// ─── Problem Schemas ─────────────────────────────────────────────────

export const createCapsuleProblemSchema = z.object({
  capsuleNumber: z.string()
    .min(1, "Capsule number is required")
    .regex(CAPSULE_NUMBER_REGEX, "Capsule number must be in format like C1, C2, C24")
    .transform(val => val.toUpperCase()),
  description: z.string()
    .min(10, "Problem description must be at least 10 characters long")
    .max(500, "Problem description must not exceed 500 characters")
    .transform(val => val.trim()),
  reportedBy: z.string()
    .min(1, "Reporter name is required")
    .max(50, "Reporter name must not exceed 50 characters")
    .transform(val => val.trim()),
});

export const resolveProblemSchema = z.object({
  resolvedBy: z.string()
    .min(1, "Resolver name is required")
    .max(50, "Resolver name must not exceed 50 characters")
    .transform(val => val.trim()),
  notes: z.string()
    .max(500, "Resolution notes must not exceed 500 characters")
    .transform(val => val?.trim())
    .optional(),
});

// ─── Schema-derived Types ────────────────────────────────────────────

export type InsertCapsule = z.infer<typeof insertCapsuleSchema>;
export type CreateCapsuleProblem = z.infer<typeof createCapsuleProblemSchema>;
export type ResolveProblem = z.infer<typeof resolveProblemSchema>;
export type MarkCapsuleCleaned = z.infer<typeof markCapsuleCleanedSchema>;
