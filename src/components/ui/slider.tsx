import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  const value = props.value || props.defaultValue || [0]

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        'relative flex w-full touch-none select-none items-center py-2 cursor-pointer',
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[#3F2319]">
        <SliderPrimitive.Range className="absolute h-full bg-[#D28A4C]" />
      </SliderPrimitive.Track>
      {value.map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={i === 0 ? 'Preço mínimo' : 'Preço máximo'}
          className="block h-4 w-4 rounded-full border-2 border-[#140D0A] bg-[#D28A4C] ring-offset-[#140D0A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D28A4C] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110 active:scale-95 shadow-md"
        />
      ))}
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
