import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)



export async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MSW !== 'true') {
    return
  }

  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  })
}


