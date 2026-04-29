const pool = require('../config/db');

let hasSlotIndexCache;
let hasSlotIndexCheckedAt = 0;

const getHasSlotIndex = async () => {
  const now = Date.now();
  if (hasSlotIndexCache !== undefined && now - hasSlotIndexCheckedAt < 60000) {
    return hasSlotIndexCache;
  }

  const [columns] = await pool.query("SHOW COLUMNS FROM roster LIKE 'slot_index'");
  hasSlotIndexCache = columns.length > 0;
  hasSlotIndexCheckedAt = now;
  return hasSlotIndexCache;
};

// Get roster for a specific date
exports.getByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required.' });
    }

    const hasSlotIndex = await getHasSlotIndex();
    const rosterQuery = hasSlotIndex
      ? `
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
      ORDER BY sc.display_order, sh.display_order, r.slot_index, s.full_name
    `
      : `
      SELECT r.*, 1 as slot_index, s.full_name as staff_name, s.designation, s.registration_number,
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
    `;

    const [roster] = await pool.query(rosterQuery, [date]);

    res.json({ roster });
  } catch (error) {
    console.error('Get roster error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Create roster assignment
exports.create = async (req, res) => {
  try {
    const { roster_date, shift_id, staff_id, notes, allow_duplicate, slot_index } = req.body;

    if (!roster_date || !shift_id || !staff_id) {
      return res.status(400).json({ message: 'Date, shift, and staff are required.' });
    }

    const hasSlotIndex = await getHasSlotIndex();
    const parsedSlotIndex = Number.parseInt(slot_index, 10);
    let finalSlotIndex = Number.isNaN(parsedSlotIndex) ? 1 : parsedSlotIndex;

    if (allow_duplicate) {
      if (!hasSlotIndex) {
        return res.status(409).json({
          message: 'Duplicate assignments require slot_index. Run the database migration to enable it.'
        });
      }
      const [maxSlot] = await pool.query(
        'SELECT MAX(slot_index) as max_slot FROM roster WHERE roster_date = ? AND shift_id = ? AND staff_id = ?',
        [roster_date, shift_id, staff_id]
      );
      finalSlotIndex = (maxSlot[0]?.max_slot || 0) + 1;
    } else {
      const [existing] = await pool.query(
        'SELECT id FROM roster WHERE roster_date = ? AND shift_id = ? AND staff_id = ? LIMIT 1',
        [roster_date, shift_id, staff_id]
      );
      if (existing.length > 0) {
        return res.status(409).json({ message: 'This staff is already assigned to this shift on this date.' });
      }
    }

    const insertQuery = hasSlotIndex
      ? 'INSERT INTO roster (roster_date, shift_id, staff_id, slot_index, assigned_by, notes) VALUES (?, ?, ?, ?, ?, ?)'
      : 'INSERT INTO roster (roster_date, shift_id, staff_id, assigned_by, notes) VALUES (?, ?, ?, ?, ?)';

    const insertValues = hasSlotIndex
      ? [roster_date, shift_id, staff_id, finalSlotIndex, req.user.id, notes || null]
      : [roster_date, shift_id, staff_id, req.user.id, notes || null];

    const [result] = await pool.query(insertQuery, insertValues);

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
    const hasSlotIndex = await getHasSlotIndex();
    const [sourceRoster] = await pool.query(
      hasSlotIndex
        ? 'SELECT shift_id, staff_id, slot_index, notes FROM roster WHERE roster_date = ?'
        : 'SELECT shift_id, staff_id, notes FROM roster WHERE roster_date = ?',
      [from_date]
    );

    if (sourceRoster.length === 0) {
      return res.status(404).json({ message: 'No roster found for the source date.' });
    }

    // Delete existing entries for target date
    await pool.query('DELETE FROM roster WHERE roster_date = ?', [to_date]);

    // Insert copied entries
    if (hasSlotIndex) {
      const values = sourceRoster.map(r => [to_date, r.shift_id, r.staff_id, r.slot_index, req.user.id, r.notes]);
      await pool.query(
        'INSERT INTO roster (roster_date, shift_id, staff_id, slot_index, assigned_by, notes) VALUES ?',
        [values]
      );
    } else {
      const values = sourceRoster.map(r => [to_date, r.shift_id, r.staff_id, req.user.id, r.notes]);
      await pool.query(
        'INSERT INTO roster (roster_date, shift_id, staff_id, assigned_by, notes) VALUES ?',
        [values]
      );
    }

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
      const hasSlotIndex = await getHasSlotIndex();
      if (hasSlotIndex) {
        const values = assignments.map(a => {
          const parsedSlotIndex = Number.parseInt(a.slot_index, 10);
          const finalSlotIndex = Number.isNaN(parsedSlotIndex) ? 1 : parsedSlotIndex;
          return [
            roster_date,
            a.shift_id,
            a.staff_id,
            finalSlotIndex,
            req.user.id,
            a.notes || null
          ];
        });
        await pool.query(
          'INSERT INTO roster (roster_date, shift_id, staff_id, slot_index, assigned_by, notes) VALUES ?',
          [values]
        );
      } else {
        const values = assignments.map(a => [
          roster_date,
          a.shift_id,
          a.staff_id,
          req.user.id,
          a.notes || null
        ]);
        await pool.query(
          'INSERT INTO roster (roster_date, shift_id, staff_id, assigned_by, notes) VALUES ?',
          [values]
        );
      }
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
    const includeInactive = req.query.include_inactive === 'true';
    const [shifts] = await pool.query(
      `SELECT * FROM shifts ${includeInactive ? '' : 'WHERE is_active = TRUE'} ORDER BY display_order`
    );
    res.json({ shifts });
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Create shift
exports.createShift = async (req, res) => {
  try {
    const { name, start_time, end_time, display_order, is_active } = req.body;

    if (!name || !start_time || !end_time) {
      return res.status(400).json({ message: 'Name, start time, and end time are required.' });
    }

    const parsedDisplayOrder = Number.parseInt(display_order, 10);
    const finalDisplayOrder = Number.isNaN(parsedDisplayOrder) ? 0 : parsedDisplayOrder;

    const [result] = await pool.query(
      'INSERT INTO shifts (name, start_time, end_time, display_order, is_active) VALUES (?, ?, ?, ?, ?)',
      [name, start_time, end_time, finalDisplayOrder, is_active !== false]
    );

    res.status(201).json({ message: 'Shift created.', id: result.insertId });
  } catch (error) {
    console.error('Create shift error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Update shift
exports.updateShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_time, end_time, display_order, is_active } = req.body;

    const [existing] = await pool.query('SELECT * FROM shifts WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Shift not found.' });
    }

    const current = existing[0];
    const parsedDisplayOrder = Number.parseInt(display_order, 10);
    const finalDisplayOrder = Number.isNaN(parsedDisplayOrder)
      ? current.display_order
      : parsedDisplayOrder;

    await pool.query(
      'UPDATE shifts SET name = ?, start_time = ?, end_time = ?, display_order = ?, is_active = ? WHERE id = ?',
      [
        name || current.name,
        start_time || current.start_time,
        end_time || current.end_time,
        finalDisplayOrder,
        typeof is_active === 'boolean' ? is_active : current.is_active,
        id
      ]
    );

    res.json({ message: 'Shift updated successfully.' });
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Toggle shift active
exports.toggleShift = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT id, is_active FROM shifts WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Shift not found.' });
    }

    const nextActive = !existing[0].is_active;
    await pool.query('UPDATE shifts SET is_active = ? WHERE id = ?', [nextActive, id]);

    res.json({ message: 'Shift status updated.', is_active: nextActive });
  } catch (error) {
    console.error('Toggle shift error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
