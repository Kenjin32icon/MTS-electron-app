// FileName: /database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid'); // Ensure uuidv4 is imported
const { generateSampleData, DEFAULT_ADMIN_CREDENTIALS, SECOND_ADMIN_CREDENTIALS } = require('./data'); // Import second admin

let db;
let electronAppInstance; // To hold the app instance

function getDbPath(appInstance) {
  return path.join(appInstance.getPath('userData'), 'genmaintpro.db');
}

async function initializeDatabase(appInstance) {
  electronAppInstance = appInstance; // Store the app instance
  const DB_PATH = getDbPath(appInstance);

  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
      } else {
        console.log('Connected to the SQLite database.');
        db.serialize(async () => { // Made async to await populateSampleData
          // Users table
          db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'client',
            status TEXT NOT NULL DEFAULT 'active',
            last_login TEXT,
            phone TEXT,
            address TEXT,
            employee_id TEXT,
            hire_date TEXT,
            team TEXT,
            certifications TEXT,
            specialties TEXT,
            notes TEXT,
            first_login BOOLEAN DEFAULT FALSE, -- New column for first login prompt
            permissions TEXT, -- New column for granular permissions (JSON string)
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          );`);

          // Add missing columns if the table already exists but is outdated
          await addColumnIfNotExists('users', 'first_login', 'BOOLEAN DEFAULT FALSE');
          await addColumnIfNotExists('users', 'permissions', 'TEXT');
          await addColumnIfNotExists('users', 'created_at', 'TEXT DEFAULT CURRENT_TIMESTAMP');
          await addColumnIfNotExists('users', 'updated_at', 'TEXT DEFAULT CURRENT_TIMESTAMP');

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
          await addColumnIfNotExists('generators', 'created_at', 'TEXT DEFAULT CURRENT_TIMESTAMP');
          await addColumnIfNotExists('generators', 'updated_at', 'TEXT DEFAULT CURRENT_TIMESTAMP');

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
          await addColumnIfNotExists('services', 'created_at', 'TEXT DEFAULT CURRENT_TIMESTAMP');
          await addColumnIfNotExists('services', 'updated_at', 'TEXT DEFAULT CURRENT_TIMESTAMP');

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
          await addColumnIfNotExists('parts', 'created_at', 'TEXT DEFAULT CURRENT_TIMESTAMP');
          await addColumnIfNotExists('parts', 'updated_at', 'TEXT DEFAULT CURRENT_TIMESTAMP');

          // User Actions Log table
          db.run(`CREATE TABLE IF NOT EXISTS user_actions (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            action_type TEXT NOT NULL,
            action_details TEXT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
          );`);

          // Add Indexes for performance improvement
          db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_generators_client_id ON generators (client_id);`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_generators_assigned_tech_id ON generators (assigned_tech_id);`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_services_generator_id ON services (generator_id);`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_services_technician_id ON services (technician_id);`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_services_service_date ON services (service_date);`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_parts_part_number ON parts (part_number);`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_parts_category ON parts (category);`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_user_actions_user_id ON user_actions (user_id);`);
          db.run(`CREATE INDEX IF NOT EXISTS idx_user_actions_timestamp ON user_actions (timestamp);`);


          // Always ensure default admin exists first
          await ensureDefaultAdminExists();

          // Check if any users (other than the default admin) exist. If not, populate with sample data.
          db.get("SELECT COUNT(*) AS count FROM users WHERE id != ? AND id != ?", [DEFAULT_ADMIN_CREDENTIALS.id, SECOND_ADMIN_CREDENTIALS.id], async (err, row) => {
            if (err) {
              console.error("Error checking user count (excluding default admins):", err.message);
              return reject(err);
            }
            if (row.count === 0) {
              console.log("No non-default users found, populating with sample data...");
              await populateSampleData();
            } else {
              console.log("Database already contains non-default user data.");
            }
            resolve();
          });
        });
      }
    });
  });
}

// Helper function to add a column if it doesn't exist
function addColumnIfNotExists(tableName, columnName, columnDefinition) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
            if (err) {
                console.error(`Error checking table info for ${tableName}:`, err.message);
                return reject(err);
            }
            // Ensure rows is an array before calling .some()
            if (!Array.isArray(rows)) {
                console.error(`Expected rows to be an array, but got:`, rows);
                return reject(new Error(`Expected rows to be an array for table ${tableName}.`));
            }
            const columnExists = rows.some(row => row.name === columnName);
            if (!columnExists) {
                db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`, (alterErr) => {
                    if (alterErr) {
                        console.error(`Error adding column ${columnName} to ${tableName}:`, alterErr.message);
                        return reject(alterErr);
                    }
                    console.log(`Column ${columnName} added to table ${tableName}.`);
                    resolve();
                });
            } else {
                resolve();
            }
        });
    });
}

async function populateSampleData() {
  const sampleData = await generateSampleData();
  const { users, generators, services, parts } = sampleData;

  const insertPromises = [];

  // Insert Users (excluding the default admin, which is handled separately)
  for (const user of users) {
    // Only insert if the user is not the default admin
    if (user.id !== DEFAULT_ADMIN_CREDENTIALS.id && user.id !== SECOND_ADMIN_CREDENTIALS.id) {
        insertPromises.push(new Promise((resolve, reject) => {
            db.run(`INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status, last_login, phone, address, employee_id, hire_date, team, certifications, specialties, notes, first_login, permissions, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [user.id, user.name, user.email, user.password_hash, user.role, user.status, user.last_login, user.phone, user.address, user.employee_id, user.hire_date, user.team, user.certifications, user.specialties, user.notes, user.first_login, user.permissions, user.created_at],
                function(err) {
                    if (err) {
                        console.error("Error inserting user:", err.message);
                        reject(err);
                    } else {
                        if (this.changes === 0) {
                            console.warn(`User with email ${user.email} already exists, skipping insertion.`);
                        }
                        resolve();
                    }
                }
            );
        }));
    }
  }

  // Insert Generators
  for (const gen of generators) {
    insertPromises.push(new Promise((resolve, reject) => {
      db.run(`INSERT OR IGNORE INTO generators (id, model, type, serial_number, location, purchase_date, warranty_end, supplier, cost, total_hours_run, last_service, next_service, status, client_id, assigned_tech_id, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [gen.id, gen.model, gen.type, gen.serial_number, gen.location, gen.purchase_date, gen.warranty_end, gen.supplier, gen.cost, gen.total_hours_run, gen.last_service, gen.next_service, gen.status, gen.client_id, gen.assigned_tech_id, gen.notes, gen.created_at],
        function(err) {
          if (err) {
            console.error("Error inserting generator:", err.message);
            reject(err);
          } else {
            if (this.changes === 0) {
                console.warn(`Generator with serial number ${gen.serial_number} already exists, skipping insertion.`);
            }
            resolve();
          }
        }
      );
    }));
  }

  // Insert Parts
  for (const part of parts) {
    insertPromises.push(new Promise((resolve, reject) => {
      db.run(`INSERT OR IGNORE INTO parts (id, name, part_number, quantity_in_stock, cost_per_unit, category, min_stock_level, preferred_supplier, last_ordered, used_last_month, compatible_generators, location, reorder_point, lead_time, notes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [part.id, part.name, part.part_number, part.quantity_in_stock, part.cost_per_unit, part.category, part.min_stock_level, part.preferred_supplier, part.last_ordered, part.used_last_month, part.compatible_generators, part.location, part.reorder_point, part.lead_time, part.notes, part.status, part.created_at],
        function(err) {
          if (err) {
            console.error("Error inserting part:", err.message);
            reject(err);
          } else {
            if (this.changes === 0) {
                console.warn(`Part with part number ${part.part_number} already exists, skipping insertion.`);
            }
            resolve();
          }
        }
      );
    }));
  }

  // Insert Services
  for (const service of services) {
    insertPromises.push(new Promise((resolve, reject) => {
      db.run(`INSERT OR IGNORE INTO services (id, generator_id, service_date, service_type, technician_id, status, duration, service_cost, work_order, notes, parts_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [service.id, service.generator_id, service.service_date, service.service_type, service.technician_id, service.status, service.duration, service.service_cost, service.work_order, service.notes, service.parts_used, service.created_at],
        function(err) {
          if (err) {
            console.error("Error inserting service:", err.message);
            reject(err);
          } else {
            if (this.changes === 0) {
                console.warn(`Service with ID ${service.id} already exists, skipping insertion.`);
            }
            resolve();
          }
        }
      );
    }));
  }

  try {
    await Promise.all(insertPromises);
    console.log("Sample data population complete.");
  } catch (error) {
    console.error("Failed to populate sample data:", error);
    throw error;
  }
}

async function ensureDefaultAdminExists() {
    // Helper to insert an admin if not exists
    async function insertAdminIfMissing(admin) {
        return new Promise((resolve, reject) => {
            db.get("SELECT id FROM users WHERE email = ?", [admin.email], async (err, row) => {
                if (err) return reject(err);
                if (!row) {
                    const hashedPassword = await bcrypt.hash(admin.password, 10);
                    db.run(`INSERT INTO users (id, name, email, password_hash, role, status, first_login, permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                        [admin.id, admin.name, admin.email, hashedPassword, admin.role, admin.status, admin.first_login, JSON.stringify(admin.permissions)],
                        function(insertErr) {
                            if (insertErr) return reject(insertErr);
                            console.log(`Default admin user ${admin.email} inserted.`);
                            resolve();
                        }
                    );
                } else {
                    console.log(`Default admin user ${admin.email} already exists.`);
                    resolve();
                }
            });
        });
    }
    await insertAdminIfMissing(DEFAULT_ADMIN_CREDENTIALS);
    await insertAdminIfMissing(SECOND_ADMIN_CREDENTIALS);
}

function getDb() {
  return db;
}

async function clearAndInitializeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
        return reject(err);
      }
      console.log('Database closed.');
      const DB_PATH = getDbPath(electronAppInstance);
      try {
        require('fs').unlinkSync(DB_PATH);
        console.log('Database file deleted.');
        // Re-initialize will create tables and then populate default admin and sample data if no users exist
        initializeDatabase(electronAppInstance).then(resolve).catch(reject);
      } catch (unlinkErr) {
        console.error('Error deleting database file:', unlinkErr.message);
        reject(unlinkErr);
      }
    });
  });
}

async function logUserAction(userId, actionType, actionDetails) {
    const db = getDb();
    const actionId = `action-${uuidv4()}`;
    // Mask sensitive details if they appear in actionDetails (e.g., passwords)
    let maskedDetails = actionDetails;
    if (actionType.includes('PASSWORD') || actionType.includes('LOGIN')) {
        maskedDetails = maskedDetails.replace(/password:(\S+)/gi, 'password:[MASKED]');
        maskedDetails = maskedDetails.replace(/credentials:({[^}]+})/gi, 'credentials:[MASKED]');
    }

    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO user_actions (id, user_id, action_type, action_details, timestamp) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [actionId, userId, actionType, maskedDetails],
            function(err) {
                if (err) {
                    console.error("Error logging user action:", err.message);
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    });
}


module.exports = {
  initializeDatabase,
  getDb,
  clearAndInitializeDatabase,
  populateSampleData,
  logUserAction,
  getDbPath // Export getDbPath for backup-manager
};
