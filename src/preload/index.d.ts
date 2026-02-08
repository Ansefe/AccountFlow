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

interface API {
  window: WindowAPI
  shell: ShellAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
