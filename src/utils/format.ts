const dateTimeFormatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const dateFormatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
})

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return ''
  return dateTimeFormatter.format(new Date(value))
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const dateOnly = value.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const [year, month, day] = dateOnly.split('-').map(Number)
    return dateFormatter.format(new Date(year, month - 1, day))
  }
  return dateFormatter.format(new Date(value))
}

export function todayISO(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
