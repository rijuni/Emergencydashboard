const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

// Get certificates (optionally filtered by staff_id)
exports.getAll = async (req, res) => {
  try {
    const { staff_id } = req.query;
    let query = `
      SELECT c.*, s.full_name as staff_name, sc.name as category_name
      FROM certificates c
      JOIN staff s ON c.staff_id = s.id
      JOIN staff_categories sc ON s.category_id = sc.id
      WHERE c.is_active = TRUE
    `;
    const params = [];

    if (staff_id) {
      query += ' AND c.staff_id = ?';
      params.push(staff_id);
    }

    query += ' ORDER BY c.expiry_date ASC';

    const [certificates] = await pool.query(query, params);
    res.json({ certificates });
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Upload certificate
exports.upload = async (req, res) => {
  try {
    const { staff_id, certificate_type, certificate_number, issuing_authority, issue_date, expiry_date } = req.body;

    if (!staff_id || !certificate_type) {
      return res.status(400).json({ message: 'Staff ID and certificate type are required.' });
    }

    const file_path = req.file ? req.file.filename : null;
    const file_type = req.file ? path.extname(req.file.originalname).replace('.', '') : null;

    const [result] = await pool.query(
      `INSERT INTO certificates (staff_id, certificate_type, certificate_number, issuing_authority, 
       issue_date, expiry_date, file_path, file_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [staff_id, certificate_type, certificate_number || null, issuing_authority || null,
       issue_date || null, expiry_date || null, file_path, file_type]
    );

    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE', 'certificate', result.insertId, `Uploaded certificate: ${certificate_type}`]
    );

    res.status(201).json({ message: 'Certificate uploaded successfully.', id: result.insertId });
  } catch (error) {
    console.error('Upload certificate error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Download certificate file
exports.download = async (req, res) => {
  try {
    const { id } = req.params;

    const [certs] = await pool.query('SELECT * FROM certificates WHERE id = ?', [id]);
    if (certs.length === 0 || !certs[0].file_path) {
      return res.status(404).json({ message: 'Certificate file not found.' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', 'certificates', certs[0].file_path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server.' });
    }

    res.download(filePath, `${certs[0].certificate_type}-${certs[0].certificate_number || 'cert'}.${certs[0].file_type}`);
  } catch (error) {
    console.error('Download certificate error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Delete certificate
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const [certs] = await pool.query('SELECT * FROM certificates WHERE id = ?', [id]);
    if (certs.length === 0) {
      return res.status(404).json({ message: 'Certificate not found.' });
    }

    // Soft delete
    await pool.query('UPDATE certificates SET is_active = FALSE WHERE id = ?', [id]);

    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'DELETE', 'certificate', id, `Deleted certificate: ${certs[0].certificate_type}`]
    );

    res.json({ message: 'Certificate deleted successfully.' });
  } catch (error) {
    console.error('Delete certificate error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
