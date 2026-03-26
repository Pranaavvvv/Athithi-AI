const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addColumn() {
  try {
    await pool.query('ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS installment_plan VARCHAR(50);');
    console.log('✅ Added installment_plan column successfully');
    
    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'enquiries' AND column_name = 'installment_plan'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Column installment_plan exists in enquiries table');
    } else {
      console.log('❌ Column installment_plan still missing');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding column:', error);
    process.exit(1);
  }
}

addColumn();
