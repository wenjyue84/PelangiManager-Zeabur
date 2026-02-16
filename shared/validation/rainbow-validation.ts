/**
 * rainbow-validation.ts — Rainbow AI feedback, intent prediction schemas
 */
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { rainbowFeedback, intentPredictions } from "../schema-tables";

// ─── Rainbow AI Schemas ──────────────────────────────────────────────

export const insertRainbowFeedbackSchema = createInsertSchema(rainbowFeedback).omit({
  id: true,
  createdAt: true,
}).extend({
  conversationId: z.string().min(1, "Conversation ID is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  rating: z.number().refine(val => val === 1 || val === -1, "Rating must be 1 (thumbs up) or -1 (thumbs down)"),
  feedbackText: z.string().max(500, "Feedback text must not exceed 500 characters").optional(),
});

export const updateFeedbackSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  frequency_minutes: z.number()
    .int("Frequency must be a whole number")
    .min(1, "Frequency must be at least 1 minute")
    .max(1440, "Frequency cannot exceed 24 hours (1440 minutes)")
    .default(30),
  timeout_minutes: z.number()
    .int("Timeout must be a whole number")
    .min(1, "Timeout must be at least 1 minute")
    .max(10, "Timeout cannot exceed 10 minutes")
    .default(2),
  skip_intents: z.array(z.string().min(1))
    .min(0, "Skip intents array is required")
    .max(50, "Too many skip intents")
    .default(["greeting","thanks","acknowledgment","escalate","contact_staff","unknown","general"]),
  prompts: z.object({
    en: z.string().min(5).max(100).default("Was this helpful? 👍 👎"),
    ms: z.string().min(5).max(100).default("Adakah ini membantu? 👍 👎"),
    zh: z.string().min(5).max(100).default("这个回答有帮助吗？👍 👎")
  })
});

export const insertIntentPredictionSchema = createInsertSchema(intentPredictions).omit({
  id: true,
  createdAt: true,
}).extend({
  conversationId: z.string().min(1),
  phoneNumber: z.string().min(1),
  messageText: z.string().min(1),
  predictedIntent: z.string().min(1),
  confidence: z.number().min(0).max(1),
  tier: z.string().min(1),
});

// ─── Schema-derived Types ────────────────────────────────────────────

export type InsertRainbowFeedbackType = z.infer<typeof insertRainbowFeedbackSchema>;
export type UpdateFeedbackSettings = z.infer<typeof updateFeedbackSettingsSchema>;
export type InsertIntentPredictionType = z.infer<typeof insertIntentPredictionSchema>;
