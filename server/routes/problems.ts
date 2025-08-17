import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { createCapsuleProblemSchema, resolveProblemSchema } from "@shared/schema";
import { validateData, securityValidationMiddleware } from "../validation";
import { authenticateToken } from "./middleware/auth";

const router = Router();

// Get all problems
router.get("/", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const problems = await storage.getAllProblems({ page, limit });
    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch problems" });
  }
});

// Get active problems only
router.get("/active", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const problems = await storage.getActiveProblems({ page, limit });
    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch active problems" });
  }
});

// Report new problem
router.post("/", 
  securityValidationMiddleware,
  authenticateToken, 
  validateData(createCapsuleProblemSchema, 'body'),
  async (req: any, res) => {
  try {
    const validatedData = req.body;
    
    // Check if capsule already has an active problem
    const existingProblems = await storage.getCapsuleProblems(validatedData.capsuleNumber);
    const hasActiveProblem = existingProblems.some(p => !p.isResolved);
    
    if (hasActiveProblem) {
      return res.status(400).json({ 
        message: "This capsule already has an active problem. Please resolve it first." 
      });
    }
    
    const problem = await storage.createCapsuleProblem({
      ...validatedData,
      reportedBy: req.user.username || req.user.email || "Unknown",
    });
    
    res.json(problem);
  } catch (error: any) {
    console.error("Error creating problem:", error);
    res.status(400).json({ message: error.message || "Failed to create problem" });
  }
});

// Resolve problem
router.patch("/:id/resolve", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const resolvedBy = req.user.username || req.user.email || "Unknown";
    const problem = await storage.resolveProblem(id, resolvedBy, notes);
    
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    res.json(problem);
  } catch (error: any) {
    console.error("Error resolving problem:", error);
    res.status(400).json({ message: error.message || "Failed to resolve problem" });
  }
});

// Delete problem
router.delete("/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await storage.deleteProblem(id);
    
    if (!deleted) {
      return res.status(404).json({ message: "Problem not found" });
    }

    res.json({ message: "Problem deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting problem:", error);
    res.status(400).json({ message: error.message || "Failed to delete problem" });
  }
});

export default router;