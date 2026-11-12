import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { fetchAllRooms } from '@/services/roomService'
import { fetchOpenBeds, type OpenBed } from '@/services/bedService'
import { submitRegistration } from '@/services/registrationService'
import { toUserMessage } from '@/lib/errors'
import { isUsernameValid, normalizeUsername } from '@/lib/authIdentity'
import type { RoomWithRelations } from '@/types/database'
import type { RegistrationInput } from '@/types/ops'

const empty: RegistrationInput = {
  full_name: '',
  date_of_birth: '',
  gender: '',
  nationality: 'Filipino',
  home_address: '',
  occupancy_type: 'student',
  school_or_company: '',
  email: '',
  mobile: '',
  emergency_name: '',
  emergency_relationship: '',
  emergency_phone: '',
  preferred_room_type: '',
  preferred_room_id: '',
  preferred_bed_id: '',
  preferred_move_in: '',
  expected_stay: '',
  special_requests: '',
  password: '',
}

export function RegistrationForm({ onClose }: { onClose?: () => void }) {
  const { siteId } = useSite()
  const toast = useToast()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(empty)
  const [idFile, setIdFile] = useState<File | null>(null)
  const [consent, setConsent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [rooms, setRooms] = useState<RoomWithRelations[]>([])
  const [openBeds, setOpenBeds] = useState<OpenBed[]>([])

  useEffect(() => {
    if (!siteId) return
    void fetchAllRooms(siteId).then((list) => setRooms(list.filter((room) => room.is_active)))
    void fetchOpenBeds(siteId).then(setOpenBeds).catch(() => setOpenBeds([]))
  }, [siteId])

  const roomsWithOpenBeds = useMemo(() => {
    const ids = new Set(openBeds.map((bed) => bed.room_id))
    return rooms.filter((room) => ids.has(room.id))
  }, [openBeds, rooms])

  const bedsForRoom = useMemo(
    () => openBeds.filter((bed) => bed.room_id === form.preferred_room_id),
    [form.preferred_room_id, openBeds],
  )

  const chosenRoom = rooms.find((room) => room.id === form.preferred_room_id)
  const chosenBed = openBeds.find((bed) => bed.bed_id === form.preferred_bed_id)

  function set<K extends keyof RegistrationInput>(key: K, value: RegistrationInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit() {
    if (!siteId) return
    if (!consent) {
      toast.error('Please accept the terms to continue.')
      return
    }
    if (!form.password || form.password.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    setSaving(true)
    try {
      const row = await submitRegistration(siteId, form, idFile)
      setDone(row.reference_number)
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to submit application.'))
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <p className="text-xs tracking-[0.22em] text-gold uppercase">Application received</p>
        <p className="mt-3 text-muted">
          Your reference number is <strong className="text-ink">{done}</strong>. You can sign in after approval
          using the username and password you entered.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/register/status"
            className="text-sm underline decoration-gold underline-offset-4"
            onClick={onClose}
          >
            Track application status
          </Link>
          {onClose ? (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-muted">
        Step {step} of 5. This application is saved to the HM Dormitory database so every administrator can review it.
      </p>

      {step === 1 ? (
        <div className="mt-5 grid gap-4">
          <Input label="Complete name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
          <Input label="Date of birth" type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
          <Select label="Gender (optional)" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </Select>
          <Input label="Nationality" value={form.nationality} onChange={(e) => set('nationality', e.target.value)} />
          <Textarea label="Home address" value={form.home_address} onChange={(e) => set('home_address', e.target.value)} />
          <Select label="Student or working professional" value={form.occupancy_type} onChange={(e) => set('occupancy_type', e.target.value)}>
            <option value="student">Student</option>
            <option value="professional">Working professional</option>
          </Select>
          <Input label="School or company" value={form.school_or_company} onChange={(e) => set('school_or_company', e.target.value)} />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-5 grid gap-4">
          <Input
            label="Username"
            autoComplete="username"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            hint="Letters, numbers, dots, underscores, or hyphens. 3–32 characters."
          />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            hint="Take note: remember your password. You will use it for your account once approved."
          />
          <Input label="Mobile number" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
          <Input label="Emergency contact name" value={form.emergency_name} onChange={(e) => set('emergency_name', e.target.value)} />
          <Input label="Relationship" value={form.emergency_relationship} onChange={(e) => set('emergency_relationship', e.target.value)} />
          <Input label="Emergency contact number" value={form.emergency_phone} onChange={(e) => set('emergency_phone', e.target.value)} />
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-5 grid gap-4">
          <Select
            label="Room"
            value={form.preferred_room_id}
            onChange={(e) => {
              const roomId = e.target.value
              const room = rooms.find((item) => item.id === roomId)
              setForm((current) => ({
                ...current,
                preferred_room_id: roomId,
                preferred_bed_id: '',
                preferred_room_type: room?.room_type ?? '',
              }))
            }}
          >
            <option value="">Select a room</option>
            {roomsWithOpenBeds.map((room) => (
              <option key={room.id} value={room.id}>
                Room {room.room_number} · {openBeds.filter((bed) => bed.room_id === room.id).length} beds open
              </option>
            ))}
          </Select>
          <Select
            label="Bed"
            value={form.preferred_bed_id}
            onChange={(e) => set('preferred_bed_id', e.target.value)}
          >
            <option value="">Select a bed</option>
            {bedsForRoom.map((bed) => (
              <option key={bed.bed_id} value={bed.bed_id}>
                {bed.bed_code}
              </option>
            ))}
          </Select>
          <Input label="Preferred move-in date" type="date" value={form.preferred_move_in} onChange={(e) => set('preferred_move_in', e.target.value)} />
          <Select label="Expected length of stay" value={form.expected_stay} onChange={(e) => set('expected_stay', e.target.value)}>
            <option value="">Select length of stay</option>
            <option value="1 semester">1 semester</option>
            <option value="2 semesters">2 semesters</option>
          </Select>
          <Textarea label="Special requests" value={form.special_requests} onChange={(e) => set('special_requests', e.target.value)} />
          <p className="text-sm text-muted">This room and bed are held for your application until an administrator reviews it.</p>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="mt-5 grid gap-4">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Valid ID (JPG, PNG, WebP, or PDF)</span>
            <input type="file" accept="image/*,.pdf" onChange={(e) => setIdFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="mt-5 space-y-3 rounded-xl border border-line bg-paper-2 p-4 text-sm">
          <p><strong>Name:</strong> {form.full_name}</p>
          <p><strong>Username:</strong> {form.email}</p>
          <p><strong>Mobile:</strong> {form.mobile}</p>
          <p><strong>Move-in:</strong> {form.preferred_move_in || '—'}</p>
          <p><strong>Stay:</strong> {form.expected_stay || '—'}</p>
          <p>
            <strong>Room:</strong> {chosenRoom?.room_number || '—'}
            {' · '}
            <strong>Bed:</strong> {chosenBed?.bed_code || '—'}
          </p>
          <label className="mt-4 flex items-start gap-2">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>I agree to the house rules, terms, and privacy notice, and I confirm this information is true.</span>
          </label>
        </div>
      ) : null}

      <div className="mt-6 flex gap-3">
        {step > 1 ? (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        ) : null}
        {step < 5 ? (
          <Button
            onClick={() => {
              if (step === 2) {
                if (!isUsernameValid(form.email)) {
                  toast.error('Choose a username with 3–32 letters, numbers, dots, underscores, or hyphens.')
                  return
                }
                if (!form.password || form.password.length < 8) {
                  toast.error('Password must be at least 8 characters.')
                  return
                }
                set('email', normalizeUsername(form.email))
              }
              if (step === 3 && (!form.preferred_room_id || !form.preferred_bed_id)) {
                toast.error('Choose a room and a bed to continue.')
                return
              }
              setStep((s) => s + 1)
            }}
          >
            Continue
          </Button>
        ) : (
          <Button disabled={saving} onClick={() => void submit()}>
            {saving ? 'Submitting…' : 'Submit application'}
          </Button>
        )}
      </div>
    </div>
  )
}
