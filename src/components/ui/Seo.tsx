import { useEffect } from 'react'

interface SeoProps {
  title: string
  description?: string | null
  image?: string | null
  path?: string
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null
  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }
  Object.entries(attributes).forEach(([key, value]) => {
    element?.setAttribute(key, value)
  })
}

export function Seo({ title, description, image, path }: SeoProps) {
  useEffect(() => {
    document.title = title
    const desc = description?.trim() || 'Comfortable boarding rooms with clear availability and rates.'
    upsertMeta('meta[name="description"]', { name: 'description', content: desc })
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title })
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: desc })
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' })
    if (image) {
      upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image })
    }
    const canonicalHref = `${window.location.origin}${path ?? window.location.pathname}`
    let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = canonicalHref
  }, [title, description, image, path])

  return null
}
