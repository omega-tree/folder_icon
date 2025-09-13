# Folder Icon App

This App allows you to set replace Windows folder images with icons.
The application is relocatable. meaining move it from one machine to another the image to icon replacements will remain.

## Features
- Set a custom icon for any folder (recursively or single folder)
- Remove custom icons and restore default folder appearance
- Supports PNG, JPG, JPEG, and ICO images
- Automatically converts images to .ico using ImageMagick
- Simple, native Windows UI

## Requirements
- **Windows** (tested on Windows 10/11)
- [Node.js](https://nodejs.org/) (for development/build)
- [ImageMagick](https://imagemagick.org/) installed and `magick` available in your PATH
- (For packaging) [electron-packager](https://github.com/electron/electron-packager) or [electron-builder](https://www.electron.build/)

## Getting Started

### 1. Install dependencies
```
npm install
```

### 2. Install ImageMagick
- Download and install from https://imagemagick.org/
- Ensure `magick.exe` is in your system PATH (test by running `magick -version` in a terminal)

### 3. Run the app in development
```
npm start
```

### 4. Build a standalone app (Windows)
- With electron-packager:
  ```
  npm run package
  ```
- With electron-builder:
  ```
  npm run build
  ```

## Usage
1. Launch the app.
2. Click to select a folder.
3. Click to select an image (PNG, JPG, ICO).
4. Click "Install Icon" to set the folder icon.
5. To remove, click "Uninstall Icon".
6. Use the recursive option to apply/remove icons to all subfolders.

## How it works
- Converts your image to `folder.ico` in the selected folder (if not already .ico)
- Writes a `desktop.ini` file referencing the icon
- Sets folder/file attributes for Windows Explorer
- Uninstall removes `desktop.ini` and resets attributes

## App Icon
- The app window and packaged executable use `icon.ico` in the project directory as their icon. Replace this file to customize.

## Troubleshooting
- If you get an error about ImageMagick, ensure `magick.exe` is in your PATH and accessible from a terminal.
- You may need to press F5 in Explorer to refresh folder icons after changes.

## License
MIT
