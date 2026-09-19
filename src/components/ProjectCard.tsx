import { useState, useRef, useEffect } from 'react'
import type { Project } from '../types/project'
import { PROJECT_TYPE_LABEL } from '../types/project'
import { formatRelativeTime, starterLabel } from '../lib/projectStore'

interface ProjectCardProps {
  project: Project
  onOpen: (project: Project) => void
  onRename: (project: Project) => void
  onDuplicate: (project: Project) => void
  onDelete: (project: Project) => void
}

export function ProjectCard({
  project,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
}: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onPointer = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <article
      className="project-card"
      onClick={() => onOpen(project)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(project)
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Open project ${project.name}`}
    >
      <div className="project-card-main">
        <div className="project-card-icon" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect
              x="2"
              y="3"
              width="14"
              height="12"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path d="M2 7h14" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </div>
        <div className="project-card-body">
          <h3 className="project-card-name">{project.name}</h3>
          <p className="project-card-meta">
            <span className="mono">{PROJECT_TYPE_LABEL[project.type]}</span>
            <span className="dot" aria-hidden>
              ·
            </span>
            <span>{starterLabel(project.starter)}</span>
          </p>
          <p className="project-card-time">{formatRelativeTime(project.updatedAt)}</p>
        </div>
      </div>

      <div className="project-card-actions" onClick={(e) => e.stopPropagation()}>
        <span className="project-card-arrow" aria-hidden>
          →
        </span>
        <button
          ref={triggerRef}
          type="button"
          className="project-menu-trigger"
          aria-label={`Actions for ${project.name}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          •••
        </button>
        {menuOpen && (
          <div
            className="project-menu"
            ref={menuRef}
            role="menu"
            aria-label={`Project actions for ${project.name}`}
          >
            <button
              type="button"
              role="menuitem"
              className="project-menu-item"
              onClick={() => {
                setMenuOpen(false)
                onOpen(project)
              }}
            >
              Open
            </button>
            <button
              type="button"
              role="menuitem"
              className="project-menu-item"
              onClick={() => {
                setMenuOpen(false)
                onRename(project)
              }}
            >
              Rename
            </button>
            <button
              type="button"
              role="menuitem"
              className="project-menu-item"
              onClick={() => {
                setMenuOpen(false)
                onDuplicate(project)
              }}
            >
              Duplicate
            </button>
            <div className="project-menu-sep" role="separator" />
            <button
              type="button"
              role="menuitem"
              className="project-menu-item project-menu-danger"
              onClick={() => {
                setMenuOpen(false)
                onDelete(project)
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
