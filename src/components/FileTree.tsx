import { useMemo, useState } from 'react'
import type { ProjectFile } from '../types/project'

interface FileTreeProps {
  files: ProjectFile[]
  activeFileId: string | null
  collapsed: Set<string>
  onOpen: (file: ProjectFile) => void
  onToggle: (id: string) => void
  onNewFile: (parentId: string | null) => void
  onNewFolder: (parentId: string | null) => void
  onRename: (file: ProjectFile) => void
  onDelete: (file: ProjectFile) => void
}

function extIcon(name: string, kind: 'file' | 'folder') {
  if (kind === 'folder') return '▸'
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'html' || ext === 'htm') return '<>'
  if (ext === 'css') return '#'
  if (ext === 'js' || ext === 'mjs') return 'JS'
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext || '')) return '▢'
  return '·'
}

export function FileTree({
  files,
  activeFileId,
  collapsed,
  onOpen,
  onToggle,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
}: FileTreeProps) {
  const [menuId, setMenuId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, ProjectFile[]>()
    for (const f of files) {
      const key = f.parentId
      const list = map.get(key) ?? []
      list.push(f)
      map.set(key, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
    }
    return map
  }, [files])

  const renderNode = (node: ProjectFile, depth: number) => {
    const kids = childrenOf.get(node.id) ?? []
    const isFolder = node.kind === 'folder'
    const isOpen = isFolder && !collapsed.has(node.id)
    const active = node.id === activeFileId

    return (
      <li key={node.id}>
        <div
          className={`tree-row ${active ? 'active' : ''}`}
          style={{ paddingLeft: 8 + depth * 14 }}
          onClick={() => {
            if (isFolder) onToggle(node.id)
            else onOpen(node)
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            setMenuId(node.id)
          }}
        >
          <span className="tree-icon" aria-hidden>
            {isFolder ? (isOpen ? '▾' : '▸') : extIcon(node.name, 'file')}
          </span>
          <span className="tree-name" title={node.path}>
            {node.name}
          </span>
          <button
            type="button"
            className="tree-more"
            aria-label={`Actions for ${node.name}`}
            onClick={(e) => {
              e.stopPropagation()
              setMenuId(menuId === node.id ? null : node.id)
            }}
          >
            •••
          </button>
          {menuId === node.id && (
            <div className="project-menu tree-menu" role="menu">
              {isFolder && (
                <>
                  <button
                    type="button"
                    className="project-menu-item"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuId(null)
                      onNewFile(node.id)
                    }}
                  >
                    New file
                  </button>
                  <button
                    type="button"
                    className="project-menu-item"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuId(null)
                      onNewFolder(node.id)
                    }}
                  >
                    New folder
                  </button>
                </>
              )}
              <button
                type="button"
                className="project-menu-item"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuId(null)
                  onRename(node)
                }}
              >
                Rename
              </button>
              <div className="project-menu-sep" />
              <button
                type="button"
                className="project-menu-item project-menu-danger"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuId(null)
                  onDelete(node)
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
        {isFolder && isOpen && kids.length > 0 && (
          <ul className="tree-children">
            {kids.map((k) => renderNode(k, depth + 1))}
          </ul>
        )}
      </li>
    )
  }

  const roots = childrenOf.get(null) ?? []

  return (
    <aside className="files-panel" aria-label="Project files">
      <div className="files-header">
        <span className="files-title">Files</span>
        <div className="files-add-wrap">
          <button
            type="button"
            className="files-add"
            aria-label="Add file or folder"
            onClick={() => setAddOpen((v) => !v)}
          >
            +
          </button>
          {addOpen && (
            <div className="project-menu files-add-menu" role="menu">
              <button
                type="button"
                className="project-menu-item"
                onClick={() => {
                  setAddOpen(false)
                  onNewFile(null)
                }}
              >
                New file
              </button>
              <button
                type="button"
                className="project-menu-item"
                onClick={() => {
                  setAddOpen(false)
                  onNewFolder(null)
                }}
              >
                New folder
              </button>
            </div>
          )}
        </div>
      </div>
      <ul className="file-tree">
        {roots.length === 0 ? (
          <li className="tree-empty">No files yet</li>
        ) : (
          roots.map((n) => renderNode(n, 0))
        )}
      </ul>
    </aside>
  )
}

