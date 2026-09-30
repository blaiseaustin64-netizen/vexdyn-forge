/**
 * Project-wide Find & Replace
 * Real results only — uses project filesystem content.
 */

import { useMemo, useState, useCallback, useEffect } from 'react'
import type { ProjectFile } from '../../types/project'
import { isTextFile } from '../../types/project'
import { Icon } from '../ui/Icon'

export interface SearchHit {
  fileId: string
  path: string
  line: number
  column: number
  endColumn: number
  preview: string
}

interface SearchPanelProps {
  files: ProjectFile[]
  onOpenFile: (fileId: string, line?: number, column?: number) => void
  onReplaceInFile: (fileId: string, content: string) => void
}

const SKIP_NAMES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.DS_Store',
])

function buildMatcher(
  query: string,
  opts: { caseSensitive: boolean; wholeWord: boolean; regex: boolean }
): { test: (line: string) => RegExpMatchArray[] } | null {
  const q = query
  if (!q) return null
  try {
    let source = opts.regex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (opts.wholeWord) source = `\\b${source}\\b`
    const flags = opts.caseSensitive ? 'g' : 'gi'
    const re = new RegExp(source, flags)
    return {
      test: (line: string) => {
        const matches: RegExpMatchArray[] = []
        let m: RegExpExecArray | null
        const r = new RegExp(re.source, re.flags)
        while ((m = r.exec(line)) !== null) {
          matches.push(m as unknown as RegExpMatchArray)
          if (m[0].length === 0) {
            r.lastIndex++
          }
          if (matches.length > 50) break
        }
        return matches
      },
    }
  } catch {
    return null
  }
}

export function SearchPanel({
  files,
  onOpenFile,
  onReplaceInFile,
}: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [replace, setReplace] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [includeFilter, setIncludeFilter] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [status, setStatus] = useState<string | null>(null)

  const matcher = useMemo(
    () =>
      query.trim().length >= 1
        ? buildMatcher(query.trim(), {
            caseSensitive,
            wholeWord,
            regex: useRegex,
          })
        : null,
    [query, caseSensitive, wholeWord, useRegex]
  )

  const hits = useMemo(() => {
    if (!matcher) return [] as SearchHit[]
    const filter = includeFilter.trim().toLowerCase()
    const results: SearchHit[] = []

    for (const f of files) {
      if (f.kind !== 'file' || f.content == null) continue
      if (!isTextFile(f.name)) continue
      if (SKIP_NAMES.has(f.name)) continue
      if (filter && !f.path.toLowerCase().includes(filter)) continue

      const lines = f.content.split('\n')
      lines.forEach((line, i) => {
        const matches = matcher.test(line)
        for (const m of matches) {
          const col = (m.index ?? 0) + 1
          results.push({
            fileId: f.id,
            path: f.path,
            line: i + 1,
            column: col,
            endColumn: col + (m[0]?.length ?? 0),
            preview: line.trim().slice(0, 140),
          })
        }
      })
      if (results.length >= 500) break
    }
    return results
  }, [files, matcher, includeFilter])

  useEffect(() => {
    setActiveIdx(0)
  }, [hits.length, query])

  const goToHit = useCallback(
    (h: SearchHit, idx: number) => {
      setActiveIdx(idx)
      onOpenFile(h.fileId, h.line, h.column)
    },
    [onOpenFile]
  )

  const nextHit = () => {
    if (hits.length === 0) return
    const next = (activeIdx + 1) % hits.length
    goToHit(hits[next], next)
  }

  const prevHit = () => {
    if (hits.length === 0) return
    const prev = (activeIdx - 1 + hits.length) % hits.length
    goToHit(hits[prev], prev)
  }

  const replaceInContent = (
    content: string,
    filePath: string
  ): { next: string; count: number } => {
    if (!matcher) return { next: content, count: 0 }
    const filter = includeFilter.trim().toLowerCase()
    if (filter && !filePath.toLowerCase().includes(filter)) {
      return { next: content, count: 0 }
    }
    let count = 0
    const lines = content.split('\n')
    const out = lines.map((line) => {
      const matches = matcher.test(line)
      if (matches.length === 0) return line
      // Rebuild with replacements from end to start
      let result = line
      const sorted = [...matches].sort(
        (a, b) => (b.index ?? 0) - (a.index ?? 0)
      )
      for (const m of sorted) {
        const start = m.index ?? 0
        const end = start + (m[0]?.length ?? 0)
        result = result.slice(0, start) + replace + result.slice(end)
        count++
      }
      return result
    })
    return { next: out.join('\n'), count }
  }

  const replaceAllInProject = () => {
    if (!matcher || !query.trim()) {
      setStatus('Enter a search query first')
      return
    }
    let total = 0
    let filesTouched = 0
    for (const f of files) {
      if (f.kind !== 'file' || f.content == null) continue
      if (!isTextFile(f.name) || SKIP_NAMES.has(f.name)) continue
      const { next, count } = replaceInContent(f.content, f.path)
      if (count > 0) {
        onReplaceInFile(f.id, next)
        total += count
        filesTouched++
      }
    }
    setStatus(
      total === 0
        ? 'No matches to replace'
        : `Replaced ${total} match${total === 1 ? '' : 'es'} in ${filesTouched} file${filesTouched === 1 ? '' : 's'}`
    )
  }

  const replaceInActiveHit = () => {
    const h = hits[activeIdx]
    if (!h || !matcher) return
    const f = files.find((x) => x.id === h.fileId)
    if (!f?.content) return
    // Replace only the specific occurrence on that line
    const lines = f.content.split('\n')
    const lineIdx = h.line - 1
    if (lineIdx < 0 || lineIdx >= lines.length) return
    const line = lines[lineIdx]
    const start = h.column - 1
    const end = h.endColumn - 1
    lines[lineIdx] = line.slice(0, start) + replace + line.slice(end)
    onReplaceInFile(f.id, lines.join('\n'))
    setStatus(`Replaced in ${h.path}:${h.line}`)
  }

  return (
    <div className="search-panel">
      <div className="search-panel-header">
        <div className="search-input-row">
          <Icon name="search" size={14} />
          <input
            className="search-input"
            type="search"
            placeholder="Search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setStatus(null)
            }}
            aria-label="Search project"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                nextHit()
              } else if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault()
                prevHit()
              }
            }}
          />
        </div>

        {showReplace && (
          <div className="search-input-row">
            <Icon name="replace" size={14} />
            <input
              className="search-input"
              type="text"
              placeholder="Replace"
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              aria-label="Replace with"
            />
          </div>
        )}

        <div className="search-options-row">
          <label className="search-option" title="Match case">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
            />
            Aa
          </label>
          <label className="search-option" title="Whole word">
            <input
              type="checkbox"
              checked={wholeWord}
              onChange={(e) => setWholeWord(e.target.checked)}
            />
            W
          </label>
          <label className="search-option" title="Regular expression">
            <input
              type="checkbox"
              checked={useRegex}
              onChange={(e) => setUseRegex(e.target.checked)}
            />
            .*
          </label>
          <button
            type="button"
            className={`search-toggle-replace ${showReplace ? 'active' : ''}`}
            onClick={() => setShowReplace((s) => !s)}
            title="Toggle replace"
          >
            <Icon name="replace" size={13} />
          </button>
        </div>

        <input
          className="search-input search-filter"
          type="text"
          placeholder="Filter by path (optional)"
          value={includeFilter}
          onChange={(e) => setIncludeFilter(e.target.value)}
          aria-label="Filter files by path"
        />

        {showReplace && (
          <div className="search-replace-actions">
            <button
              type="button"
              className="search-action-btn"
              onClick={replaceInActiveHit}
              disabled={hits.length === 0}
            >
              Replace
            </button>
            <button
              type="button"
              className="search-action-btn primary"
              onClick={replaceAllInProject}
              disabled={!query.trim()}
            >
              Replace All
            </button>
          </div>
        )}

        {status && <p className="search-status">{status}</p>}
      </div>

      <div className="search-results">
        {!query.trim() ? (
          <p className="panel-empty">Search across project files</p>
        ) : !matcher ? (
          <p className="panel-empty">Invalid regular expression</p>
        ) : hits.length === 0 ? (
          <p className="panel-empty">No results</p>
        ) : (
          <>
            <div className="search-count-row">
              <span className="search-count">
                {hits.length} result{hits.length === 1 ? '' : 's'}
              </span>
              <div className="search-nav">
                <button
                  type="button"
                  className="panel-icon-btn"
                  onClick={prevHit}
                  aria-label="Previous result"
                  title="Previous"
                >
                  <Icon name="chevronLeft" size={14} />
                </button>
                <span className="search-idx">
                  {activeIdx + 1}/{hits.length}
                </span>
                <button
                  type="button"
                  className="panel-icon-btn"
                  onClick={nextHit}
                  aria-label="Next result"
                  title="Next"
                >
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
            </div>
            {hits.map((h, i) => (
              <button
                key={`${h.fileId}-${h.line}-${h.column}-${i}`}
                type="button"
                className={`search-hit ${i === activeIdx ? 'active' : ''}`}
                onClick={() => goToHit(h, i)}
              >
                <span className="search-hit-path">
                  {h.path}:{h.line}:{h.column}
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
