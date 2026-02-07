import { ElectronAPI } from '@electron-toolkit/preload'

interface WindowAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximizedChange: (callback: (maximized: boolean) => void) => void
}

interface API {
  window: WindowAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
