import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = 'primary', size = 'md', className = '', children, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        className={`btn btn-${variant} btn-${size} ${className}`.trim()}
        {...props}
      >
        {children}
      </button>
    )
  }
)
