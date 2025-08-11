// FileName: /preload.js
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication APIs
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  register: (userData) => ipcRenderer.invoke('auth:register', userData),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'), // Get current user's role and permissions
  updatePasswordAndFirstLogin: (userId, newName, newEmail, newPassword) => ipcRenderer.invoke('auth:updatePasswordAndFirstLogin', userId, newName, newEmail, newPassword), // Added newName, newEmail

  // General API service for CRUD operations
  api: {
    get: (endpoint, id) => ipcRenderer.invoke('api:get', endpoint, id),
    post: (endpoint, data) => ipcRenderer.invoke('api:post', endpoint, data), // Ensure this line is complete
    put: (endpoint, id, data) => ipcRenderer.invoke('api:put', endpoint, id, data),
    delete: (endpoint, id) => ipcRenderer.invoke('api:delete', endpoint, id),
  },

  // Admin specific actions
  admin: {
    resetData: (credentials) => ipcRenderer.invoke('admin:resetData', credentials),
    loadSampleData: (credentials) => ipcRenderer.invoke('admin:loadSampleData', credentials),
  },

  // Data update subscriptions
  subscribeDataUpdate: (channel) => ipcRenderer.invoke('subscribe:data', channel),
  unsubscribeDataUpdate: (channel) => ipcRenderer.invoke('unsubscribe:data', channel),
  onDataUpdate: (callback) => ipcRenderer.on('data:updated', (event, channel) => callback(channel)),

  // Sample data for unauthenticated users
  getSampleData: () => ipcRenderer.invoke('data:getSampleData'),
});
