import { getServerEnvironment } from "../../shared/utils";

export type DatabaseType = 'memory' | 'database';

export interface DatabaseConfig {
  type: DatabaseType;
  url?: string;
  label: string;
  ssl?: string;
  neonOptimized?: boolean;
}

export const DATABASE_CONFIGS: Record<DatabaseType, DatabaseConfig> = {
  memory: {
    type: 'memory',
    label: 'Memory',
  },
  database: {
    type: 'database',
    url: process.env.DATABASE_URL,
    label: 'Database',
    // Check if this is a Neon database for Replit
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? 'require' : undefined,
    neonOptimized: process.env.DATABASE_URL?.includes('neon.tech') || false,
  },
};

export function getDatabaseConfig(): DatabaseConfig {
  // Check if user has selected a specific database type
  const selectedType = process.env.PELANGI_DB_TYPE as DatabaseType;
  
  if (selectedType && DATABASE_CONFIGS[selectedType]) {
    return DATABASE_CONFIGS[selectedType];
  }
  
  // SIMPLE: Auto-detect based on environment
  if (process.env.DATABASE_URL) {
    // SIMPLE: Any DATABASE_URL = database
    return DATABASE_CONFIGS.database;
  } else {
    // SIMPLE: No DATABASE_URL = memory
    return DATABASE_CONFIGS.memory;
  }
}

export function setDatabaseType(type: DatabaseType): void {
  process.env.PELANGI_DB_TYPE = type;
  
  if (type === 'database') {
    // Keep existing DATABASE_URL
    console.log('✅ Database mode enabled');
  } else {
    // Memory - remove DATABASE_URL to trigger in-memory storage
    delete process.env.DATABASE_URL;
    console.log('✅ Memory storage mode enabled');
  }
}