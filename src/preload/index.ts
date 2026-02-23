import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Window Controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Widget Logic
  setIgnoreMouseEvents: (ignore: boolean) => {
    if (ignore) ipcRenderer.send('set-ignore-mouse-events', true, { forward: true })
    else ipcRenderer.send('set-ignore-mouse-events', false)
  },
  sendTimerUpdate: (data: any) => ipcRenderer.send('update-timer', data),
  onTimerUpdate: (callback: (data: any) => void) => {
    ipcRenderer.on('sync-timer', (_, value) => callback(value))
  },
  sendWidgetCommand: (command: string) => ipcRenderer.send('widget-command', command),
  onWidgetCommand: (callback: (command: string) => void) => {
    ipcRenderer.on('control-session', (_, value) => callback(value))
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}