import fs from 'fs';
import path from 'path';
import { isLidUser, jidNormalizedUser } from '@whiskeysockets/baileys';

/**
 * LidMapper - Handles LID→phone JID mappings for Baileys v7
 *
 * Baileys v7 uses @lid JIDs for incoming messages, but requires @s.whatsapp.net
 * JIDs for sending messages. This class manages the bidirectional mapping.
 */
export class LidMapper {
  private lidToPhone = new Map<string, string>();
  private instanceId: string;

  constructor(instanceId: string) {
    this.instanceId = instanceId;
  }

  /**
   * Load LID→phone mappings from Baileys auth state files on disk
   */
  loadFromDisk(authDir: string): void {
    try {
      const files = fs.readdirSync(authDir);
      let loaded = 0;

      for (const file of files) {
        // Pattern: lid-mapping-{lidUser}_reverse.json → contains pnUser
        const match = file.match(/^lid-mapping-(\d+)_reverse\.json$/);
        if (!match) continue;

        const lidUser = match[1];
        const filePath = path.join(authDir, file);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const pnUser = JSON.parse(raw);

        if (typeof pnUser === 'string' && pnUser.length > 0) {
          const lidJid = `${lidUser}@lid`;
          const phoneJid = `${pnUser}@s.whatsapp.net`;
          this.lidToPhone.set(lidJid, phoneJid);
          loaded++;
        }
      }

      if (loaded > 0) {
        console.log(`[Baileys:${this.instanceId}] Loaded ${loaded} LID→phone mappings from auth state`);
      }
    } catch (err: any) {
      console.warn(`[Baileys:${this.instanceId}] Failed to load LID mappings: ${err.message}`);
    }
  }

  /**
   * Convert @lid JID to @s.whatsapp.net JID if mapping exists
   */
  resolve(jid: string, authDir: string): string {
    if (!isLidUser(jid)) return jid;

    const normalized = jidNormalizedUser(jid);
    const phoneJid = this.lidToPhone.get(normalized);

    if (phoneJid) {
      return phoneJid;
    }

    // Fallback: check auth state files on disk (Baileys may have stored new mappings)
    const decoded = jid.replace(/@lid$/, '');
    const lidUser = decoded.split(':')[0]; // strip device suffix
    const reverseFile = path.join(authDir, `lid-mapping-${lidUser}_reverse.json`);

    try {
      if (fs.existsSync(reverseFile)) {
        const pnUser = JSON.parse(fs.readFileSync(reverseFile, 'utf-8'));
        if (typeof pnUser === 'string' && pnUser.length > 0) {
          const resolvedJid = `${pnUser}@s.whatsapp.net`;
          this.lidToPhone.set(normalized, resolvedJid); // cache it
          console.log(`[Baileys:${this.instanceId}] LID resolved from disk: ${normalized} → ${resolvedJid}`);
          return resolvedJid;
        }
      }
    } catch {
      // Ignore read errors
    }

    // Can't resolve — return original @lid JID
    return jid;
  }

  /**
   * Add a LID→phone mapping (from contacts.upsert or messaging-history events)
   */
  add(lidJid: string, phoneJid: string): void {
    const normalizedLid = jidNormalizedUser(lidJid);
    const normalizedPhone = jidNormalizedUser(phoneJid);

    if (!this.lidToPhone.has(normalizedLid)) {
      this.lidToPhone.set(normalizedLid, normalizedPhone);
      console.log(`[Baileys:${this.instanceId}] LID mapped: ${normalizedLid} → ${normalizedPhone}`);
    }
  }

  /**
   * Get total number of cached mappings
   */
  get size(): number {
    return this.lidToPhone.size;
  }
}
