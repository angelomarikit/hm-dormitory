import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Seo } from '@/components/ui/Seo'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'

export default function AdminLoginPage() {
  const { site, loading: siteLoading, error: siteError } = useSite()
  const { signIn, loading, isSiteAdmin, authError, clearAuthError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!siteLoading && isSiteAdmin) {
    return <Navigate to="/admin/dashboard" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    clearAuthError()
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
    } catch {
      // AuthContext stores the message.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <Seo title={`Admin · ${site?.name ?? 'Sign in'}`} description="Administrator sign in." path="/admin" />
      <div className="w-full max-w-md rounded-xl border border-line bg-white p-6 sm:p-8">
        <p className="text-xs tracking-[0.22em] text-gold uppercase">Administrator</p>
        <span className="gold-rule mt-4" />
        <h1 className="mt-4 font-display text-3xl">{site?.name ?? 'Sign in'}</h1>
        <p className="mt-2 text-sm text-muted">Sign in to manage this website.</p>

        {siteError ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{siteError}</p>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <div className="relative">
            <Input
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="absolute top-9 right-3 rounded-full p-1 text-muted"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {authError ? <p className="text-sm text-red-700">{authError}</p> : null}
          <Button type="submit" className="w-full" disabled={submitting || loading || !site}>
            {submitting || loading ? <Spinner /> : null}
            Sign In
          </Button>
        </form>
      </div>
    </div>
  )
}
