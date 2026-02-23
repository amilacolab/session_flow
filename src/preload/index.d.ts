import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      // Window Controls (The new ones we just added)
      minimize: () => void
      maximize: () => void
      close: () => void

      // Widget Logic
      setIgnoreMouseEvents: (ignore: boolean) => void
      sendTimerUpdate: (data: any) => void
      onTimerUpdate: (callback: (data: any) => void) => void
      sendWidgetCommand: (command: string) => void
      onWidgetCommand: (callback: (command: string) => void) => void
    }
  }
}