import { useEffect, useRef, ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    previousFocus.current = document.activeElement as HTMLElement | null

    // Prefer the filename/text field — never the header close button first
    const focusInput = () => {
      const root = panelRef.current
      if (!root) return
      const field = root.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([type="button"]):not([type="submit"]), textarea, select'
      )
      if (field) {
        field.focus()
        if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
          const len = field.value.length
          try {
            field.setSelectionRange(len, len)
          } catch {
            /* some input types reject selection */
          }
        }
        return
      }
      root.focus()
    }

    // Blur any CodeMirror surface so it cannot eat keystrokes
    const active = document.activeElement as HTMLElement | null
    if (active?.closest('.cm-editor') || active?.closest('.cm-content')) {
      active.blur()
    }

    // Double rAF: wait for children (Input autoFocus) to mount
    requestAnimationFrame(() => {
      requestAnimationFrame(focusInput)
    })

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      const activeEl = document.activeElement as HTMLElement | null
      const editorTookFocus =
        activeEl &&
        (activeEl.closest('.cm-editor') ||
          activeEl.closest('.cm-content') ||
          activeEl.classList?.contains('cm-content'))
      if (editorTookFocus) return
      const restored = previousFocus.current
      if (
        restored &&
        typeof restored.focus === 'function' &&
        document.contains(restored)
      ) {
        try {
          restored.focus()
        } catch {
          /* ignore */
        }
      }
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onMouseDown={(e) => {
        // Keep focus inside modal when clicking the overlay chrome
        if (e.target === e.currentTarget) {
          e.preventDefault()
          onClose()
        }
      }}
    >
      <div
        className="modal"
        ref={panelRef}
        tabIndex={-1}
        onMouseDown={(e) => {
          // Clicking non-interactive modal chrome should not blur the input
          const t = e.target as HTMLElement
          if (t.closest('input, textarea, select, button, a')) return
          e.preventDefault()
        }}
      >
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            {title}
          </h2>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close dialog"
            type="button"
            style={{ padding: '0 8px', minWidth: 32 }}
          >
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
