import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { SiteProvider } from '@/contexts/SiteContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { StaffUnreadProvider } from '@/contexts/StaffUnreadContext'
import { ToastProvider } from '@/contexts/ToastContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SiteProvider>
        <AuthProvider>
          <StaffUnreadProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </StaffUnreadProvider>
        </AuthProvider>
      </SiteProvider>
    </BrowserRouter>
  </StrictMode>,
)
