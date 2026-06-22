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

    // Check if Housekeeping Supervisor category exists
    const [hkCategories] = await connection.execute(`SELECT id FROM staff_categories WHERE name = 'Housekeeping Supervisor' LIMIT 1`);
    if (hkCategories.length > 0) {
      console.log('Category "Housekeeping Supervisor" already exists.');
    } else {
      console.log('Adding "Housekeeping Supervisor" category...');
      await connection.execute(`INSERT INTO staff_categories (name, display_order) VALUES ('Housekeeping Supervisor', 8)`);
      console.log('Housekeeping Supervisor category added successfully.');
    }

    // Check if column must_change_password exists in users table
    const [columns] = await connection.execute(`SHOW COLUMNS FROM users LIKE 'must_change_password'`);
    if (columns.length === 0) {
      console.log('Adding must_change_password column to users table...');
      await connection.execute(`ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE`);
      console.log('must_change_password column added.');
    } else {
      console.log('must_change_password column already exists.');
    }

    console.log('Database sync complete!');
    await connection.end();
  } catch (error) {
    console.error('Error syncing DB:', error);
  }
}

syncDB();
