import axios, { AxiosError, CanceledError, type InternalAxiosRequestConfig } from 'axios'
import { waitForNetwork } from './network-ready'
import { getSessionToken, isCurrentSession } from './session'

function belongsToPreviousSession(config?: InternalAxiosRequestConfig): boolean {
  if (!config || !/^\/(?:auth\/me|favorites|cart|orders|profile|wallets)(?:\/|$)/.test(config.url || '')) return false
  const authorization = config.headers.get('Authorization')
  const token = typeof authorization === 'string' ? authorization.replace(/^Bearer /, '') : null
  return !isCurrentSession(token)
}

export const api = axios.create({
  // Axios owns timeout/abort handling in the fetch adapter, including under the
  // browser clock used by the deterministic timeout and session E2E scenarios.
  adapter: 'fetch',
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to attach token from localStorage if present
api.interceptors.request.use(async (config) => {
  const token = getSessionToken()
  await waitForNetwork()
  if (!isCurrentSession(token)) throw new CanceledError('A sessão mudou antes do envio.', config)
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Allow passing scenario simulation header from localStorage or window if active
  const scenario = localStorage.getItem('kurio_msw_scenario')
  if (scenario && config.headers) {
    config.headers['x-msw-scenario'] = scenario
  }

  return config
})

// Response interceptor to handle session expiration or global errors
api.interceptors.response.use(
  (response) => {
    if (belongsToPreviousSession(response.config)) throw new CanceledError('Resposta de uma sessão encerrada.', response.config)
    return response
  },
  (error: AxiosError) => {
    if (belongsToPreviousSession(error.config)) return Promise.reject(new CanceledError('Resposta de uma sessão encerrada.', error.config))
    if (error.response?.status === 401 && getSessionToken() && !['/auth/login', '/auth/register', '/auth/logout'].includes(error.config?.url || '')) {
      // Dispatched when session expires
      window.dispatchEvent(new CustomEvent('kurio:session-expired'))
    }
    return Promise.reject(error)
  },
)

export default api
