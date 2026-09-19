import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ error, className = '', ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`input ${error ? 'input-error' : ''} ${className}`.trim()}
        {...props}
      />
    )
  }
)
