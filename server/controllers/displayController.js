const pool = require('../config/db');
const xlsx = require('xlsx');
const fs = require('fs');

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

// Get today's display data (PUBLIC - no auth required)
exports.getToday = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const hasSlotIndex = await getHasSlotIndex();
    const rosterQuery = hasSlotIndex
      ? `
            SELECT r.id, r.roster_date, r.notes, r.slot_index,
              s.id as staff_id, s.full_name as staff_name, s.department, s.designation, s.specialization, s.registration_number,
             sc.id as category_id, sc.name as category_name, sc.display_order as category_order,
             sh.id as shift_id, sh.name as shift_name, sh.start_time, sh.end_time, sh.display_order as shift_order
      FROM roster r
      JOIN staff s ON r.staff_id = s.id
      JOIN staff_categories sc ON s.category_id = sc.id
      JOIN shifts sh ON r.shift_id = sh.id
      WHERE r.roster_date = ? AND s.is_active = TRUE
      ORDER BY sc.display_order, sh.display_order, r.slot_index, s.full_name
    `
      : `
            SELECT r.id, r.roster_date, r.notes, 1 as slot_index,
              s.id as staff_id, s.full_name as staff_name, s.department, s.designation, s.specialization, s.registration_number,
             sc.id as category_id, sc.name as category_name, sc.display_order as category_order,
             sh.id as shift_id, sh.name as shift_name, sh.start_time, sh.end_time, sh.display_order as shift_order
      FROM roster r
      JOIN staff s ON r.staff_id = s.id
      JOIN staff_categories sc ON s.category_id = sc.id
      JOIN shifts sh ON r.shift_id = sh.id
      WHERE r.roster_date = ? AND s.is_active = TRUE
      ORDER BY sc.display_order, sh.display_order, s.full_name
    `;

    const [roster] = await pool.query(rosterQuery, [date]);

    // Get all categories and shifts for the grid structure
    const [categories] = await pool.query(
      'SELECT * FROM staff_categories WHERE is_active = TRUE ORDER BY display_order'
    );
    const [shifts] = await pool.query(
      'SELECT * FROM shifts WHERE is_active = TRUE ORDER BY display_order'
    );

    // Get display settings
    const [settings] = await pool.query('SELECT * FROM display_settings');
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });

    // Get certificates of on-duty staff for the ticker
    const staffIds = [...new Set(roster.map(r => r.staff_id))];
    let certificates = [];
    if (staffIds.length > 0) {
      const [certs] = await pool.query(`
        SELECT c.*, s.full_name as staff_name, sc.name as category_name
        FROM certificates c
        JOIN staff s ON c.staff_id = s.id
        JOIN staff_categories sc ON s.category_id = sc.id
        WHERE c.staff_id IN (?) AND c.is_active = TRUE
        ORDER BY s.full_name
      `, [staffIds]);
      certificates = certs;
    }

    // Get today's Night Supervisor / MOD
    const [nightSupervisorData] = await pool.query(
      'SELECT staff_name FROM monthly_duty_schedule WHERE duty_date = ? AND role_name = "Night Supervisor"',
      [date]
    );
    const nightSupervisorName = nightSupervisorData.length > 0 ? nightSupervisorData[0].staff_name : null;

    // Structure data for display
    const displayData = {
      date,
      settings: settingsMap,
      categories,
      shifts,
      roster,
      certificates,
      nightSupervisorName
    };

    res.json(displayData);
  } catch (error) {
    console.error('Get display error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Get display settings
exports.getSettings = async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT * FROM display_settings');
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });
    res.json({ settings: settingsMap });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Update display settings (auth required)
exports.updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ message: 'Settings object is required.' });
    }

    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        'INSERT INTO display_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, value, value]
      );
    }

    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE', 'settings', null, `Updated display settings: ${Object.keys(settings).join(', ')}`]
    );

    res.json({ message: 'Settings updated successfully.' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Total active staff by category
    const [staffByCategory] = await pool.query(`
      SELECT sc.name as category, COUNT(s.id) as count
      FROM staff_categories sc
      LEFT JOIN staff s ON sc.id = s.category_id AND s.is_active = TRUE
      WHERE sc.is_active = TRUE
      GROUP BY sc.id, sc.name
      ORDER BY sc.display_order
    `);

    // Today's roster count
    const [todayRoster] = await pool.query(
      'SELECT COUNT(*) as count FROM roster WHERE roster_date = ?',
      [today]
    );

    // Expiring certificates (within 30 days)
    const [expiringCerts] = await pool.query(`
      SELECT c.*, s.full_name as staff_name
      FROM certificates c
      JOIN staff s ON c.staff_id = s.id
      WHERE c.is_active = TRUE AND c.expiry_date IS NOT NULL
      AND c.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      ORDER BY c.expiry_date
    `);

    // Recent activity
    const [recentActivity] = await pool.query(`
      SELECT a.*, u.full_name as user_name
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 10
    `);

    // Total counts
    const [totalStaff] = await pool.query('SELECT COUNT(*) as count FROM staff WHERE is_active = TRUE');
    const [totalCerts] = await pool.query('SELECT COUNT(*) as count FROM certificates WHERE is_active = TRUE');

    res.json({
      stats: {
        totalStaff: totalStaff[0].count,
        totalCertificates: totalCerts[0].count,
        todayRosterCount: todayRoster[0].count,
        expiringCertificates: expiringCerts.length,
        staffByCategory,
        expiringCerts,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Import monthly duty schedule from Excel
exports.importMonthlyDuty = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Read raw values first
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true });

    // SAVE FOR DEBUGGING
    const debugPath = 'uploads/latest_debug.xlsx';
    if (fs.existsSync(debugPath)) fs.unlinkSync(debugPath);
    fs.copyFileSync(req.file.path, debugPath);
    
    fs.unlinkSync(req.file.path);

    if (data.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty' });
    }

    let dateIndex = -1;
    let nameIndex = -1;
    let headerRowIndex = -1;

    // Scan for the header row
    for (let i = 0; i < Math.min(data.length, 20); i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;
      
      const cDate = row.findIndex(val => typeof val === 'string' && (val.toLowerCase() === 'date' || val.toLowerCase().includes('duty date')));
      const cName = row.findIndex(val => typeof val === 'string' && (val.toLowerCase() === 'name' || val.toLowerCase() === 'names' || val.toLowerCase().includes('supervisor')));
      
      if (cDate !== -1 && cName !== -1) {
        dateIndex = cDate;
        nameIndex = cName;
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      return res.status(400).json({ message: 'Could not find "Date" and "Name" columns in the Excel file.' });
    }

    // Process data
    let insertedRows = 0;
    
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!Array.isArray(row) || row.length <= Math.max(dateIndex, nameIndex)) continue;

      let dateRaw = row[dateIndex];
      let nameRaw = row[nameIndex];

      if (!dateRaw || !nameRaw) continue; // Skip incomplete rows
      if (typeof nameRaw !== 'string') nameRaw = String(nameRaw);
      
      let formattedDate;

      // Handle Excel Date Serial Number vs String
      if (typeof dateRaw === 'number') {
        const parsed = xlsx.SSF.parse_date_code(dateRaw);
        if (parsed) {
          const y = parsed.y;
          const m = String(parsed.m).padStart(2, '0');
          const d = String(parsed.d).padStart(2, '0');
          formattedDate = `${y}-${m}-${d}`;
        }
      } else {
        // String format parsing (DD-MM-YYYY or MM/DD/YYYY)
        let strDate = String(dateRaw).trim();
        // check for DD-MM-YYYY or DD/MM/YYYY
        const dmyMatch = strDate.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
        if (dmyMatch) {
          // If the user specified DD-MM-YYYY
          const d = dmyMatch[1].padStart(2, '0');
          const m = dmyMatch[2].padStart(2, '0');
          const y = dmyMatch[3];
          formattedDate = `${y}-${m}-${d}`;
        } else {
          // Fallback to JS standard Date parsing
          let dutyDate = new Date(strDate);
          if (!isNaN(dutyDate.getTime())) {
            formattedDate = dutyDate.toISOString().split('T')[0];
          }
        }
      }

      if (!formattedDate) continue;

      await pool.query(
        'INSERT INTO monthly_duty_schedule (duty_date, role_name, staff_name) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE staff_name = ?',
        [formattedDate, 'Night Supervisor', nameRaw.trim(), nameRaw.trim()]
      );
      insertedRows++;
    }

    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'IMPORT', 'schedule', null, `Imported monthly night supervisor schedule (${insertedRows} rows)`]
    );

    res.json({ message: `Successfully imported ${insertedRows} schedule assignments.`, rows: insertedRows });
  } catch (error) {
    console.error('Import monthly duty error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Server error while parsing Excel file.' });
  }
};
