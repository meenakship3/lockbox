const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // Load from Vite dev server in development, or from built files in production
    if (process.env.NODE_ENV === 'development') {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, '../renderer/index.html'));
    }
}

app.whenReady().then(() => {
    // Handle file save dialog
    ipcMain.handle('save-file', async (event, { defaultPath, content }) => {
        const { filePath } = await dialog.showSaveDialog({
            defaultPath: defaultPath || 'untitled.txt',
            filters: [
                { name: 'All Files', extensions: ['*'] },
                { name: 'Environment Files', extensions: ['env'] },
                { name: 'Shell Scripts', extensions: ['sh'] }
            ]
        });

        if (filePath) {
            fs.writeFileSync(filePath, content, 'utf-8');
        }
    });

    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});