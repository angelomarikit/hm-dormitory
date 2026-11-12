export const BOARDER_AUTH_DOMAIN = 'boarder.hm-dormitory.local'

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

export function isUsernameValid(value: string) {
  return /^[a-z0-9._-]{3,32}$/.test(normalizeUsername(value))
}

export function toAuthEmail(usernameOrEmail: string) {
  const value = usernameOrEmail.trim().toLowerCase()
  if (!value) return value
  if (value.includes('@')) return value
  return `${value}@${BOARDER_AUTH_DOMAIN}`
}

export function toDisplayUsername(emailOrUsername: string | null | undefined) {
  if (!emailOrUsername) return ''
  const value = emailOrUsername.trim()
  const suffix = `@${BOARDER_AUTH_DOMAIN}`
  if (value.toLowerCase().endsWith(suffix)) {
    return value.slice(0, -suffix.length)
  }
  return value
}
