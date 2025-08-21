import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon to use WebSocket constructor for serverless environments
neonConfig.webSocketConstructor = ws;

async function initDatabase() {
  try {
    // Ensure database connection string is configured
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }

    console.log("🔌 Connecting to database...");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle({ client: pool, schema });

    console.log("📋 Creating database tables...");
    
    // Create all tables from schema
    await db.execute(schema.users);
    await db.execute(schema.sessions);
    await db.execute(schema.guests);
    await db.execute(schema.capsules);
    await db.execute(schema.capsuleProblems);
    await db.execute(schema.expenses);
    await db.execute(schema.appSettings);
    await db.execute(schema.guestTokens);
    await db.execute(schema.occupancyData);

    console.log("✅ Database initialized successfully!");
    console.log("📊 Tables created:");
    console.log("  - users");
    console.log("  - sessions");
    console.log("  - guests");
    console.log("  - capsules");
    console.log("  - capsule_problems");
    console.log("  - expenses");
    console.log("  - app_settings");
    console.log("  - guest_tokens");
    console.log("  - occupancy_data");

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}

// Run initialization
initDatabase();
