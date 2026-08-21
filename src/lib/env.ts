export function getEnv() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''
  const siteSlug = import.meta.env.VITE_SITE_SLUG?.trim() ?? ''

  return { url, publishableKey, siteSlug }
}

export function isSupabaseConfigured() {
  const { url, publishableKey, siteSlug } = getEnv()
  return Boolean(url && publishableKey && siteSlug)
}
