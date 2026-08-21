import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { validateImageFile } from '@/services/storageService'

interface ImageUploadProps {
  label: string
  hint?: string
  value?: string | null
  uploading?: boolean
  fit?: 'cover' | 'contain'
  onSelect: (file: File) => void
  onRemove?: () => void
}

export function ImageUpload({
  label,
  hint,
  value,
  uploading,
  fit = 'cover',
  onSelect,
  onRemove,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  function handleFile(file: File | undefined) {
    if (!file) return
    const error = validateImageFile(file)
    if (error) {
      setLocalError(error)
      return
    }
    setLocalError(null)
    onSelect(file)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink">{label}</p>
      {value ? (
        <img
          src={value}
          alt=""
          className={
            fit === 'contain'
              ? 'mx-auto h-40 w-40 rounded-2xl border border-line bg-white object-contain p-4'
              : 'h-40 w-full rounded-2xl object-cover'
          }
        />
      ) : (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-line bg-paper text-muted">
          No image yet
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Spinner /> : <ImagePlus className="h-4 w-4" />}
          {value ? 'Replace image' : 'Upload image'}
        </Button>
        {value && onRemove ? (
          <Button variant="ghost" disabled={uploading} onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          handleFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <p className="text-xs text-muted">{hint ?? 'JPG, PNG, or WebP. Maximum 5 MB.'}</p>
      {localError ? <p className="text-sm text-red-700">{localError}</p> : null}
    </div>
  )
}
