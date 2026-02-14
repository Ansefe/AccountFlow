import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/icon.png?asset'
import { loginToRiotClient, killRiotClient } from './riot-client'

// Asegura rutas escribibles para cache/storage (evita errores de "Acceso denegado" en Windows).
const userDataDir = join(app.getPath('appData'), 'AccountFlow')
app.setPath('userData', userDataDir)
app.commandLine.appendSwitch('disk-cache-dir', join(userDataDir, 'Cache'))

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    backgroundColor: '#0A0A0F',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.accountflow')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Shell IPC handlers
  ipcMain.on('shell:openExternal', (_, url: string) => {
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      shell.openExternal(url)
    }
  })

  // Window control IPC handlers
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window:close', () => mainWindow?.close())
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized())

  // ── Riot Client IPC handlers ──
  ipcMain.handle(
    'riot:login',
    async (
      _,
      args: {
        rentalId: string
        supabaseUrl: string
        anonKey: string
        accessToken: string
        riotClientPath: string
      }
    ) => {
      return loginToRiotClient({
        ...args,
        onProgress: (message: string) => {
          mainWindow?.webContents.send('riot:login-progress', message)
        }
      })
    }
  )

  ipcMain.handle('riot:kill', async () => {
    return killRiotClient()
  })

  // ── File dialog IPC handler ──
  ipcMain.handle('dialog:openFile', async (_, options: Electron.OpenDialogOptions) => {
    if (!mainWindow) return { canceled: true, filePaths: [] }
    return dialog.showOpenDialog(mainWindow, options)
  })

  createWindow()

  // ── Auto-updater ──
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('updater:status', {
      status: 'downloading',
      version: info.version
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('updater:status', {
      status: 'ready',
      version: info.version
    })
  })

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err.message)
  })

  // Check for updates after window is ready (only in production)
  if (!is.dev) {
    setTimeout(() => autoUpdater.checkForUpdates(), 3000)
    // Re-check every 30 minutes (catches urgent hotfixes quickly)
    setInterval(() => autoUpdater.checkForUpdates(), 30 * 60 * 1000)
  }

  // IPC: renderer can request update install
  ipcMain.on('updater:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  // IPC: renderer can manually trigger update check
  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { updateAvailable: !!result?.updateInfo, version: result?.updateInfo?.version }
    } catch (err: unknown) {
      return { updateAvailable: false, error: (err as Error).message }
    }
  })

  mainWindow?.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized-change', true)
  })
  mainWindow?.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized-change', false)
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Kill Riot Client when the app is closing (ensures game stops if app is closed)
app.on('before-quit', async (event) => {
  event.preventDefault()
  try {
    await killRiotClient()
  } catch {
    // best-effort — don't block quit
  }
  // Remove listener to prevent infinite loop, then quit
  app.removeAllListeners('before-quit')
  app.quit()
})
