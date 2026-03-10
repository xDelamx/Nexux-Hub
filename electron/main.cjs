const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // Allows using Node.js APIs in the renderer if needed, but be careful with security
        },
    });

    // In production, load the local index.html.
    // In development, load the Vite dev server URL.
    const isDev = !app.isPackaged;

    if (isDev) {
        win.loadURL('http://localhost:3000');
        // Open DevTools in dev mode
        win.webContents.openDevTools();
    } else {
        // Correct way to load local file in production
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
