const { contextBridge, ipcRenderer, clipboard } = require('electron');

async function writeClipboardText(text) {
  const value = String(text ?? '');
  try {
    clipboard.writeText(value);
    return true;
  } catch (err) {
    console.warn('[aispace] preload clipboard.writeText failed', err);
  }
  try {
    return await ipcRenderer.invoke('clipboard-write-text', value);
  } catch (err) {
    console.warn('[aispace] ipc clipboard-write-text failed', err);
    return false;
  }
}

const LAYV_CHROME_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

contextBridge.exposeInMainWorld('aispace', {
  platform: process.platform,
  isElectron: true,
  chromeUserAgent: LAYV_CHROME_USER_AGENT,
  aiWebviewPartition: 'persist:layv-ai',
  writeClipboardText,
  openExternalAI: (url) => ipcRenderer.invoke('open-external-ai', url),
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window-toggle-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizedChanged: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, isMaximized) => callback(isMaximized);
    ipcRenderer.on('window-maximized-changed', listener);
    return () => ipcRenderer.removeListener('window-maximized-changed', listener);
  },
});
