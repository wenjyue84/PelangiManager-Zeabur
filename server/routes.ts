import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import path from "path";
import sgMail from "@sendgrid/mail";
import multer from "multer";
import { OAuth2Client } from "google-auth-library";
import { registerRoutes as registerModularRoutes } from "./routes/index";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Initialize SendGrid
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  } else {
    console.warn("SENDGRID_API_KEY not found. Email sending will be disabled.");
  }
  
  // Google OAuth client
  const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Multer configuration for photo uploads
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), "uploads", "photos");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  // Register all modular routes
  registerModularRoutes(app);

  // Setup admin route
  app.post("/setup-admin", async (req, res) => {
    // Implementation for admin setup
    res.json({ message: "Admin setup route - to be implemented" });
  });

  // Serve static files from dist/public
  app.use(express.static(path.join(process.cwd(), "dist/public")));

  // Catch-all handler for SPA
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ message: "API endpoint not found" });
    }
    res.sendFile(path.join(process.cwd(), "dist/public/index.html"));
  });

  const httpServer = createServer(app);
  return httpServer;
}