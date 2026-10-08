import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const COLORS = ['bg-teal-600', 'bg-violet-600', 'bg-blue-600', 'bg-orange-500', 'bg-pink-600', 'bg-cyan-600', 'bg-indigo-600']

function colorFor(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}

function initials(name = '?') {
  const parts = name.trim().split(/[\s-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase()
}

// Text-size classes must reach the fallback, which otherwise forces text-sm.
const textSize = (className = '') => className.split(' ').filter((c) => /^text-(\[|xs|sm|base|lg|\d?xl)/.test(c))

export default function UserAvatar({ id, name, className }: { id: string; name?: string; className?: string }) {
  return (
    <Avatar className={cn('size-10', className)}>
      <AvatarFallback className={cn('font-semibold text-white', colorFor(id), textSize(className))}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

export function AvatarStack({
  people,
  max = 3,
  className,
  ring = 'ring-card',
}: {
  people: { id: string; name?: string }[]
  max?: number
  className?: string
  ring?: string
}) {
  const shown = people.slice(0, max)
  const rest = people.length - shown.length
  return (
    <div className="flex -space-x-2.5">
      {shown.map((p) => (
        <UserAvatar key={p.id} id={p.id} name={p.name} className={cn('ring-[2.5px]', ring, className)} />
      ))}
      {rest > 0 && (
        <Avatar className={cn('ring-[2.5px]', ring, className)}>
          <AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">+{rest}</AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
