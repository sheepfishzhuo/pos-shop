import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  print: (options) => ipcRenderer.invoke('dialog:print', options),
  platform: process.platform
})
