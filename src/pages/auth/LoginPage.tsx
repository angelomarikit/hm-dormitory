import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Seo } from '@/components/ui/Seo'
import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'
import { useRegistrationModal } from '@/contexts/RegistrationModalContext'
import { requestPasswordReset } from '@/services/authService'
import { SiteLogo } from '@/components/BrandMark'

export default function LoginPage() {
  const { site } = useSite()
  const { signIn, loading, access, authError, clearAuthError } = useAuth()
  const { openRegister } = useRegistrationModal()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (access === 'cms') return <Navigate to="/admin/dashboard" replace />
  if (access === 'caretaker') return <Navigate to="/caretaker" replace />
  if (access === 'boarder') return <Navigate to="/boarder" replace />
  if (access === 'pending_boarder') return <Navigate to="/boarder/pending" replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    clearAuthError()
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
    } catch {
      /* shown via authError */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <Seo title={`Sign in · ${site?.name ?? 'HM Dormitory'}`} description="Sign in to your account." path="/login" />
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl border border-line bg-white p-6 sm:p-8">
        <SiteLogo url={site?.logo_url} name={site?.name} />
        <h1 className="mt-4 font-display text-3xl">{site?.name ?? 'HM Dormitory'}</h1>
        <p className="mt-1 text-sm text-muted">Boarders, caretakers, and administrators sign in here.</p>
        <div className="mt-6 grid gap-4">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {authError ? <p className="text-sm text-red-700">{authError}</p> : null}
          {resetSent ? <p className="text-sm text-muted">Password reset email sent if that account exists.</p> : null}
          <Button className="w-full" disabled={submitting || loading} type="submit">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
          <button
            type="button"
            className="text-sm text-muted underline"
            onClick={() => {
              if (!email.trim()) return
              void requestPasswordReset(email.trim()).then(() => setResetSent(true))
            }}
          >
            Forgot password
          </button>
          <p className="text-sm text-muted">
            Applying to stay?{' '}
            <button
              type="button"
              className="text-ink underline decoration-gold underline-offset-4"
              onClick={openRegister}
            >
              Register
            </button>
          </p>
        </div>
      </form>
    </div>
  )
}
