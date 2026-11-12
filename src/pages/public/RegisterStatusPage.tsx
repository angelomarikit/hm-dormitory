import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Seo } from '@/components/ui/Seo'
import { lookupRegistration } from '@/services/registrationService'
import { formatDateTime } from '@/utils/format'

export default function RegisterStatusPage() {
  const { ref } = useParams()
  const [reference, setReference] = useState(ref ?? '')
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<{ reference_number: string; status: string; submitted_at: string } | null>(null)
  const [missing, setMissing] = useState(false)

  async function lookup() {
    setMissing(false)
    const row = await lookupRegistration(reference, email)
    if (!row) setMissing(true)
    setResult(row)
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Seo title="Application status" path="/register/status" />
      <h1 className="font-display text-3xl">Track your application</h1>
      <div className="mt-6 grid gap-4">
        <Input label="Reference number" value={reference} onChange={(e) => setReference(e.target.value)} />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button onClick={() => void lookup()}>Check status</Button>
        {missing ? <p className="text-sm text-red-700">No application matched those details.</p> : null}
        {result ? (
          <div className="rounded-xl border border-line p-4">
            <p className="font-medium">{result.reference_number}</p>
            <p className="mt-1 capitalize text-muted">{result.status.replace('_', ' ')}</p>
            <p className="mt-1 text-sm text-muted">Submitted {formatDateTime(result.submitted_at)}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
