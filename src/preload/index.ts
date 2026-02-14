import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  window: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    maximize: (): void => ipcRenderer.send('window:maximize'),
    close: (): void => ipcRenderer.send('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    onMaximizedChange: (callback: (maximized: boolean) => void): void => {
      ipcRenderer.on('window:maximized-change', (_, maximized) => callback(maximized))
    }
  },
  shell: {
    openExternal: (url: string): void => ipcRenderer.send('shell:openExternal', url)
  },
  riot: {
    login: (args: {
      rentalId: string
      supabaseUrl: string
      anonKey: string
      accessToken: string
      riotClientPath: string
    }): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('riot:login', args),
    onLoginProgress: (callback: (message: string) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, message: string): void => callback(message)
      ipcRenderer.on('riot:login-progress', listener)
      return (): void => {
        ipcRenderer.removeListener('riot:login-progress', listener)
      }
    },
    kill: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('riot:kill')
  },
  dialog: {
    openFile: (
      options: { title?: string; filters?: { name: string; extensions: string[] }[] }
    ): Promise<{ canceled: boolean; filePaths: string[] }> =>
      ipcRenderer.invoke('dialog:openFile', options)
  },
  updater: {
    onStatus: (callback: (data: { status: string; version: string }) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { status: string; version: string }): void => callback(data)
      ipcRenderer.on('updater:status', listener)
      return (): void => {
        ipcRenderer.removeListener('updater:status', listener)
      }
    },
    install: (): void => ipcRenderer.send('updater:install'),
    check: (): Promise<{ updateAvailable: boolean; version?: string; error?: string }> =>
      ipcRenderer.invoke('updater:check')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
