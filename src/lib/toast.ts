import { createContext, useContext, type ReactNode } from 'react'

export const ToastContext = createContext<(message: string, action?: ReactNode) => void>(() => {})
export function useToast() { return useContext(ToastContext) }
