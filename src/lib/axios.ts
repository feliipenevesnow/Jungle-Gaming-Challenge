import axios, { AxiosError } from 'axios'
import { waitForNetwork } from './network-ready'

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
  await waitForNetwork()
  const token = localStorage.getItem('kurio_session_token')
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
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !['/auth/login', '/auth/register', '/auth/logout'].includes(error.config?.url || '')) {
      // Dispatched when session expires
      window.dispatchEvent(new CustomEvent('kurio:session-expired'))
    }
    return Promise.reject(error)
  },
)

export default api
