const HUES = ['teal', 'violet', 'blue', 'orange', 'pink', 'cyan', 'indigo']

function hueFor(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return HUES[h % HUES.length]
}

export function initials(name = '?') {
  const parts = name.trim().split(/[\s-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default function Avatar({ id, name, size = 40 }: { id: string; name?: string; size?: number }) {
  return (
    <span className={`avatar solid-${hueFor(id)}`} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials(name)}
    </span>
  )
}

export function AvatarStack({ people, max = 3, size = 36 }: { people: { id: string; name?: string }[]; max?: number; size?: number }) {
  const shown = people.slice(0, max)
  const rest = people.length - shown.length
  return (
    <span className="avatar-stack">
      {shown.map((p) => (
        <Avatar key={p.id} id={p.id} name={p.name} size={size} />
      ))}
      {rest > 0 && (
        <span className="avatar more" style={{ width: size, height: size, fontSize: size * 0.34 }}>
          +{rest}
        </span>
      )}
    </span>
  )
}
