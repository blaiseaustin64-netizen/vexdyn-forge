/**
 * Local identity placeholder until VEXDYN Core auth is wired.
 * Do not present this as cloud authentication.
 */

const OWNER_KEY = 'vexdyn-forge-owner-v1'
const PROFILE_KEY = 'vexdyn-forge-profile-v1'

export interface LocalProfile {
  displayName: string
  username: string
  email: string
  /** Local-only session id — not a VEXDYN Core user id yet */
  localId: string
  createdAt: string
}

export function getLocalOwnerId(): string {
  try {
    let id = localStorage.getItem(OWNER_KEY)
    if (!id) {
      id = `local-${crypto.randomUUID()}`
      localStorage.setItem(OWNER_KEY, id)
    }
    return id
  } catch {
    return 'local-anonymous'
  }
}

function defaults(localId: string): LocalProfile {
  return {
    displayName: 'Forge Developer',
    username: 'forge-dev',
    email: '',
    localId,
    createdAt: new Date().toISOString(),
  }
}

export function loadProfile(): LocalProfile {
  const localId = getLocalOwnerId()
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalProfile>
      return { ...defaults(localId), ...parsed, localId }
    }
  } catch {
    /* ignore */
  }
  return defaults(localId)
}

export function saveProfile(profile: LocalProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch {
    /* ignore */
  }
}

export function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'F'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
