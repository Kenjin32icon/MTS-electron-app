// FileName: /backup-manager.js
const fs = require('fs-extra');
const path = require('path');
const { getDbPath } = require('./database');

class BackupManager {
  static async createBackup(app) { // Accept app instance
    const dbPath = getDbPath(app); // Pass app to getDbPath
    const backupDir = path.join(app.getPath('documents'), 'GenMaintProBackups');
    await fs.ensureDir(backupDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}.db`);

    try {
      await fs.copyFile(dbPath, backupPath);
      console.log(`Backup created at ${backupPath}`);
      return { success: true, path: backupPath };
    } catch (err) {
      console.error('Backup failed:', err);
      return { success: false, message: err.message };
    }
  }

  // New: Function to list available backups
  static async listBackups(app) {
    const backupDir = path.join(app.getPath('documents'), 'GenMaintProBackups');
    try {
      await fs.ensureDir(backupDir); // Ensure directory exists before reading
      const files = await fs.readdir(backupDir);
      const backups = files
        .filter(file => file.startsWith('backup-') && file.endsWith('.db'))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          date: new Date(file.replace('backup-', '').replace('.db', '').replace(/-/g, ':').replace(':', '-').replace(':', '-')).toLocaleString() // Basic date parsing
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by newest first
      return { success: true, backups };
    } catch (err) {
      console.error('Failed to list backups:', err);
      return { success: false, message: err.message };
    }
  }

  // New: Function to restore from a backup
  static async restoreBackup(app, backupFilePath) {
    const dbPath = getDbPath(app);
    try {
      // Ensure the backup file exists
      if (!await fs.pathExists(backupFilePath)) {
        throw new Error('Backup file not found.');
      }

      // Close the current database connection before overwriting
      const { getDb, initializeDatabase } = require('./database');
      const db = getDb();
      if (db) {
        await new Promise((resolve, reject) => {
          db.close((err) => {
            if (err) {
              console.error('Error closing database before restore:', err.message);
              return reject(err);
            }
            console.log('Database closed for restore.');
            resolve();
          });
        });
      }

      // Overwrite the current database with the backup
      await fs.copyFile(backupFilePath, dbPath);
      console.log(`Database restored from ${backupFilePath}`);

      // Reinitialize the database connection
      await initializeDatabase(app);

      return { success: true, message: 'Database restored successfully.' };
    } catch (err) {
      console.error('Restore failed:', err);
      return { success: false, message: err.message };
    }
  }
}

module.exports = BackupManager;
