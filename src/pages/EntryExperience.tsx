import { Button } from '../components/Button'

interface EntryExperienceProps {
  onCreate: () => void
  onImport: () => void
}

/**
 * First-entry experience.
 * Feels like entering a professional creation environment — not a marketing page.
 */
export function EntryExperience({ onCreate, onImport }: EntryExperienceProps) {
  return (
    <section className="entry" aria-labelledby="entry-heading">
      <p className="entry-label">VEXDYN / CREATION ENVIRONMENT</p>
      <h1 id="entry-heading" className="entry-title">
        CREATE WITHOUT LIMITS.
      </h1>
      <p className="entry-desc">
        Build websites and digital experiences with a workspace designed for
        real development.
      </p>
      <div className="entry-actions">
        <Button variant="primary" size="lg" onClick={onCreate}>
          CREATE PROJECT
        </Button>
        <Button variant="secondary" size="lg" onClick={onImport}>
          IMPORT PROJECT
        </Button>
      </div>
    </section>
  )
}
