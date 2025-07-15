require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addUnitColumn() {
  try {
    console.log('Adding unit column to listings table...');
    
    // Check if the column already exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'listings' 
      AND column_name = 'unit'
    `;
    
    const checkResult = await pool.query(checkQuery);
    
    if (checkResult.rows.length > 0) {
      console.log('Unit column already exists in listings table');
      return;
    }
    
    // Add the unit column
    const alterQuery = `
      ALTER TABLE public.listings 
      ADD COLUMN unit text
    `;
    
    await pool.query(alterQuery);
    console.log('Successfully added unit column to listings table');
    
  } catch (error) {
    console.error('Error adding unit column:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addUnitColumn().catch(console.error); 