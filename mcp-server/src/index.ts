import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createMCPHandler } from './server.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.MCP_SERVER_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'pelangi-mcp-server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// MCP protocol endpoint
app.post('/mcp', createMCPHandler());

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Pelangi MCP Server running on http://localhost:${PORT}`);
  console.log(`📡 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API URL: ${process.env.PELANGI_API_URL || 'http://localhost:5000'}`);
});
