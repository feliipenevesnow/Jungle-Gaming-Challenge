import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type FormSelectProps = {
  id?: string
  value: string
  onValueChange: (value: string) => void
  options: readonly { value: string; label: string }[]
  className?: string
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  disabled?: boolean
  placeholder?: string
}

export function FormSelect({ value, onValueChange, options, placeholder, disabled, ...props }: FormSelectProps) {
  return <Select value={value} onValueChange={onValueChange} disabled={disabled}>
    <SelectTrigger {...props}><SelectValue placeholder={placeholder} /></SelectTrigger>
    <SelectContent position="popper" align="start">
      {options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
    </SelectContent>
  </Select>
}
