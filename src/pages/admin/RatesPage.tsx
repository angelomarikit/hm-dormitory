import { useEffect, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { Textarea } from '@/components/ui/Textarea'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { toUserMessage } from '@/lib/errors'
import { clearSessionDraft, readSessionDraft, writeSessionDraft } from '@/hooks/useSessionDraft'
import { fetchRate, upsertRate } from '@/services/rateService'
import type { RateUpdate } from '@/types/database'

const emptyForm: RateUpdate = {
  monthly_rate: '',
  monthly_rate_label: 'Monthly boarding rate',
  electricity_information: '',
  water_information: '',
  other_fees: '',
  deposit_information: '',
  additional_notes: '',
}

export default function RatesPage() {
  const { siteId } = useSite()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<RateUpdate>(emptyForm)
  const draftKey = siteId ? `rates:${siteId}` : null

  useEffect(() => {
    if (!siteId) return
    const id: string = siteId
    let cancelled = false

    async function load(currentSiteId: string) {
      setLoading(true)
      try {
        const stored = readSessionDraft<RateUpdate>(`rates:${currentSiteId}`)
        if (stored) {
          if (!cancelled) {
            setForm(stored)
            setLoading(false)
          }
          return
        }
        const rate = await fetchRate(currentSiteId)
        if (!cancelled && rate) {
          setForm({
            monthly_rate: rate.monthly_rate ?? '',
            monthly_rate_label: rate.monthly_rate_label ?? 'Monthly boarding rate',
            electricity_information: rate.electricity_information ?? '',
            water_information: rate.water_information ?? '',
            other_fees: rate.other_fees ?? '',
            deposit_information: rate.deposit_information ?? '',
            additional_notes: rate.additional_notes ?? '',
          })
        }
      } catch (error) {
        toast.error(toUserMessage(error, 'Unable to load rates.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load(id)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  useEffect(() => {
    if (!draftKey || loading) return
    writeSessionDraft(draftKey, form)
  }, [draftKey, form, loading])

  async function save() {
    if (!siteId) return
    setSaving(true)
    try {
      await upsertRate(siteId, form)
      clearSessionDraft(draftKey)
      toast.success('Rates saved.')
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to save rates.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <AdminPageHeader
        title="Rates"
        description="Share general boarding information. This is not a billing or submeter tracker."
      />
      {loading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <div className="mt-6 space-y-4 rounded-xl border border-line bg-white p-5">
          <Input
            label="Rate label"
            value={form.monthly_rate_label ?? ''}
            onChange={(event) =>
              setForm((current) => ({ ...current, monthly_rate_label: event.target.value }))
            }
          />
          <Input
            label="Monthly boarding rate"
            value={form.monthly_rate ?? ''}
            placeholder="Example: 4,500 / month"
            onChange={(event) => setForm((current) => ({ ...current, monthly_rate: event.target.value }))}
          />
          <Textarea
            label="Electricity charge information"
            value={form.electricity_information ?? ''}
            onChange={(event) =>
              setForm((current) => ({ ...current, electricity_information: event.target.value }))
            }
          />
          <Textarea
            label="Water charge information"
            value={form.water_information ?? ''}
            onChange={(event) =>
              setForm((current) => ({ ...current, water_information: event.target.value }))
            }
          />
          <Textarea
            label="Other applicable fees"
            value={form.other_fees ?? ''}
            onChange={(event) => setForm((current) => ({ ...current, other_fees: event.target.value }))}
          />
          <Textarea
            label="Deposit information"
            value={form.deposit_information ?? ''}
            onChange={(event) =>
              setForm((current) => ({ ...current, deposit_information: event.target.value }))
            }
          />
          <Textarea
            label="Other dormitory information"
            value={form.additional_notes ?? ''}
            onChange={(event) =>
              setForm((current) => ({ ...current, additional_notes: event.target.value }))
            }
          />
          <Button disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  )
}
