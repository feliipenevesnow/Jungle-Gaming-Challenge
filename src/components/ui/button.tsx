import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md font-mono text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D28A4C] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-[#D28A4C] text-[#140D0A] font-bold hover:bg-[#E89B55] active:bg-[#B3723B]',
        destructive:
          'bg-[#F0805F] text-white hover:bg-[#F0805F]/90 active:bg-[#F0805F]/80',
        outline:
          'border border-[#3F2319] bg-transparent text-[#F5F1EB] hover:bg-[#2F1D15] hover:border-[#D28A4C]',
        secondary:
          'bg-[#2F1D15] text-[#F5F1EB] hover:bg-[#3F2319]',
        ghost:
          'text-[#CFB28C] hover:bg-[#2F1D15] hover:text-[#F5F1EB]',
        link:
          'text-[#D28A4C] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8 text-base font-bold',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
