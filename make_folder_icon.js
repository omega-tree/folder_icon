// make_folder_icon.js
// Node.js script to install/uninstall custom folder icons on Windows
// Requires ImageMagick's 'convert' command in PATH for image conversion

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function usage() {
  console.error('Usage: node make_folder_icon.js install <folder_path> [<image_path>]');
  console.error('   or: node make_folder_icon.js uninstall <folder_path>');
  process.exit(1);
}

function getShortPathName(winPath) {
  // Use PowerShell to get the short path name
  try {
    const cmd = `powershell -Command "(Get-Item \"${winPath}\").ShortName"`;
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
    console.error(`Error: Folder '${folderPath}' does not exist.`);
    process.exit(1);
  }

  if (!imagePath) {
    // Look for folder.png, folder.jpg, folder.ico
    const files = fs.readdirSync(folderPath);
    const found = files.find(f => /^folder\.(png|jpe?g|ico)$/i.test(f));
    if (found) {
      imagePath = path.join(folderPath, found);
      console.log(`Found image '${imagePath}' in the folder.`);
    } else {
      console.error(`Error: No 'folder.png', 'folder.jpg', or 'folder.ico' found in '${folderPath}'.`);
      process.exit(1);
    }
  }
  imagePath = path.resolve(imagePath);
  if (!fs.existsSync(imagePath)) {
    console.error(`Error: Image file '${imagePath}' does not exist.`);
    process.exit(1);
  }

  let icoPath = imagePath;
  if (path.extname(imagePath).toLowerCase() !== '.ico') {
    // Convert to .ico using ImageMagick
    icoPath = path.join(path.dirname(imagePath), path.basename(imagePath, path.extname(imagePath)) + '.ico');
    const cmd = `magick "${imagePath}" -define icon:auto-resize=256,64,48,32,16 "${icoPath}"`;
    console.log('Node.js process PATH:', process.env.PATH);
    try {
      console.log('Converting image to .ico using ImageMagick...');
      execSync(cmd, { stdio: 'inherit' });
      console.log(`Conversion successful. New ICO file at '${icoPath}'.`);
    } catch (err) {
      console.error('Error: ImageMagick "magick" failed. Make sure it\'s in your PATH.');
      if (err.stderr) {
        console.error('STDERR:', err.stderr.toString());
      }
      if (err.stdout) {
        console.error('STDOUT:', err.stdout.toString());
      }
      console.error('Full error:', err);
      process.exit(1);
    }
  } else {
    console.log('Image is already an ICO file. Skipping conversion.');
  }

  // Get short path for desktop.ini
  const shortIcoPath = getShortPathName(icoPath);
  const desktopIniPath = path.join(folderPath, 'desktop.ini');
  const iniContent = `[.ShellClassInfo]\nIconResource=${shortIcoPath},0\nInfoTip=Custom folder icon\n`;
  fs.writeFileSync(desktopIniPath, iniContent);

  // Set file and folder attributes
  execSync(`attrib +h +s "${desktopIniPath}"`);
  execSync(`attrib +r "${folderPath}"`);

  console.log(`Success! Custom icon installed for '${folderPath}'.`);
  console.log('You may need to press F5 in Explorer to refresh.');
}

function uninstallIcon(folderPath) {
  folderPath = path.resolve(folderPath);
  if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    console.error(`Error: Folder '${folderPath}' does not exist.`);
    process.exit(1);
  }
  const desktopIniPath = path.join(folderPath, 'desktop.ini');
  if (fs.existsSync(desktopIniPath)) {
    console.log(`Removing '${desktopIniPath}'...`);
    execSync(`attrib -s -h "${desktopIniPath}"`);
    fs.unlinkSync(desktopIniPath);
    console.log('File removed successfully.');
  } else {
    console.log(`No 'desktop.ini' found in '${folderPath}'. Nothing to uninstall.`);
  }
  console.log(`Removing read-only attribute from '${folderPath}'...`);
  execSync(`attrib -r "${folderPath}"`);
  console.log('Read-only attribute removed.');
  console.log('Uninstallation complete. Folder icon will revert to default.');
  console.log('You may need to press F5 in Explorer to refresh.');
}

// Main
const [,, command, folderPath, imagePath] = process.argv;
if (!command) usage();
if (command === 'install') {
  if (!folderPath) usage();
  installIcon(folderPath, imagePath);
} else if (command === 'uninstall') {
  if (!folderPath) usage();
  uninstallIcon(folderPath);
} else {
  usage();
}
