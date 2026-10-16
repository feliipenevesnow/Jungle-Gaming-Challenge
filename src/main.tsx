import './index.css'
import { setNetworkReady } from './lib/network-ready'

// Download UI and mocks concurrently. Wait for interception before rendering
// so images, fonts and the first API queries share the same network lifecycle.
async function bootstrap() {
  const mocking = import.meta.env.VITE_ENABLE_MSW === 'true'
    ? import('./mocks/browser').then(module => module.enableMocking())
    : Promise.resolve()
  const application = import('./app')
  setNetworkReady(mocking)
  const [, app] = await Promise.all([mocking, application])
  app.renderApp()
}
// Let the initial accessible status paint before evaluating the UI and mock
// modules. A hidden tab can initialize immediately without waiting for frames.
const start = () => { void bootstrap().catch(showStartupError) }
if (document.visibilityState === 'hidden') start()
else requestAnimationFrame(() => setTimeout(start, 0))
function showStartupError() {
  const root = document.getElementById('root')!
  const message = document.createElement('p')
  message.textContent = 'Não foi possível iniciar a aplicação. Confira sua conexão.'
  message.setAttribute('role', 'alert')
  const retry = document.createElement('button')
  retry.textContent = 'Tentar novamente'
  retry.onclick = () => window.location.reload()
  root.replaceChildren(message, retry)
}
