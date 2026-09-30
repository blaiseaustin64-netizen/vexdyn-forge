import { useState, useCallback, useEffect } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Input } from './Input'
import type { StarterTemplate } from '../types/project'
import { STARTER_OPTIONS } from '../types/project'

interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
  onCreate: (name: string, starter: StarterTemplate) => void
  isCreating?: boolean
}

export function CreateProjectModal({
  open,
  onClose,
  onCreate,
  isCreating = false,
}: CreateProjectModalProps) {
  const [name, setName] = useState('')
  const [starter, setStarter] = useState<StarterTemplate>('blank')
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setStarter('blank')
      setError(null)
      setTouched(false)
    }
  }, [open])

  const validate = useCallback((value: string): string | null => {
    const trimmed = value.trim()
    if (!trimmed) return 'Project name is required'
    if (trimmed.length > 80) return 'Name must be 80 characters or fewer'
    if (!/^[\w\s\-.'()]+$/u.test(trimmed)) {
      return 'Use letters, numbers, spaces, and basic punctuation only'
    }
    return null
  }, [])

  const handleNameChange = (value: string) => {
    setName(value)
    if (touched) setError(validate(value))
  }

  const handleSubmit = () => {
    setTouched(true)
    const err = validate(name)
    if (err) {
      setError(err)
      return
    }
    onCreate(name.trim(), starter)
  }

  const canSubmit = !validate(name) && !isCreating
  const available = STARTER_OPTIONS.filter((o) => o.available)
  const blankOptions = available.filter((o) => o.kind === 'blank')
  const templateOptions = available.filter((o) => o.kind === 'template')
  const selected = available.find((o) => o.id === starter)

  return (
    <Modal open={open} onClose={isCreating ? () => {} : onClose} title="Create project">
      <div className="create-form">
        <div className="create-field">
          <label className="label" htmlFor="create-project-name">
            Project name
          </label>
          <Input
            id="create-project-name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            onBlur={() => {
              setTouched(true)
              setError(validate(name))
            }}
            placeholder="My New Project"
            autoFocus
            error={!!error}
            disabled={isCreating}
            aria-invalid={!!error}
            aria-describedby={error ? 'name-error' : undefined}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) handleSubmit()
            }}
          />
          {error && (
            <p id="name-error" className="field-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="create-field">
          <span className="label" id="starter-label">
            Starting point
          </span>
          <p className="create-hint">
            <strong>Blank</strong> starts empty. <strong>Templates</strong> create a working
            website you can edit or replace entirely.
          </p>

          {blankOptions.length > 0 && (
            <>
              <p className="starter-group-label">From zero</p>
              <div className="starter-grid" role="radiogroup" aria-labelledby="starter-label">
                {blankOptions.map((opt) => {
                  const selectedOpt = starter === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={selectedOpt}
                      className={`starter-card ${selectedOpt ? 'selected' : ''} starter-blank`}
                      onClick={() => setStarter(opt.id)}
                      disabled={isCreating}
                    >
                      <span className="starter-label">{opt.label}</span>
                      <span className="starter-desc">{opt.description}</span>
                      {opt.filesHint && (
                        <span className="starter-meta">{opt.filesHint}</span>
                      )}
                      {selectedOpt && (
                        <span className="starter-check" aria-hidden>
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {templateOptions.length > 0 && (
            <>
              <p className="starter-group-label">Templates</p>
              <div className="starter-grid" role="radiogroup" aria-label="Templates">
                {templateOptions.map((opt) => {
                  const selectedOpt = starter === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={selectedOpt}
                      className={`starter-card ${selectedOpt ? 'selected' : ''}`}
                      onClick={() => setStarter(opt.id)}
                      disabled={isCreating}
                    >
                      <span className="starter-label">{opt.label}</span>
                      <span className="starter-desc">{opt.description}</span>
                      {opt.tech && <span className="starter-tech">{opt.tech}</span>}
                      {opt.filesHint && (
                        <span className="starter-meta">{opt.filesHint}</span>
                      )}
                      {selectedOpt && (
                        <span className="starter-check" aria-hidden>
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {selected && (
            <p className="starter-selected-hint">
              {selected.kind === 'blank'
                ? 'You will get an empty workspace. Create files when you are ready.'
                : `Creates a working project (${selected.filesHint ?? 'template files'}). Preview will show the site immediately where supported.`}
            </p>
          )}
        </div>

        <div className="modal-footer create-footer">
          <Button variant="ghost" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
            {isCreating ? (
              <span className="loading-text">
                <span className="spinner" aria-hidden />
                Initializing workspace
              </span>
            ) : (
              'Create project'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
