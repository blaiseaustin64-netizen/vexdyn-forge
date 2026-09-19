import { useState } from 'react'
import { Button } from '../components/Button'
import {
  loadSettings,
  saveSettings,
  type ForgeSettings,
  type EditorFontSize,
  type TabSize,
} from '../lib/settingsStore'

interface SettingsProps {
  onBack: () => void
}

export function Settings({ onBack }: SettingsProps) {
  const [settings, setSettings] = useState<ForgeSettings>(() => loadSettings())
  const [saved, setSaved] = useState(false)

  const update = <K extends keyof ForgeSettings>(key: K, value: ForgeSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }))
  }

  const handleSave = () => {
    saveSettings(settings)
    document.documentElement.dataset.reduceMotion = settings.reduceMotion
      ? 'true'
      : 'false'
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1500)
  }

  return (
    <section className="shell-page" aria-labelledby="settings-heading">
      <header className="shell-page-header">
        <button type="button" className="ws-back" onClick={onBack}>
          ← Back
        </button>
        <h1 id="settings-heading" className="shell-page-title">
          Settings
        </h1>
      </header>

      <div className="shell-card">
        <h2 className="shell-section-title">Appearance</h2>
        <p className="shell-note">
          Theme is locked to Forge dark (tech blue + silver) for V1.
        </p>
      </div>

      <div className="shell-card">
        <h2 className="shell-section-title">Editor</h2>
        <div className="settings-row">
          <label htmlFor="font-size">Font size</label>
          <select
            id="font-size"
            className="sort-select"
            value={settings.editorFontSize}
            onChange={(e) =>
              update('editorFontSize', e.target.value as EditorFontSize)
            }
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </div>
        <div className="settings-row">
          <label htmlFor="tab-size">Tab size</label>
          <select
            id="tab-size"
            className="sort-select"
            value={settings.tabSize}
            onChange={(e) => update('tabSize', Number(e.target.value) as TabSize)}
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
        </div>
        <p className="shell-note">
          Font size and tab size apply the next time you open a file in the editor.
        </p>
      </div>

      <div className="shell-card">
        <h2 className="shell-section-title">Interface</h2>
        <label className="settings-check">
          <input
            type="checkbox"
            checked={settings.reduceMotion}
            onChange={(e) => update('reduceMotion', e.target.checked)}
          />
          Prefer reduced motion
        </label>
      </div>

      <div className="shell-card">
        <h2 className="shell-section-title">Account</h2>
        <p className="shell-note">
          Manage display name, username, and email in Profile. Authentication will
          connect through VEXDYN Core later.
        </p>
      </div>

      <div className="shell-card">
        <h2 className="shell-section-title">About</h2>
        <dl className="profile-meta">
          <div>
            <dt>Product</dt>
            <dd>VEXDYN FORGE</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd className="mono">1.0.0</dd>
          </div>
          <div>
            <dt>Editor</dt>
            <dd>CodeMirror 6</dd>
          </div>
        </dl>
        <p className="shell-note">
          Future: NYVEN · Live · Builder · PRO — architecture boundaries only in V1.
        </p>
      </div>

      <div className="shell-actions">
        <Button variant="primary" onClick={handleSave}>
          {saved ? 'Saved' : 'Save settings'}
        </Button>
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
      </div>
    </section>
  )
}
