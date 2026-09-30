/**
 * VS Code-style Command Palette
 * Ctrl+Shift+P / Cmd+Shift+P
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Icon, type IconName } from './Icon'

export interface CommandItem {
  id: string
  label: string
  category?: string
  icon?: IconName
  shortcut?: string
  action: () => void
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  commands: CommandItem[]
  mode?: 'commands' | 'files'
  files?: { id: string; path: string; name: string }[]
  onOpenFile?: (id: string) => void
  placeholder?: string
}

export function CommandPalette({
  open,
  onClose,
  commands,
  mode = 'commands',
  files = [],
  onOpenFile,
  placeholder,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open, mode])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (mode === 'files') {
      const list = files.map((f) => ({
        id: f.id,
        label: f.path,
        icon: 'file' as IconName,
        action: () => onOpenFile?.(f.id),
      }))
      if (!q) return list.slice(0, 50)
      return list
        .filter((f) => f.label.toLowerCase().includes(q))
        .slice(0, 50)
    }
    if (!q) return commands
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    )
  }, [query, mode, commands, files, onOpenFile])

  useEffect(() => {
    setActive(0)
  }, [query, mode])

  const run = useCallback(
    (item: (typeof filtered)[0]) => {
      onClose()
      // Defer so palette closes first
      requestAnimationFrame(() => item.action())
    },
    [onClose]
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[active]) run(filtered[active])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, filtered, active, run, onClose])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  const ph =
    placeholder ??
    (mode === 'files' ? 'Go to file…' : 'Type a command…')

  return (
    <div className="cmd-palette-overlay" onMouseDown={onClose}>
      <div
        className="cmd-palette"
        role="dialog"
        aria-label={mode === 'files' ? 'Go to file' : 'Command palette'}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="cmd-palette-input-row">
          <Icon name={mode === 'files' ? 'goToFile' : 'commandPalette'} size={16} />
          <input
            ref={inputRef}
            className="cmd-palette-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={ph}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="cmd-palette-list" ref={listRef} role="listbox">
          {filtered.length === 0 ? (
            <div className="cmd-palette-empty">No results</div>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.id + i}
                type="button"
                role="option"
                data-idx={i}
                aria-selected={i === active}
                className={`cmd-palette-item ${i === active ? 'active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(item)}
              >
                {item.icon && <Icon name={item.icon} size={14} />}
                <span className="cmd-palette-label">
                  {'category' in item && item.category && (
                    <span className="cmd-palette-cat">{item.category} · </span>
                  )}
                  {item.label}
                </span>
                {'shortcut' in item && item.shortcut && (
                  <span className="cmd-palette-shortcut">{item.shortcut}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
