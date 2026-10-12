const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  exportSave: json => ipcRenderer.invoke('export-save', json),
  onPause: callback => ipcRenderer.on('desktop-pause', () => callback())
});
