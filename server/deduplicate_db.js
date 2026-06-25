const mysql = require('mysql2/promise');
require('dotenv').config();

async function deduplicate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('Connected to database. Starting deduplication...');

  try {
    // 1. Deduplicate Shifts
    console.log('\n--- Deduplicating Shifts ---');
    const [shifts] = await connection.execute('SELECT id, name FROM shifts ORDER BY id ASC');
    
    const uniqueShifts = {};
    for (const shift of shifts) {
      const name = shift.name.trim();
      if (!uniqueShifts[name]) {
        uniqueShifts[name] = shift.id; // First seen is primary
      } else {
        const primaryId = uniqueShifts[name];
        console.log(`Duplicate shift found: "${name}" (ID: ${shift.id}). Merging into primary ID: ${primaryId}...`);
        
        // Update roster to point to primary shift
        await connection.execute('UPDATE roster SET shift_id = ? WHERE shift_id = ?', [primaryId, shift.id]);
        
        // Delete the duplicate
        await connection.execute('DELETE FROM shifts WHERE id = ?', [shift.id]);
        console.log(`Deleted duplicate shift ID: ${shift.id}`);
      }
    }

    // 2. Deduplicate Staff Categories
    console.log('\n--- Deduplicating Staff Categories ---');
    const [categories] = await connection.execute('SELECT id, name FROM staff_categories ORDER BY id ASC');
    
    const uniqueCategories = {};
    for (const cat of categories) {
      const name = cat.name.trim();
      if (!uniqueCategories[name]) {
        uniqueCategories[name] = cat.id; // First seen is primary
      } else {
        const primaryId = uniqueCategories[name];
        console.log(`Duplicate category found: "${name}" (ID: ${cat.id}). Merging into primary ID: ${primaryId}...`);
        
        // Update staff to point to primary category
        await connection.execute('UPDATE staff SET category_id = ? WHERE category_id = ?', [primaryId, cat.id]);
        
        // Delete the duplicate
        await connection.execute('DELETE FROM staff_categories WHERE id = ?', [cat.id]);
        console.log(`Deleted duplicate category ID: ${cat.id}`);
      }
    }

    // 3. Add UNIQUE constraints to prevent future duplicates
    console.log('\n--- Adding UNIQUE Constraints ---');
    try {
      await connection.execute('ALTER TABLE shifts ADD UNIQUE INDEX unique_name (name)');
      console.log('Added UNIQUE constraint to shifts.name');
    } catch (e) {
      console.log('UNIQUE constraint on shifts.name may already exist:', e.message);
    }

    try {
      await connection.execute('ALTER TABLE staff_categories ADD UNIQUE INDEX unique_cat_name (name)');
      console.log('Added UNIQUE constraint to staff_categories.name');
    } catch (e) {
      console.log('UNIQUE constraint on staff_categories.name may already exist:', e.message);
    }

    console.log('\n✅ Deduplication completed successfully! You can safely delete this script.');
  } catch (err) {
    console.error('Error during deduplication:', err);
  } finally {
    await connection.end();
  }
}

deduplicate();
