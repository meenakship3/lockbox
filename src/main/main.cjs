const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const tokenModel = require('../models/tokenModels');
const notificationService = require('./notificationService.cjs');

// Set app name for notifications (important for macOS)
app.name = 'Chinese Whispers';

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

ipcMain.handle('tokens:getAll', async () => {
    try {
        return await tokenModel.getTokens();
    } catch (error) {
        console.error('Error getting tokens');
        throw error;
    }
})

ipcMain.handle('tokens:getById', async (event, ids) => {
    try {
        return await tokenModel.getTokensById(ids);
    } catch (error) {
        console.error('Error getting token(s) by ID', error);
        throw error;
    }
})

ipcMain.handle('tokens:update', async (event, id, updates) => {
    try {
        return await tokenModel.updateToken(id, updates);
    } catch (error) {
        console.error('Error updating token', error);
        throw error;
    }
})

ipcMain.handle('tokens:add', async (event, tokenData) => {
    try {
        return await tokenModel.addToken(tokenData);
    } catch (error) {
        console.error('Error adding token', error);
        throw error;
    }
})

ipcMain.handle('tokens:delete', async (event, id) => {
    try {
        return await tokenModel.deleteToken(id);
    } catch (error) {
        console.error('Error deleting token', error);
        throw error;
    }
})

// const NOTIFICATION_TITLE = 'Basic Notification'
// const NOTIFICATION_BODY = 'Notification from the Main process'

// function showNotification () {
//   new Notification({ title: NOTIFICATION_TITLE, body: NOTIFICATION_BODY }).show()
// }

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

    createWindow();
    // showNotification();
    notificationService.startNotificationScheduler();

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