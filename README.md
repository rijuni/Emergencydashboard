# Hospital Casualty Digital Dashboard

A modern, highly-polished web application designed to replace the physical whiteboard in a hospital's casualty/emergency section. It provides a beautiful, dark-themed digital display for duty rosters, staff information, and critical on-call assignments, backed by a powerful administrative management panel.

## Key Features

### 🖥️ Premium Digital TV Display
- **Glassmorphism Design:** A stunning, vibrant dark mode aesthetic with micro-animations and smooth transitions, optimized for large TV screens.
- **Auto-Refreshing:** The display automatically polls and updates every 30 seconds without requiring manual browser reloads.
- **Dynamic Layouts:** Toggle between different display layouts (e.g., standard Casualty layout vs. Doctors-focused layout) depending on the TV's location.
- **Code Blue Integration:** Prominently highlights the Code Blue team for immediate visibility.

### 👥 Comprehensive Staff Management
- **CRUD Operations:** Easily manage Doctors, Nursing Officers, Pharmacists, Technicians, and Ambulance drivers.
- **Certificate Tracking:** Upload and track staff licenses and certifications, complete with visual expiry alerts.

### 📅 Advanced Roster & Shift Scheduling
- **Daily Roster Assignment:** Assign staff to Morning (06:00-14:00), Evening (14:00-22:00), and Night (22:00-06:00) shifts.
- **Duplicate Assignments:** Architecture supports assigning multiple staff members of the same category to a single shift using intelligent slot indexing.
- **Historical Integrity Lock:** Prevents users from accidentally or intentionally modifying roster assignments for dates that have already passed, ensuring accurate historical records.
- **Copy Previous Day:** Quickly clone an entire day's roster to the current day to save time on repetitive scheduling.

### 🏥 24-Hour On-Call Doctor Duty
- **Dedicated On-Call Management:** A specialized interface to assign doctors to a 24-hour on-call duty.
- **Department Filtering:** Easily filter available doctors by department and assign them to the entire day with a single click.

### 📊 Automated MOD (Manager on Duty) Excel Integration
- **Excel Schedule Uploads:** Instead of manually typing out the MOD for every day, administrators can upload a monthly Excel schedule (`.xlsx`). The backend parses the file and automatically displays the correct MOD based on the current date.
- **Month Validation:** The system strictly validates uploads to ensure only the schedule for the current month is accepted.
- **Active Schedule Downloading:** Administrators can download the currently active Excel schedule directly from the dashboard.
- **Manual Overrides:** If the scheduled MOD is absent, admins can manually override the name for a specific date.
- **Restore Defaults:** A "Restore Default" feature allows admins to instantly revert a manual override back to the original name found in the uploaded Excel file.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS v4 (Vanilla CSS used for advanced glassmorphism and animations)
- **Backend**: Node.js + Express.js + Multer (for file uploads) + SheetJS (`xlsx` for Excel parsing)
- **Database**: MySQL 8.0 (Custom schema with robust auditing)
- **Auth**: JWT (JSON Web Tokens)

## Setup Instructions

### 1. Database Setup

Open MySQL Workbench or CLI and run the schema file to initialize the database structure and seed default categories:

```sql
SOURCE E:/Git/Casualty-Dashboard/database/schema.sql;
```

*Note: If you are upgrading from an older version, ensure you run the `slot_index` database migrations for the roster table.*

### 2. Configure Environment

Edit `server/.env` and set your MySQL credentials and JWT secret:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=casualty_dashboard
JWT_SECRET=your_secure_secret
PORT=5000
```

### 3. Start Backend

```bash
cd server
npm install
npm run dev
```

### 4. Start Frontend

```bash
cd client
npm install
npm run dev
```

### 5. Access the Application

- **Admin Dashboard**: `http://localhost:5173`
- **Public TV Display**: `http://localhost:5173/display`
- **Default Super Admin Login**: `admin` / `admin123`

## Usage Workflow

1. **Login** with admin credentials.
2. **Add Staff** in the Staff Management page.
3. **Upload the Monthly MOD Schedule** (Excel) on the Roster page.
4. **Assign Daily Roster** and **On-Call Doctors** for the upcoming days.
5. **Open Display** on the hospital TV by navigating to `/display` and selecting your preferred layout in settings.
