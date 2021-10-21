const { app, BrowserWindow } = require("electron");

const portEvents = require("./server");

let mainWindow;

const createWindow = (port) => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 500,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadURL(`http://localhost:${port}`);
  mainWindow.on("closed", function () {
    mainWindow = null;
  });
};

const createMainWindow = (PORT) => {
  setTimeout(() => {
    mainWindow.close();
    createWindow(PORT);
  }, 2000);

  portEvents.removeAllListeners("port");
};

const createLoadingWindow = () => {
  mainWindow = new BrowserWindow({
    width: 300,
    height: 200,
    frame: false,
    resizable: false,
  });

  mainWindow.loadFile("./loading.html");
};

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    // Focusing window on second instance
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on("ready", () => {
    createLoadingWindow();
    portEvents.on("port", createMainWindow);
  });

  app.on("resize", function (e, x, y) {
    mainWindow.setSize(x, y);
  });

  app.on("window-all-closed", function () {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", function () {
    if (mainWindow === null) {
      createWindow();
    }
  });
}
