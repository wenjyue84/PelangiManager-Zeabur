import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config({ path: 'local.env' });

const sql = neon(process.env.DATABASE_URL);

async function applyMigration() {
  console.log('Applying alert settings migration...');

  try {
    // Add alert_settings column
    await sql`ALTER TABLE guests ADD COLUMN IF NOT EXISTS alert_settings TEXT`;
    console.log('✓ Added alert_settings column');

    // Add index on expected_checkout_date
    await sql`CREATE INDEX IF NOT EXISTS idx_guests_expected_checkout_date ON guests(expected_checkout_date)`;
    console.log('✓ Added index on expected_checkout_date');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
