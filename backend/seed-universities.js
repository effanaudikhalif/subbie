const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
});

const universities = [
  { name: 'Boston University', domain: 'bu.edu' },
  { name: 'Northeastern University', domain: 'northeastern.edu' },
  { name: 'MIT', domain: 'mit.edu' },
  { name: 'Harvard University', domain: 'harvard.edu' },
  { name: 'Boston College', domain: 'bc.edu' },
  { name: 'Tufts University', domain: 'tufts.edu' },
  { name: 'Emerson College', domain: 'emerson.edu' },
  { name: 'Berklee College of Music', domain: 'berklee.edu' },
  { name: 'Suffolk University', domain: 'suffolk.edu' },
  { name: 'UMass Boston', domain: 'umb.edu' }
];

async function seedUniversities() {
  try {
    console.log('Seeding universities...');
    
    for (const university of universities) {
      const { rows } = await pool.query(
        'INSERT INTO universities (name, domain) VALUES ($1, $2) ON CONFLICT (domain) DO NOTHING RETURNING *',
        [university.name, university.domain]
      );
      
      if (rows.length > 0) {
        console.log(`Added: ${university.name}`);
      } else {
        console.log(`Skipped (already exists): ${university.name}`);
      }
    }
    
    console.log('Universities seeded successfully!');
  } catch (error) {
    console.error('Error seeding universities:', error);
  } finally {
    await pool.end();
  }
}

seedUniversities(); 