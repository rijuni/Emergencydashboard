const mysql = require('mysql2/promise');
require('dotenv').config();

async function syncDB() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log('Connected to DB. Checking for Security Supervisor category...');

    // Check if category exists
    const [categories] = await connection.execute(`SELECT id FROM staff_categories WHERE name = 'Security Supervisor' LIMIT 1`);
    
    let categoryId;
    if (categories.length > 0) {
      console.log('Category "Security Supervisor" already exists.');
      categoryId = categories[0].id;
    } else {
      console.log('Adding "Security Supervisor" category...');
      const [result] = await connection.execute(`INSERT INTO staff_categories (name, display_order) VALUES ('Security Supervisor', 7)`);
      categoryId = result.insertId;
      console.log('Category added successfully.');
    }

    // Update Hospital Name
    console.log('Updating Hospital Name to KIMS Hospital...');
    await connection.execute(`UPDATE display_settings SET setting_value = 'KIMS Hospital' WHERE setting_key = 'hospital_name'`);

    console.log('Database sync complete!');
    await connection.end();
  } catch (error) {
    console.error('Error syncing DB:', error);
  }
}

syncDB();
