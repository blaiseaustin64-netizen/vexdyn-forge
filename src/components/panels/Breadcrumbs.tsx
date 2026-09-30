/**
 * Editor breadcrumbs — path segments for active file
 */

interface BreadcrumbsProps {
  path: string
  onNavigate?: (segmentPath: string) => void
}

export function Breadcrumbs({ path, onNavigate }: BreadcrumbsProps) {
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 0) return null

  let acc = ''
  return (
    <nav className="breadcrumbs" aria-label="File path">
      {parts.map((part, i) => {
        acc = acc ? `${acc}/${part}` : part
        const segmentPath = acc
        const isLast = i === parts.length - 1
        return (
          <span key={segmentPath} className="breadcrumb-item">
            {i > 0 && <span className="breadcrumb-sep" aria-hidden>/</span>}
            {isLast ? (
              <span className="breadcrumb-current">{part}</span>
            ) : (
              <button
                type="button"
                className="breadcrumb-link"
                onClick={() => onNavigate?.(segmentPath)}
              >
                {part}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
