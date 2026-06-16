const { app, BrowserWindow, ipcMain, shell, Menu, clipboard, session } = require('electron');
const path = require('path');

const AI_EMBED_HOST_SUFFIXES = [
  'chatgpt.com',
  'openai.com',
  'gemini.google.com',
  'google.com',
  'claude.ai',
  'pi.ai',
];

const TITLE_BAR_HEIGHT = 36;
const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

/** Guest webview UA — Electron 문자열이 있으면 ChatGPT/Gemini가 차단·빈 화면을 보일 수 있음 */
const LAYV_CHROME_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const AI_WEBVIEW_PARTITION = 'persist:layv-ai';

let mainWindow;

function buildWindowOptions() {
  const options = {
    width: 1600,
    height: 960,
    minWidth: 1280,
    minHeight: 800,
    title: 'LAYV',
    backgroundColor: '#0a0a0a',
    show: false,
    autoHideMenuBar: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
      webviewTag: true,
    },
  };

  if (isMac) {
    options.titleBarStyle = 'hidden';
    options.trafficLightPosition = { x: -1000, y: -1000 };
  }

  if (isWin) {
    options.thickFrame = true;
    options.roundedCorners = true;
  }

  return options;
}

function createMainWindow() {
  mainWindow = new BrowserWindow(buildWindowOptions());

  Menu.setApplicationMenu(null);
  mainWindow.setMenuBarVisibility(false);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (
      input.key === 'F12' ||
      (input.control && input.shift && input.key.toLowerCase() === 'i')
    ) {
      mainWindow.webContents.toggleDevTools();
    }
  });

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized-changed', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized-changed', false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function hostnameMatchesAiEmbed(hostname) {
  if (!hostname) return false;
  const host = hostname.toLowerCase();
  return AI_EMBED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}

function configureAiEmbedSession(targetSession) {
  const ses = targetSession || session.defaultSession;
  if (!ses || ses.__layvAiEmbedConfigured) return;
  ses.__layvAiEmbedConfigured = true;

  try {
    ses.setUserAgent(LAYV_CHROME_USER_AGENT);
  } catch (err) {
    console.warn('[configureAiEmbedSession] setUserAgent failed', err);
  }

  ses.webRequest.onHeadersReceived({ urls: ['https://*/*', 'http://*/*'] }, (details, callback) => {
    let hostname = '';
    try {
      hostname = new URL(details.url).hostname;
    } catch {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }

    if (!hostnameMatchesAiEmbed(hostname)) {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }

    const responseHeaders = { ...details.responseHeaders };
    for (const key of Object.keys(responseHeaders)) {
      const lower = key.toLowerCase();
      if (lower === 'x-frame-options') {
        delete responseHeaders[key];
      } else if (lower === 'content-security-policy' || lower === 'content-security-policy-report-only') {
        const value = Array.isArray(responseHeaders[key])
          ? responseHeaders[key].join('; ')
          : String(responseHeaders[key] || '');
        const stripped = value
          .split(';')
          .map((part) => part.trim())
          .filter((part) => part && !/^frame-ancestors\b/i.test(part))
          .join('; ');
        if (stripped) responseHeaders[key] = [stripped];
        else delete responseHeaders[key];
      }
    }

    callback({ responseHeaders });
  });
}

function configureAllAiSessions() {
  configureAiEmbedSession(session.defaultSession);
  configureAiEmbedSession(session.fromPartition(AI_WEBVIEW_PARTITION));
}

function attachWebviewPolicies(contents) {
  contents.on('will-attach-webview', (_event, webPreferences, params) => {
    webPreferences.preload = undefined;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = false;
    webPreferences.javascript = true;

    if (params.partition) {
      configureAiEmbedSession(session.fromPartition(params.partition));
    }
  });

  contents.on('did-attach-webview', (_event, guestContents) => {
    try {
      guestContents.setUserAgent(LAYV_CHROME_USER_AGENT);
    } catch (err) {
      console.warn('[did-attach-webview] setUserAgent failed', err);
    }

    const partition = guestContents.session?.partition || 'default';
    console.log('[did-attach-webview] partition=%s url=%s', partition, guestContents.getURL() || '(pending)');

    guestContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
      if (errorCode === -3) return;
      console.error('[webview-guest] did-fail-load', { errorCode, errorDescription, validatedURL });
    });
  });
}

function registerIpcHandlers() {
  ipcMain.handle('open-external-ai', async (_event, url) => {
    if (typeof url === 'string' && /^https?:/i.test(url)) {
      await shell.openExternal(url);
    }
  });

  ipcMain.handle('window-minimize', () => {
    BrowserWindow.getFocusedWindow()?.minimize();
  });

  ipcMain.handle('window-toggle-maximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return false;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
    return win.isMaximized();
  });

  ipcMain.handle('window-close', () => {
    BrowserWindow.getFocusedWindow()?.close();
  });

  ipcMain.handle('window-is-maximized', () => {
    return BrowserWindow.getFocusedWindow()?.isMaximized() ?? false;
  });

  ipcMain.handle('clipboard-write-text', (_event, text) => {
    try {
      clipboard.writeText(String(text ?? ''));
      return true;
    } catch (err) {
      console.error('[clipboard-write-text]', err);
      return false;
    }
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  configureAllAiSessions();

  app.on('web-contents-created', (_event, contents) => {
    attachWebviewPolicies(contents);
    contents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/i.test(url)) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });
  });

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

module.exports = {
  TITLE_BAR_HEIGHT,
  LAYV_CHROME_USER_AGENT,
  AI_WEBVIEW_PARTITION,
};
