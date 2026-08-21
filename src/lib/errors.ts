import type { PostgrestError } from '@supabase/supabase-js'

export class AppError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
  }
}

export function toUserMessage(error: unknown, fallback: string): string {
  if (error instanceof AppError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function throwIfError<T>(
  data: T | null,
  error: PostgrestError | null,
  fallback: string,
): T {
  if (error) {
    console.error(fallback, error.message)
    throw new AppError(fallback)
  }
  if (data === null) {
    throw new AppError(fallback)
  }
  return data
}
