import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

interface RegistrationModalContextValue {
  open: boolean
  openRegister: () => void
  closeRegister: () => void
}

const RegistrationModalContext = createContext<RegistrationModalContextValue | undefined>(undefined)

export function RegistrationModalProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('register') === '1' || location.hash === '#register') {
      setOpen(true)
    }
  }, [location.hash, location.search])

  const openRegister = useCallback(() => setOpen(true), [])
  const closeRegister = useCallback(() => {
    setOpen(false)
    const params = new URLSearchParams(location.search)
    if (params.get('register') === '1' || location.hash === '#register') {
      navigate({ pathname: location.pathname === '/register' ? '/' : location.pathname, search: '', hash: '' }, { replace: true })
    }
  }, [location.hash, location.pathname, location.search, navigate])

  const value = useMemo(
    () => ({ open, openRegister, closeRegister }),
    [open, openRegister, closeRegister],
  )

  return <RegistrationModalContext.Provider value={value}>{children}</RegistrationModalContext.Provider>
}

export function useRegistrationModal() {
  const context = useContext(RegistrationModalContext)
  if (!context) {
    throw new Error('useRegistrationModal must be used within RegistrationModalProvider')
  }
  return context
}
