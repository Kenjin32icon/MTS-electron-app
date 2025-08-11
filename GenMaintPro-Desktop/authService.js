// FileName: /authService.js
const { getDb, logUserAction } = require('./database');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { DEFAULT_ADMIN_CREDENTIALS } = require('./data'); // Import default admin credentials

const authService = {
    async login(credentials) {
        const db = getDb();
        return new Promise((resolve, reject) => {
            // Input validation
            if (!credentials.email || !credentials.password) {
                return resolve({ success: false, message: "Email and password are required." });
            }

            // Normal database login for all users
            db.get("SELECT id, name, email, password_hash, role, status, last_login, first_login, permissions FROM users WHERE email = ?", [credentials.email], async (err, user) => {
                if (err) {
                    console.error("Database error during login:", err.message);
                    await logUserAction(null, 'LOGIN_FAILED', `Attempt by ${credentials.email}: Database error`);
                    return resolve({ success: false, message: "Database error." });
                }
                if (!user) {
                    await logUserAction(null, 'LOGIN_FAILED', `Attempt by ${credentials.email}: User not found`);
                    return resolve({ success: false, message: "Invalid credentials." }); // Changed message to be generic
                }

                const match = await bcrypt.compare(credentials.password, user.password_hash);
                if (match) {
                    // Update last login time
                    db.run("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id], (updateErr) => {
                        if (updateErr) {
                            console.warn("Failed to update last login for user:", user.id, updateErr.message);
                        }
                    });
                    // Log successful login
                    await logUserAction(user.id, 'LOGIN_SUCCESS', `User ${user.email} logged in`);

                    // Return user data without password hash
                    const { password_hash, ...userWithoutHash } = user;
                    // Parse permissions string to object
                    if (userWithoutHash.permissions) {
                        userWithoutHash.permissions = JSON.parse(userWithoutHash.permissions);
                    } else {
                        userWithoutHash.permissions = {}; // Default to empty object if no permissions
                    }

                    // Special handling for default admin's first login
                    if (user.id === DEFAULT_ADMIN_CREDENTIALS.id && user.first_login) {
                        // Mark that this is the default admin's first login
                        userWithoutHash.first_login = true;
                    } else {
                        userWithoutHash.first_login = false; // Ensure it's false for other users or subsequent logins
                    }

                    const result = { success: true, message: "Login successful!", user: userWithoutHash };
                    resolve(result);
                } else {
                    await logUserAction(user.id, 'LOGIN_FAILED', `Attempt by ${credentials.email}: Invalid credentials`);
                    resolve({ success: false, message: "Invalid credentials." });
                }
            });
        });
    },

    async register(userData) {
        const db = getDb();
        return new Promise(async (resolve, reject) => {
            // Input validation
            if (!userData.name || !userData.email || !userData.password || !userData.role) {
                await logUserAction(null, 'REGISTER_FAILED', `Attempt by ${userData.email || 'N/A'}: Missing required fields`);
                return resolve({ success: false, message: "All fields are required for registration." });
            }
            if (userData.password.length < 6) { // Password policy
                await logUserAction(null, 'REGISTER_FAILED', `Attempt by ${userData.email}: Password too short`);
                return resolve({ success: false, message: "Password must be at least 6 characters long." });
            }
            // Basic email format validation (can be more robust)
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
                await logUserAction(null, 'REGISTER_FAILED', `Attempt by ${userData.email}: Invalid email format`);
                return resolve({ success: false, message: "Invalid email format." });
            }

            // Prevent direct admin sign-up from public registration (only allow via Admin Panel's "Add New User")
            if (userData.role === 'admin' && userData.source !== 'adminPanel') { // Added source check
                await logUserAction(null, 'REGISTER_FAILED', `Attempt to register as admin by ${userData.email}: Role not allowed via public signup`);
                return resolve({ success: false, message: "Admin role cannot be registered directly. Please contact an existing administrator." });
            }

            // Check if user already exists
            db.get("SELECT id FROM users WHERE email = ?", [userData.email], async (err, existingUser) => {
                if (err) {
                    console.error("Database error during registration check:", err.message);
                    await logUserAction(null, 'REGISTER_FAILED', `Attempt by ${userData.email}: Database error during check`);
                    return resolve({ success: false, message: "Database error." });
                }
                if (existingUser) {
                    await logUserAction(existingUser.id, 'REGISTER_FAILED', `Attempt by ${userData.email}: User already exists`);
                    return resolve({ success: false, message: "User already exists with this email." }); // More specific message
                }

                const newUserId = `user-${uuidv4()}`;
                const hashedPassword = await bcrypt.hash(userData.password, 10);
                // Set default permissions based on role
                let defaultPermissions = {};
                if (userData.role === 'client') {
                    defaultPermissions = { permClientPortal: true, permDashboard: true };
                } else if (userData.role === 'technician') {
                    defaultPermissions = { permDashboard: true, permScheduleModify: true, permRecordsModify: true, permPartsModify: true };
                } else if (userData.role === 'admin') { // If source is adminPanel, allow full admin permissions
                    defaultPermissions = DEFAULT_ADMIN_CREDENTIALS.permissions; // Assign full admin permissions
                }
                const permissionsString = JSON.stringify(defaultPermissions);

                db.run(`INSERT INTO users (id, name, email, password_hash, role, status, first_login, permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                    [newUserId, userData.name, userData.email, hashedPassword, userData.role, 'active', false, permissionsString],
                    function(insertErr) {
                        if (insertErr) {
                            console.error("Error inserting new user:", insertErr.message);
                            logUserAction(null, 'REGISTER_FAILED', `Failed to register user ${userData.email}: ${insertErr.message}`);
                            return resolve({ success: false, message: "Failed to register user due to a database error." });
                        }
                        if (this.changes === 0) {
                            // This case should ideally be caught by the db.get check above,
                            // but as a fallback, if no rows were changed, it means insertion failed.
                            logUserAction(null, 'REGISTER_FAILED', `Failed to register user ${userData.email}: No changes made (possible duplicate ID/email race condition)`);
                            return resolve({ success: false, message: "Failed to register user. Please try again or use a different email." });
                        }
                        logUserAction(newUserId, 'REGISTER_SUCCESS', `New user registered: ${userData.email} with role ${userData.role}`);
                        resolve({ success: true, message: "Registration successful!", user: { id: newUserId, name: userData.name, email: userData.email, role: userData.role, status: 'active', first_login: false, permissions: defaultPermissions } });
                    }
                );
            });
        });
    },

    // This function is now used for the default admin's initial password change and for general user profile updates.
    async updatePasswordAndFirstLogin(userId, newName, newEmail, newPassword) {
        const db = getDb();
        // Input validation
        if (!newName || !newEmail || !newPassword) {
            return { success: false, message: "All fields are required." };
        }
        if (newPassword.length < 6) { // Password policy
            return { success: false, message: "New password must be at least 6 characters long." };
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            return { success: false, message: "Invalid email format." };
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        return new Promise((resolve, reject) => {
            // Check if the new email already exists for another user (excluding the current user)
            db.get(`SELECT id FROM users WHERE email = ? AND id != ?`, [newEmail, userId], (err, existingUser) => {
                if (err) {
                    console.error("Database error during email check:", err.message);
                    return resolve({ success: false, message: "Database error during email check." });
                }
                if (existingUser) {
                    return resolve({ success: false, message: "Email already in use by another account." });
                }

                // Update user details and set first_login to false
                db.run(`UPDATE users SET name = ?, email = ?, password_hash = ?, first_login = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                    [newName, newEmail, hashedPassword, false, userId], // Set first_login to false explicitly
                    function(err) {
                        if (err) {
                            console.error("Error updating password and user details:", err.message);
                            logUserAction(userId, 'UPDATE_PASSWORD_FAILED', `Failed to update password for user ${userId}: ${err.message}`);
                            return resolve({ success: false, message: "Failed to update password." });
                        }
                        logUserAction(userId, 'UPDATE_PASSWORD_SUCCESS', `User ${userId} updated password, email, name and first login status`);
                        resolve({ success: true, message: "Password, name, and email updated successfully." });
                    }
                );
            });
        });
    }
};

module.exports = authService;
