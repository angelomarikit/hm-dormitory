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
  return dateFormatter.format(new Date(value))
}
