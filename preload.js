// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  installIcon: (folder, image, recursive) => ipcRenderer.invoke('install-icon', folder, image, recursive),
  uninstallIcon: (folder, recursive) => ipcRenderer.invoke('uninstall-icon', folder, recursive),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectImage: () => ipcRenderer.invoke('select-image')
});
