import { useState, type ReactNode } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Button } from '@/components/ui/Button'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { toUserMessage } from '@/lib/errors'
import { updateSite } from '@/services/siteService'
import { deleteSiteAssetByUrl, uploadSiteAsset } from '@/services/storageService'
import type { SiteUpdate } from '@/types/database'

export default function SettingsPage() {
  const { site, siteId, refreshSite } = useSite()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [form, setForm] = useState<SiteUpdate>({
    name: site?.name ?? '',
    short_description: site?.short_description ?? '',
    hero_heading: site?.hero_heading ?? '',
    hero_subheading: site?.hero_subheading ?? '',
    logo_url: site?.logo_url ?? '',
    hero_image_url: site?.hero_image_url ?? '',
    building_image_url: site?.building_image_url ?? '',
    address: site?.address ?? '',
    phone: site?.phone ?? '',
    email: site?.email ?? '',
    facebook_url: site?.facebook_url ?? '',
    messenger_url: site?.messenger_url ?? '',
    registration_url: site?.registration_url ?? '',
    google_maps_embed_url: site?.google_maps_embed_url ?? '',
    google_maps_directions_url: site?.google_maps_directions_url ?? '',
  })

  function updateField<K extends keyof SiteUpdate>(key: K, value: SiteUpdate[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function upload(folder: 'logo' | 'hero' | 'building', file: File, key: keyof SiteUpdate) {
    if (!siteId) return
    setUploading(key)
    try {
      const url = await uploadSiteAsset(siteId, folder, file)
      const previous = form[key]
      if (typeof previous === 'string' && previous) {
        await deleteSiteAssetByUrl(previous)
      }
      updateField(key, url)
      toast.success('Image uploaded.')
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to upload image.'))
    } finally {
      setUploading(null)
    }
  }

  async function save() {
    if (!siteId) return
    setSaving(true)
    try {
      await updateSite(siteId, form)
      await refreshSite()
      toast.success('Settings saved.')
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to save settings.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <AdminPageHeader
        title="Settings"
        description="Update the public website, including the Google Form used for boarder registration."
      />
      <div className="mt-6 space-y-8">
        <SettingsGroup title="Website copy">
          <Input label="Business name" value={form.name ?? ''} onChange={(event) => updateField('name', event.target.value)} />
          <Textarea
            label="Short description"
            value={form.short_description ?? ''}
            onChange={(event) => updateField('short_description', event.target.value)}
          />
          <Input
            label="Hero heading"
            value={form.hero_heading ?? ''}
            onChange={(event) => updateField('hero_heading', event.target.value)}
          />
          <Textarea
            label="Hero subheading"
            value={form.hero_subheading ?? ''}
            onChange={(event) => updateField('hero_subheading', event.target.value)}
          />
        </SettingsGroup>

        <SettingsGroup title="Images">
          <ImageUpload
            label="Logo"
            value={form.logo_url}
            uploading={uploading === 'logo_url'}
            onSelect={(file) => void upload('logo', file, 'logo_url')}
            onRemove={() => {
              void deleteSiteAssetByUrl(form.logo_url)
              updateField('logo_url', '')
            }}
          />
          <ImageUpload
            label="Hero image"
            value={form.hero_image_url}
            uploading={uploading === 'hero_image_url'}
            onSelect={(file) => void upload('hero', file, 'hero_image_url')}
            onRemove={() => {
              void deleteSiteAssetByUrl(form.hero_image_url)
              updateField('hero_image_url', '')
            }}
          />
          <ImageUpload
            label="Main building image"
            value={form.building_image_url}
            uploading={uploading === 'building_image_url'}
            onSelect={(file) => void upload('building', file, 'building_image_url')}
            onRemove={() => {
              void deleteSiteAssetByUrl(form.building_image_url)
              updateField('building_image_url', '')
            }}
          />
        </SettingsGroup>

        <SettingsGroup
          title="Location"
          description="These fields replace the sample address and map on the public Location section."
        >
          <Textarea
            label="Address"
            value={form.address ?? ''}
            placeholder="Street, barangay, city"
            onChange={(event) => updateField('address', event.target.value)}
          />
          <Textarea
            label="Google Maps embed URL"
            value={form.google_maps_embed_url ?? ''}
            placeholder="https://www.google.com/maps/embed?pb=..."
            onChange={(event) => updateField('google_maps_embed_url', event.target.value)}
          />
          <p className="text-xs text-muted">
            In Google Maps, open the dormitory location → Share → Embed a map → copy the <code>src</code> URL from the iframe
            (it starts with https://www.google.com/maps/embed).
          </p>
          <Input
            label="Google Maps directions URL"
            value={form.google_maps_directions_url ?? ''}
            placeholder="https://www.google.com/maps/dir/?api=1&destination=..."
            onChange={(event) => updateField('google_maps_directions_url', event.target.value)}
          />
          <p className="text-xs text-muted">
            This is the link for the Get Directions button. In Google Maps use Share → Copy link, or a directions URL.
          </p>
        </SettingsGroup>

        <SettingsGroup title="Contact">
          <Input label="Phone" value={form.phone ?? ''} onChange={(event) => updateField('phone', event.target.value)} />
          <Input label="Email" type="email" value={form.email ?? ''} onChange={(event) => updateField('email', event.target.value)} />
          <Input
            label="Facebook URL"
            value={form.facebook_url ?? ''}
            onChange={(event) => updateField('facebook_url', event.target.value)}
          />
          <Input
            label="Messenger URL"
            value={form.messenger_url ?? ''}
            onChange={(event) => updateField('messenger_url', event.target.value)}
          />
        </SettingsGroup>

        <SettingsGroup title="Registration">
          <Input
            label="Google Form registration URL"
            value={form.registration_url ?? ''}
            placeholder="https://docs.google.com/forms/d/e/..."
            onChange={(event) => updateField('registration_url', event.target.value)}
          />
          <p className="text-xs text-muted">
            Paste your Google Form link here. The “Registration Form” button on the website will open this form in a new tab. Leave it blank to hide the button.
          </p>
          {form.registration_url ? (
            <a
              href={form.registration_url}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm text-gold-dark hover:underline"
            >
              Open the current form
            </a>
          ) : null}
        </SettingsGroup>

        <Button disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}

function SettingsGroup({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4 rounded-xl border border-line bg-white p-5">
      <div>
        <h2 className="font-display text-xl">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}
