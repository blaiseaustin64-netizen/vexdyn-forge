/**
 * Forge icon system — Lucide React wrappers
 * Consistent size, stroke, and color via CSS variables.
 */

import {
  Files,
  Search,
  GitBranch,
  Wrench,
  Settings,
  User,
  File,
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  Pencil,
  Trash2,
  Copy,
  Download,
  Upload,
  Save,
  Play,
  Square,
  RefreshCw,
  Eye,
  Maximize2,
  Minimize2,
  Columns2,
  Rows2,
  X,
  Terminal,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  Rocket,
  History,
  Cloud,
  Github,
  GitCommit,
  Undo2,
  Redo2,
  Replace,
  Command,
  FileSearch,
  Hash,
  ExternalLink,
  Check,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  PanelLeft,
  PanelBottom,
  Layout,
  Share2,
  Globe,
  Circle,
  Loader2,
  Plus,
  ArrowLeft,
  Home,
  LogOut,
  Zap,
  Package,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react'

export const Icons = {
  explorer: Files,
  search: Search,
  source: GitBranch,
  tools: Wrench,
  settings: Settings,
  account: User,
  file: File,
  folder: Folder,
  folderOpen: FolderOpen,
  newFile: FilePlus,
  newFolder: FolderPlus,
  rename: Pencil,
  delete: Trash2,
  duplicate: Copy,
  download: Download,
  upload: Upload,
  save: Save,
  run: Play,
  stop: Square,
  refresh: RefreshCw,
  preview: Eye,
  fullscreen: Maximize2,
  exitFullscreen: Minimize2,
  splitRight: Columns2,
  splitDown: Rows2,
  close: X,
  terminal: Terminal,
  problems: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  error: AlertCircle,
  debug: Bug,
  deploy: Rocket,
  history: History,
  cloud: Cloud,
  github: Github,
  branch: GitBranch,
  commit: GitCommit,
  undo: Undo2,
  redo: Redo2,
  find: Search,
  replace: Replace,
  commandPalette: Command,
  goToFile: FileSearch,
  goToLine: Hash,
  externalLink: ExternalLink,
  copy: Copy,
  check: Check,
  more: MoreHorizontal,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  panelLeft: PanelLeft,
  panelBottom: PanelBottom,
  layout: Layout,
  share: Share2,
  globe: Globe,
  circle: Circle,
  loading: Loader2,
  plus: Plus,
  back: ArrowLeft,
  home: Home,
  logout: LogOut,
  zap: Zap,
  package: Package,
  output: Terminal,
} as const

export type IconName = keyof typeof Icons

interface IconProps extends Omit<LucideProps, 'ref'> {
  name: IconName
  size?: number
  className?: string
}

export function Icon({ name, size = 16, className = '', strokeWidth = 1.75, ...rest }: IconProps) {
  const Comp = Icons[name] as LucideIcon
  if (!Comp) return null
  return (
    <Comp
      size={size}
      strokeWidth={strokeWidth}
      className={`forge-icon ${className}`.trim()}
      aria-hidden
      {...rest}
    />
  )
}

/** File-type icon by extension */
export function FileTypeIcon({ name, size = 14, className = '' }: { name: string; size?: number; className?: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  let iconName: IconName = 'file'
  if (['html', 'htm'].includes(ext)) iconName = 'globe'
  else if (ext === 'css') iconName = 'file'
  else if (['js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx'].includes(ext)) iconName = 'file'
  else if (ext === 'json') iconName = 'package'
  else if (['md', 'markdown'].includes(ext)) iconName = 'file'
  else if (ext === 'svg') iconName = 'file'
  return <Icon name={iconName} size={size} className={className} />
}
