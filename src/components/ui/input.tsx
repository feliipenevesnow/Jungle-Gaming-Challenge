import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-[5px] border border-[#3F2319] bg-[#140D0A]/70 px-3 py-2 font-mono text-sm text-[#F5F1EB] placeholder:text-[#B39463] focus-visible:outline-none focus-visible:border-[#D28A4C] focus-visible:ring-1 focus-visible:ring-[#D28A4C] disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
