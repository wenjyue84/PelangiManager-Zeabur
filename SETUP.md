# Pelangi Manager Setup Guide

## Overview
Pelangi Manager is a full-stack capsule hostel management system with **SIMPLE** storage selection:
- **Local Development**: Uses in-memory storage (no database setup required)
- **Production**: Uses database if `DATABASE_URL` is set, otherwise falls back to memory

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

The server will start on `http://localhost:5000` and automatically use in-memory storage.

## Storage System Architecture

**SIMPLE RULE:** The system automatically chooses storage based on one environment variable:

```typescript
// SIMPLE: Just check if DATABASE_URL exists
if (process.env.DATABASE_URL) {
  storage = new DatabaseStorage();
  console.log("✅ Using database storage");
} else {
  storage = new MemStorage();
  console.log("✅ Using in-memory storage");
}
```

## Local Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Steps
1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Access at: `http://localhost:5000`

### What Happens
- No `DATABASE_URL` environment variable = Uses `MemStorage`
- Sample data is automatically initialized
- All functionality works with in-memory data
- Data resets on each server restart

## Production Deployment

### Option 1: Use Database
Set environment variable:
```bash
DATABASE_URL=postgresql://username:password@host:port/database
```

### Option 2: Use Memory (Simple)
Don't set `DATABASE_URL` - system will use in-memory storage.

## Replit Deployment

Set `DATABASE_URL` in Replit's Secrets (Tools → Secrets):
```bash
DATABASE_URL=postgresql://username:password@host:port/database
```

## UI Display

The system shows a simple badge in the navigation:
- 🟠 **Memory** - When using in-memory storage
- 🔵 **Database** - When using database storage

No dropdown, no switching, no complexity - just shows what you're currently using!

## That's It!

No complex Docker setup, no environment detection confusion. Just:
- **No DATABASE_URL** = Memory storage
- **Has DATABASE_URL** = Database storage

Simple and effective! 🎯