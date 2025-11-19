const { contextBridge, ipcRenderer } = require("electron");

// Expose APIs for the renderer process
// contextBridge.exposeInMainWorld("electron", {
//     saveFile: (options) => ipcRenderer.invoke('save-file', options) 
// });

contextBridge.exposeInMainWorld("api", {
    tokens: {
        getAll: () => ipcRenderer.invoke('tokens:getAll'),
        getById: (ids) => ipcRenderer.invoke('tokens:getById', ids),
        update: (id, updates) => ipcRenderer.invoke('tokens:update', id, updates),
        add: (tokenData) => ipcRenderer.invoke('tokens:add', tokenData),
        delete: (id) => ipcRenderer.invoke('tokens:delete', id)
    },
    auth: {
        isSetup: () => ipcRenderer.invoke('auth:isSetup'),
        setup: (password) => ipcRenderer.invoke('auth:setup', password),
        verify: (password) => ipcRenderer.invoke('auth:verify', password),
        isTouchIDAvailable: () => ipcRenderer.invoke('auth:isTouchIDAvailable'),
        authenticateWithTouchID: () => ipcRenderer.invoke('auth:authenticateWithTouchID'),
        lock: () => ipcRenderer.invoke('auth:lock')
    }
});