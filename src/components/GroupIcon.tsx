import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Solid colors cycled across groups, used for card headers and icon tiles. */
export const GROUP_COLORS = ['bg-teal-600', 'bg-blue-600', 'bg-violet-600', 'bg-orange-500', 'bg-pink-600', 'bg-indigo-600']

export function groupColor(index: number) {
  return GROUP_COLORS[index % GROUP_COLORS.length]
}

export default function GroupIcon({ className }: { className?: string }) {
  return (
    <span className={cn('grid size-12 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-md', className)}>
      <Users className="size-6" />
    </span>
  )
}
