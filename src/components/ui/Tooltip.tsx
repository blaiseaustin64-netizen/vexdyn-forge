/**
 * Subtle professional tooltip
 */

import { useState, useRef, useEffect, type ReactNode } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  shortcut?: string
}

export function Tooltip({
  content,
  children,
  side = 'bottom',
  delay = 400,
  shortcut,
}: TooltipProps) {
  const [open, setOpen] = useState(false)
  const timer = useRef<number | null>(null)
  const ref = useRef<HTMLSpanElement>(null)

  const show = () => {
    timer.current = window.setTimeout(() => setOpen(true), delay)
  }
  const hide = () => {
    if (timer.current) window.clearTimeout(timer.current)
    setOpen(false)
  }

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  if (!content) return <>{children}</>

  return (
    <span
      className="tooltip-wrap"
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open && (
        <span className={`tooltip tooltip-${side}`} role="tooltip">
          {content}
          {shortcut && <span className="tooltip-shortcut">{shortcut}</span>}
        </span>
      )}
    </span>
  )
}
