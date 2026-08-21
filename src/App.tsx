import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PublicLayout } from '@/layouts/PublicLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { ProtectedAdminRoute } from '@/components/ProtectedAdminRoute'
import { PageLoader } from '@/components/ui/Spinner'
import AdminLoginPage from '@/pages/admin/AdminLoginPage'

const HomePage = lazy(() => import('@/pages/public/HomePage'))
const NotFoundPage = lazy(() => import('@/pages/public/NotFoundPage'))
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const AnnouncementsPage = lazy(() => import('@/pages/admin/AnnouncementsPage'))
const AdminRoomsPage = lazy(() => import('@/pages/admin/RoomsPage'))
const AmenitiesPage = lazy(() => import('@/pages/admin/AmenitiesPage'))
const RatesPage = lazy(() => import('@/pages/admin/RatesPage'))
const FaqsPage = lazy(() => import('@/pages/admin/FaqsPage'))
const HouseRulesAdminPage = lazy(() => import('@/pages/admin/HouseRulesPage'))
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'))

function Fallback() {
  return <PageLoader label="Loading page…" />
}

export default function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route element={<ProtectedAdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<DashboardPage />} />
            <Route path="/admin/announcements" element={<AnnouncementsPage />} />
            <Route path="/admin/rooms" element={<AdminRoomsPage />} />
            <Route path="/admin/amenities" element={<AmenitiesPage />} />
            <Route path="/admin/rates" element={<RatesPage />} />
            <Route path="/admin/faqs" element={<FaqsPage />} />
            <Route path="/admin/house-rules" element={<HouseRulesAdminPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
            <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Route>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/rooms" element={<Navigate to="/#rooms" replace />} />
          <Route path="/house-rules" element={<Navigate to="/#house-rules" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
