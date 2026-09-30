/**
 * Local UI settings. Future: sync via VEXDYN Core.
 */

export type EditorFontSize = 'sm' | 'md' | 'lg'
export type TabSize = 2 | 4

export interface ForgeSettings {
  editorFontSize: EditorFontSize
  tabSize: TabSize
  reduceMotion: boolean
  /** Minimap — off by default for performance */
  minimap: boolean
  /** Emmet Tab expansion in HTML */
  emmet: boolean
  /** Word wrap */
  wordWrap: boolean
}

const KEY = 'vexdyn-forge-settings-v1'

const DEFAULTS: ForgeSettings = {
  editorFontSize: 'md',
  tabSize: 2,
  reduceMotion: false,
  minimap: false,
  emmet: true,
  wordWrap: false,
}

export function loadSettings(): ForgeSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ForgeSettings>) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(next: ForgeSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}
