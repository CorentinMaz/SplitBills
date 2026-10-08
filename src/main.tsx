import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/auth'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import '@/index.css'
import '@/lib/theme'

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
