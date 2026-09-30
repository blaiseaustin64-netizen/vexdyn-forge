/**
 * Deploy flow modal — honest about backend status
 */

import { useState } from 'react'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Icon } from '../ui/Icon'
import { services } from '../../services'

interface DeployModalProps {
  open: boolean
  onClose: () => void
  projectName: string
  projectId: string
}

export function DeployModal({
  open,
  onClose,
  projectName,
  projectId,
}: DeployModalProps) {
  const [env, setEnv] = useState<'production' | 'preview'>('production')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const configured = services.deployment.isConfigured()

  const handleDeploy = async () => {
    setBusy(true)
    setMessage(null)
    try {
      await services.deployment.deploy(projectId)
      setMessage('Deployment started.')
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : 'Deployment backend not connected yet'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title="Deploy Project">
      <div className="deploy-modal">
        <div className="deploy-field">
          <span className="label">Project</span>
          <p className="deploy-value">{projectName}</p>
        </div>

        <div className="deploy-field">
          <span className="label">Environment</span>
          <div className="deploy-env-row">
            <button
              type="button"
              className={`deploy-env-btn ${env === 'production' ? 'selected' : ''}`}
              onClick={() => setEnv('production')}
              disabled={busy}
            >
              Production
            </button>
            <button
              type="button"
              className={`deploy-env-btn ${env === 'preview' ? 'selected' : ''}`}
              onClick={() => setEnv('preview')}
              disabled={busy}
            >
              Preview
            </button>
          </div>
        </div>

        <div className="deploy-field">
          <span className="label">Build</span>
          <p className="deploy-value muted">Automatic</p>
        </div>

        <div className="deploy-field">
          <span className="label">Output</span>
          <p className="deploy-value muted">Automatic</p>
        </div>

        {!configured && (
          <div className="deploy-notice">
            <Icon name="info" size={14} />
            <p>
              Deployment backend not connected yet. Architecture is ready for
              Cloudflare Pages — no deployment will be created until the backend
              is configured.
            </p>
          </div>
        )}

        {message && (
          <div className="deploy-message" role="alert">
            {message}
          </div>
        )}

        <div className="modal-footer create-footer">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleDeploy}
            disabled={busy || !configured}
          >
            <Icon name="deploy" size={14} />
            {busy ? 'Deploying…' : 'Deploy'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
