import { ElectronAPI } from '@electron-toolkit/preload'

interface WindowAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximizedChange: (callback: (maximized: boolean) => void) => void
}

interface ShellAPI {
  openExternal: (url: string) => void
}

interface RiotAPI {
  login: (args: {
    rentalId: string
    supabaseUrl: string
    anonKey: string
    accessToken: string
    riotClientPath: string
  }) => Promise<{ success: boolean; error?: string }>
  onLoginProgress: (callback: (message: string) => void) => () => void
  kill: () => Promise<{ success: boolean; error?: string }>
}

interface DialogAPI {
  openFile: (options: {
    title?: string
    filters?: { name: string; extensions: string[] }[]
  }) => Promise<{ canceled: boolean; filePaths: string[] }>
}

interface UpdaterAPI {
  onStatus: (callback: (data: { status: string; version: string }) => void) => () => void
  install: () => void
  check: () => Promise<{ updateAvailable: boolean; version?: string; error?: string }>
}

interface API {
  window: WindowAPI
  shell: ShellAPI
  riot: RiotAPI
  dialog: DialogAPI
  updater: UpdaterAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
