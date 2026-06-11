const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDB() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'casualty_dashboard',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    const [rows] = await pool.query('SELECT * FROM display_settings WHERE setting_key = ?', ['active_mod_schedule_filename']);
    if (rows.length > 0) {
      let val = rows[0].setting_value;
      console.log('Current value:', val);
      val = val.replace(/Â/g, '').replace(/\s+/g, ' ').trim();
      console.log('New value:', val);
      await pool.query('UPDATE display_settings SET setting_value = ? WHERE setting_key = ?', [val, 'active_mod_schedule_filename']);
      console.log('Fixed in database');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

fixDB();
