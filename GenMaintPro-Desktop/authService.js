// authService.js
    const bcrypt = require('bcrypt');
    const { getDb } = require('./database');
    const { v4: uuidv4 } = require('uuid'); // For generating unique IDs

    async function login({ email, password }) {
      const db = getDb();
      return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
          if (err) {
            console.error('Login DB error:', err.message);
            return reject({ success: false, message: 'Database error during login.' });
          }
          if (!user) {
            return resolve({ success: false, message: 'Invalid credentials.' });
          }

          const match = await bcrypt.compare(password, user.password_hash);
          if (!match) {
            return resolve({ success: false, message: 'Invalid credentials.' });
          }

          // Update last login time
          db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id], (updateErr) => {
            if (updateErr) console.warn('Failed to update last login:', updateErr.message);
          });

          // For an offline app, a simple success message and user data might suffice.
          // No JWT needed for local authentication unless you want to simulate it.
          resolve({
            success: true,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              status: user.status
            }
          });
        });
      });
    }

    async function register({ name, email, password, role = 'client', status = 'active' }) {
      const db = getDb();
      return new Promise(async (resolve, reject) => {
        db.get('SELECT id FROM users WHERE email = ?', [email], async (err, existingUser) => {
          if (err) {
            console.error('Register DB error:', err.message);
            return reject({ success: false, message: 'Database error during registration.' });
          }
          if (existingUser) {
            return resolve({ success: false, message: 'Email already exists.' });
          }

          const hashedPassword = await bcrypt.hash(password, 10);
          const id = `user-${uuidv4()}`; // Use UUID for unique IDs

          db.run(
            `INSERT INTO users (id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, name, email, hashedPassword, role, status],
            function(insertErr) {
              if (insertErr) {
                console.error('Insert user DB error:', insertErr.message);
                return reject({ success: false, message: 'Failed to register user.' });
              }
              resolve({
                success: true,
                user: { id, name, email, role, status }
              });
            }
          );
        });
      });
    }

    module.exports = { login, register };