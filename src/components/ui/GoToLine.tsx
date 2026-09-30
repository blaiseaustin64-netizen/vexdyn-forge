/**
 * Go to Line dialog — Ctrl+G
 * Accepts "42" or "42:15"
 */

import { useState, useEffect, useRef } from 'react'
import { Icon } from './Icon'

interface GoToLineProps {
  open: boolean
  onClose: () => void
  onGo: (line: number, column?: number) => void
  maxLine?: number
}

export function GoToLine({ open, onClose, onGo, maxLine }: GoToLineProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setValue('')
      setError(null)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const submit = () => {
    const raw = value.trim()
    if (!raw) {
      setError('Enter a line number')
      return
    }
    const match = raw.match(/^(\d+)(?::(\d+))?$/)
    if (!match) {
      setError('Use line or line:column')
      return
    }
    const line = parseInt(match[1], 10)
    const col = match[2] ? parseInt(match[2], 10) : undefined
    if (line < 1) {
      setError('Line must be ≥ 1')
      return
    }
    if (maxLine && line > maxLine) {
      setError(`Max line is ${maxLine}`)
      return
    }
    onGo(line, col)
    onClose()
  }

  return (
    <div className="cmd-palette-overlay" onMouseDown={onClose}>
      <div
        className="goto-line-dialog"
        role="dialog"
        aria-label="Go to line"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="goto-line-row">
          <Icon name="goToLine" size={16} />
          <input
            ref={inputRef}
            className="cmd-palette-input"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
            placeholder="Line number (:column)"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {error && <p className="goto-line-error">{error}</p>}
        <p className="goto-line-hint">Enter a line number, or line:column</p>
      </div>
    </div>
  )
}
