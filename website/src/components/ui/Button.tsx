'use client'

import { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  href?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', href, children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-300 cursor-pointer whitespace-nowrap'

    const variants = {
      primary:
        'bg-primary text-white hover:bg-primary-hover hover:shadow-[0_0_20px_rgba(255,158,25,0.35)]',
      secondary:
        'bg-surface-alt text-ink hover:bg-border',
      ghost:
        'text-ink hover:text-primary',
      dark:
        'bg-primary text-white hover:bg-primary-hover',
    }

    const sizes = {
      sm: 'px-5 py-2.5 text-sm',
      md: 'px-7 py-3.5 text-[0.95rem]',
      lg: 'px-9 py-4.5 text-base',
    }

    const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`

    if (href) {
      return (
        <a href={href} className={classes}>
          {children}
        </a>
      )
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
