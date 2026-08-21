export function uniqueFileName(originalName: string): string {
  const extension = originalName.split('.').pop()?.toLowerCase() ?? 'jpg'
  const safeExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? extension : 'jpg'
  return `${crypto.randomUUID()}.${safeExtension}`
}
