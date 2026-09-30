/**
 * VS Code-style activity bar — Lucide icons
 */

import { Icon } from '../ui/Icon'
import { Tooltip } from '../ui/Tooltip'

export type ActivityView = 'explorer' | 'search' | 'source' | 'extensions'

interface ActivityBarProps {
  active: ActivityView
  onChange: (view: ActivityView) => void
}

const items: {
  id: ActivityView
  label: string
  icon: 'explorer' | 'search' | 'source' | 'tools'
  shortcut?: string
}[] = [
  { id: 'explorer', label: 'Explorer', icon: 'explorer', shortcut: '⌘⇧E' },
  { id: 'search', label: 'Search', icon: 'search', shortcut: '⌘P' },
  { id: 'source', label: 'Source Control', icon: 'source' },
  { id: 'extensions', label: 'Tools', icon: 'tools' },
]

export function ActivityBar({ active, onChange }: ActivityBarProps) {
  return (
    <nav className="activity-bar" aria-label="Activity">
      {items.map((item) => (
        <Tooltip key={item.id} content={item.label} shortcut={item.shortcut} side="right">
          <button
            type="button"
            className={`activity-btn ${active === item.id ? 'active' : ''}`}
            aria-label={item.label}
            aria-pressed={active === item.id}
            onClick={() => onChange(item.id)}
          >
            <Icon name={item.icon} size={20} strokeWidth={1.5} />
          </button>
        </Tooltip>
      ))}
    </nav>
  )
}
