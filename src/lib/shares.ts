/**
 * Sets one member's share and spreads the rest over the others so the total always makes 100.
 * The others keep their proportions to each other (evenly when they were all at 0); whole percents only,
 * the rounding leftover goes to the first of them.
 */
export function rebalanceShares(shares: Record<string, number>, ids: string[], id: string, value: number) {
  const mine = Math.min(100, Math.max(0, Math.round(value) || 0))
  const others = ids.filter((x) => x !== id)
  const next: Record<string, number> = { ...shares, [id]: mine }
  if (others.length === 0) return next

  const rest = 100 - mine
  const weights = others.map((x) => shares[x] ?? 0)
  const sum = weights.reduce((a, b) => a + b, 0)
  let given = 0
  others.forEach((x, i) => {
    const w = sum > 0 ? weights[i] / sum : 1 / others.length
    const part = i === others.length - 1 ? rest - given : Math.round(rest * w)
    next[x] = part
    given += part
  })
  return next
}
