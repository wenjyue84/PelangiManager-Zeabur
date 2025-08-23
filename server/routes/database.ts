import { Router } from "express";
import { getDatabaseConfig, DATABASE_CONFIGS } from "../lib/databaseConfig.js";

const router = Router();

// Get current database configuration (read-only)
router.get("/api/database/config", (req, res) => {
  const config = getDatabaseConfig();
  res.json({
    current: config,
    // Note: No more switching available - just display current mode
  });
});

export default router;