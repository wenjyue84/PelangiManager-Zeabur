/**
 * user-validation.ts — User-related Zod schemas (login, registration, profile)
 */
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
  USERNAME_REGEX,
  PASSWORD_LOWERCASE_REGEX,
  PASSWORD_UPPERCASE_REGEX,
  PASSWORD_DIGIT_REGEX,
} from "../validation-patterns";
import { users } from "../schema-tables";

// ─── User Schemas ────────────────────────────────────────────────────

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string()
    .email("Please enter a valid email address (e.g., john@example.com)")
    .min(5, "Email is too short. Please enter at least 5 characters including @ and domain")
    .max(254, "Email is too long. Please use a shorter email address (maximum 254 characters)")
    .toLowerCase()
    .transform(val => val.trim()),
  username: z.string()
    .min(3, "Username too short. Please enter at least 3 characters")
    .max(30, "Username too long. Please use 30 characters or fewer")
    .regex(USERNAME_REGEX, "Username can only use letters, numbers, dashes (-), and underscores (_). No spaces or special characters allowed")
    .transform(val => val.trim())
    .optional(),
  password: z.string()
    .min(8, "Password too short. Please create a password with at least 8 characters")
    .max(128, "Password too long. Please use 128 characters or fewer")
    .regex(PASSWORD_LOWERCASE_REGEX, "Password missing lowercase letter. Please add at least one lowercase letter (a-z)")
    .regex(PASSWORD_UPPERCASE_REGEX, "Password missing uppercase letter. Please add at least one uppercase letter (A-Z)")
    .regex(PASSWORD_DIGIT_REGEX, "Password missing number. Please add at least one number (0-9)")
    .optional(),
  googleId: z.string().optional(),
  firstName: z.string()
    .min(1, "First name is required")
    .max(50, "First name must not exceed 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "First name can only contain letters, spaces, apostrophes, and hyphens")
    .transform(val => val.trim())
    .optional(),
  lastName: z.string()
    .min(1, "Last name is required")
    .max(50, "Last name must not exceed 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Last name can only contain letters, spaces, apostrophes, and hyphens")
    .transform(val => val.trim())
    .optional(),
  profileImage: z.string().url("Profile image must be a valid URL").optional(),
  role: z.enum(["admin", "staff"], {
    required_error: "Role must be either 'admin' or 'staff'",
  }).default("staff"),
});

export const updateUserSchema = insertUserSchema.partial().extend({
  id: z.string().min(1, "User ID is required"),
});

// ─── Auth Schemas ────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string()
    .min(1, "Username or email is required")
    .max(254, "Username or email must not exceed 254 characters")
    .transform(val => val.trim().toLowerCase()),
  password: z.string()
    .min(1, "Password is required")
    .max(128, "Password must not exceed 128 characters"),
});

export const googleAuthSchema = z.object({
  token: z.string().min(1, "Google token is required"),
});

// ─── Schema-derived Types ────────────────────────────────────────────

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
