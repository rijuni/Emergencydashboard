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
    
    // NOTE: removed automatic seeding of default departments.
    // The database should be populated externally (migration/import).
    // If you need initial seed data, run a separate migration script.
  } catch (error) {
    console.error('❌ Error ensuring departments table exists:', error);
  }
};

// Run the check on module load
ensureTableExists();

// Get all departments
exports.getAll = async (req, res) => {
  try {
    const { is_active, page, limit, search } = req.query;
    
    let query = 'FROM departments WHERE 1=1';
    const params = [];
    
    if (is_active !== undefined) {
      const isActiveVal = is_active === 'true';
      query += ' AND is_active = ?';
      params.push(isActiveVal);
    }
    
    if (search !== undefined && search.trim() !== '') {
      query += ' AND name LIKE ?';
      params.push(`%${search.trim()}%`);
    }
    
    // Get total count
    const [countResult] = await pool.query(`SELECT COUNT(*) as total ${query}`, params);
    const totalRecords = countResult[0].total;
    
    let querySelect = `SELECT * ${query} ORDER BY name ASC`;
    
    let totalPages = 1;
    let currentPage = 1;
    
    if (page !== undefined && limit !== undefined) {
      const pageVal = parseInt(page) || 1;
      const limitVal = parseInt(limit) || 10;
      const offset = (pageVal - 1) * limitVal;
      
      querySelect += ' LIMIT ? OFFSET ?';
      params.push(limitVal, offset);
      
      currentPage = pageVal;
      totalPages = Math.ceil(totalRecords / limitVal);
    }
    
    const [departments] = await pool.query(querySelect, params);
    
    res.json({ 
      departments,
      pagination: {
        totalRecords,
        totalPages,
        currentPage,
        limit: limit ? parseInt(limit) : totalRecords
      }
    });
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
    
    // Check if it already exists (case-insensitive)
    const [existing] = await pool.query('SELECT id FROM departments WHERE LOWER(name) = LOWER(?)', [trimmedName]);
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

    // Check if new name already exists (excluding current department), case-insensitive
    const [duplicate] = await pool.query('SELECT id FROM departments WHERE LOWER(name) = LOWER(?) AND id != ?', [trimmedName, id]);
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
