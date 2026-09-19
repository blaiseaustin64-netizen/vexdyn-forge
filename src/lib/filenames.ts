const INVALID = /[\\/:*?"<>|]/
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

export function validateFilename(raw: string, kind: 'file' | 'folder'): string | null {
  const name = raw.trim()
  if (!name) return `${kind === 'file' ? 'Filename' : 'Folder name'} is required`
  if (name.length > 80) return 'Name must be 80 characters or fewer'
  if (name === '.' || name === '..') return 'That name is not allowed'
  if (INVALID.test(name)) return 'Name cannot contain / \\ : * ? " < > |'
  if (RESERVED.test(name)) return 'That name is reserved'
  if (kind === 'file' && !name.includes('.')) {
    return 'Include an extension, e.g. about.html'
  }
  return null
}
