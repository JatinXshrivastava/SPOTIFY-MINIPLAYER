const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    openSpotify: () => ipcRenderer.invoke('open-spotify'),
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    showWindow: () => ipcRenderer.invoke('show-window'),
    openLogin: () => ipcRenderer.invoke('open-login'),
    dragWindow: (delta) => ipcRenderer.send('window-drag', delta),
})
