const { app, BrowserWindow, Menu, ipcMain, session, powerMonitor, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

app.setName('Sisyphus Clicker');
// Stable across installer, portable builds and development launches.
const userData = process.env.SISYPHUS_TEST_DATA || path.join(app.getPath('appData'), 'Sisyphus Clicker');
fs.mkdirSync(userData, { recursive: true });
app.setPath('userData', userData);
app.setPath('sessionData', userData);
const lock = app.requestSingleInstanceLock();
let win;
if (!lock) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    app.setAppUserModelId('com.archer266.sisyphus-clicker');
    Menu.setApplicationMenu(null);
    // A packaged game never needs remote resources; block them even if offline.
    session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']}, (_, callback) => callback({cancel:true}));
    win = new BrowserWindow({
      width: 1280, height: 800, minWidth: 800, minHeight: 620,
      title: 'Sisyphus Clicker', backgroundColor: '#101719', show: false,
      icon: path.join(__dirname, '../build/icon.ico'),
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true }
    });
    win.webContents.setWindowOpenHandler(() => ({action:'deny'}));
    win.webContents.on('will-navigate', event => event.preventDefault());
    win.on('blur', () => win.webContents.send('desktop-pause'));
    win.on('minimize', () => win.webContents.send('desktop-pause'));
    const suspend = () => { if (win && !win.isDestroyed()) win.webContents.send('desktop-pause'); };
    powerMonitor.on('suspend', suspend); powerMonitor.on('resume', suspend);
    win.once('ready-to-show', () => win.show());
    win.on('closed', () => { win = null; });
    ipcMain.handle('toggle-fullscreen', event => {
      if (win && event.sender === win.webContents) win.setFullScreen(!win.isFullScreen());
    });
    ipcMain.handle('export-save', async (event, json) => {
      if (!win || event.sender !== win.webContents || typeof json !== 'string' || json.length > 100000) return false;
      const data = JSON.parse(json);
      if (!/^\d+$/.test(String(data.totalPushes)) || !/^\d+$/.test(String(data.completedClimbs)) || !Number.isFinite(data.climbPushes)) return false;
      const choice = await dialog.showSaveDialog(win, {title:'Export Sisyphus save',defaultPath:'sisyphus-save.json',filters:[{name:'Game save',extensions:['json']}]});
      if (choice.canceled) return false;
      await fs.promises.writeFile(choice.filePath, json, 'utf8');
      return true;
    });
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  });
  app.on('window-all-closed', () => app.quit());
}
