/**
 * Project-wide search panel
 */

import { useMemo, useState } from 'react'
import type { ProjectFile } from '../../types/project'

interface SearchHit {
  fileId: string
  path: string
  line: number
  preview: string
}

interface SearchPanelProps {
  files: ProjectFile[]
  onOpenFile: (fileId: string, line?: number) => void
}

export function SearchPanel({ files, onOpenFile }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)

  const hits = useMemo(() => {
    const q = query.trim()
    if (!q || q.length < 2) return [] as SearchHit[]
    const results: SearchHit[] = []
    const needle = caseSensitive ? q : q.toLowerCase()

    for (const f of files) {
      if (f.kind !== 'file' || f.content == null) continue
      const lines = f.content.split('\n')
      lines.forEach((line, i) => {
        const hay = caseSensitive ? line : line.toLowerCase()
        if (hay.includes(needle)) {
          results.push({
            fileId: f.id,
            path: f.path,
            line: i + 1,
            preview: line.trim().slice(0, 120),
          })
        }
      })
    }
    return results.slice(0, 200)
  }, [files, query, caseSensitive])

  return (
    <div className="search-panel">
      <div className="search-panel-header">
        <input
          className="search-input"
          type="search"
          placeholder="Search in files…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search project"
        />
        <label className="search-option">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
          />
          Case
        </label>
      </div>
      <div className="search-results">
        {query.trim().length < 2 ? (
          <p className="panel-empty">Type at least 2 characters to search.</p>
        ) : hits.length === 0 ? (
          <p className="panel-empty">No results.</p>
        ) : (
          <>
            <p className="search-count">{hits.length} result{hits.length === 1 ? '' : 's'}</p>
            {hits.map((h, i) => (
              <button
                key={`${h.fileId}-${h.line}-${i}`}
                type="button"
                className="search-hit"
                onClick={() => onOpenFile(h.fileId, h.line)}
              >
                <span className="search-hit-path">
                  {h.path}:{h.line}
                </span>
                <span className="search-hit-preview">{h.preview}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
