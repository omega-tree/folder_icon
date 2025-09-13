// main.js
// process.env.PATH = 'C:\WINDOWS\system32\;' + process.env.PATH;

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

function getShortPathName(winPath) {
  try {
    const cmd = `powershell -Command \"(Get-Item \"${winPath}\").ShortName\"`;
    const shortName = execSync(cmd, { encoding: 'utf8' }).trim();
    if (shortName && shortName !== winPath) {
      return path.join(path.dirname(winPath), shortName);
    }
  } catch {}
  return winPath;
}

function installIcon(folderPath, imagePath) {
  folderPath = path.resolve(folderPath);
  if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    throw new Error(`Folder '${folderPath}' does not exist.`);
  }
  if (!imagePath) {
    const files = fs.readdirSync(folderPath);
    const found = files.find(f => /^folder\.(png|jpe?g|ico)$/i.test(f));
    if (found) {
      imagePath = path.join(folderPath, found);
    } else {
      throw new Error(`No 'folder.png', 'folder.jpg', or 'folder.ico' found in '${folderPath}'.`);
    }
  }
  imagePath = path.resolve(imagePath);
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file '${imagePath}' does not exist.`);
  }
  let icoPath = imagePath;
  let targetIcoPath = path.join(folderPath, 'folder.ico');
  if (path.extname(imagePath).toLowerCase() !== '.ico') {
    icoPath = path.join(path.dirname(imagePath), path.basename(imagePath, path.extname(imagePath)) + '.ico');
    const cmd = `magick \"${imagePath}\" -define icon:auto-resize=256,64,48,32,16 \"${icoPath}\"`;
    try {
      execSync(cmd, { stdio: 'ignore' });
    } catch {
      throw new Error('ImageMagick "convert" failed. Make sure it\'s in your PATH.');
    }
    // Copy the generated .ico to the folder as 'folder.ico'
    fs.copyFileSync(icoPath, targetIcoPath);
    icoPath = targetIcoPath;
  } else {
    // If already .ico, copy to folder as 'folder.ico' if not already there
    if (imagePath !== targetIcoPath) {
      fs.copyFileSync(imagePath, targetIcoPath);
    }
    icoPath = targetIcoPath;
  }
  const shortIcoPath = getShortPathName(icoPath);
  const desktopIniPath = path.join(folderPath, 'desktop.ini');
  const iniContent = `[.ShellClassInfo]\nIconResource=${shortIcoPath},0\nInfoTip=Custom folder icon\n`;
  fs.writeFileSync(desktopIniPath, iniContent);
  execSync(`attrib +h +s \"${desktopIniPath}\"`);
  execSync(`attrib +r \"${folderPath}\"`);
}

function installIconRecursive(folderPath, imagePath) {
  installIcon(folderPath, imagePath);
  const subfolders = fs.readdirSync(folderPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(folderPath, dirent.name));
  for (const sub of subfolders) {
    installIconRecursive(sub, imagePath);
  }
}

function uninstallIconRecursive(folderPath) {
  uninstallIcon(folderPath);
  const subfolders = fs.readdirSync(folderPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(folderPath, dirent.name));
  for (const sub of subfolders) {
    uninstallIconRecursive(sub);
  }
}

function uninstallIcon(folderPath) {
  folderPath = path.resolve(folderPath);
  if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    throw new Error(`Folder '${folderPath}' does not exist.`);
  }
  const desktopIniPath = path.join(folderPath, 'desktop.ini');
  if (fs.existsSync(desktopIniPath)) {
    execSync(`attrib -s -h \"${desktopIniPath}\"`);
    fs.unlinkSync(desktopIniPath);
  }
  execSync(`attrib -r \"${folderPath}\"`);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 500,
    height: 400,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('install-icon', async (event, folderPath, imagePath, recursive) => {
  try {
    if (recursive) {
      installIconRecursive(folderPath, imagePath);
    } else {
      installIcon(folderPath, imagePath);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
ipcMain.handle('uninstall-icon', async (event, folderPath, recursive) => {
  try {
    if (recursive) {
      uninstallIconRecursive(folderPath);
    } else {
      uninstallIcon(folderPath);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (result.canceled) return null;
  return result.filePaths[0];
});
ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [
    { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'ico'] }
  ] });
  if (result.canceled) return null;
  return result.filePaths[0];
});
