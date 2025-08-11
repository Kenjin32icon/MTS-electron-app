// apiService.js
    const { getDb } = require('./database');
    const bcrypt = require('bcrypt');
    const { v4: uuidv4 } = require('uuid');

    const saltRounds = 10;

    // Helper function for running SQL queries
    function runQuery(sql, params = []) {
      const db = getDb();
      return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ lastID: this.lastID, changes: this.changes });
          }
        });
      });
    }

    // Helper function for getting single row
    function getQuery(sql, params = []) {
      const db = getDb();
      return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
    }

    // Helper function for getting all rows
    function allQuery(sql, params = []) {
      const db = getDb();
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
    }

    const apiService = {
      // --- Users ---
      async getUsers() {
        return allQuery('SELECT id, name, email, role, status, last_login FROM users');
      },

      async addUser({ name, email, password, role, status }) {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const id = `user-${uuidv4()}`;
        await runQuery(
          `INSERT INTO users (id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)`,
          [id, name, email, hashedPassword, role, status]
        );
        return getQuery('SELECT id, name, email, role, status FROM users WHERE id = ?', [id]);
      },

      async updateUser(id, { role, status }) {
        await runQuery(
          `UPDATE users SET role = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [role, status, id]
        );
        return getQuery('SELECT id, name, email, role, status FROM users WHERE id = ?', [id]);
      },

      async deleteUser(id) {
        const result = await runQuery('DELETE FROM users WHERE id = ?', [id]);
        return result.changes > 0;
      },

      // --- Generators ---
      async getGenerators() {
        return allQuery(`
          SELECT g.*, u.name as client_name, t.name as technician_name
          FROM generators g
          LEFT JOIN users u ON g.client_id = u.id
          LEFT JOIN users t ON g.assigned_tech_id = t.id
        `);
      },

      async addGenerator({ model, type, serial_number, location, purchase_date, warranty_end, supplier, cost, total_hours_run, last_service, next_service, status, client_id, assigned_tech_id, notes }) {
        const id = `gen-${uuidv4()}`;
        await runQuery(
          `INSERT INTO generators (id, model, type, serial_number, location, purchase_date, warranty_end, supplier, cost, total_hours_run, last_service, next_service, status, client_id, assigned_tech_id, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, model, type, serial_number, location, purchase_date, warranty_end, supplier, cost, total_hours_run, last_service, next_service, status, client_id, assigned_tech_id, notes]
        );
        return getQuery('SELECT * FROM generators WHERE id = ?', [id]);
      },

      async deleteGenerator(id) {
        const result = await runQuery('DELETE FROM generators WHERE id = ?', [id]);
        return result.changes > 0;
      },

      // --- Services ---
      async getServices() {
        return allQuery(`
          SELECT s.*, g.model as generator_model, g.serial_number as generator_serial, g.location as generator_location,
                 u.name as technician_name, u.email as technician_email
          FROM services s
          JOIN generators g ON s.generator_id = g.id
          JOIN users u ON s.technician_id = u.id
        `);
      },

      async addService({ generator_id, service_date, service_type, technician_id, status, duration, service_cost, work_order, notes, parts_used }) {
        const id = `srv-${uuidv4()}`;
        await runQuery(
          `INSERT INTO services (id, generator_id, service_date, service_type, technician_id, status, duration, service_cost, work_order, notes, parts_used)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, generator_id, service_date, service_type, technician_id, status, duration, service_cost, work_order, notes, parts_used]
        );
        return getQuery('SELECT * FROM services WHERE id = ?', [id]);
      },

      // --- Parts ---
      async getParts() {
        return allQuery('SELECT * FROM parts');
      },

      async addPart({ name, part_number, quantity_in_stock, cost_per_unit, category, min_stock_level, preferred_supplier, last_ordered, used_last_month, compatible_generators, location, reorder_point, lead_time, notes }) {
        const id = `part-${uuidv4()}`;
        const status = quantity_in_stock <= 0 ? 'Out of Stock' : (quantity_in_stock <= (min_stock_level || 10) ? 'Low Stock' : 'In Stock');
        await runQuery(
          `INSERT INTO parts (id, name, part_number, quantity_in_stock, cost_per_unit, category, min_stock_level, preferred_supplier, last_ordered, used_last_month, compatible_generators, location, reorder_point, lead_time, notes, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, name, part_number, quantity_in_stock, cost_per_unit, category, min_stock_level, preferred_supplier, last_ordered, used_last_month, compatible_generators, location, reorder_point, lead_time, notes, status]
        );
        return getQuery('SELECT * FROM parts WHERE id = ?', [id]);
      },

      async deletePart(id) {
        const result = await runQuery('DELETE FROM parts WHERE id = ?', [id]);
        return result.changes > 0;
      },

      // --- Technicians (Users with role 'technician') ---
      async getTechnicians() {
        return allQuery("SELECT id, name, email, phone, role, status FROM users WHERE role = 'technician' OR role = 'admin'"); // Include admins for team view
      },

      async addTechnician({ name, email, phone, address, employeeId, role, hireDate, team, status, certifications, specialties, notes, password }) {
        const hashedPassword = await bcrypt.hash(password || 'defaultpass', saltRounds); // Provide a default password if not given
        const id = `user-${uuidv4()}`;
        await runQuery(
          `INSERT INTO users (id, name, email, password_hash, role, status, phone, address, employee_id, hire_date, team, certifications, specialties, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, name, email, hashedPassword, role, status, phone, address, employeeId, hireDate, team, certifications, specialties, notes]
        );
        return getQuery('SELECT id, name, email, role, status FROM users WHERE id = ?', [id]);
      },

      // Generic GET/POST/PUT/DELETE handlers to map to specific functions
      async get(endpoint) {
        switch (endpoint) {
          case 'users': return this.getUsers();
          case 'generators': return this.getGenerators();
          case 'services': return this.getServices();
          case 'parts': return this.getParts();
          case 'technicians': return this.getTechnicians();
          default: throw new Error(`Unknown GET endpoint: ${endpoint}`);
        }
      },

      async post(endpoint, data) {
        switch (endpoint) {
          case 'users': return this.addUser(data);
          case 'generators': return this.addGenerator(data);
          case 'services': return this.addService(data);
          case 'parts': return this.addPart(data);
          case 'technicians': return this.addTechnician(data);
          default: throw new Error(`Unknown POST endpoint: ${endpoint}`);
        }
      },

      async put(endpoint, id, data) {
        switch (endpoint) {
          case 'users': return this.updateUser(id, data);
          // Add other PUT handlers as needed
          default: throw new Error(`Unknown PUT endpoint: ${endpoint}`);
        }
      },

      async delete(endpoint, id) {
        switch (endpoint) {
          case 'users': return this.deleteUser(id);
          case 'generators': return this.deleteGenerator(id);
          case 'parts': return this.deletePart(id);
          default: throw new Error(`Unknown DELETE endpoint: ${endpoint}`);
        }
      }
    };

    module.exports = apiService;