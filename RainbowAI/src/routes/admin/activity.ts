/**
 * Activity API Routes — REST + SSE endpoints for real-time activity feed
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { activityTracker } from '../../lib/activity-tracker.js';
import type { ActivityEvent } from '../../lib/activity-tracker.js';

const router = Router();

// ─── REST: Get recent activity ────────────────────────────────────────
router.get('/activity', (_req: Request, res: Response) => {
  const limit = Math.min(parseInt(String(_req.query.limit) || '20', 10), 100);
  const events = activityTracker.getRecent(limit);
  res.json({ events, count: events.length });
});

// ─── SSE: Real-time activity stream ───────────────────────────────────
router.get('/activity/stream', (req: Request, res: Response) => {
  // Set SSE headers and flush immediately — compression middleware must NOT
  // buffer this response (see index.ts filter), and flushHeaders() ensures
  // the 200 + headers reach the browser without waiting for body data.
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });
  res.flushHeaders();

  // Send initial batch of recent events
  const recentEvents = activityTracker.getRecent(15);
  res.write(`event: init\ndata: ${JSON.stringify({ events: recentEvents })}\n\n`);

  // Keep-alive heartbeat every 30s
  const heartbeat = setInterval(() => {
    res.write(`:heartbeat\n\n`);
  }, 30000);

  // Listen for new activity events
  const onActivity = (event: ActivityEvent) => {
    res.write(`event: activity\ndata: ${JSON.stringify(event)}\n\n`);
  };

  activityTracker.on('activity', onActivity);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    activityTracker.removeListener('activity', onActivity);
  });
});

export default router;
