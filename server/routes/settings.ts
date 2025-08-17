import { Router } from "express";
import { z } from "zod";
import path from "path";
import { storage } from "../storage";
import { updateSettingsSchema } from "@shared/schema";
import { validateData, securityValidationMiddleware } from "../validation";
import { csvSettings } from "../csvSettings";
import { authenticateToken } from "./middleware/auth";
import multer from "multer";

const router = Router();

// Multer configuration for CSV uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, process.cwd());
    },
    filename: (req, file, cb) => {
      cb(null, 'settings.csv');
    }
  }),
  limits: {
    fileSize: 1024 * 1024, // 1MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Get all settings
router.get("/", authenticateToken, async (req, res) => {
  try {
    const settings = await storage.getAllSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

// Update settings
router.patch("/", 
  securityValidationMiddleware,
  authenticateToken,
  validateData(updateSettingsSchema, 'body'),
  async (req: any, res) => {
  try {
    const { key, value } = req.body;
    const updatedBy = req.user.username || req.user.email || "Unknown";
    
    const setting = await storage.setSetting(key, value, updatedBy);
    res.json(setting);
  } catch (error: any) {
    console.error("Error updating setting:", error);
    res.status(400).json({ message: error.message || "Failed to update setting" });
  }
});

// Export settings as CSV
router.get("/export", async (req, res) => {
  try {
    const settings = await storage.getAllSettings();
    const csvContent = csvSettings.generateCsv(settings);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="settings.csv"');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ message: "Failed to export settings" });
  }
});

// Get CSV file path
router.get("/csv-path", authenticateToken, async (req, res) => {
  try {
    const csvPath = path.join(process.cwd(), 'settings.csv');
    res.json({ path: csvPath });
  } catch (error) {
    res.status(500).json({ message: "Failed to get CSV path" });
  }
});

// Import settings from CSV
router.post("/import",
  securityValidationMiddleware,
  authenticateToken,
  upload.single('file'),
  async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const updatedBy = req.user.username || req.user.email || "Unknown";
    const results = await csvSettings.importFromFile(req.file.path, updatedBy);
    
    res.json({
      message: "Settings imported successfully",
      imported: results.imported,
      errors: results.errors
    });
  } catch (error: any) {
    console.error("Error importing settings:", error);
    res.status(500).json({ message: error.message || "Failed to import settings" });
  }
});

export default router;