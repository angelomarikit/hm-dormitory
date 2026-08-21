import { useCallback, useEffect, useState } from 'react'

const PREFIX = 'apex-admin-draft:'

export function readSessionDraft<T>(key: string | null | undefined): T | null {
  if (!key) return null
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function writeSessionDraft(key: string | null | undefined, value: unknown) {
  if (!key) return
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearSessionDraft(key: string | null | undefined) {
  if (!key) return
  sessionStorage.removeItem(PREFIX + key)
}

export function useSessionDraft<T>(key: string | null, initialValue: T) {
  const [value, setValue] = useState<T>(() => readSessionDraft<T>(key) ?? initialValue)

  useEffect(() => {
    const stored = readSessionDraft<T>(key)
    if (stored !== null) setValue(stored)
  }, [key])

  useEffect(() => {
    writeSessionDraft(key, value)
  }, [key, value])

  const clearDraft = useCallback(() => {
    clearSessionDraft(key)
  }, [key])

  return [value, setValue, clearDraft] as const
}

export function useModalDraft<TForm>(key: string | null, emptyForm: TForm) {
  type Draft = { open: boolean; editingId: string | null; form: TForm }
  const stored = readSessionDraft<Draft>(key)
  const [open, setOpen] = useState(stored?.open ?? false)
  const [editingId, setEditingId] = useState<string | null>(stored?.editingId ?? null)
  const [form, setForm] = useState<TForm>(stored?.form ?? emptyForm)

  useEffect(() => {
    writeSessionDraft(key, { open, editingId, form })
  }, [key, open, editingId, form])

  const resetDraft = useCallback(() => {
    setOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    clearSessionDraft(key)
  }, [emptyForm, key])

  return { open, setOpen, editingId, setEditingId, form, setForm, resetDraft }
}
