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
      prefix,
      employee_id,
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

    // Validate full_name: must not contain numbers
    if (/[0-9]/.test(full_name)) {
      return res.status(400).json({ message: 'Full name must not contain numbers.' });
    }

    // Require employee_id for all staff
    if (!employee_id || String(employee_id).trim() === '') {
      return res.status(400).json({ message: 'Employee ID is required.' });
    }

    // Validate employee_id: must be numeric only
    if (!/^\d+$/.test(String(employee_id).trim())) {
      return res.status(400).json({ message: 'Employee ID must contain only numbers.' });
    }

    // Check duplicate employee_id
    const [dupCheck] = await pool.query('SELECT id FROM staff WHERE employee_id = ? LIMIT 1', [String(employee_id).trim()]);
    if (dupCheck.length > 0) {
      return res.status(409).json({ message: 'Employee ID already exists.' });
    }

    const doctorCategoryId = await getDoctorCategoryId();
    if (doctorCategoryId && Number(category_id) === doctorCategoryId && !designation) {
      return res.status(400).json({ message: 'Designation is required for doctors.' });
    }

    const [result] = await pool.query(
      'INSERT INTO staff (full_name, display_name, prefix, employee_id, category_id, branch, department, unit, designation, qualification, specialization, registration_number, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        full_name,
        req.body.display_name || null,
        prefix || null,
        String(employee_id).trim(),
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
    const empIdsInBatch = new Set();
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

      // ensure employee_id exists; generate one if missing to allow bulk import
      let eid = null;
      if (!item.employee_id || String(item.employee_id).trim() === '') {
        // generate a deterministic-ish auto id to keep uniqueness in DB
        eid = `AUTO${Date.now().toString().slice(-6)}${index}`;
      } else {
        eid = String(item.employee_id).trim();
      }
      if (empIdsInBatch.has(eid)) {
        return res.status(409).json({ message: `Duplicate Employee ID in request: ${eid}` });
      }
      empIdsInBatch.add(eid);

      values.push([
        fullName,
        item.display_name ? String(item.display_name).trim() : null,
        item.prefix ? String(item.prefix).trim() : null,
        eid,
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
    // Check duplicates against existing DB for any provided employee_ids
    const empArray = Array.from(empIdsInBatch);
    if (empArray.length > 0) {
      const placeholders = empArray.map(() => '?').join(',');
      const [existing] = await pool.query(`SELECT employee_id FROM staff WHERE employee_id IN (${placeholders})`, empArray);
      if (existing.length > 0) {
        return res.status(409).json({ message: `Employee ID already exists: ${existing[0].employee_id}` });
      }
    }

    await pool.query(
      'INSERT INTO staff (full_name, display_name, prefix, employee_id, category_id, branch, department, unit, designation, qualification, specialization, registration_number, phone, email) VALUES ?',
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
      prefix,
      employee_id,
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

    // Validate full_name if provided: must not contain numbers
    if (full_name && /[0-9]/.test(full_name)) {
      return res.status(400).json({ message: 'Full name must not contain numbers.' });
    }

    // If employee_id provided and different, check for duplicates
    if (employee_id !== undefined && String(employee_id).trim() !== String(existing[0].employee_id || '').trim()) {
      if (!employee_id || String(employee_id).trim() === '') {
        return res.status(400).json({ message: 'Employee ID is required.' });
      }
      // Validate employee_id: must be numeric only
      if (!/^\d+$/.test(String(employee_id).trim())) {
        return res.status(400).json({ message: 'Employee ID must contain only numbers.' });
      }
      const [conflict] = await pool.query('SELECT id FROM staff WHERE employee_id = ? AND id <> ? LIMIT 1', [String(employee_id).trim(), id]);
      if (conflict.length > 0) {
        return res.status(409).json({ message: 'Employee ID already exists.' });
      }
    }

    await pool.query(
      `UPDATE staff SET full_name = ?, display_name = ?, prefix = ?, employee_id = ?, category_id = ?, branch = ?, department = ?, unit = ?, designation = ?,
       qualification = ?, specialization = ?, registration_number = ?, phone = ?, email = ?, is_active = ? WHERE id = ?`,
      [
        full_name || existing[0].full_name,
        req.body.display_name !== undefined ? req.body.display_name : existing[0].display_name,
        prefix !== undefined ? prefix : existing[0].prefix,
        employee_id !== undefined ? employee_id : existing[0].employee_id,
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

// Check if an employee_id exists (optionally exclude an id)
exports.checkRegistration = async (req, res) => {
  try {
    const { employee_id, exclude_id } = req.query;
    if (!employee_id || String(employee_id).trim() === '') {
      return res.status(400).json({ message: 'employee_id is required.' });
    }
    const eid = String(employee_id).trim();
    if (exclude_id) {
      const [rows] = await pool.query('SELECT id FROM staff WHERE employee_id = ? AND id <> ? LIMIT 1', [eid, exclude_id]);
      return res.json({ exists: rows.length > 0 });
    }
    const [rows] = await pool.query('SELECT id FROM staff WHERE employee_id = ? LIMIT 1', [eid]);
    return res.json({ exists: rows.length > 0 });
  } catch (error) {
    console.error('Check employee_id error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Get all categories including inactive ones
exports.getAllCategories = async (req, res) => {
  try {
    const [categories] = await pool.query(
      'SELECT * FROM staff_categories ORDER BY display_order, name'
    );
    res.json({ categories });
  } catch (error) {
    console.error('Get all categories error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Create a new category
exports.createCategory = async (req, res) => {
  try {
    const { name, display_order } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Category name is required.' });
    }
    const [result] = await pool.query(
      'INSERT INTO staff_categories (name, display_order, is_active) VALUES (?, ?, ?)',
      [name, display_order || 0, true]
    );
    
    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE', 'staff_categories', result.insertId, `Created category: ${name}`]
    );

    res.status(201).json({
      message: 'Category created successfully',
      category: { id: result.insertId, name, display_order: display_order || 0, is_active: 1 }
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Update a category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, display_order, is_active } = req.body;
    
    const [existing] = await pool.query('SELECT * FROM staff_categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    await pool.query(
      'UPDATE staff_categories SET name = ?, display_order = ?, is_active = ? WHERE id = ?',
      [
        name || existing[0].name,
        display_order !== undefined ? display_order : existing[0].display_order,
        is_active !== undefined ? is_active : existing[0].is_active,
        id
      ]
    );

    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE', 'staff_categories', id, `Updated category: ${name || existing[0].name}`]
    );

    res.json({ message: 'Category updated successfully.' });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Delete (soft-delete) a category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM staff_categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    await pool.query('UPDATE staff_categories SET is_active = FALSE WHERE id = ?', [id]);
    
    // Audit log
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'DELETE', 'staff_categories', id, `Deactivated category: ${existing[0].name}`]
    );

    res.json({ message: 'Category deactivated successfully.' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
