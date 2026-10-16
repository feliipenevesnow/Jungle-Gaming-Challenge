import { isAxiosError } from 'axios'
import type { ApiErrorResponse } from '@/types/api'

export function apiErrorMessage(error: unknown, fallback: string): string {
  return isAxiosError<ApiErrorResponse>(error) ? error.response?.data?.message || fallback : fallback
}
