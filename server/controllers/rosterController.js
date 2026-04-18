const pool = require('../config/db');

// Get roster for a specific date
exports.getByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required.' });
    }

    const [roster] = await pool.query(`
      SELECT r.*, s.full_name as staff_name, s.designation, s.registration_number,
             sc.name as category_name, sc.display_order as category_order,
             sh.name as shift_name, sh.start_time, sh.end_time, sh.display_order as shift_order,
             u.full_name as assigned_by_name
      FROM roster r
      JOIN staff s ON r.staff_id = s.id
      JOIN staff_categories sc ON s.category_id = sc.id
      JOIN shifts sh ON r.shift_id = sh.id
      LEFT JOIN users u ON r.assigned_by = u.id
      WHERE r.roster_date = ?
      ORDER BY sc.display_order, sh.display_order, s.full_name
    `, [date]);

    res.json({ roster });
  } catch (error) {
    console.error('Get roster error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Create roster assignment
exports.create = async (req, res) => {
  try {
    const { roster_date, shift_id, staff_id, notes } = req.body;

    if (!roster_date || !shift_id || !staff_id) {
      return res.status(400).json({ message: 'Date, shift, and staff are required.' });
    }

    const [result] = await pool.query(
      'INSERT INTO roster (roster_date, shift_id, staff_id, assigned_by, notes) VALUES (?, ?, ?, ?, ?)',
      [roster_date, shift_id, staff_id, req.user.id, notes || null]
    );

    // Audit log
    const [staff] = await pool.query('SELECT full_name FROM staff WHERE id = ?', [staff_id]);
    const [shift] = await pool.query('SELECT name FROM shifts WHERE id = ?', [shift_id]);
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE', 'roster', result.insertId, 
       `Assigned ${staff[0]?.full_name} to ${shift[0]?.name} shift on ${roster_date}`]
    );

    res.status(201).json({ message: 'Roster assignment created.', id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'This staff is already assigned to this shift on this date.' });
    }
    console.error('Create roster error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Update roster assignment
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { shift_id, staff_id, notes } = req.body;

    const [existing] = await pool.query('SELECT * FROM roster WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Roster entry not found.' });
    }

    await pool.query(
      'UPDATE roster SET shift_id = ?, staff_id = ?, notes = ? WHERE id = ?',
      [shift_id || existing[0].shift_id, staff_id || existing[0].staff_id, notes !== undefined ? notes : existing[0].notes, id]
    );

    res.json({ message: 'Roster updated successfully.' });
  } catch (error) {
    console.error('Update roster error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Delete roster assignment
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM roster WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Roster entry not found.' });
    }

    await pool.query('DELETE FROM roster WHERE id = ?', [id]);

    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'DELETE', 'roster', id, `Removed roster assignment for date ${existing[0].roster_date}`]
    );

    res.json({ message: 'Roster assignment removed.' });
  } catch (error) {
    console.error('Delete roster error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Copy roster from one date to another
exports.copyRoster = async (req, res) => {
  try {
    const { from_date, to_date } = req.body;

    if (!from_date || !to_date) {
      return res.status(400).json({ message: 'Source and target dates are required.' });
    }

    // Get source roster
    const [sourceRoster] = await pool.query(
      'SELECT shift_id, staff_id, notes FROM roster WHERE roster_date = ?',
      [from_date]
    );

    if (sourceRoster.length === 0) {
      return res.status(404).json({ message: 'No roster found for the source date.' });
    }

    // Delete existing entries for target date
    await pool.query('DELETE FROM roster WHERE roster_date = ?', [to_date]);

    // Insert copied entries
    const values = sourceRoster.map(r => [to_date, r.shift_id, r.staff_id, req.user.id, r.notes]);
    await pool.query(
      'INSERT INTO roster (roster_date, shift_id, staff_id, assigned_by, notes) VALUES ?',
      [values]
    );

    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE', 'roster', null, `Copied roster from ${from_date} to ${to_date} (${sourceRoster.length} entries)`]
    );

    res.json({ message: `Roster copied successfully. ${sourceRoster.length} assignments created.` });
  } catch (error) {
    console.error('Copy roster error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Bulk assign roster
exports.bulkAssign = async (req, res) => {
  try {
    const { roster_date, assignments } = req.body;

    if (!roster_date || !assignments || !Array.isArray(assignments)) {
      return res.status(400).json({ message: 'Date and assignments array are required.' });
    }

    // Delete existing entries for this date
    await pool.query('DELETE FROM roster WHERE roster_date = ?', [roster_date]);

    if (assignments.length > 0) {
      const values = assignments.map(a => [roster_date, a.shift_id, a.staff_id, req.user.id, a.notes || null]);
      await pool.query(
        'INSERT INTO roster (roster_date, shift_id, staff_id, assigned_by, notes) VALUES ?',
        [values]
      );
    }

    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE', 'roster', null, `Bulk assigned roster for ${roster_date} (${assignments.length} entries)`]
    );

    res.json({ message: `Roster saved. ${assignments.length} assignments created.` });
  } catch (error) {
    console.error('Bulk assign error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Get shifts
exports.getShifts = async (req, res) => {
  try {
    const [shifts] = await pool.query(
      'SELECT * FROM shifts WHERE is_active = TRUE ORDER BY display_order'
    );
    res.json({ shifts });
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
