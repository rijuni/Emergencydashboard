const pool = require('../config/db');

const normalizeBoolQuery = (value) => {
  if (value === undefined) return undefined;
  return value === 'true';
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const buildStaffListQuery = ({ categoryId, excludeCategoryId, isActive, search }) => {
  let query = `
    SELECT s.*, s.display_name as staff_display_name, sc.name as category_name
    FROM staff s
    JOIN staff_categories sc ON s.category_id = sc.id
    WHERE 1=1
  `;
  const params = [];

  if (categoryId) {
    query += ' AND s.category_id = ?';
    params.push(categoryId);
  }

  if (excludeCategoryId) {
    query += ' AND s.category_id <> ?';
    params.push(excludeCategoryId);
  }

  if (isActive !== undefined) {
    query += ' AND s.is_active = ?';
    params.push(isActive);
  }

  if (search) {
    query += ' AND (s.full_name LIKE ? OR s.designation LIKE ? OR s.registration_number LIKE ? OR s.branch LIKE ? OR s.department LIKE ? OR s.unit LIKE ? OR s.qualification LIKE ? OR s.specialization LIKE ?)';
    params.push(
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`
    );
  }

  query += ' ORDER BY sc.display_order, s.full_name';
  return { query, params };
};

const buildStaffCountQuery = ({ categoryId, excludeCategoryId, isActive, search }) => {
  let query = `
    SELECT COUNT(*) as total
    FROM staff s
    JOIN staff_categories sc ON s.category_id = sc.id
    WHERE 1=1
  `;
  const params = [];

  if (categoryId) {
    query += ' AND s.category_id = ?';
    params.push(categoryId);
  }

  if (excludeCategoryId) {
    query += ' AND s.category_id <> ?';
    params.push(excludeCategoryId);
  }

  if (isActive !== undefined) {
    query += ' AND s.is_active = ?';
    params.push(isActive);
  }

  if (search) {
    query += ' AND (s.full_name LIKE ? OR s.designation LIKE ? OR s.registration_number LIKE ? OR s.branch LIKE ? OR s.department LIKE ? OR s.unit LIKE ? OR s.qualification LIKE ? OR s.specialization LIKE ?)';
    params.push(
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`
    );
  }

  return { query, params };
};

const getDoctorCategoryId = async () => {
  const [rows] = await pool.query(
    'SELECT id FROM staff_categories WHERE LOWER(name) = ? LIMIT 1',
    ['doctor']
  );
  return rows[0]?.id;
};

// Get all staff (with optional filters)
exports.getAll = async (req, res) => {
  try {
    const { category_id, is_active, search } = req.query;
    const { query, params } = buildStaffListQuery({
      categoryId: category_id,
      isActive: normalizeBoolQuery(is_active),
      search
    });

    const [staff] = await pool.query(query, params);
    res.json({ staff });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Get doctor master list
exports.getDoctors = async (req, res) => {
  try {
    const { is_active, search } = req.query;
    const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
    const requestedLimit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const offset = (page - 1) * limit;
    const doctorCategoryId = await getDoctorCategoryId();

    if (!doctorCategoryId) {
      return res.json({
        staff: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      });
    }

    const { query, params } = buildStaffListQuery({
      categoryId: doctorCategoryId,
      isActive: normalizeBoolQuery(is_active),
      search
    });

    const { query: countQuery, params: countParams } = buildStaffCountQuery({
      categoryId: doctorCategoryId,
      isActive: normalizeBoolQuery(is_active),
      search
    });

    const [staff, countRows] = await Promise.all([
      pool.query(`${query} LIMIT ? OFFSET ?`, [...params, limit, offset]),
      pool.query(countQuery, countParams)
    ]);

    const total = Number(countRows[0]?.[0]?.total || 0);
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    res.json({
      staff: staff[0],
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Get employee master list (all non-doctor staff)
exports.getEmployees = async (req, res) => {
  try {
    const { category_id, is_active, search } = req.query;
    const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
    const requestedLimit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const offset = (page - 1) * limit;
    const doctorCategoryId = await getDoctorCategoryId();

    const { query, params } = buildStaffListQuery({
      categoryId: category_id,
      excludeCategoryId: doctorCategoryId,
      isActive: normalizeBoolQuery(is_active),
      search
    });

    const { query: countQuery, params: countParams } = buildStaffCountQuery({
      categoryId: category_id,
      excludeCategoryId: doctorCategoryId,
      isActive: normalizeBoolQuery(is_active),
      search
    });

    const [staff, countRows] = await Promise.all([
      pool.query(`${query} LIMIT ? OFFSET ?`, [...params, limit, offset]),
      pool.query(countQuery, countParams)
    ]);

    const total = Number(countRows[0]?.[0]?.total || 0);
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    res.json({
      staff: staff[0],
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Get single staff with certificates
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const [staff] = await pool.query(`
      SELECT s.*, s.display_name as staff_display_name, sc.name as category_name 
      FROM staff s 
      JOIN staff_categories sc ON s.category_id = sc.id 
      WHERE s.id = ?
    `, [id]);

    if (staff.length === 0) {
      return res.status(404).json({ message: 'Staff not found.' });
    }

    const [certificates] = await pool.query(
      'SELECT * FROM certificates WHERE staff_id = ? AND is_active = TRUE ORDER BY created_at DESC',
      [id]
    );

    res.json({ staff: { ...staff[0], certificates } });
  } catch (error) {
    console.error('Get staff by id error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Create staff
exports.create = async (req, res) => {
  try {
    const {
      full_name,
      category_id,
      branch,
      department,
      unit,
      designation,
      qualification,
      specialization,
      registration_number,
      phone,
      email
    } = req.body;

    if (!full_name || !category_id) {
      return res.status(400).json({ message: 'Full name and category are required.' });
    }

    const doctorCategoryId = await getDoctorCategoryId();
    if (doctorCategoryId && Number(category_id) === doctorCategoryId && !designation) {
      return res.status(400).json({ message: 'Designation is required for doctors.' });
    }

    const [result] = await pool.query(
      'INSERT INTO staff (full_name, display_name, category_id, branch, department, unit, designation, qualification, specialization, registration_number, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        full_name,
        req.body.display_name || null,
        category_id,
        branch || null,
        department || null,
        unit || null,
        designation || null,
        qualification || null,
        specialization || null,
        registration_number || null,
        phone || null,
        email || null
      ]
    );

    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE', 'staff', result.insertId, `Created staff: ${full_name}`]
    );

    res.status(201).json({
      message: 'Staff created successfully',
      staff: {
        id: result.insertId,
        full_name,
        display_name: req.body.display_name || null,
        category_id,
        branch,
        department,
        unit,
        designation,
        qualification,
        specialization,
        registration_number,
        phone,
        email
      }
    });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Bulk create staff records
exports.bulkCreate = async (req, res) => {
  try {
    const { staffList } = req.body;

    if (!Array.isArray(staffList) || staffList.length === 0) {
      return res.status(400).json({ message: 'staffList array is required.' });
    }

    if (staffList.length > 200) {
      return res.status(400).json({ message: 'Maximum 200 records allowed per request.' });
    }

    const values = [];
    const doctorCategoryId = await getDoctorCategoryId();
    for (let index = 0; index < staffList.length; index += 1) {
      const item = staffList[index] || {};
      const fullName = String(item.full_name || '').trim();
      const categoryId = Number(item.category_id);

      if (!fullName || !Number.isInteger(categoryId) || categoryId <= 0) {
        return res.status(400).json({
          message: `Invalid data at item ${index + 1}. full_name and valid category_id are required.`
        });
      }

      if (doctorCategoryId && categoryId === doctorCategoryId && !item.designation) {
        return res.status(400).json({
          message: `Designation is required for doctors (item ${index + 1}).`
        });
      }

      values.push([
        fullName,
        item.display_name ? String(item.display_name).trim() : null,
        categoryId,
        item.branch ? String(item.branch).trim() : null,
        item.department ? String(item.department).trim() : null,
        item.unit ? String(item.unit).trim() : null,
        item.designation ? String(item.designation).trim() : null,
        item.qualification ? String(item.qualification).trim() : null,
        item.specialization ? String(item.specialization).trim() : null,
        item.registration_number ? String(item.registration_number).trim() : null,
        item.phone ? String(item.phone).trim() : null,
        item.email ? String(item.email).trim() : null
      ]);
    }

    await pool.query(
      'INSERT INTO staff (full_name, display_name, category_id, branch, department, unit, designation, qualification, specialization, registration_number, phone, email) VALUES ?',
      [values]
    );

    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE', 'staff', null, `Bulk created ${values.length} staff records`]
    );

    res.status(201).json({
      message: `${values.length} staff records created successfully.`,
      createdCount: values.length
    });
  } catch (error) {
    console.error('Bulk create staff error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Update staff
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      full_name,
      category_id,
      branch,
      department,
      unit,
      designation,
      qualification,
      specialization,
      registration_number,
      phone,
      email,
      is_active
    } = req.body;

    const [existing] = await pool.query('SELECT * FROM staff WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Staff not found.' });
    }

    await pool.query(
      `UPDATE staff SET full_name = ?, display_name = ?, category_id = ?, branch = ?, department = ?, unit = ?, designation = ?,
       qualification = ?, specialization = ?, registration_number = ?, phone = ?, email = ?, is_active = ? WHERE id = ?`,
      [
        full_name || existing[0].full_name,
        req.body.display_name !== undefined ? req.body.display_name : existing[0].display_name,
        category_id || existing[0].category_id,
        branch !== undefined ? branch : existing[0].branch,
        department !== undefined ? department : existing[0].department,
        unit !== undefined ? unit : existing[0].unit,
        designation !== undefined ? designation : existing[0].designation,
        qualification !== undefined ? qualification : existing[0].qualification,
        specialization !== undefined ? specialization : existing[0].specialization,
        registration_number !== undefined ? registration_number : existing[0].registration_number,
        phone !== undefined ? phone : existing[0].phone,
        email !== undefined ? email : existing[0].email,
        is_active !== undefined ? is_active : existing[0].is_active,
        id
      ]
    );

    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE', 'staff', id, `Updated staff: ${full_name || existing[0].full_name}`]
    );

    res.json({ message: 'Staff updated successfully.' });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Delete (soft delete) staff
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM staff WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Staff not found.' });
    }

    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    await pool.query('UPDATE staff SET is_active = FALSE WHERE id = ?', [id]);
    await pool.query('DELETE FROM roster WHERE staff_id = ? AND roster_date >= ?', [id, todayStr]);

    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'DELETE', 'staff', id, `Deactivated staff: ${existing[0].full_name} and removed future roster assignments`]
    );

    res.json({ message: 'Staff deactivated successfully.' });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const [categories] = await pool.query(
      'SELECT * FROM staff_categories WHERE is_active = TRUE ORDER BY display_order'
    );
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
