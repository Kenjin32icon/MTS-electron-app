// FileName: /preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Auth related
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    register: (userData) => ipcRenderer.invoke('auth:register', userData),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
    checkFirstLogin: () => ipcRenderer.invoke('auth:checkFirstLogin'),
    updatePasswordAndFirstLogin: (userId, newName, newEmail, newPassword) => ipcRenderer.invoke('auth:updatePasswordAndFirstLogin', userId, newName, newEmail, newPassword),

    // API related (CRUD operations)
    api: {
        get: (endpoint, id) => ipcRenderer.invoke('api:get', endpoint, id),
        post: (endpoint, data) => ipcRenderer.invoke('api:post', endpoint, data),
        put: (endpoint, id, data) => ipcRenderer.invoke('api:put', endpoint, id, data),
        delete: (endpoint, id) => ipcRenderer.invoke('api:delete', endpoint, id)
    },

    // Admin specific actions
    resetData: (credentials) => ipcRenderer.invoke('admin:resetData', credentials),
    loadSampleData: (credentials) => ipcRenderer.invoke('admin:loadSampleData', credentials),

    // Backup/Restore
    createBackup: () => ipcRenderer.invoke('backup:create'),
    listBackups: () => ipcRenderer.invoke('backup:list'),
    restoreBackup: (backupFilePath, credentials) => ipcRenderer.invoke('backup:restore', backupFilePath, credentials),

    // Data update notifications
    onDataUpdated: (callback) => ipcRenderer.on('data:updated', (event, channel) => callback(channel)),
    subscribeToDataUpdates: (channel) => ipcRenderer.invoke('subscribe:data', channel),
    unsubscribeFromDataUpdates: (channel) => ipcRenderer.invoke('unsubscribe:data', channel),

    // General utilities
    getSampleData: () => ipcRenderer.invoke('data:getSampleData') // For unauthenticated display if needed
});
