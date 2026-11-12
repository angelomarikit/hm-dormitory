export function uniqueFileName(originalName: string): string {
  const extension = originalName.split('.').pop()?.toLowerCase() ?? 'jpg'
  const safeExtension = ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(extension) ? extension : 'bin'
  return `${crypto.randomUUID()}.${safeExtension}`
}
