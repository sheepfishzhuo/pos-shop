import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../dist-electron/preload.js'),
      webSecurity: true,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#001529',
    show: false,
    autoHideMenuBar: true,
  })

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: https: blob:",
            "font-src 'self' data: https://fonts.gstatic.com",
            "connect-src 'self' ws://localhost:5173 http://localhost:3000",
          ].join('; '),
        },
      })
    })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: https:",
            "font-src 'self' data: https://fonts.gstatic.com",
            "connect-src 'self' http://localhost:3000",
          ].join('; '),
        },
      })
    })
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.maximize()
  })

  mainWindow.on('unmaximize', () => {
    mainWindow?.maximize()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'png', 'gif'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  return result.filePaths
})

ipcMain.handle('dialog:print', async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    try {
      await win.webContents.print(options)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
  return { success: false, error: 'Window not found' }
})
