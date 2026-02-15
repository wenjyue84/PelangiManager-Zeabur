import type { IncomingMessage } from '../../assistant/types.js';

// ─── Instance Configuration ─────────────────────────────────────────

export interface InstanceConfig {
  id: string;
  label: string;
  authDir: string;
  autoStart: boolean;
  createdAt: string;
  firstConnectedAt?: string; // ISO timestamp of first successful WhatsApp connection (persisted)
}

export interface InstancesFile {
  instances: InstanceConfig[];
}

// ─── Instance Status ────────────────────────────────────────────────

export interface WhatsAppInstanceStatus {
  id: string;
  label: string;
  state: string;
  user: { name: string; id: string; phone: string } | null;
  authDir: string;
  qr: string | null;
  unlinkedFromWhatsApp: boolean; // User unlinked from WhatsApp side (not from our system)
  lastUnlinkedAt: string | null; // ISO timestamp of when unlink was detected
  lastConnectedAt: string | null; // ISO timestamp of last successful connection
  firstConnectedAt: string | null; // ISO timestamp of first ever successful connection (persisted)
}

// ─── Message Handler Type ───────────────────────────────────────────

export type MessageHandler = (msg: IncomingMessage) => Promise<void>;
