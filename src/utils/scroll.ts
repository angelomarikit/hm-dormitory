export function scrollToSection(id: string) {
  const element = document.getElementById(id)
  if (!element) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  element.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
