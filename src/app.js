const {
  app,
  ipcMain,
  protocol,
  BrowserWindow,
  shell,
  ipcRenderer,
} = require("electron");
const { Microsoft } = require("./assets/js/libs/mc/Index");
const { autoUpdater } = require("electron-updater");
const { io } = require("socket.io-client");
const socket = io("https://api.battlylauncher.com");
//process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
const fs = require("fs");
const path = require("path");
const dataDirectory =
  process.env.APPDATA ||
  (process.platform == "darwin"
    ? `${process.env.HOME}/Library/Application Support`
    : process.env.HOME);
const { Notification } = require("electron");
let dev = process.env.NODE_ENV === "dev";
let selectedAccount;
app.setAppUserModelId("Battly Launcher");

const notifier = require("node-notifier");

const { Menu, Tray } = require("electron");

let tray = null;
let isPlaying = false;

app.whenReady().then(() => {
  tray = new Tray(path.join(__dirname, "/assets/images/icon.png"));
  updateTrayMenu(); // Actualizar menú inicialmente

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Battly Launcher",
      type: "normal",
      icon: path.join(__dirname, "/assets/images/icon15px.png"),
      click: () => {
        const MainWindow = require("./assets/js/windows/mainWindow.js");
        MainWindow.getWindow().show();
      },
    },
    { type: "separator" },
    {
      label: "Apri la cartella Battly",
      type: "normal",
      click: () => {
        AbrirCarpeta();
      },
    },
    {
      label: "Musica Battly",
      type: "submenu",
      submenu: [
        {
          label: "Riproduci/Pausa",
          type: "normal",
          click: () => {
            PlayPause();
          },
        },
        {
          label: "Seguente",
          type: "normal",
          click: () => {
            NextMusic();
          },
        },
        {
          label: "Ex",
          type: "normal",
          click: () => {
            PrevMusic();
          },
        },
      ],
    },
    { type: "separator" },
    {
      label: "Discord",
      type: "normal",
      click: () => {
        shell.openExternal("https://discord.nexuxnova.it");
      },
    },
    {
      label: "Sito Web",
      type: "normal",
      click: () => {
        shell.openExternal("https://nexuxnova.it");
      },
    },
    { type: "separator" },
    {
      label: "Chiudi Battly",
      type: "normal",
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setToolTip("Battly Launcher");
  tray.setContextMenu(contextMenu);
});

// Función para actualizar el menú de la bandeja dependiendo del estado de reproducción
function updateTrayMenu() {
  const playPauseLabel = isPlaying ? "Pausa" : "Riprodurre";
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Battly Launcher",
      type: "normal",
      icon: path.join(__dirname, "/assets/images/icon15px.png"),
    },
    { type: "separator" },
    {
      label: "Apri la cartella Battly",
      type: "normal",
      click: () => {
        AbrirCarpeta();
      },
    },
    {
      label: "Musica Battly",
      type: "submenu",
      submenu: [
        {
          label: playPauseLabel,
          type: "normal",
          click: () => {
            PlayPause();
          },
        },
        {
          label: "Seguente",
          type: "normal",
          click: () => {
            NextMusic();
          },
        },
        {
          label: "Ex",
          type: "normal",
          click: () => {
            PrevMusic();
          },
        },
      ],
    },
    { type: "separator" },
    {
      label: "Discord",
      type: "normal",
      click: () => {
        shell.openExternal("https://discord.nexuxnova.it");
      },
    },
    {
      label: "Sito Web",
      type: "normal",
      click: () => {
        shell.openExternal("https://nexuxnova.it");
      },
    },
    { type: "separator" },
    {
      label: "Chiudi Battly",
      type: "normal",
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
}

async function PlayPause() {
  isPlaying = !isPlaying; // Cambiar el estado de reproducción
  updateTrayMenu(); // Actualizar el menú de la bandeja
  const window = MainWindow.getWindow();
  window.webContents.send("play-pause");
}

async function PrevMusic() {
  const window = MainWindow.getWindow();
  window.webContents.send("prev--song");
  window.webContents.send("prev");
}

async function NextMusic() {
  const window = MainWindow.getWindow();
  window.webContents.send("next--song");
  window.webContents.send("next");
}

ipcMain.on("next", async () => {
  const window = MainWindow.getWindow();
  window.webContents.send("next--song");
  window.webContents.send("next");
});

ipcMain.on("prev", async () => {
  const window = MainWindow.getWindow();
  window.webContents.send("prev--song");
  window.webContents.send("prev");
});

async function AbrirCarpeta() {
  shell.openPath(path.join(dataDirectory, ".battly"));
}

if (!fs.existsSync(path.join(dataDirectory, ".battly")))
  fs.mkdirSync(path.join(dataDirectory, ".battly"));

socket.on("connect", () => {
  console.log("Connesso al server");
});

socket.on("notificacion", async (data) => {
  const { titulo, descripcion, url } = data;

  notifier.notify(
    {
      title: titulo,
      message: descripcion,
      icon: path.join(__dirname, "/assets/images/icon.png"),
      sound: true,
      wait: true,
      actions: ["Apri"],
      appID: "Battly Launcher",
    },
    function (err, response, metadata) {
      if (metadata.activationType === "Abrir") {
        console.log("URL di apertura:", url);
        shell.openExternal(url);
      }
    }
  );
});

ipcMain.on("select-account", async (event, data) => {
  selectedAccount = data;
});

socket.on("solicitudAmistad", async (data) => {
  const { username } = data;

  try {
    notifier.notify(
      {
        title: "Richiesta di amicizia",
        message: `${username} ti ha inviato una richiesta di amicizia.`,
        icon: path.join(__dirname, "/assets/images/icon.png"),
        sound: true,
        wait: true,
        actions: ["Accetta", "Declino"],
        appID: "Battly Launcher",
      },
      (event, arg, metadata) => {
        if (arg === "aceptar") {
          socket.emit("aceptarSolicitud", {
            username: selectedAccount.name,
            solicitud: username,
            password: selectedAccount.password,
          });
        } else {
          socket.emit("rechazarSolicitud", {
            username: selectedAccount.name,
            solicitud: username,
            password: selectedAccount.password,
          });
        }
      }
    );
  } catch (error) {
    console.error("Errore nella visualizzazione della notifica:", error);
  }
});

app.on("open-url", function (event, urlToOpen) {
  event.preventDefault();

  const parsedUrl = url.parse(urlToOpen, true);
  const pathname = parsedUrl.pathname;

  console.log(pathname);
});

ipcMain.on("socket", async (i, event, data) => {
  socket.emit(event, data);
});

socket.on("onlineUsers", (data) => {
  const window = MainWindow.getWindow();
  window.webContents.send("onlineUsers", data);
});

socket.on("obtenerUsuariosPremium", (data) => {
  const window = MainWindow.getWindow();
  window.webContents.send("obtenerUsuariosPremium", data);
});

let shown = false;

socket.on("getLogs", async (data) => {
  if (shown) {
    const RegistroLog = fs.readFileSync(
      `${dataDirectory}/.battly/Registro.log`,
      "utf8"
    );
    const window = MainWindow.getWindow();
    window.webContents.send("getLogsAnterior", { RegistroLog });

    const registryConvertedToBase64 =
      Buffer.from(RegistroLog).toString("base64");
    socket.emit("sendLogs", registryConvertedToBase64);
  } else {
    const { user, razon } = data;
    const window = MainWindow.getWindow();
    window.webContents.send("avisoObtenerLogs", { user, razon });
  }
});

ipcMain.on("obtenerLogs", async (event, data) => {
  const RegistroLog = fs.readFileSync(
    `${dataDirectory}/.battly/Registro.log`,
    "utf8"
  );
  let dataJSON = JSON.stringify(data);
  let dataConvertedToBase64 = Buffer.from(dataJSON).toString("base64");
  let registryConvertedToBase64 = Buffer.from(RegistroLog).toString("base64");
  socket.emit("sendLogs", {
    userData: dataConvertedToBase64,
    logs: registryConvertedToBase64,
  });
  shown = true;
});

ipcMain.on("obtenerSocketID", async (event, data) => {
  const sessionID = socket.id;
  const window = MainWindow.getWindow();
  window.webContents.send("enviarSocketID", { sessionID });
});

ipcMain.on("updateStatus", async (event, data) => {
  socket.emit("updateStatus", data);
});

if (!dev) {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient("battly", process.execPath, [
        path.resolve(process.argv[1]),
      ]);
      app.setAsDefaultProtocolClient("battlylauncher", process.execPath, [
        path.resolve(process.argv[1]),
      ]);
    }
  } else {
    app.setAsDefaultProtocolClient("battly");
    app.setAsDefaultProtocolClient("battlylauncher");
  }
}

const UpdateWindow = require("./assets/js/windows/updateWindow.js");
const MainWindow = require("./assets/js/windows/mainWindow.js");

if (dev) {
  let appPath = path.resolve("./AppData/Launcher").replace(/\\/g, "/");
  if (!fs.existsSync(appPath)) fs.mkdirSync(appPath, { recursive: true });
  app.setPath("userData", appPath);
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    UpdateWindow.createWindow();
  });
}

process.on("uncaughtException", (error) => {
  console.log(error);
});

process.on("unhandledRejection", (error) => {
  console.log(error);
});

ipcMain.on("update-window-close", () => UpdateWindow.destroyWindow());
ipcMain.on("update-window-dev-tools", () =>
  UpdateWindow.getWindow().webContents.openDevTools()
);
ipcMain.on("main-window-open", () => MainWindow.createWindow());
ipcMain.on("main-window-dev-tools", () =>
  MainWindow.getWindow().webContents.openDevTools()
);
ipcMain.on("main-window-close", () => MainWindow.destroyWindow());
ipcMain.on("main-window-progress_", (progress_actual, size_actual) => {
  MainWindow.getWindow().setProgressBar(
    parseInt(size_actual.progress) / parseInt(100)
  );
});
ipcMain.on("main-window-progress", (progress_actual, size_actual) => {
  MainWindow.getWindow().setProgressBar(
    parseInt(size_actual.progress_actual) / parseInt(size_actual.size_actual)
  );
});

ipcMain.on("main-window-progress-loading", () => {
  MainWindow.getWindow().setProgressBar(2);
});

ipcMain.on("main-window-progress-reset", () => {
  MainWindow.getWindow().setProgressBar(-1);
});
ipcMain.on("main-window-minimize", () => MainWindow.getWindow().minimize());

ipcMain.on("main-window-maximize", () => {
  if (MainWindow.getWindow().isMaximized()) {
    MainWindow.getWindow().unmaximize();
  } else {
    MainWindow.getWindow().maximize();
  }
});

ipcMain.on("main-window-hide", () => MainWindow.getWindow().hide());
ipcMain.on("main-window-show", () => MainWindow.getWindow().show());

ipcMain.handle("Microsoft-window", async (event, client_id) => {
  return await new Microsoft(client_id).getAuth();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.on("restartLauncher", () => {
  app.relaunch();
  app.exit();
});

let songPlaying;
ipcMain.on("set-song", async (info, song) => {
  if (song) {
    ipcMain.emit("get-song", song);
  }
});

ipcMain.on("pause-song", async () => {
  songPlaying = false;
  ipcMain.emit("pause--song");
});

ipcMain.on("play-song", async () => {
  songPlaying = true;
  ipcMain.emit("play--song");
});

let startedAppTime = Date.now();

const rpc = require("./assets/js/libs/discord/index");
let client = new rpc.Client({ transport: "ipc" });

ipcMain.on("new-status-discord", async () => {
  client.login({ clientId: "1385601392122527825" });
  client.on("ready", () => {
    client
      .request("SET_ACTIVITY", {
        pid: process.pid,
        activity: {
          details: "Nel menu di avvio",
          assets: {
            large_image: "battly_512",
            large_text: "Battly Launcher",
          },
          buttons: [
            {
              label: "👥 Discord",
              url: "https://discord.nexuxnova.it",
            },
            { label: "⏬ Scarico", url: "https://nexuxnova.it" },
          ],
          instance: false,
          timestamps: {
            start: startedAppTime,
          },
        },
      })
      .catch((error) => { });
  });
});

ipcMain.on("new-status-discord-jugando", async (event, status) => {
  if (status.endsWith("-forge")) {
    status = status.replace("-forge", "");
    status = `${status} - Forge`;
  } else if (status.endsWith("-fabric")) {
    status = status.replace("-fabric", "");
    status = `${status} - Fabric`;
  } else {
    status = `${status}`;
  }

  if (client) await client.destroy();
  client = new rpc.Client({ transport: "ipc" });
  client.login({ clientId: "1385601392122527825" });
  client.on("ready", () => {
    client
      .request("SET_ACTIVITY", {
        pid: process.pid,
        activity: {
          details: status,
          assets: {
            large_image: "battly_512",
            small_image: "mc_512",
            small_text: "Minecraft",
            large_text: "Battly Launcher",
          },
          buttons: [
            {
              label: "👥 Discord",
              url: "https://discord.nexuxnova.it",
            },
            { label: "⏬ Scarico", url: "https://nexuxnova.it" },
          ],
          instance: false,
          timestamps: {
            start: startedAppTime,
          },
        },
      })
      .catch((error) => { });
  });
});

ipcMain.on("new-notification", async (event, info) => {
  new Notification({
    title: info.title,
    body: info.body,
    icon: path.join(__dirname, "/assets/images/icon.png"),
  }).show();
});

ipcMain.on("delete-and-new-status-discord", async () => {
  if (client) client.destroy();
  client = new rpc.Client({ transport: "ipc" });
  client.login({ clientId: "1385601392122527825" });
  client.on("ready", () => {
    client
      .request("SET_ACTIVITY", {
        pid: process.pid,
        activity: {
          details: "Nel menu di avvio",
          assets: {
            large_image: "battly_512",
            large_text: "Battly Launcher",
          },
          buttons: [
            {
              label: "👥 Discord",
              url: "https://discord.nexuxnova.it",
            },
            { label: "⏬ Scarico", url: "https://nexuxnova.it" },
          ],
          instance: false,
          timestamps: {
            start: startedAppTime,
          },
        },
      })
      .catch((error) => { });
  });
});

ipcMain.on("delete-status-discord", async () => {
  if (client) client.destroy();
});

autoUpdater.autoDownload = false;

ipcMain.handle("update-app", () => {
  return new Promise(async (resolve, reject) => {
    autoUpdater
      .checkForUpdates()
      .then(() => {
        resolve();
      })
      .catch((error) => {
        console.log(error);
        resolve({
          error: true,
          message: error,
        });
      });
  });
});

const pkgVersion = async () => {
  const pkg = {
    version: "2.0.2",
    buildVersion: 1004
  };
  return pkg;
};

ipcMain.handle("update-new-app", async () => {
  console.log(await pkgVersion());

  return new Promise(async (resolve, reject) => {
    fetch("https://api.battlylauncher.com/launcher/config-launcher/config.json").then(async res => {
      let data = await res.json();
      let version = data.battly.release;

      let actualBuild = (pkgVersion()).buildVersion;

      if (actualBuild != version.latest_build) {
        resolve();
        const updateWindow = UpdateWindow.getWindow();
        if (updateWindow) updateWindow.webContents.send("updateNewAvailable");
      } else {
        reject();
      }
    }).catch((error) => {
      console.log(error);
      resolve({
        error: true,
        message: error,
      });
    });
  });
});

autoUpdater.on("update-available", () => {
  const updateWindow = UpdateWindow.getWindow();
  if (updateWindow) updateWindow.webContents.send("updateAvailable");
});

ipcMain.on("start-update", () => {
  autoUpdater.downloadUpdate();
});

autoUpdater.on("update-not-available", () => {
  const updateWindow = UpdateWindow.getWindow();
  if (updateWindow) updateWindow.webContents.send("update-not-available");
});

autoUpdater.on("update-downloaded", () => {
  autoUpdater.quitAndInstall();
});

autoUpdater.on("download-progress", (progress) => {
  const updateWindow = UpdateWindow.getWindow();
  if (updateWindow)
    updateWindow.webContents.send("download-progress", progress);
});
