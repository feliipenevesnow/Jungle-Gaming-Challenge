import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { apiErrorMessage } from '@/lib/api-error'
import { Button } from './ui/button'
import { Input } from './ui/input'

export function CouponForm({ code, invalidReason }: { code?: string; invalidReason?: string }) {
  const [input, setInput] = useState('')
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (value: string | null) => value === null
      ? api.delete('/cart/coupon')
      : api.put('/cart/coupon', { code: value }),
    onSuccess: async () => {
      setInput('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cart'] }),
        queryClient.invalidateQueries({ queryKey: ['cart-quote'] }),
        queryClient.invalidateQueries({ queryKey: ['checkout-quote'] }),
      ])
    },
  })
  return <div className="coupon-form space-y-2">
    {code ? <div className="flex items-center justify-between gap-2 text-xs text-[#E89B55]">
      <span role="status">Cupom <strong>{code}</strong> {invalidReason ? 'indisponível' : 'aplicado!'}</span>
      <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate(null)} className="underline">Remover cupom</button>
    </div> : <form onSubmit={event => { event.preventDefault(); if (input.trim()) mutation.mutate(input.trim().toUpperCase()) }} className="flex">
      <Input aria-label="Código promocional" required placeholder="Digite o código promocional..." value={input} onChange={event => setInput(event.target.value)} className="h-10 min-w-0 rounded-r-none text-xs" />
      <Button type="submit" disabled={mutation.isPending} className="h-10 rounded-l-none bg-[#D28A4C] text-[#140D0A]">{mutation.isPending ? 'Aplicando...' : 'Aplicar'}</Button>
    </form>}
    {invalidReason && <p role="alert" className="text-xs text-[#E89B55]">{invalidReason}</p>}
    {mutation.isError && <p id="coupon-error" role="alert" className="text-xs text-[#F0805F]">{apiErrorMessage(mutation.error, 'Não foi possível atualizar o cupom. Tente novamente.')}</p>}
  </div>
}
