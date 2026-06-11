const pool = require('../config/db');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const xlsx = require('xlsx');

// Ensure archives directory exists
const archivesDir = path.join(__dirname, '..', 'uploads', 'archives');
if (!fs.existsSync(archivesDir)) {
  fs.mkdirSync(archivesDir, { recursive: true });
}

// Self-initializing schema check to support cascade deletion on uploaded files deletion
const ensureSchemaUpgradesExist = async () => {
  try {
    // 1. Check/Add uploaded_file_id column to roster
    const [rosterCols] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'roster' 
        AND COLUMN_NAME = 'uploaded_file_id'
    `);
    if (rosterCols.length === 0) {
      console.log('Adding uploaded_file_id column to roster table...');
      await pool.query(`
        ALTER TABLE roster 
        ADD COLUMN uploaded_file_id INT NULL,
        ADD CONSTRAINT fk_roster_uploaded_file 
          FOREIGN KEY (uploaded_file_id) 
          REFERENCES uploaded_files(id) 
          ON DELETE CASCADE
      `);
      console.log('uploaded_file_id column added to roster table.');
    }

    // 2. Check/Add uploaded_file_id column to monthly_duty_schedule
    const [scheduleCols] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'monthly_duty_schedule' 
        AND COLUMN_NAME = 'uploaded_file_id'
    `);
    if (scheduleCols.length === 0) {
      console.log('Adding uploaded_file_id column to monthly_duty_schedule table...');
      await pool.query(`
        ALTER TABLE monthly_duty_schedule 
        ADD COLUMN uploaded_file_id INT NULL,
        ADD CONSTRAINT fk_monthly_duty_uploaded_file 
          FOREIGN KEY (uploaded_file_id) 
          REFERENCES uploaded_files(id) 
          ON DELETE CASCADE
      `);
      console.log('uploaded_file_id column added to monthly_duty_schedule table.');
    }
  } catch (error) {
    console.error('Error upgrading database schema in fileController:', error);
  }
};

ensureSchemaUpgradesExist();


// List all uploaded files
exports.getFiles = async (req, res) => {
  try {
    const [files] = await pool.query(`
      SELECT f.*, u.full_name as uploaded_by_name 
      FROM uploaded_files f 
      LEFT JOIN users u ON f.uploaded_by = u.id 
      ORDER BY f.uploaded_at DESC
    `);
    res.json({ files });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ message: 'Server error while fetching files' });
  }
};

// Download a specific file
exports.downloadFile = async (req, res) => {
  try {
    const [files] = await pool.query('SELECT * FROM uploaded_files WHERE id = ?', [req.params.id]);
    if (files.length === 0) {
      return res.status(404).json({ message: 'File not found in database' });
    }

    const fileRecord = files[0];
    const filePath = path.join(archivesDir, fileRecord.stored_name);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Physical file not found on server' });
    }

    res.download(filePath, fileRecord.original_name);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ message: 'Server error while downloading file' });
  }
};

// Download dynamic Excel template
exports.downloadTemplate = async (req, res) => {
  try {
    const type = req.params.type;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template');
    let fileName = 'Template.xlsx';

    // Generate dates 1-31
    const dates = Array.from({ length: 31 }, (_, i) => String(i + 1));
    let headers = [];

    if (type === 'mod') {
      fileName = 'Manager_On_Duty_Template.xlsx';
      headers = ['Sl. No', 'Date', 'Name', 'Employee ID', 'Designation', 'Mob No'];
    } else if (type === 'doctors') {
      fileName = 'Doctors_Roster_Template.xlsx';
      headers = ['NAME OF THE DOCTORS', ...dates];
    } else if (type === 'pharmacy') {
      fileName = 'Pharmacy_Roster_Template.xlsx';
      headers = ['SL NO', 'NAME', ...dates];
    } else if (type === 'nursing') {
      fileName = 'Nursing_Roster_Template.xlsx';
      headers = ['SL NO', 'STAFFS NAME', ...dates];
    } else {
      return res.status(400).json({ message: 'Invalid template type requested.' });
    }

    // Set columns with standard width
    worksheet.columns = headers.map(h => ({
      header: h,
      key: h,
      width: h.length > 10 ? h.length + 5 : 12
    }));

    // Add highlight colors to the header row (Row 1)
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // White text
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0D9488' } // Teal color to match dashboard primary theme
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Apply borders to header
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add some empty rows with borders for neatness
    for (let i = 2; i <= 31; i++) {
       const row = worksheet.getRow(i);
       for (let j = 1; j <= headers.length; j++) {
           const cell = row.getCell(j);
           cell.border = {
             top: { style: 'thin' },
             left: { style: 'thin' },
             bottom: { style: 'thin' },
             right: { style: 'thin' }
           };
       }
    }

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ message: 'Server error while generating template' });
  }
};

// Delete a specific file from archives
exports.deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const [files] = await pool.query('SELECT * FROM uploaded_files WHERE id = ?', [id]);
    if (files.length === 0) {
      return res.status(404).json({ message: 'File not found in database' });
    }

    const fileRecord = files[0];
    const filePath = path.join(archivesDir, fileRecord.stored_name);

    // Delete physical file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete database record
    await pool.query('DELETE FROM uploaded_files WHERE id = ?', [id]);

    // Log audit trail
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'DELETE', 'file', id, `Deleted file archive: ${fileRecord.original_name}`]
    );

    res.json({ message: 'File deleted successfully.' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Server error while deleting file' });
  }
};

