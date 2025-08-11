// preload.js
    const { contextBridge, ipcRenderer } = require('electron');

    contextBridge.exposeInMainWorld('electronAPI', {
      login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
      register: (userData) => ipcRenderer.invoke('auth:register', userData),
      api: {
        get: (endpoint) => ipcRenderer.invoke('api:get', endpoint),
        post: (endpoint, data) => ipcRenderer.invoke('api:post', endpoint, data),
        put: (endpoint, id, data) => ipcRenderer.invoke('api:put', endpoint, id, data),
        delete: (endpoint, id) => ipcRenderer.invoke('api:delete', endpoint, id),
      }
    });