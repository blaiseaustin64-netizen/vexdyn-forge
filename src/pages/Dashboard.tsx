import { useState } from 'react'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { ProjectCard } from '../components/ProjectCard'
import type { Project } from '../types/project'
import type { SortMode } from '../hooks/useProjects'

interface DashboardProps {
  filtered: Project[]
  query: string
  onQueryChange: (q: string) => void
  sort: SortMode
  onSortChange: (s: SortMode) => void
  onCreate: () => void
  onOpen: (project: Project) => void
  onRename: (project: Project) => void
  onDuplicate: (project: Project) => void
  onDelete: (project: Project) => void
  hasProjects: boolean
}

export function Dashboard({
  filtered,
  query,
  onQueryChange,
  sort,
  onSortChange,
  onCreate,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
  hasProjects,
}: DashboardProps) {
  const [searchFocused, setSearchFocused] = useState(false)

  return (
    <section className="dashboard" aria-labelledby="dash-heading">
      <header className="dashboard-header">
        <div className="dashboard-header-row">
          <div>
            <h1 id="dash-heading" className="dashboard-heading">
              YOUR WORKSPACE
            </h1>
            <p className="dashboard-sub">
              Build something real. Turn ideas into working projects.
            </p>
          </div>
          <Button variant="primary" onClick={onCreate} className="dashboard-create-btn">
            + Create project
          </Button>
        </div>

        {hasProjects && (
          <div className="dashboard-toolbar">
            <div className={`search-wrap ${searchFocused ? 'focused' : ''}`}>
              <span className="search-icon" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <Input
                className="search-input"
                type="search"
                placeholder="Search projects…"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                aria-label="Search projects"
              />
              {query && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => onQueryChange('')}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="sort-wrap">
              <label htmlFor="sort-select" className="sr-only">
                Sort projects
              </label>
              <select
                id="sort-select"
                className="sort-select"
                value={sort}
                onChange={(e) => onSortChange(e.target.value as SortMode)}
              >
                <option value="recent">Recently modified</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
        )}
      </header>

      {!hasProjects ? (
        <div className="state-container">
          <div className="state-icon" aria-hidden>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect
                x="8"
                y="10"
                width="32"
                height="28"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path d="M8 18h32" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="14" cy="14" r="1.5" fill="currentColor" opacity="0.5" />
              <circle cx="20" cy="14" r="1.5" fill="currentColor" opacity="0.5" />
              <path
                d="M18 28h12M24 22v12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.6"
              />
            </svg>
          </div>
          <h2 className="state-title">No projects yet</h2>
          <p className="state-desc">
            Your workspace is ready. Create your first project and start building.
          </p>
          <Button variant="primary" onClick={onCreate}>
            Create project
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="state-container">
          <h2 className="state-title">No matches</h2>
          <p className="state-desc">No projects match your search.</p>
          <Button variant="secondary" onClick={() => onQueryChange('')}>
            Clear search
          </Button>
        </div>
      ) : (
        <div className="projects-section">
          <h2 className="projects-section-title">
            Recent projects
            <span className="projects-count">{filtered.length}</span>
          </h2>
          <div className="project-list" role="list">
            {filtered.map((p) => (
              <div key={p.id} role="listitem">
                <ProjectCard
                  project={p}
                  onOpen={onOpen}
                  onRename={onRename}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
