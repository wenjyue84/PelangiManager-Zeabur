import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { storage } from "../storage";
import { 
  guestSelfCheckinSchema,
  createTokenSchema
} from "@shared/schema";
import { calculateAgeFromIC } from "@shared/utils";
import { validateData, securityValidationMiddleware, sanitizers, validators } from "../validation";
import { getConfig, AppConfig } from "../configManager";
import { authenticateToken } from "./middleware/auth";
import sgMail from "@sendgrid/mail";

const router = Router();

// Get active guest tokens (reserved capsules)
router.get("/active", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const activeTokens = await storage.getActiveGuestTokens({ page, limit });
    res.json(activeTokens);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch active tokens" });
  }
});

export default router;