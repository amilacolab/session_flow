"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const api = {
  // Window Controls
  minimize: () => electron.ipcRenderer.send("window-minimize"),
  maximize: () => electron.ipcRenderer.send("window-maximize"),
  close: () => electron.ipcRenderer.send("window-close"),
  // Widget Logic
  setIgnoreMouseEvents: (ignore) => {
    if (ignore) electron.ipcRenderer.send("set-ignore-mouse-events", true, { forward: true });
    else electron.ipcRenderer.send("set-ignore-mouse-events", false);
  },
  sendTimerUpdate: (data) => electron.ipcRenderer.send("update-timer", data),
  onTimerUpdate: (callback) => {
    electron.ipcRenderer.on("sync-timer", (_, value) => callback(value));
  },
  sendWidgetCommand: (command) => electron.ipcRenderer.send("widget-command", command),
  onWidgetCommand: (callback) => {
    electron.ipcRenderer.on("control-session", (_, value) => callback(value));
  }
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", preload.electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
}
