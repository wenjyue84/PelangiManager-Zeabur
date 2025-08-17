import { Router } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "../objectStorage";
import { securityValidationMiddleware } from "../validation";

const router = Router();

// Upload object
router.post("/api/objects/upload", async (req, res) => {
  try {
    const objectStorage = new ObjectStorageService();
    
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ message: "Invalid request body" });
    }

    const { data, contentType, filename } = req.body;
    
    if (!data) {
      return res.status(400).json({ message: "No data provided" });
    }

    const result = await objectStorage.upload(data, {
      contentType: contentType || 'application/octet-stream',
      filename: filename || 'upload'
    });

    res.json(result);
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ message: error.message || "Upload failed" });
  }
});

// Get object by path
router.get("/objects/:objectPath(*)", async (req, res) => {
  try {
    const objectStorage = new ObjectStorageService();
    const { objectPath } = req.params;
    
    const result = await objectStorage.get(objectPath);
    
    if (result.contentType) {
      res.setHeader('Content-Type', result.contentType);
    }
    
    res.send(result.data);
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      return res.status(404).json({ message: "Object not found" });
    }
    console.error("Get object error:", error);
    res.status(500).json({ message: "Failed to retrieve object" });
  }
});

// Development upload with CORS
router.options("/api/objects/dev-upload/:id", (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).end();
});

router.put("/api/objects/dev-upload/:id", async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const objectStorage = new ObjectStorageService();
    const { id } = req.params;
    
    if (!req.body) {
      return res.status(400).json({ message: "No data provided" });
    }

    const result = await objectStorage.upload(req.body, {
      contentType: req.headers['content-type'] || 'application/octet-stream',
      filename: id
    });

    res.json(result);
  } catch (error: any) {
    console.error("Dev upload error:", error);
    res.status(500).json({ message: error.message || "Upload failed" });
  }
});

// Get upload by ID
router.get("/objects/uploads/:id", async (req, res) => {
  try {
    const objectStorage = new ObjectStorageService();
    const { id } = req.params;
    
    const result = await objectStorage.get(`uploads/${id}`);
    
    if (result.contentType) {
      res.setHeader('Content-Type', result.contentType);
    }
    
    res.send(result.data);
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      return res.status(404).json({ message: "Upload not found" });
    }
    console.error("Get upload error:", error);
    res.status(500).json({ message: "Failed to retrieve upload" });
  }
});

export default router;