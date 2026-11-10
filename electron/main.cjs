const { app, BrowserWindow } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 420,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: true,
    },
  });

  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error(`[electron] did-fail-load: ${errorDescription} (${errorCode}) url=${validatedURL} mainFrame=${isMainFrame}`);
  });

  win.webContents.on("did-finish-load", () => {
    console.log("[electron] did-finish-load ok");
  });

  win.webContents.on("console-message", (_event, _level, _message) => {
    // noop
  });

  win.webContents.on("render-process-gone", (_event, details) => {
    console.error(`[electron] render-process-gone: ${JSON.stringify(details)}`);
  });

  if (isDev) {
    win.loadURL("http://127.0.0.1:3001");
  } else {
    win.loadFile(path.join(process.resourcesPath, "app.asar", "dist", "index.html"));
  }

  return win;
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform === "darwin") {
    app.quit();
  }
});
