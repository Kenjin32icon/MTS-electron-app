// FileName: /main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initializeDatabase, clearAndInitializeDatabase, populateSampleData, logUserAction } = require('./database');
const authService = require('./authService');
const apiService = require('./apiService');
const BackupManager = require('./backup-manager');
const PerformanceMonitor = require('./performance-monitor');
const { DEFAULT_ADMIN_CREDENTIALS, generateSampleData } = require('./data'); // Import generateSampleData

let mainWindow;
let currentUser = null; // This will store the full user object including role and permissions

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  mainWindow.loadFile('index.html');

  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(async () => {
  await initializeDatabase(app);
  createWindow();

  // Set up daily backup (24 hours * 60 minutes * 60 seconds * 1000 milliseconds)
  setInterval(() => {
    BackupManager.createBackup(app).catch(console.error);
  }, 24 * 60 * 60 * 1000);

  PerformanceMonitor.start(BrowserWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('render-process-gone', (event, webContents, details) => {
  console.error('Renderer crashed:', details);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadFile('fatal-error.html');
  } else {
    createWindow();
  }
});

// --- IPC Main Handlers ---
ipcMain.handle('auth:login', async (event, credentials) => {
  const result = await authService.login(credentials);
  if (result.success && result.user) {
    currentUser = result.user; // Store the full user object
  }
  return result;
});

ipcMain.handle('auth:register', async (event, userData) => {
  const result = await authService.register(userData);
  if (result.success) {
    // Notify frontend that user data might have changed (e.g., for admin panel user list)
    notifyDataUpdate('users'); // Notify 'users' channel
  }
  return result;
});

ipcMain.handle('auth:logout', async () => { // Made async to log action
  if (currentUser) {
    await logUserAction(currentUser.id, 'LOGOUT', `User ${currentUser.email} logged out`);
  }
  currentUser = null;
  return true;
});

// IPC handler to get current user role and permissions (for frontend access control)
ipcMain.handle('auth:getCurrentUser', () => {
  return currentUser;
});

// New IPC handler to check if the current user is the default admin and it's their first login
ipcMain.handle('auth:checkFirstLogin', () => {
    if (currentUser && currentUser.id === DEFAULT_ADMIN_CREDENTIALS.id && currentUser.first_login) {
        return { isFirstLogin: true, user: currentUser };
    }
    return { isFirstLogin: false };
});

// This function is now a general user profile update, not specifically for "first login"
ipcMain.handle('auth:updatePasswordAndFirstLogin', async (event, userId, newName, newEmail, newPassword) => {
    // Ensure only the current user can update their own details, or an admin can update any user.
    if (!currentUser || (currentUser.id !== userId && currentUser.role !== 'admin')) {
        await logUserAction(currentUser ? currentUser.id : null, 'UPDATE_PROFILE_FAILED', `Unauthorized attempt to update user ${userId}`);
        return { success: false, message: 'Unauthorized to update this user profile.' };
    }

    const result = await authService.updatePasswordAndFirstLogin(userId, newName, newEmail, newPassword);
    if (result.success && currentUser && currentUser.id === userId) {
        // Update the currentUser object in main process if password change was for current user
        currentUser.name = newName; // Update name
        currentUser.email = newEmail; // Update email
        currentUser.first_login = false; // Mark first login as complete
    }
    return result;
});


ipcMain.handle('api:get', async (event, endpoint, id) => {
  // Pass currentUser details to apiService for all calls
  const userRole = currentUser ? currentUser.role : null;
  const userPermissions = currentUser ? currentUser.permissions : {};
  const userId = currentUser ? currentUser.id : null; // Pass userId for logging
  try {
    return await apiService.get(endpoint, id, userRole, userPermissions, userId);
  } catch (error) {
    console.error(`IPC API GET Error for ${endpoint}:`, error.message);
    // Return a structured error response
    return { success: false, message: error.message };
  }
});

ipcMain.handle('api:post', async (event, endpoint, data) => {
  if (!currentUser) return { success: false, message: 'Unauthorized: Please log in.' };
  try {
    const result = await apiService.post(endpoint, data, currentUser.role, currentUser.permissions, currentUser.id);
    notifyDataUpdate(endpoint); // Notify frontend of data change
    return { success: true, data: result };
  } catch (error) {
    console.error(`IPC API POST Error for ${endpoint}:`, error.message);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('api:put', async (event, endpoint, id, data) => {
  if (!currentUser) return { success: false, message: 'Unauthorized: Please log in.' };
  try {
    const result = await apiService.put(endpoint, id, data, currentUser.role, currentUser.permissions, currentUser.id);
    notifyDataUpdate(endpoint); // Notify frontend of data change
    return { success: true, data: result };
  } catch (error) {
    console.error(`IPC API PUT Error for ${endpoint}:`, error.message);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('api:delete', async (event, endpoint, id) => {
  if (!currentUser) return { success: false, message: 'Unauthorized: Please log in.' };
  try {
    const result = await apiService.delete(endpoint, id, currentUser.role, currentUser.permissions, currentUser.id);
    notifyDataUpdate(endpoint); // Notify frontend of data change
    return { success: true, data: result };
  } catch (error) {
    console.error(`IPC API DELETE Error for ${endpoint}:`, error.message);
    return { success: false, message: error.message };
  }
});

// New IPC handler for resetting data with admin credentials
ipcMain.handle('admin:resetData', async (event, credentials) => {
  // Verify admin credentials before resetting data
  const authResult = await authService.login(credentials);
  if (!authResult.success || authResult.user.role !== 'admin') {
    await logUserAction(authResult.user ? authResult.user.id : null, 'RESET_DATA_FAILED', `Unauthorized attempt to reset data by ${credentials.email}`);
    return { success: false, message: 'Unauthorized: Invalid admin credentials.' };
  }

  try {
    // clearAndInitializeDatabase now handles re-adding the default admin
    await clearAndInitializeDatabase(app); // Pass app instance
    await logUserAction(authResult.user.id, 'RESET_DATA_SUCCESS', `Database reset and re-initialized by admin ${authResult.user.email}`);
    // After reset, clear current user session as data is wiped
    currentUser = null;
    notifyDataUpdate('*'); // Notify all channels of a major data change
    return { success: true, message: 'Database reset and re-initialized successfully.' };
  } catch (error) {
    console.error('Error resetting database:', error);
    await logUserAction(authResult.user.id, 'RESET_DATA_FAILED', `Failed to reset database by admin ${authResult.user.email}: ${error.message}`);
    return { success: false, message: 'Failed to reset database: ' + error.message };
  }
});

// IPC handler to load sample data (for admin use)
ipcMain.handle('admin:loadSampleData', async (event, credentials) => {
    // Verify admin credentials
    const authResult = await authService.login(credentials);
    if (!authResult.success || authResult.user.role !== 'admin') {
        await logUserAction(authResult.user ? authResult.user.id : null, 'LOAD_SAMPLE_DATA_FAILED', `Unauthorized attempt to load sample data by ${credentials.email}`);
        return { success: false, message: 'Unauthorized: Invalid admin credentials.' };
    }

    try {
        // populateSampleData now uses INSERT OR IGNORE, so it will only add new data
        await populateSampleData();
        await logUserAction(authResult.user.id, 'LOAD_SAMPLE_DATA_SUCCESS', `Sample data loaded by admin ${authResult.user.email}`);
        notifyDataUpdate('*'); // Notify all channels of a major data change
        return { success: true, message: 'Sample data loaded successfully.' };
    } catch (error) {
        console.error('Error loading sample data:', error);
        await logUserAction(authResult.user.id, 'LOAD_SAMPLE_DATA_FAILED', `Failed to load sample data by admin ${authResult.user.email}: ${error.message}`);
        return { success: false, message: 'Failed to load sample data: ' + error.message };
    }
});

// New IPC handler to get sample data for unauthenticated users (if needed for display, but not for core data)
// This is kept for completeness but might not be used if all data is hidden when not logged in.
ipcMain.handle('data:getSampleData', async () => {
    try {
        const sampleData = await generateSampleData();
        return { success: true, data: sampleData };
    } catch (error) {
        console.error('Error fetching sample data:', error);
        return { success: false, message: 'Failed to fetch sample data: ' + error.message };
    }
});

// New IPC handlers for manual backup/restore
ipcMain.handle('backup:create', async () => {
  if (!currentUser || currentUser.role !== 'admin' || !currentUser.permissions.permExportData) {
    await logUserAction(currentUser ? currentUser.id : null, 'BACKUP_CREATE_FAILED', 'Unauthorized attempt to create backup');
    return { success: false, message: 'Unauthorized: Admin permission required to create backup.' };
  }
  try {
    const result = await BackupManager.createBackup(app);
    if (result.success) {
      await logUserAction(currentUser.id, 'BACKUP_CREATE_SUCCESS', `Backup created at ${result.path}`);
    } else {
      await logUserAction(currentUser.id, 'BACKUP_CREATE_FAILED', `Failed to create backup: ${result.message}`);
    }
    return result;
  } catch (error) {
    console.error('Error creating backup:', error);
    await logUserAction(currentUser.id, 'BACKUP_CREATE_FAILED', `Error creating backup: ${error.message}`);
    return { success: false, message: 'Error creating backup: ' + error.message };
  }
});

ipcMain.handle('backup:list', async () => {
  if (!currentUser || currentUser.role !== 'admin' || !currentUser.permissions.permImportData) { // Assuming list is part of import/export management
    await logUserAction(currentUser ? currentUser.id : null, 'BACKUP_LIST_FAILED', 'Unauthorized attempt to list backups');
    return { success: false, message: 'Unauthorized: Admin permission required to list backups.' };
  }
  try {
    const result = await BackupManager.listBackups(app);
    if (result.success) {
      await logUserAction(currentUser.id, 'BACKUP_LIST_SUCCESS', 'Listed available backups');
    } else {
      await logUserAction(currentUser.id, 'BACKUP_LIST_FAILED', `Failed to list backups: ${result.message}`);
    }
    return result;
  } catch (error) {
    console.error('Error listing backups:', error);
    await logUserAction(currentUser.id, 'BACKUP_LIST_FAILED', `Error listing backups: ${error.message}`);
    return { success: false, message: 'Error listing backups: ' + error.message };
  }
});

ipcMain.handle('backup:restore', async (event, backupFilePath, credentials) => {
  // Verify admin credentials before restoring data
  const authResult = await authService.login(credentials);
  if (!authResult.success || authResult.user.role !== 'admin' || !authResult.user.permissions.permImportData) {
    await logUserAction(authResult.user ? authResult.user.id : null, 'BACKUP_RESTORE_FAILED', `Unauthorized attempt to restore data by ${credentials.email}`);
    return { success: false, message: 'Unauthorized: Invalid admin credentials or missing permission.' };
  }

  try {
    const result = await BackupManager.restoreBackup(app, backupFilePath);
    if (result.success) {
      await logUserAction(authResult.user.id, 'BACKUP_RESTORE_SUCCESS', `Database restored from ${backupFilePath} by admin ${authResult.user.email}`);
      currentUser = null; // Clear session after restore as DB state changed
      notifyDataUpdate('*'); // Notify all channels of a major data change
    } else {
      await logUserAction(authResult.user.id, 'BACKUP_RESTORE_FAILED', `Failed to restore database from ${backupFilePath}: ${result.message}`);
    }
    return result;
  } catch (error) {
    console.error('Error restoring database:', error);
    await logUserAction(authResult.user.id, 'BACKUP_RESTORE_FAILED', `Error restoring database from ${backupFilePath}: ${error.message}`);
    return { success: false, message: 'Error restoring database: ' + error.message };
  }
});


const dataUpdateChannels = new Set();

ipcMain.handle('subscribe:data', (event, channel) => {
  dataUpdateChannels.add(channel);
});

ipcMain.handle('unsubscribe:data', (event, channel) => {
  dataUpdateChannels.delete(channel);
});

const notifyDataUpdate = (channel) => {
  dataUpdateChannels.forEach(sub => {
    if (sub === channel || sub === '*') {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('data:updated', channel);
      }
    }
  });
};
// Notify all subscribers when data is updated
ipcMain.on('data:updated', (event, channel) => {
  notifyDataUpdate(channel);
});
ipcMain.on('data:update', (event, channel) => { // This is redundant if 'data:updated' is used
  notifyDataUpdate(channel);
});
ipcMain.on('data:delete', (event, channel) => { // This is redundant if 'data:updated' is used
  notifyDataUpdate(channel);
});
