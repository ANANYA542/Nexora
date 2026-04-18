require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./src/config/db');

async function runMigrations() {
  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).sort();
  let hasErrors = false;

  for (const file of files) {
    if (file.endsWith('.sql')) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      try {
        await pool.query(sql);
        console.log(`Success: ${file}`);
      } catch (err) {
        hasErrors = true;
        console.error(`Error in ${file}: ${err.message}`);
        break;
      }
    }
  }

  if (hasErrors) {
    console.error('Migration run failed.');
    process.exit(1);
  }

  console.log('Done!');
  process.exit(0);
}

runMigrations();
