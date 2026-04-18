# Hospital Casualty Digital Dashboard

A modern web application to replace the physical whiteboard in the hospital casualty section. Displays duty rosters, staff information, and license certificates on a digital screen.

## Features

- **Digital Display** — Full-screen TV-optimized view replacing the physical whiteboard
- **Staff Management** — CRUD for Doctors, Nursing Officers, Pharmacists, Technicians, etc.
- **Roster Management** — Assign staff to Morning/Evening/Night shifts with date picker
- **Certificate Management** — Upload & track staff licenses with expiry alerts
- **Role-Based Access** — Super Admin and Casualty In-charge roles
- **Auto-Refresh** — Display updates every 30 seconds without manual reload
- **Night Mode** — Automatically dims display during night shifts
- **Code Blue Display** — Prominently displayed and easily updated

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS v4
- **Backend**: Node.js + Express.js
- **Database**: MySQL 8.0
- **Auth**: JWT (JSON Web Tokens)

## Setup Instructions

### 1. Database Setup

Open MySQL Workbench or CLI and run:

```sql
SOURCE E:/Git/Casualty-Dashboard/database/schema.sql;
```

Or via command line:
```bash
mysql -u root -p < database/schema.sql
```

### 2. Configure Environment

Edit `server/.env` and set your MySQL password:
```
DB_PASSWORD=your_mysql_password
```

### 3. Start Backend

```bash
cd server
npm run dev
```

### 4. Start Frontend

```bash
cd client
npm run dev
```

### 5. Access the Application

- **Admin Dashboard**: http://localhost:5173
- **Public Display**: http://localhost:5173/display
- **Default Login**: `admin` / `admin123`

## Usage

1. **Login** with admin credentials
2. **Add Staff** in the Staff Management page
3. **Create Roster** by assigning staff to shifts for each day
4. **Upload Certificates** for staff license verification
5. **Open Display** on a TV/monitor by navigating to `/display`
