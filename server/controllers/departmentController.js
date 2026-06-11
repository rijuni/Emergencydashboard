const pool = require('../config/db');

// Self-initializing table check to ensure the departments table exists
const ensureTableExists = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Seed some initial departments if the table is empty
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM departments');
    if (rows[0].count === 0) {
      const defaultDepts = [
        'Medicine', 'Surgery', 'Pediatrics', 'Obstetrics & Gynecology', 
        'Orthopedics', 'Ophthalmology', 'ENT', 'Dermatology', 
        'Psychiatry', 'Radiology', 'Anesthesiology', 'Emergency Medicine'
      ];
      const values = defaultDepts.map(d => [d]);
      await pool.query('INSERT INTO departments (name) VALUES ?', [values]);
      console.log('✅ Seeded default departments successfully');
    }
  } catch (error) {
    console.error('❌ Error ensuring departments table exists:', error);
  }
};

// Run the check on module load
ensureTableExists();

// Get all departments
exports.getAll = async (req, res) => {
  try {
    const [departments] = await pool.query('SELECT * FROM departments ORDER BY name ASC');
    res.json({ departments });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Create a department
exports.create = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Department name is required.' });
    }
    const trimmedName = name.trim();
    
    // Check if it already exists
    const [existing] = await pool.query('SELECT id FROM departments WHERE name = ?', [trimmedName]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Department already exists.' });
    }

    const [result] = await pool.query('INSERT INTO departments (name) VALUES (?)', [trimmedName]);
    
    // Log audit trail
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE', 'department', result.insertId, `Created department: ${trimmedName}`]
    );

    res.status(201).json({
      message: 'Department created successfully.',
      department: { id: result.insertId, name: trimmedName }
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Delete a department
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [existing] = await pool.query('SELECT * FROM departments WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    await pool.query('DELETE FROM departments WHERE id = ?', [id]);

    // Log audit trail
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'DELETE', 'department', id, `Deleted department: ${existing[0].name}`]
    );

    res.json({ message: 'Department deleted successfully.' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
