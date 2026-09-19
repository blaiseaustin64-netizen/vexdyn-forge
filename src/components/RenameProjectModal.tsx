import { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Input } from './Input'
import type { Project } from '../types/project'

interface RenameProjectModalProps {
  open: boolean
  project: Project | null
  onClose: () => void
  onSave: (id: string, name: string) => void
}

export function RenameProjectModal({
  open,
  project,
  onClose,
  onSave,
}: RenameProjectModalProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && project) {
      setName(project.name)
      setError(null)
    }
  }, [open, project])

  if (!project) return null

  const validate = (value: string) => {
    const t = value.trim()
    if (!t) return 'Project name is required'
    if (t.length > 80) return 'Name must be 80 characters or fewer'
    return null
  }

  const handleSave = () => {
    const err = validate(name)
    if (err) {
      setError(err)
      return
    }
    onSave(project.id, name.trim())
  }

  return (
    <Modal open={open} onClose={onClose} title="Rename project">
      <div className="create-field">
        <label className="label" htmlFor="rename-project-name">
          Project name
        </label>
        <Input
          id="rename-project-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (error) setError(validate(e.target.value))
          }}
          autoFocus
          error={!!error}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
          }}
        />
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="modal-footer create-footer">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!!validate(name)}
        >
          Save changes
        </Button>
      </div>
    </Modal>
  )
}
