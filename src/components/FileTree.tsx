import { useMemo, useState, useCallback } from 'react'
import type { ProjectFile } from '../types/project'
import { Icon, FileTypeIcon } from './ui/Icon'
import { IconButton } from './ui/IconButton'
import { ContextMenu, type ContextMenuItem } from './ui/ContextMenu'
import { Tooltip } from './ui/Tooltip'

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
  onDuplicate?: (file: ProjectFile) => void
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
  onDuplicate,
}: FileTreeProps) {
  const [ctx, setCtx] = useState<{
    open: boolean
    x: number
    y: number
    target: ProjectFile | null
    root: boolean
  }>({ open: false, x: 0, y: 0, target: null, root: false })

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

  const openCtx = useCallback(
    (e: React.MouseEvent, target: ProjectFile | null, root = false) => {
      e.preventDefault()
      e.stopPropagation()
      setCtx({ open: true, x: e.clientX, y: e.clientY, target, root })
    },
    []
  )

  const closeCtx = useCallback(() => {
    setCtx((s) => ({ ...s, open: false }))
  }, [])

  const copyPath = (path: string) => {
    void navigator.clipboard?.writeText(path)
  }

  const menuItems: ContextMenuItem[] = useMemo(() => {
    if (ctx.root || !ctx.target) {
      return [
        {
          id: 'new-file',
          label: 'New File',
          icon: 'newFile',
          onClick: () => onNewFile(null),
        },
        {
          id: 'new-folder',
          label: 'New Folder',
          icon: 'newFolder',
          onClick: () => onNewFolder(null),
        },
      ]
    }
    const t = ctx.target
    if (t.kind === 'folder') {
      return [
        {
          id: 'new-file',
          label: 'New File',
          icon: 'newFile',
          onClick: () => onNewFile(t.id),
        },
        {
          id: 'new-folder',
          label: 'New Folder',
          icon: 'newFolder',
          onClick: () => onNewFolder(t.id),
        },
        { id: 'sep1', label: '', separator: true },
        {
          id: 'rename',
          label: 'Rename',
          icon: 'rename',
          onClick: () => onRename(t),
        },
        {
          id: 'copy-path',
          label: 'Copy Path',
          icon: 'copy',
          onClick: () => copyPath(t.path),
        },
        { id: 'sep2', label: '', separator: true },
        {
          id: 'delete',
          label: 'Delete',
          icon: 'delete',
          danger: true,
          onClick: () => onDelete(t),
        },
      ]
    }
    return [
      {
        id: 'open',
        label: 'Open',
        icon: 'file',
        onClick: () => onOpen(t),
      },
      {
        id: 'rename',
        label: 'Rename',
        icon: 'rename',
        onClick: () => onRename(t),
      },
      {
        id: 'duplicate',
        label: 'Duplicate',
        icon: 'duplicate',
        onClick: () => onDuplicate?.(t),
      },
      {
        id: 'copy-path',
        label: 'Copy Path',
        icon: 'copy',
        onClick: () => copyPath(t.path),
      },
      { id: 'sep1', label: '', separator: true },
      {
        id: 'delete',
        label: 'Delete',
        icon: 'delete',
        danger: true,
        onClick: () => onDelete(t),
      },
    ]
  }, [ctx, onNewFile, onNewFolder, onRename, onDelete, onDuplicate, onOpen])

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
          onContextMenu={(e) => openCtx(e, node)}
          onDoubleClick={() => {
            if (!isFolder) onOpen(node)
          }}
        >
          <span className="tree-icon" aria-hidden>
            {isFolder ? (
              <Icon
                name={isOpen ? 'chevronDown' : 'chevronRight'}
                size={14}
                className="tree-chevron"
              />
            ) : (
              <FileTypeIcon name={node.name} size={14} />
            )}
          </span>
          {isFolder && (
            <span className="tree-folder-icon" aria-hidden>
              <Icon name={isOpen ? 'folderOpen' : 'folder'} size={14} />
            </span>
          )}
          <span className="tree-name" title={node.path}>
            {node.name}
          </span>
          <button
            type="button"
            className="tree-more"
            aria-label={`Actions for ${node.name}`}
            onClick={(e) => openCtx(e, node)}
          >
            <Icon name="more" size={14} />
          </button>
        </div>
        {isFolder && isOpen && kids.length > 0 && (
          <ul className="tree-children">{kids.map((k) => renderNode(k, depth + 1))}</ul>
        )}
      </li>
    )
  }

  const roots = childrenOf.get(null) ?? []

  return (
    <div
      className="file-tree"
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest('.tree-row')) return
        openCtx(e, null, true)
      }}
    >
      <div className="file-tree-toolbar">
        <span className="file-tree-title">Files</span>
        <div className="file-tree-actions">
          <Tooltip content="New File">
            <button
              type="button"
              className="icon-btn icon-btn-ghost"
              aria-label="New File"
              onClick={() => onNewFile(null)}
            >
              <Icon name="newFile" size={15} />
            </button>
          </Tooltip>
          <Tooltip content="New Folder">
            <button
              type="button"
              className="icon-btn icon-btn-ghost"
              aria-label="New Folder"
              onClick={() => onNewFolder(null)}
            >
              <Icon name="newFolder" size={15} />
            </button>
          </Tooltip>
        </div>
      </div>
      <ul className="tree-list" role="tree">
        {roots.length === 0 ? (
          <li className="tree-empty">No files yet</li>
        ) : (
          roots.map((n) => renderNode(n, 0))
        )}
      </ul>
      <ContextMenu
        open={ctx.open}
        x={ctx.x}
        y={ctx.y}
        items={menuItems}
        onClose={closeCtx}
      />
    </div>
  )
}
