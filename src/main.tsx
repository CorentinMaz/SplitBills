import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/auth'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import '@/index.css'
import '@/lib/theme'

// After a deploy, a page that was already open can't load the chunks of the old build any more
// (the receipt scanner is one): reload so it runs the new version instead of failing silently.
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <TooltipProvider>
          <App />
          <Toaster position="top-center" richColors />
        </TooltipProvider>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
