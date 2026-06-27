const pool = require('../config/db');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const updateExcelFile = require('./updateExcelHelper');

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
              s.id as staff_id, s.prefix as prefix, s.full_name as staff_name, s.display_name as staff_display_name, s.department, s.designation, s.specialization, s.registration_number,
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
              s.id as staff_id, s.prefix as prefix, s.full_name as staff_name, s.display_name as staff_display_name, s.department, s.designation, s.specialization, s.registration_number,
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

    const restrictedKeys = ['hospital_name', 'display_title', 'code_blue', 'auto_refresh_seconds'];
    const updatedKeys = [];

    for (const [key, value] of Object.entries(settings)) {
      if (req.user.role === 'admin' && restrictedKeys.includes(key)) {
        continue; // Skip restricted settings for admin
      }
      await pool.query(
        'INSERT INTO display_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, value, value]
      );
      updatedKeys.push(key);
    }

    // Audit log
    if (updatedKeys.length > 0) {
      await pool.query(
        'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'UPDATE', 'settings', null, `Updated display settings: ${updatedKeys.join(', ')}`]
      );
    }

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

    const startDate = req.query.startDate || today;
    const endDate = req.query.endDate || today;

    // Recent activity
    const [recentActivity] = await pool.query(`
      SELECT a.*, u.full_name as user_name
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.created_at BETWEEN ? AND ?
      ORDER BY a.created_at DESC
    `, [`${startDate} 00:00:00`, `${endDate} 23:59:59`]);

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

    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    if (fileExtension !== '.xlsx') {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'Invalid file format. Only Excel files (.xlsx) are allowed.' });
    }

    const categoryStr = req.body.category || 'mod';
    if (categoryStr !== 'mod') {
      return await handleMatrixUpload(req, res, categoryStr);
    }
    // Helper function to update physical Excel file
async function updateExcelFile(dateStr, newName, userId) {
  try {
    const schedulePath = 'uploads/latest_mod_schedule.xlsx';
    if (!fs.existsSync(schedulePath)) return;

    const workbook = xlsx.readFile(schedulePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    // Same scanning logic
    let dateIndex = -1, nameIndex = -1, headerRowIndex = -1;
    for (let i = 0; i < Math.min(data.length, 20); i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;
      const cDate = row.findIndex(val => typeof val === 'string' && (val.toLowerCase() === 'date' || val.toLowerCase().includes('duty date')));
      const cName = row.findIndex(val => typeof val === 'string' && (val.toLowerCase() === 'name' || val.toLowerCase() === 'names' || val.toLowerCase().includes('supervisor')));
      if (cDate !== -1 && cName !== -1) {
        dateIndex = cDate; nameIndex = cName; headerRowIndex = i; break;
      }
    }

    if (headerRowIndex === -1) return;

    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!Array.isArray(row) || row.length <= Math.max(dateIndex, nameIndex)) continue;

      let dateRaw = row[dateIndex];
      let formattedDate;

      if (typeof dateRaw === 'number') {
        const parsed = xlsx.SSF.parse_date_code(dateRaw);
        if (parsed) {
          const y = parsed.y;
          const m = String(parsed.m).padStart(2, '0');
          const d = String(parsed.d).padStart(2, '0');
          formattedDate = `${y}-${m}-${d}`;
        }
      } else {
        let strDate = String(dateRaw).trim();
        const dmyMatch = strDate.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
        if (dmyMatch) {
          const d = dmyMatch[1].padStart(2, '0');
          const m = dmyMatch[2].padStart(2, '0');
          const y = dmyMatch[3];
          formattedDate = `${y}-${m}-${d}`;
        } else {
          let dutyDate = new Date(strDate);
          if (!isNaN(dutyDate.getTime())) {
            formattedDate = dutyDate.toISOString().split('T')[0];
          }
        }
      }

      if (formattedDate === dateStr) {
        data[i][nameIndex] = newName || '';
        break;
      }
    }

    const newSheet = xlsx.utils.aoa_to_sheet(data);
    workbook.Sheets[sheetName] = newSheet;
    xlsx.writeFile(workbook, schedulePath);

    // Save modified version to archives
    const archivesDir = path.join(__dirname, '..', 'uploads', 'archives');
    if (fs.existsSync(archivesDir)) {
      const timestamp = Date.now();
      const storedName = `${timestamp}_MOD_Schedule_Modified.xlsx`;
      const archivePath = path.join(archivesDir, storedName);
      fs.copyFileSync(schedulePath, archivePath);
      
      await pool.query(
        'INSERT INTO uploaded_files (original_name, stored_name, upload_type, uploaded_by) VALUES (?, ?, ?, ?)',
        ['MOD_Schedule_Modified.xlsx', storedName, 'Manager On Duty Schedule Modified', userId]
      );
    }
  } catch (error) {
    console.error('Update Excel file error:', error);
  }
}

async function handleMatrixUpload(req, res, categoryStr) {
  try {
    const year = parseInt(req.body.year) || new Date().getFullYear();
    const month = parseInt(req.body.month) || (new Date().getMonth() + 1);

    let categoryId;
    let headerPrefix;
    let uploadTypeStr = '';
    if (categoryStr === 'doctors') { categoryId = 1; headerPrefix = 'DOCTOR'; uploadTypeStr = 'Doctors Roster'; }
    else if (categoryStr === 'nursing') { categoryId = 2; headerPrefix = 'STAFF'; uploadTypeStr = 'Nursing Roster'; }
    else if (categoryStr === 'pharmacy') { categoryId = 3; headerPrefix = 'NAME'; uploadTypeStr = 'Pharmacy Roster'; }
    else {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Invalid category for matrix upload.' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true });

    let headerRowIndex = -1;
    let datesStartIndex = -1;
    let nameIndex = -1;

    for (let i = 0; i < Math.min(data.length, 20); i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;
      const oneIndex = row.findIndex(v => String(v).trim() === '1');
      if (oneIndex !== -1) {
         headerRowIndex = i;
         datesStartIndex = oneIndex;
         for (let j = 0; j < oneIndex; j++) {
            if (typeof row[j] === 'string' && (row[j].toUpperCase().includes('NAME') || row[j].toUpperCase().includes(headerPrefix))) {
               nameIndex = j;
            }
         }
         if (nameIndex === -1) nameIndex = oneIndex - 1;
         break;
      }
    }

    if (headerRowIndex === -1) {
       if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
       return res.status(400).json({ message: 'Could not find days 1-31 in the Excel file. Please use the official template.' });
    }

    // Archive file and register it in uploaded_files BEFORE inserting the roster entries
    const archivesDir = path.join(__dirname, '..', 'uploads', 'archives');
    if (!fs.existsSync(archivesDir)) fs.mkdirSync(archivesDir, { recursive: true });
    
    let originalName = req.file.originalname || `${uploadTypeStr}.xlsx`;
    originalName = Buffer.from(originalName, 'latin1').toString('utf8').replace(/Â/g, '').replace(/\s+/g, ' ').trim();
    
    const timestamp = Date.now();
    const storedName = `${timestamp}_${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const archivePath = path.join(archivesDir, storedName);
    fs.copyFileSync(req.file.path, archivePath);

    const [fileResult] = await pool.query(
      'INSERT INTO uploaded_files (original_name, stored_name, upload_type, uploaded_by) VALUES (?, ?, ?, ?)',
      [originalName, storedName, uploadTypeStr, req.user.id]
    );
    const uploadedFileId = fileResult.insertId;

    const [staffRows] = await pool.query('SELECT id, full_name FROM staff WHERE category_id = ? AND is_active = TRUE', [categoryId]);
    console.log(`[MatrixUpload] Found ${staffRows.length} active staff for category ${categoryStr}`);
    
    const shiftMap = { 
      'M': 1, 'MORNING': 1,
      'E': 2, 'EVENING': 2,
      'N': 3, 'NIGHT': 3
    };
    let insertedRows = 0;
    const skippedNames = [];
    
    for (let i = headerRowIndex + 1; i < data.length; i++) {
       const row = data[i];
       if (!Array.isArray(row)) continue;

       const nameRaw = String(row[nameIndex] || '').trim();
       if (!nameRaw || nameRaw.toUpperCase().includes('SL NO')) continue;

       // Robust name cleaning and matching
       const cleanWords = name => {
         return name.toLowerCase()
           .replace(/dr\.|dr\b|mr\.|mr\b|mrs\.|mrs\b|ms\.|ms\b/g, '') // strip titles
           .replace(/[^a-z0-9\s]/g, '') // strip special characters
           .split(/\s+/)
           .filter(w => w.length > 1);
       };

       const excelWords = cleanWords(nameRaw);
       
       const staffMatch = staffRows.find(s => {
         const dbWords = cleanWords(s.full_name);
         if (dbWords.length === 0 || excelWords.length === 0) return false;
         const intersection = dbWords.filter(w => excelWords.includes(w));
         const minMatch = Math.min(dbWords.length, excelWords.length, 2);
         return intersection.length >= minMatch;
       });
       
       if (!staffMatch) {
         if (!skippedNames.includes(nameRaw)) {
           skippedNames.push(nameRaw);
         }
         console.log(`[MatrixUpload] Skipped row: Excel name "${nameRaw}" not found in DB master.`);
         continue;
       }

       const staffId = staffMatch.id;
       const staffNameForLog = staffMatch.full_name;
       console.log(`[MatrixUpload] Matched Excel name "${nameRaw}" to DB staff "${staffMatch.full_name}" (ID: ${staffId})`);

       for (let day = 1; day <= 31; day++) {
          const colIndex = datesStartIndex + (day - 1);
          const cellVal = String(row[colIndex] || '').trim().toUpperCase();

          const shiftId = shiftMap[cellVal];
          if (shiftId) {
             const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
             
             const d = new Date(dateStr);
             if (isNaN(d.getTime()) || d.getMonth() + 1 !== month) continue;

             const [existing] = await pool.query('SELECT id FROM roster WHERE roster_date = ? AND shift_id = ? AND staff_id = ?', [dateStr, shiftId, staffId]);
             if (existing.length === 0) {
                await pool.query('INSERT INTO roster (roster_date, shift_id, staff_id, assigned_by, uploaded_file_id) VALUES (?, ?, ?, ?, ?)', [dateStr, shiftId, staffId, req.user.id, uploadedFileId]);
                console.log(`[MatrixUpload] Inserted shift ${shiftId} on ${dateStr} for ${staffNameForLog}`);
                insertedRows++;
             } else {
                console.log(`[MatrixUpload] Shift ${shiftId} on ${dateStr} for ${staffNameForLog} already exists. Skipping.`);
             }
          }
       }
    }

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'IMPORT', 'roster', null, `Imported ${uploadTypeStr} schedule (${insertedRows} shifts assigned)`]
    );

    let responseMessage = `Successfully imported ${insertedRows} shift assignments for ${uploadTypeStr}.`;
    if (skippedNames.length > 0) {
      responseMessage += ` Note: The following staff names were not found in your master directory and were skipped: ${skippedNames.join(', ')}`;
    }

    return res.json({ message: responseMessage, rows: insertedRows });

  } catch (error) {
    console.error('Matrix upload error:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ message: 'Server error while parsing Excel matrix file.' });
  }
}

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Read raw values first
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true });

    if (data.length === 0) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
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
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Could not find "Date" and "Name" columns in the Excel file.' });
    }

    // Phase 1: Parse and validate all valid rows
    const parsedRows = [];
    const now = new Date();
    // Midnight of the 1st of the current month
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

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

      // Validation: Check if date is from a previous month
      const parsedDateObj = new Date(formattedDate);
      if (parsedDateObj < currentMonthStart) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          message: 'Invalid file: This Excel sheet contains dates from a previous month. You can only upload schedules for the current and future months.' 
        });
      }

      parsedRows.push({ formattedDate, nameRaw: nameRaw.trim() });
    }

    // Save filename to settings
    let originalName = req.file.originalname || 'MOD_Schedule.xlsx';
    // Fix UTF-8 encoding issue often caused by multer with latin1 fallback
    originalName = Buffer.from(originalName, 'latin1').toString('utf8');
    // Remove the Â character which usually accompanies non-breaking spaces
    originalName = originalName.replace(/Â/g, '').replace(/\s+/g, ' ').trim();

    const timestamp = Date.now();
    const storedName = `${timestamp}_${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // Save to historical archives
    const archivesDir = path.join(__dirname, '..', 'uploads', 'archives');
    if (!fs.existsSync(archivesDir)) {
      fs.mkdirSync(archivesDir, { recursive: true });
    }
    const archivePath = path.join(archivesDir, storedName);
    fs.copyFileSync(req.file.path, archivePath);

    // Log to uploaded_files table BEFORE inserting schedule entries
    const [fileResult] = await pool.query(
      'INSERT INTO uploaded_files (original_name, stored_name, upload_type, uploaded_by) VALUES (?, ?, ?, ?)',
      [originalName, storedName, 'Manager On Duty Schedule', req.user.id]
    );
    const uploadedFileId = fileResult.insertId;

    // Phase 2: Insert into database
    let insertedRows = 0;
    for (const item of parsedRows) {
      await pool.query(
        'INSERT INTO monthly_duty_schedule (duty_date, role_name, staff_name, uploaded_file_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE staff_name = ?, uploaded_file_id = ?',
        [item.formattedDate, 'Night Supervisor', item.nameRaw, uploadedFileId, item.nameRaw, uploadedFileId]
      );
      insertedRows++;
    }

    // If validation passed and we inserted rows, save the file for download
    const schedulePath = 'uploads/latest_mod_schedule.xlsx';
    if (fs.existsSync(schedulePath)) fs.unlinkSync(schedulePath);
    fs.copyFileSync(req.file.path, schedulePath);
    
    await pool.query(
      'INSERT INTO display_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
      ['active_mod_schedule_filename', originalName, originalName]
    );

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

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

// Manually override MOD for a specific date
exports.updateManualMod = async (req, res) => {
  try {
    const { date, staff_name } = req.body;

    if (!date) {
      return res.status(400).json({ message: 'Date is required.' });
    }

    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (date < todayStr) {
      return res.status(400).json({ message: 'Cannot modify roster for past dates.' });
    }

    if (!staff_name || staff_name.trim() === '') {
      // If empty, delete the MOD entry for that date
      await pool.query(
        'DELETE FROM monthly_duty_schedule WHERE duty_date = ? AND role_name = "Night Supervisor"',
        [date]
      );
      
      // Audit log
      await pool.query(
        'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'DELETE', 'schedule', null, `Removed MOD for ${date}`]
      );
      
      // Update Excel file to clear the name
      await updateExcelFile(date, '', req.user.id);
      
      return res.json({ message: 'Manager On Duty entry removed successfully for the selected date.' });
    }

    // Upsert into monthly_duty_schedule for Night Supervisor / MOD
    await pool.query(
      'INSERT INTO monthly_duty_schedule (duty_date, role_name, staff_name) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE staff_name = ?',
      [date, 'Night Supervisor', staff_name.trim(), staff_name.trim()]
    );

    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE', 'schedule', null, `Manually updated MOD for ${date} to ${staff_name}`]
    );

    // Update physical Excel
    await updateExcelFile(date, staff_name.trim(), req.user.id);

    res.json({ message: 'Manager On Duty updated successfully for the selected date.' });
  } catch (error) {
    console.error('Update manual MOD error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Download latest MOD schedule
exports.downloadModSchedule = (req, res) => {
  const schedulePath = 'uploads/latest_mod_schedule.xlsx';
  if (fs.existsSync(schedulePath)) {
    res.download(schedulePath, 'MOD_Schedule.xlsx');
  } else {
    res.status(404).json({ message: 'No schedule file available for download.' });
  }
};

// Restore original MOD from Excel file
exports.restoreMod = async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ message: 'Date is required.' });

    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (date < todayStr) {
      return res.status(400).json({ message: 'Cannot modify roster for past dates.' });
    }

    const [originalFiles] = await pool.query(
      "SELECT stored_name FROM uploaded_files WHERE upload_type = 'Manager On Duty Schedule' ORDER BY uploaded_at DESC LIMIT 1"
    );

    let schedulePath = 'uploads/latest_mod_schedule.xlsx';
    if (originalFiles.length > 0) {
      schedulePath = path.join(__dirname, '..', 'uploads', 'archives', originalFiles[0].stored_name);
    }

    if (!fs.existsSync(schedulePath)) {
      return res.status(400).json({ message: 'No active schedule file found to restore from.' });
    }

    const workbook = xlsx.readFile(schedulePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true });

    let dateIndex = -1;
    let nameIndex = -1;
    let headerRowIndex = -1;

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
      return res.status(400).json({ message: 'Could not parse the original Excel file headers.' });
    }

    let originalName = null;

    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!Array.isArray(row) || row.length <= Math.max(dateIndex, nameIndex)) continue;

      let dateRaw = row[dateIndex];
      let nameRaw = row[nameIndex];
      if (!dateRaw || !nameRaw) continue;

      let formattedDate;
      if (typeof dateRaw === 'number') {
        const parsed = xlsx.SSF.parse_date_code(dateRaw);
        if (parsed) {
          formattedDate = `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
        }
      } else {
        let strDate = String(dateRaw).trim();
        const dmyMatch = strDate.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
        if (dmyMatch) {
          formattedDate = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
        } else {
          let dutyDate = new Date(strDate);
          if (!isNaN(dutyDate.getTime())) {
            formattedDate = dutyDate.toISOString().split('T')[0];
          }
        }
      }

      if (formattedDate === date) {
        originalName = String(nameRaw).trim();
        break;
      }
    }

    if (!originalName) {
      return res.status(404).json({ message: 'Original name not found in the Excel file for this date.' });
    }

    // Upsert into monthly_duty_schedule for Night Supervisor / MOD
    await pool.query(
      'INSERT INTO monthly_duty_schedule (duty_date, role_name, staff_name) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE staff_name = ?',
      [date, 'Night Supervisor', originalName, originalName]
    );

    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE', 'schedule', null, `Restored default MOD for ${date} to ${originalName}`]
    );

    // Update physical Excel
    await updateExcelFile(date, originalName, req.user.id);

    res.json({ message: `Restored default Manager On Duty: ${originalName}` });
  } catch (error) {
    console.error('Restore MOD error:', error);
    res.status(500).json({ message: 'Server error restoring MOD.' });
  }
};

// Export audit logs to Excel
exports.exportAuditLogs = async (req, res) => {
  try {
    // Only super admin allowed
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Forbidden. Super Admin only.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const startDate = req.query.startDate || today;
    const endDate = req.query.endDate || today;

    const [rows] = await pool.query(`
      SELECT a.id, a.created_at, u.full_name as user_name, a.action, a.entity_type, a.details
      FROM audit_log a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.created_at BETWEEN ? AND ?
      ORDER BY a.created_at DESC
    `, [`${startDate} 00:00:00`, `${endDate} 23:59:59`]);

    const excelData = rows.map(r => ({
      'Log ID': r.id,
      'Timestamp': new Date(r.created_at).toLocaleString('en-IN'),
      'User': r.user_name || 'System',
      'Action': r.action,
      'Entity Type': r.entity_type,
      'Details': r.details
    }));

    const worksheet = xlsx.utils.json_to_sheet(excelData);
    
    const colWidths = [
      { wch: 10 },
      { wch: 25 },
      { wch: 25 },
      { wch: 15 },
      { wch: 20 },
      { wch: 60 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Audit Logs');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Audit_Logs_${startDate}_to_${endDate}.xlsx"`);
    res.end(buffer);
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({ message: 'Server error exporting logs.' });
  }
};
