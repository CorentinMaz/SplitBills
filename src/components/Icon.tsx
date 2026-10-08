export default function Icon({ name, fill, className = '' }: { name: string; fill?: boolean; className?: string }) {
  return (
    <span className={`icon ${fill ? 'fill' : ''} ${className}`} aria-hidden>
      {name}
    </span>
  )
}
