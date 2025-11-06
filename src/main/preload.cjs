const { contextBridge, ipcRenderer } = require("electron");

// Expose APIs for the renderer process
contextBridge.exposeInMainWorld("electron", {
    saveFile: (options) => ipcRenderer.invoke('save-file', options)
});

// Keep the old API for reference (can remove later)
contextBridge.exposeInMainWorld("api", {
    getNames: () => ipcRenderer.invoke('get-names')
});