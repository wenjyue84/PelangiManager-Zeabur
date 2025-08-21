// Script to fix expenses table foreign key constraint issue in Replit
// Run this in Replit shell to resolve the database constraint problem

const { Pool } = require('pg');

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL environment variable not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixExpensesTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking expenses table structure...');
    
    // Check if expenses table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'expenses'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ Expenses table does not exist. Creating it...');
      
      // Create expenses table with proper foreign key constraint
      await client.query(`
        CREATE TABLE expenses (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          description text NOT NULL,
          amount text NOT NULL,
          category text NOT NULL,
          subcategory text,
          date date NOT NULL,
          notes text,
          receipt_photo_url text,
          item_photo_url text,
          created_by varchar REFERENCES users(id),
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        );
      `);
      
      // Create indexes
      await client.query(`
        CREATE INDEX idx_expenses_category ON expenses(category);
        CREATE INDEX idx_expenses_date ON expenses(date);
        CREATE INDEX idx_expenses_created_by ON expenses(created_by);
        CREATE INDEX idx_expenses_created_at ON expenses(created_at);
      `);
      
      console.log('✅ Expenses table created successfully');
    } else {
      console.log('✅ Expenses table exists');
      
      // Check if created_by column exists and has proper foreign key constraint
      const columnExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'expenses' 
          AND column_name = 'created_by'
        );
      `);
      
      if (!columnExists.rows[0].exists) {
        console.log('❌ created_by column missing. Adding it...');
        await client.query(`
          ALTER TABLE expenses ADD COLUMN created_by varchar REFERENCES users(id);
        `);
        console.log('✅ created_by column added');
      } else {
        console.log('✅ created_by column exists');
        
        // Check foreign key constraint
        const fkExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.table_constraints 
            WHERE table_name = 'expenses' 
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%created_by%'
          );
        `);
        
        if (!fkExists.rows[0].exists) {
          console.log('❌ Foreign key constraint missing. Adding it...');
          await client.query(`
            ALTER TABLE expenses 
            ADD CONSTRAINT expenses_created_by_users_id_fk 
            FOREIGN KEY (created_by) REFERENCES users(id);
          `);
          console.log('✅ Foreign key constraint added');
        } else {
          console.log('✅ Foreign key constraint exists');
        }
      }
    }
    
    // Check if there are any existing expenses with invalid created_by values
    console.log('🔍 Checking for orphaned expenses...');
    const orphanedExpenses = await client.query(`
      SELECT e.id, e.description, e.created_by 
      FROM expenses e 
      LEFT JOIN users u ON e.created_by = u.id 
      WHERE e.created_by IS NOT NULL AND u.id IS NULL;
    `);
    
    if (orphanedExpenses.rows.length > 0) {
      console.log(`⚠️  Found ${orphanedExpenses.rows.length} expenses with invalid created_by values`);
      console.log('These expenses will be updated to have NULL created_by');
      
      await client.query(`
        UPDATE expenses 
        SET created_by = NULL 
        WHERE created_by IS NOT NULL 
        AND created_by NOT IN (SELECT id FROM users);
      `);
      
      console.log('✅ Orphaned expenses fixed');
    } else {
      console.log('✅ No orphaned expenses found');
    }
    
    console.log('🎉 Database check and fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing expenses table:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixExpensesTable().catch(console.error);
