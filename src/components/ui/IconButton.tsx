/**
 * Icon button with optional tooltip
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import { Tooltip } from './Tooltip'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  label: string
  shortcut?: string
  size?: number
  active?: boolean
  variant?: 'ghost' | 'subtle' | 'primary' | 'danger'
  children?: ReactNode
}

export function IconButton({
  icon,
  label,
  shortcut,
  size = 16,
  active = false,
  variant = 'ghost',
  className = '',
  disabled,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <Tooltip content={label} shortcut={shortcut}>
      <button
        type="button"
        className={`icon-btn icon-btn-${variant} ${active ? 'active' : ''} ${className}`.trim()}
        aria-label={label}
        disabled={disabled}
        {...rest}
      >
        <Icon name={icon} size={size} />
        {children}
      </button>
    </Tooltip>
  )
}
