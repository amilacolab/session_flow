"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const icon = path.join(__dirname, "../../resources/icon.png");
let mainWindow = null;
let widgetWindow = null;
let tray = null;
const gotTheLock = electron.app.requestSingleInstanceLock();
if (!gotTheLock) {
  electron.app.quit();
} else {
  electron.app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
  electron.app.whenReady().then(() => {
    utils.electronApp.setAppUserModelId("com.electron");
    electron.app.on("browser-window-created", (_, window) => {
      utils.optimizer.watchWindowShortcuts(window);
    });
    createMainWindow();
    createWidgetWindow();
    createTray();
    electron.app.on("activate", function() {
      if (electron.BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });
}
function createMainWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    frame: false,
    // Removes the OS title bar
    autoHideMenuBar: true,
    ...process.platform === "linux" ? { icon } : {},
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      backgroundThrottling: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    if (mainWindow) mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
function createWidgetWindow() {
  const primaryDisplay = electron.screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const windowWidth = 320;
  const windowHeight = 80;
  widgetWindow = new electron.BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: width - windowWidth - 20,
    y: height - windowHeight - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      backgroundThrottling: false
    }
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    widgetWindow.loadURL(process.env["ELECTRON_RENDERER_URL"] + "#widget");
  } else {
    widgetWindow.loadFile(path.join(__dirname, "../renderer/index.html"), { hash: "widget" });
  }
  widgetWindow.setIgnoreMouseEvents(true, { forward: true });
}
function createTray() {
  const trayIcon = electron.nativeImage.createFromPath(icon);
  tray = new electron.Tray(trayIcon);
  const contextMenu = electron.Menu.buildFromTemplate([
    {
      label: "Show App",
      click: () => {
        mainWindow?.show();
      }
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        electron.app.quit();
      }
    }
  ]);
  tray.setToolTip("Active Session Flow");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
    }
  });
}
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") ;
});
electron.ipcMain.on("window-minimize", () => mainWindow?.minimize());
electron.ipcMain.on("window-maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
electron.ipcMain.on("window-close", () => {
  mainWindow?.hide();
});
electron.ipcMain.on("set-ignore-mouse-events", (event, ignore, options) => {
  const win = electron.BrowserWindow.fromWebContents(event.sender);
  if (win) win.setIgnoreMouseEvents(ignore, options);
});
electron.ipcMain.on("update-timer", (_, data) => {
  if (widgetWindow) widgetWindow.webContents.send("sync-timer", data);
});
electron.ipcMain.on("widget-command", (_, command) => {
  if (mainWindow) mainWindow.webContents.send("control-session", command);
});
