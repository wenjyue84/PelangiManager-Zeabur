import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { updateSettingsSchema } from "@shared/schema";
import { validateData, securityValidationMiddleware } from "../validation";
import { getConfig, getConfigForAPI, validateConfigUpdate } from "../configManager";
import { authenticateToken } from "./middleware/auth";

const router = Router();

// Get admin configuration
router.get("/config", securityValidationMiddleware, async (req, res) => {
  try {
    const config = await getConfigForAPI();
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: "Failed to get configuration" });
  }
});

// Update admin configuration
router.put("/config", securityValidationMiddleware, async (req, res) => {
  try {
    const updates = req.body;
    const validation = await validateConfigUpdate(updates);
    
    if (!validation.isValid) {
      return res.status(400).json({ 
        message: "Invalid configuration", 
        errors: validation.errors 
      });
    }

    const config = getConfig();
    await config.updateSettings(updates);
    
    res.json({ message: "Configuration updated successfully" });
  } catch (error) {
    console.error("Config update error:", error);
    res.status(500).json({ message: "Failed to update configuration" });
  }
});

// Reset admin configuration to defaults
router.post("/config/reset", securityValidationMiddleware, async (req, res) => {
  try {
    const config = getConfig();
    await config.resetToDefaults();
    
    res.json({ message: "Configuration reset to defaults successfully" });
  } catch (error) {
    console.error("Config reset error:", error);
    res.status(500).json({ message: "Failed to reset configuration" });
  }
});

// Get admin notifications
router.get("/notifications", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const notifications = await storage.getAdminNotifications({ page, limit });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// Get unread admin notifications
router.get("/notifications/unread", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const notifications = await storage.getUnreadAdminNotifications({ page, limit });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch unread notifications" });
  }
});

// Mark notification as read
router.patch("/notifications/:id/read", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await storage.markNotificationAsRead(id);
    
    if (!updated) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

// Mark all notifications as read
router.patch("/notifications/read-all", authenticateToken, async (req, res) => {
  try {
    const count = await storage.markAllNotificationsAsRead();
    res.json({ message: `${count} notifications marked as read` });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark all notifications as read" });
  }
});

export default router;