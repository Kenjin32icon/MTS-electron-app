// main.js
    const { app, BrowserWindow, ipcMain } = require('electron');
    const path = require('path');
    const { initializeDatabase, getDb } = require('./database'); // Will create this
    const authService = require('./authService'); // Will create this
    const apiService = require('./apiService'); // Will create this

    let mainWindow;

    function createWindow() {
      mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'), // Will create this
          nodeIntegration: false, // Keep false for security
          contextIsolation: true, // Keep true for security
          enableRemoteModule: false // Keep false for security
        }
      });

      // Load the index.html of the app.
      mainWindow.loadFile('index.html');

      // Open the DevTools.
      // mainWindow.webContents.openDevTools();
    }

    app.whenReady().then(async () => {
      await initializeDatabase(); // Initialize SQLite database
      createWindow();

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

    // --- IPC Main Handlers (for communication between renderer and main process) ---
    ipcMain.handle('auth:login', async (event, credentials) => {
      return authService.login(credentials);
    });

    ipcMain.handle('auth:register', async (event, userData) => {
      return authService.register(userData);
    });

    ipcMain.handle('api:get', async (event, endpoint) => {
      return apiService.get(endpoint);
    });

    ipcMain.handle('api:post', async (event, endpoint, data) => {
      return apiService.post(endpoint, data);
    });

    ipcMain.handle('api:put', async (event, endpoint, id, data) => {
      return apiService.put(endpoint, id, data);
    });

    ipcMain.handle('api:delete', async (event, endpoint, id) => {
      return apiService.delete(endpoint, id);
    });