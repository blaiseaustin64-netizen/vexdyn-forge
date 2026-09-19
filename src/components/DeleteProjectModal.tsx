import { Modal } from './Modal'
import { Button } from './Button'
import type { Project } from '../types/project'

interface DeleteProjectModalProps {
  open: boolean
  project: Project | null
  onClose: () => void
  onConfirm: (id: string) => void
}

export function DeleteProjectModal({
  open,
  project,
  onClose,
  onConfirm,
}: DeleteProjectModalProps) {
  if (!project) return null

  return (
    <Modal open={open} onClose={onClose} title="Delete project?">
      <p className="delete-message">
        This action will permanently remove{' '}
        <strong className="delete-name">{project.name}</strong> and its files.
        This cannot be undone.
      </p>
      <div className="modal-footer create-footer">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => onConfirm(project.id)}
        >
          Delete project
        </Button>
      </div>
    </Modal>
  )
}
