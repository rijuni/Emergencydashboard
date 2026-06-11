const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const pool = require('./../config/db');

const updateExcelFile = async (date, staffName, userId) => {
  const schedulePath = 'uploads/latest_mod_schedule.xlsx';
  if (!fs.existsSync(schedulePath)) return;

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

  if (headerRowIndex === -1) return;

  let targetRowIndex = -1;
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!Array.isArray(row) || row.length <= Math.max(dateIndex, nameIndex)) continue;

    let dateRaw = row[dateIndex];
    if (!dateRaw) continue;

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
      targetRowIndex = i;
      break;
    }
  }

  if (targetRowIndex !== -1) {
    // Modify the cell in the worksheet object directly
    // xlsx.utils.sheet_to_json gives array of arrays, but we need to update the sheet object
    const cellRef = xlsx.utils.encode_cell({ r: targetRowIndex, c: nameIndex });
    if (!sheet[cellRef]) {
      sheet[cellRef] = { t: 's', v: staffName };
    } else {
      sheet[cellRef].v = staffName;
    }

    // Write back to latest_mod_schedule.xlsx
    xlsx.writeFile(workbook, schedulePath);

    // Create archive copy
    const [settings] = await pool.query("SELECT setting_value FROM display_settings WHERE setting_key = 'active_mod_schedule_filename'");
    const originalName = settings.length > 0 ? settings[0].setting_value : 'Manager_On_Duty_Schedule.xlsx';
    
    const archivesDir = path.join(__dirname, '..', 'uploads', 'archives');
    if (!fs.existsSync(archivesDir)) fs.mkdirSync(archivesDir, { recursive: true });
    
    const timestamp = Date.now();
    const storedName = `${timestamp}_Updated_${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const archivePath = path.join(archivesDir, storedName);
    fs.copyFileSync(schedulePath, archivePath);

    await pool.query(
      'INSERT INTO uploaded_files (original_name, stored_name, upload_type, uploaded_by) VALUES (?, ?, ?, ?)',
      [originalName, storedName, 'Manager On Duty Schedule (Auto-Updated)', userId]
    );
  }
};

module.exports = updateExcelFile;
