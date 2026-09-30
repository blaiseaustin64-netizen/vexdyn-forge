/**
 * Professional context menu
 */

import React, { useEffect, useRef } from 'react'
import { Icon, type IconName } from './Icon'

export interface ContextMenuItem {
  id: string
  label: string
  icon?: IconName
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  separator?: boolean
  onClick?: () => void
}

interface ContextMenuProps {
  open: boolean
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export function ContextMenu({ open, x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [open, onClose])

  if (!open) return null

  const style: React.CSSProperties = {
    left: Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 220 : x),
    top: Math.min(y, typeof window !== 'undefined' ? window.innerHeight - items.length * 32 - 16 : y),
  }

  return (
    <div className="context-menu" ref={ref} style={style} role="menu">
      {items.map((item) => {
        if (item.separator) {
          return <div key={item.id} className="context-menu-sep" role="separator" />
        }
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            className={`context-menu-item ${item.danger ? 'danger' : ''}`}
            disabled={item.disabled}
            onClick={() => {
              if (!item.disabled) {
                item.onClick?.()
                onClose()
              }
            }}
          >
            {item.icon && <Icon name={item.icon} size={14} />}
            <span className="context-menu-label">{item.label}</span>
            {item.shortcut && (
              <span className="context-menu-shortcut">{item.shortcut}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function useContextMenu() {
  const [state, setState] = React.useState<{
    open: boolean
    x: number
    y: number
  }>({ open: false, x: 0, y: 0 })

  const openAt = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setState({ open: true, x: e.clientX, y: e.clientY })
  }

  const close = () => setState((s) => ({ ...s, open: false }))

  return { ...state, openAt, close }
}
