const pool = require('../config/db');

// Self-initializing table check to ensure the departments table exists
const ensureTableExists = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const [columns] = await pool.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'departments'
        AND COLUMN_NAME = 'is_active'
    `);

    if (columns.length === 0) {
      await pool.query('ALTER TABLE departments ADD COLUMN is_active BOOLEAN DEFAULT TRUE');
    }
    
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
    const { is_active } = req.query;
    let query = 'SELECT * FROM departments';
    const params = [];
    
    if (is_active !== undefined) {
      const isActiveVal = is_active === 'true';
      query += ' WHERE is_active = ?';
      params.push(isActiveVal);
    }
    
    query += ' ORDER BY name ASC';
    const [departments] = await pool.query(query, params);
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

// Delete a department (soft delete)
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [existing] = await pool.query('SELECT * FROM departments WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    await pool.query('UPDATE departments SET is_active = FALSE WHERE id = ?', [id]);

    // Log audit trail
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'DELETE', 'department', id, `Deactivated department: ${existing[0].name}`]
    );

    res.json({ message: 'Department deactivated successfully.' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Reactivate a department
exports.reactivate = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [existing] = await pool.query('SELECT * FROM departments WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    await pool.query('UPDATE departments SET is_active = TRUE WHERE id = ?', [id]);

    // Log audit trail
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE', 'department', id, `Reactivated department: ${existing[0].name}`]
    );

    res.json({ message: 'Department reactivated successfully.' });
  } catch (error) {
    console.error('Reactivate department error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Update a department
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Department name is required.' });
    }

    const trimmedName = name.trim();
    const [existing] = await pool.query('SELECT * FROM departments WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    // Check if new name already exists (excluding current department)
    const [duplicate] = await pool.query('SELECT id FROM departments WHERE name = ? AND id != ?', [trimmedName, id]);
    if (duplicate.length > 0) {
      return res.status(400).json({ message: 'Department name already exists.' });
    }

    await pool.query('UPDATE departments SET name = ? WHERE id = ?', [trimmedName, id]);

    // Log audit trail
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE', 'department', id, `Updated department: ${existing[0].name} → ${trimmedName}`]
    );

    res.json({ message: 'Department updated successfully.' });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
