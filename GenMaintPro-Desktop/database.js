// database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt'); // For initial admin user

const DB_PATH = path.join(app.getPath('userData'), 'genmaintpro.db'); // Store in user data directory
let db;

async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
      } else {
        console.log('Connected to the SQLite database.');
        db.serialize(() => {
          // Users table
          db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'client',
            status TEXT NOT NULL DEFAULT 'active',
            last_login TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            phone TEXT,                -- New field for phone number
            address TEXT,              -- New field for address
            employee_id TEXT UNIQUE,   -- New field for employee ID
            hire_date TEXT,            -- New field for hire date
            team TEXT,                 -- New field for team
            certifications TEXT,       -- New field for certifications
            specialties TEXT           -- New field for specialties
          );`);

          // Generators table
          db.run(`CREATE TABLE IF NOT EXISTS generators (
            id TEXT PRIMARY KEY,
            model TEXT NOT NULL,
            type TEXT NOT NULL,
            serial_number TEXT UNIQUE NOT NULL,
            location TEXT NOT NULL,
            purchase_date TEXT,
            warranty_end TEXT,
            supplier TEXT,
            cost REAL,
            total_hours_run REAL DEFAULT 0,
            last_service TEXT,
            next_service TEXT,
            status TEXT DEFAULT 'Active',
            client_id TEXT,
            assigned_tech_id TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (assigned_tech_id) REFERENCES users(id) ON DELETE SET NULL
          );`);

          // Services table
          db.run(`CREATE TABLE IF NOT EXISTS services (
            id TEXT PRIMARY KEY,
            generator_id TEXT NOT NULL,
            service_date TEXT NOT NULL,
            service_type TEXT NOT NULL,
            technician_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            duration REAL,
            service_cost REAL,
            work_order TEXT,
            notes TEXT,
            parts_used TEXT, -- Store as JSON string or comma-separated
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (generator_id) REFERENCES generators(id) ON DELETE CASCADE,
            FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE
          );`);

          // Parts table
          db.run(`CREATE TABLE IF NOT EXISTS parts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            part_number TEXT UNIQUE NOT NULL,
            quantity_in_stock INTEGER NOT NULL DEFAULT 0,
            cost_per_unit REAL NOT NULL DEFAULT 0,
            category TEXT,
            min_stock_level INTEGER DEFAULT 0,
            preferred_supplier TEXT,
            last_ordered TEXT,
            used_last_month INTEGER DEFAULT 0,
            compatible_generators TEXT, -- Store as JSON string or comma-separated
            location TEXT,
            reorder_point INTEGER,
            lead_time INTEGER,
            notes TEXT,
            status TEXT NOT NULL DEFAULT 'In Stock', -- Calculated based on quantity_in_stock
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          );`);

          // Initial Admin User (if not exists)
          db.get("SELECT id FROM users WHERE role = 'admin' LIMIT 1", async (err, row) => {
            if (err) {
              console.error("Error checking for admin user:", err.message);
              return;
            }
            if (!row) {
              const adminPasswordHash = await bcrypt.hash('admin123', 10); // Use a strong default password
              const adminId = `user-${Date.now()}`;
              db.run(`INSERT INTO users (id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)`,
                [adminId, 'Admin User', 'admin@genmaint.com', adminPasswordHash, 'admin', 'active'],
                function(err) {
                  if (err) {
                    console.error("Error inserting initial admin user:", err.message);
                  } else {
                    console.log('Initial admin user created.');
                  }
                }
              );
            }
          });
          resolve();
        });
      }
    });
  });
}

function getDb() {
  return db;
}

module.exports = { initializeDatabase, getDb };
