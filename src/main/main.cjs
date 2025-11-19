const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const tokenModel = require('../models/tokenModels');
const notificationService = require('./notificationService.cjs');
const authService = require('./authService.cjs');

// Set app name for notifications (important for macOS)
app.name = 'EnvVault';

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
    if (!authService.isUserAuthenticated()) {
        throw new Error('Not authenticated');
    }
    try {
        return await tokenModel.getTokens();
    } catch (error) {
        console.error('Error getting tokens');
        throw error;
    }
})

ipcMain.handle('tokens:getById', async (event, ids) => {
    if (!authService.isUserAuthenticated()) {
        throw new Error('Not authenticated');
    }
    try {
        return await tokenModel.getTokensById(ids);
    } catch (error) {
        console.error('Error getting token(s) by ID', error);
        throw error;
    }
})

ipcMain.handle('tokens:update', async (event, id, updates) => {
    if (!authService.isUserAuthenticated()) {
        throw new Error('Not authenticated');
    }
    try {
        return await tokenModel.updateToken(id, updates);
    } catch (error) {
        console.error('Error updating token', error);
        throw error;
    }
})

ipcMain.handle('tokens:add', async (event, tokenData) => {
    if (!authService.isUserAuthenticated()) {
        throw new Error('Not authenticated');
    }
    try {
        return await tokenModel.addToken(tokenData);
    } catch (error) {
        console.error('Error adding token', error);
        throw error;
    }
})

ipcMain.handle('tokens:delete', async (event, id) => {
    if (!authService.isUserAuthenticated()) {
        throw new Error('Not authenticated');
    }
    try {
        return await tokenModel.deleteToken(id);
    } catch (error) {
        console.error('Error deleting token', error);
        throw error;
    }
})

// Auth handlers
ipcMain.handle('auth:isSetup', async () => {
    return await authService.checkIfSetup();
});

ipcMain.handle('auth:setup', async (event, password) => {
    try {
        await authService.setup(password);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('auth:verify', async (event, password) => {
    try {
        const isValid = await authService.verify(password);
        return { success: isValid };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Touch ID handlers
ipcMain.handle('auth:isTouchIDAvailable', () => {
    return authService.isTouchIDAvailable();
});

ipcMain.handle('auth:authenticateWithTouchID', async () => {
    try {
        await authService.authenticateWithTouchID();
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
});

ipcMain.handle('auth:lock', () => {
    authService.lock();
    return { success: true };
});


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