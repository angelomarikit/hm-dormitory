export function pesoToCentavos(pesos: number): number {
  return Math.round(pesos * 100)
}

export function centavosToPesos(centavos: number): number {
  return centavos / 100
}

export function formatPeso(centavos: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(centavosToPesos(centavos))
}

export function parsePesoInput(value: string): number {
  const n = Number(value.replace(/,/g, '').trim())
  if (!Number.isFinite(n) || n < 0) return 0
  return pesoToCentavos(n)
}
