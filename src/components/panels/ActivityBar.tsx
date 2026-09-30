/**
 * VS Code-style activity bar — left edge icon rail
 */

export type ActivityView = 'explorer' | 'search' | 'source' | 'extensions'

interface ActivityBarProps {
  active: ActivityView
  onChange: (view: ActivityView) => void
}

const items: { id: ActivityView; label: string; icon: string }[] = [
  { id: 'explorer', label: 'Explorer', icon: '☰' },
  { id: 'search', label: 'Search', icon: '⌕' },
  { id: 'source', label: 'Source Control', icon: '⑂' },
  { id: 'extensions', label: 'Tools', icon: '▦' },
]

export function ActivityBar({ active, onChange }: ActivityBarProps) {
  return (
    <nav className="activity-bar" aria-label="Activity">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`activity-btn ${active === item.id ? 'active' : ''}`}
          title={item.label}
          aria-label={item.label}
          aria-pressed={active === item.id}
          onClick={() => onChange(item.id)}
        >
          <span className="activity-icon" aria-hidden>
            {item.icon}
          </span>
        </button>
      ))}
    </nav>
  )
}
