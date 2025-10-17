const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aispace', {
  openExternalAI: (url) => ipcRenderer.invoke('open-external-ai', url),
});

