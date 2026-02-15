/**
 * Migration Script: JSON conversations → PostgreSQL
 *
 * One-time script to import existing .rainbow-kb/conversations/*.json
 * files into the new rainbow_conversations + rainbow_messages tables.
 *
 * Usage: npx tsx scripts/migrate-conversations-to-db.ts
 */
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

// Load .env from project root (../.env relative to this script)
dotenv.config({ path: path.resolve(fileURLToPath(import.meta.url), '../../.env') });

import { db, dbReady } from '../src/lib/db.js';
// Import directly from .ts file since we run with tsx and allowImportingTsExtensions is on
import { rainbowConversations, rainbowMessages } from '../../shared/schema-tables.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface OldLoggedMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    intent?: string;
    confidence?: number;
    action?: string;
    manual?: boolean;
    source?: string;
    model?: string;
    responseTime?: number;
    kbFiles?: string[];
    messageType?: string;
    routedAction?: string;
    workflowId?: string;
    stepId?: string;
}

interface OldConversationLog {
    phone: string;
    pushName: string;
    instanceId?: string;
    messages: OldLoggedMessage[];
    contactDetails?: Record<string, unknown>;
    pinned?: boolean;
    favourite?: boolean;
    lastReadAt?: number;
    responseMode?: string;
    createdAt: number;
    updatedAt: number;
}

function canonicalPhoneKey(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits || phone.replace(/[^a-zA-Z0-9@._-]/g, '_');
}

async function main() {
    console.log('🔄 Migration: JSON conversations → PostgreSQL\n');

    // 1. Wait for DB
    const ready = await dbReady;
    if (!ready) {
        console.error('❌ Database not available. Set DATABASE_URL in .env');
        process.exit(1);
    }
    console.log('✅ Database connected\n');

    // 1.5 Create tables manually (bypass drizzle-kit push issues)
    console.log('🛠️ Ensuring tables exist...');
    await db.execute(sql`
    CREATE TABLE IF NOT EXISTS rainbow_conversations (
      phone varchar(64) PRIMARY KEY,
      push_name text NOT NULL DEFAULT '',
      instance_id text,
      pinned boolean NOT NULL DEFAULT false,
      favourite boolean NOT NULL DEFAULT false,
      last_read_at timestamp,
      response_mode text,
      contact_details_json text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `);

    await db.execute(sql`
    CREATE TABLE IF NOT EXISTS rainbow_messages (
      id serial PRIMARY KEY,
      phone varchar(64) NOT NULL,
      role varchar(10) NOT NULL,
      content text NOT NULL,
      timestamp timestamp NOT NULL DEFAULT now(),
      intent text,
      confidence real,
      action text,
      manual boolean,
      source text,
      model text,
      response_time_ms integer,
      kb_files_json text,
      message_type text,
      routed_action text,
      workflow_id text,
      step_id text
    );
  `);

    await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_rainbow_messages_phone ON rainbow_messages (phone);
    CREATE INDEX IF NOT EXISTS idx_rainbow_messages_phone_timestamp ON rainbow_messages (phone, timestamp);
    CREATE INDEX IF NOT EXISTS idx_rainbow_messages_role ON rainbow_messages (role);
    CREATE INDEX IF NOT EXISTS idx_rainbow_messages_timestamp ON rainbow_messages (timestamp);
  `);
    console.log('✅ Tables ready\n');

    // 2. Find conversations directory
    const convosDir = path.resolve(__dirname, '..', '.rainbow-kb', 'conversations');
    let files: string[];
    try {
        files = (await fs.readdir(convosDir)).filter(f => f.endsWith('.json'));
    } catch {
        console.log('📁 No conversations directory found at', convosDir);
        console.log('   Nothing to migrate.');
        process.exit(0);
    }

    console.log(`📁 Found ${files.length} JSON file(s) in ${convosDir}\n`);

    if (files.length === 0) {
        console.log('   Nothing to migrate.');
        process.exit(0);
    }

    // 3. Deduplicate by canonical key (keep the one with most messages)
    const byKey = new Map<string, OldConversationLog>();

    for (const file of files) {
        try {
            const data = await fs.readFile(path.join(convosDir, file), 'utf-8');
            const log: OldConversationLog = JSON.parse(data);
            const key = canonicalPhoneKey(log.phone);

            const existing = byKey.get(key);
            if (!existing || log.messages.length > existing.messages.length) {
                byKey.set(key, { ...log, phone: key }); // Normalize phone to canonical
            }
        } catch (err: any) {
            console.warn(`⚠️ Skipping ${file}: ${err.message}`);
        }
    }

    console.log(`📊 ${byKey.size} unique conversation(s) after deduplication\n`);

    // 4. Import each conversation
    let imported = 0;
    let totalMessages = 0;

    for (const [key, log] of byKey) {
        try {
            // Upsert conversation
            await db
                .insert(rainbowConversations)
                .values({
                    phone: key,
                    pushName: log.pushName || '',
                    instanceId: log.instanceId ?? null,
                    pinned: log.pinned ?? false,
                    favourite: log.favourite ?? false,
                    lastReadAt: log.lastReadAt ? new Date(log.lastReadAt) : null,
                    responseMode: log.responseMode ?? null,
                    contactDetailsJson: log.contactDetails ? JSON.stringify(log.contactDetails) : null,
                    createdAt: new Date(log.createdAt),
                    updatedAt: new Date(log.updatedAt),
                })
                .onConflictDoUpdate({
                    target: rainbowConversations.phone,
                    set: {
                        pushName: log.pushName || '',
                        updatedAt: new Date(log.updatedAt),
                    },
                });

            // Insert messages in batches of 100
            const msgs = log.messages;
            for (let i = 0; i < msgs.length; i += 100) {
                const batch = msgs.slice(i, i + 100);
                const values = batch.map(m => ({
                    phone: key,
                    role: m.role,
                    content: m.content,
                    timestamp: new Date(m.timestamp),
                    intent: m.intent ?? null,
                    confidence: m.confidence ?? null,
                    action: m.action ?? null,
                    manual: m.manual ?? null,
                    source: m.source ?? null,
                    model: m.model ?? null,
                    responseTime: m.responseTime ?? null,
                    kbFilesJson: m.kbFiles ? JSON.stringify(m.kbFiles) : null,
                    messageType: m.messageType ?? null,
                    routedAction: m.routedAction ?? null,
                    workflowId: m.workflowId ?? null,
                    stepId: m.stepId ?? null,
                }));

                await db.insert(rainbowMessages).values(values);
            }

            totalMessages += msgs.length;
            imported++;
            console.log(`  ✅ ${key} — ${log.pushName} (${msgs.length} messages)`);
        } catch (err: any) {
            console.error(`  ❌ ${key}: ${err.message}`);
        }
    }

    console.log(`\n🎉 Migration complete!`);
    console.log(`   Conversations: ${imported}/${byKey.size}`);
    console.log(`   Messages: ${totalMessages}`);
    console.log(`\n💡 You can now safely archive .rainbow-kb/conversations/ if everything looks good.`);

    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
