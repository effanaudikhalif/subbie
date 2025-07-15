const dotenv = require('dotenv');
const { Pool } = require('pg');
const fs = require('fs');
const csv = require('csv-parser');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
});

async function importUniversitiesFromCSV(csvFilePath) {
  try {
    console.log('Starting CSV import...');
    
    const universities = [];
    
    // Read CSV file
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
          // Assuming CSV has 'name' and 'domain' columns
          // Adjust column names as needed
          const university = {
            name: row.name || row.Name || row.NAME,
            domain: row.domain || row.Domain || row.DOMAIN
          };
          
          if (university.name && university.domain) {
            universities.push(university);
          } else {
            console.warn('Skipping row with missing data:', row);
          }
        })
        .on('end', async () => {
          console.log(`Found ${universities.length} universities in CSV`);
          
          const results = {
            added: 0,
            skipped: 0,
            errors: []
          };

          // Import universities with conflict handling
          for (const university of universities) {
            try {
              const { rows } = await pool.query(
                'INSERT INTO universities (name, domain) VALUES ($1, $2) ON CONFLICT (domain) DO NOTHING RETURNING *',
                [university.name, university.domain]
              );
              
              if (rows.length > 0) {
                console.log(`✓ Added: ${university.name} (${university.domain})`);
                results.added++;
              } else {
                console.log(`- Skipped (already exists): ${university.name} (${university.domain})`);
                results.skipped++;
              }
            } catch (error) {
              console.error(`✗ Error processing ${university.name}:`, error.message);
              results.errors.push(`Error processing ${university.name}: ${error.message}`);
            }
          }
          
          console.log('\n=== Import Summary ===');
          console.log(`Added: ${results.added}`);
          console.log(`Skipped: ${results.skipped}`);
          console.log(`Errors: ${results.errors.length}`);
          
          if (results.errors.length > 0) {
            console.log('\nErrors:');
            results.errors.forEach(error => console.log(`- ${error}`));
          }
          
          resolve(results);
        })
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('Error importing universities:', error);
    throw error;
  }
}

// Usage: node import-universities-csv.js <csv-file-path>
const csvFilePath = process.argv[2];

if (!csvFilePath) {
  console.error('Usage: node import-universities-csv.js <csv-file-path>');
  console.error('Example: node import-universities-csv.js universities.csv');
  process.exit(1);
}

if (!fs.existsSync(csvFilePath)) {
  console.error(`CSV file not found: ${csvFilePath}`);
  process.exit(1);
}

importUniversitiesFromCSV(csvFilePath)
  .then(() => {
    console.log('Import completed successfully!');
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    pool.end();
    process.exit(1);
  }); 