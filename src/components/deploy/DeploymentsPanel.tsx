/**
 * Vercel-style deployments panel
 * Honest empty state — no fake deployment data
 */

import { Icon } from '../ui/Icon'
import { Button } from '../Button'
import { StatusIndicator } from '../ui/StatusIndicator'
import { services } from '../../services'

interface DeploymentsPanelProps {
  projectId: string
  projectName: string
  onDeploy: () => void
}

export function DeploymentsPanel({
  projectId,
  projectName,
  onDeploy,
}: DeploymentsPanelProps) {
  const configured = services.deployment.isConfigured()

  return (
    <div className="deployments-panel">
      <div className="deployments-header">
        <h3>Deployments</h3>
        <Button variant="primary" size="sm" onClick={onDeploy}>
          <Icon name="deploy" size={14} />
          Deploy
        </Button>
      </div>

      <section className="deploy-production">
        <h4 className="deploy-section-title">Current Production</h4>
        <div className="deploy-card empty">
          <div className="deploy-card-body">
            <StatusIndicator status="idle" label="Not deployed" />
            <p className="deploy-card-title">{projectName}</p>
            <p className="deploy-card-url muted">No production URL yet</p>
          </div>
          <div className="deploy-card-actions">
            <Button variant="secondary" size="sm" onClick={onDeploy} disabled={!configured}>
              Deploy
            </Button>
          </div>
        </div>
      </section>

      <section className="deploy-history">
        <h4 className="deploy-section-title">History</h4>
        <div className="deploy-empty-state">
          <Icon name="history" size={24} />
          <p>No deployments yet</p>
          <p className="panel-hint">
            {configured
              ? 'Deploy this project to see history here.'
              : 'Connect the Cloudflare Pages backend to enable deployments. The UI and service contracts are ready.'}
          </p>
        </div>
      </section>
    </div>
  )
}
