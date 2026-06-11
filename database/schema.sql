-- =============================================
-- Hospital Casualty Dashboard - Database Schema
-- =============================================

CREATE DATABASE IF NOT EXISTS casualty_dashboard;
USE casualty_dashboard;

-- Users table (for login/authentication)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('super_admin', 'casualty_incharge') NOT NULL DEFAULT 'casualty_incharge',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Uploaded files archives
CREATE TABLE IF NOT EXISTS uploaded_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    upload_type VARCHAR(100) NOT NULL,
    uploaded_by INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Staff categories lookup
CREATE TABLE IF NOT EXISTS staff_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- Staff members
CREATE TABLE IF NOT EXISTS staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    category_id INT NOT NULL,
    branch VARCHAR(100),
    department VARCHAR(100),
    unit VARCHAR(100),
    designation VARCHAR(100),
    qualification VARCHAR(150),
    specialization VARCHAR(150),
    registration_number VARCHAR(50),
    phone VARCHAR(15),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES staff_categories(id)
);

-- Shift definitions
CREATE TABLE IF NOT EXISTS shifts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- Daily roster assignments
CREATE TABLE IF NOT EXISTS roster (
    id INT AUTO_INCREMENT PRIMARY KEY,
    roster_date DATE NOT NULL,
    shift_id INT NOT NULL,
    staff_id INT NOT NULL,
    slot_index INT NOT NULL DEFAULT 1,
    assigned_by INT,
    notes VARCHAR(255),
    uploaded_file_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (shift_id) REFERENCES shifts(id),
    FOREIGN KEY (staff_id) REFERENCES staff(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    FOREIGN KEY (uploaded_file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE,
    UNIQUE KEY unique_roster (roster_date, shift_id, staff_id, slot_index)
);

-- Staff certificates/licenses
CREATE TABLE IF NOT EXISTS certificates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL,
    certificate_type VARCHAR(100) NOT NULL,
    certificate_number VARCHAR(100),
    issuing_authority VARCHAR(150),
    issue_date DATE,
    expiry_date DATE,
    file_path VARCHAR(500),
    file_type VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- Display settings
CREATE TABLE IF NOT EXISTS display_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =============================================
-- Seed Data
-- =============================================

-- Default admin user (password: admin123)
INSERT INTO users (username, password_hash, full_name, role) VALUES
('admin', '$2b$10$7xJmei9uphelTRYab3PD9e8L505Qqdn1IqXWt.FN0uuVc2UDWGKPW', 'System Administrator', 'super_admin');

-- Staff Categories (matching the whiteboard)
INSERT INTO staff_categories (name, display_order) VALUES
('Doctor', 1),
('Nursing Officer', 2),
('Pharmacist', 3),
('MOD', 4),
('Ambulance', 5),
('Technician', 6),
('Security Supervisor', 7);

-- Shifts
INSERT INTO shifts (name, start_time, end_time, display_order) VALUES
('Morning', '06:00:00', '14:00:00', 1),
('Evening', '14:00:00', '22:00:00', 2),
('Night', '22:00:00', '06:00:00', 3);

-- Display Settings
INSERT INTO display_settings (setting_key, setting_value) VALUES
('hospital_name', 'KIMS Hospital'),
('code_blue', '33'),
('display_title', 'CASUALTY DEPARTMENT'),
('auto_refresh_seconds', '30'),
('night_mode_start', '22:00'),
('night_mode_end', '06:00'),
('ambulance_contact_number', ''),
('ambulance_contact_details', '');

-- Monthly Duty Schedule
CREATE TABLE monthly_duty_schedule (
  id INT AUTO_INCREMENT PRIMARY KEY,
  duty_date DATE NOT NULL,
  role_name VARCHAR(255) NOT NULL,
  staff_name VARCHAR(255) NOT NULL,
  uploaded_file_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_duty (duty_date, role_name),
  FOREIGN KEY (uploaded_file_id) REFERENCES uploaded_files(id) ON DELETE CASCADE
);

-- Departments Master Table
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

