import { clearError, useLastError } from '../lib/errors'

export default function ErrorBanner() {
  const error = useLastError()
  if (!error) return null
  return (
    <div className="error-banner" role="alert">
      <span>{error}</span>
      <button className="icon-btn" aria-label="Fermer" onClick={clearError}>
        ×
      </button>
    </div>
  )
}
