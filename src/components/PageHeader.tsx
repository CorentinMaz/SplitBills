import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function PageHeader({ title, back, actions }: { title?: string; back?: string; actions?: ReactNode }) {
  return (
    <header className="flex items-center gap-2">
      {back ? (
        <Button asChild variant="secondary" size="icon" className="rounded-full bg-muted text-foreground">
          <Link to={back} aria-label="Retour">
            <ArrowLeft />
          </Link>
        </Button>
      ) : (
        <span className="size-9" />
      )}
      <h1 className="flex-1 text-center text-lg font-semibold">{title}</h1>
      <div className="flex min-w-9 justify-end gap-2">{actions}</div>
    </header>
  )
}
