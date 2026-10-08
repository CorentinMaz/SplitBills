export function formatMoney(amount: number, currency = 'CAD') {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency }).format(amount)
}

export function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function today() {
  return new Date().toLocaleDateString('en-CA')
}
