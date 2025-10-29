const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 960,
    minWidth: 1280,
    minHeight: 800,
    title: 'AISpace Desktop',
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
      webviewTag: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  // 개발자 도구 자동 열기 (개발 중)
  // mainWindow.webContents.openDevTools();

  // F12 또는 Ctrl+Shift+I로 개발자 도구 토글
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || 
        (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});