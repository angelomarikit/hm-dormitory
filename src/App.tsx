import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PublicLayout } from '@/layouts/PublicLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { BoarderLayout } from '@/layouts/BoarderLayout'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import {
  ProtectedAdminRoute,
  ProtectedBoarderRoute,
  ProtectedCaretakerRoute,
  ProtectedPendingBoarderRoute,
} from '@/components/ProtectedAdminRoute'
import { PageLoader } from '@/components/ui/Spinner'
import { RegistrationModal } from '@/components/public/RegistrationModal'
import { RegistrationModalProvider } from '@/contexts/RegistrationModalContext'
import AdminLoginPage from '@/pages/admin/AdminLoginPage'
import LoginPage from '@/pages/auth/LoginPage'

const HomePage = lazy(() => import('@/pages/public/HomePage'))
const NotFoundPage = lazy(() => import('@/pages/public/NotFoundPage'))
const RegisterStatusPage = lazy(() => import('@/pages/public/RegisterStatusPage'))
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const RegistrationsPage = lazy(() => import('@/pages/admin/RegistrationsPage'))
const TenantsPage = lazy(() => import('@/pages/admin/TenantsPage'))
const AnnouncementsPage = lazy(() => import('@/pages/admin/AnnouncementsPage'))
const AdminRoomsPage = lazy(() => import('@/pages/admin/RoomsPage'))
const AmenitiesPage = lazy(() => import('@/pages/admin/AmenitiesPage'))
const RatesPage = lazy(() => import('@/pages/admin/RatesPage'))
const FaqsPage = lazy(() => import('@/pages/admin/FaqsPage'))
const HouseRulesAdminPage = lazy(() => import('@/pages/admin/HouseRulesPage'))
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'))
const BillingPage = lazy(() => import('@/pages/admin/BillingPage'))
const PaymentsPage = lazy(() => import('@/pages/admin/PaymentsPage'))
const NoticesPage = lazy(() => import('@/pages/admin/NoticesPage'))
const MessagesPage = lazy(() => import('@/pages/admin/MessagesPage'))
const ReportsPage = lazy(() => import('@/pages/admin/ReportsPage'))
const ActivityPage = lazy(() => import('@/pages/admin/ActivityPage'))
const AdminMaintenancePage = lazy(() => import('@/pages/caretaker/CaretakerMaintenancePage'))
const PendingBoarderPage = lazy(() => import('@/pages/boarder/PendingBoarderPage'))
const BoarderHomePage = lazy(() => import('@/pages/boarder/BoarderHomePage'))
const BoarderBillsPage = lazy(() => import('@/pages/boarder/BoarderBillsPage'))
const BoarderPayPage = lazy(() => import('@/pages/boarder/BoarderPayPage'))
const BoarderHistoryPage = lazy(() => import('@/pages/boarder/BoarderHistoryPage'))
const BoarderProfilePage = lazy(() => import('@/pages/boarder/BoarderProfilePage'))
const BoarderNoticesPage = lazy(() => import('@/pages/boarder/BoarderNoticesPage'))
const BoarderMessagesPage = lazy(() => import('@/pages/boarder/BoarderMessagesPage'))
const BoarderMaintenancePage = lazy(() => import('@/pages/boarder/BoarderMaintenancePage'))
const CaretakerHomePage = lazy(() => import('@/pages/caretaker/CaretakerHomePage'))
const CaretakerBoardersPage = lazy(() => import('@/pages/caretaker/CaretakerBoardersPage'))
const CaretakerRoomsPage = lazy(() => import('@/pages/caretaker/CaretakerRoomsPage'))
const CaretakerCollectionsPage = lazy(() => import('@/pages/caretaker/CaretakerCollectionsPage'))
const CaretakerMessagesPage = lazy(() => import('@/pages/caretaker/CaretakerMessagesPage'))
const CaretakerMaintenancePage = lazy(() => import('@/pages/caretaker/CaretakerMaintenancePage'))

function Fallback() {
  return <PageLoader label="Loading page…" />
}

export default function App() {
  return (
    <RegistrationModalProvider>
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminLoginPage />} />

        <Route element={<ProtectedAdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<DashboardPage />} />
            <Route path="/admin/registrations" element={<RegistrationsPage />} />
            <Route path="/admin/tenants" element={<TenantsPage />} />
            <Route path="/admin/announcements" element={<AnnouncementsPage />} />
            <Route path="/admin/rooms" element={<AdminRoomsPage />} />
            <Route path="/admin/billing" element={<BillingPage />} />
            <Route path="/admin/payments" element={<PaymentsPage />} />
            <Route path="/admin/notices" element={<NoticesPage />} />
            <Route path="/admin/messages" element={<MessagesPage />} />
            <Route path="/admin/reports" element={<ReportsPage />} />
            <Route path="/admin/activity" element={<ActivityPage />} />
            <Route path="/admin/maintenance" element={<AdminMaintenancePage />} />
            <Route path="/admin/amenities" element={<AmenitiesPage />} />
            <Route path="/admin/rates" element={<RatesPage />} />
            <Route path="/admin/faqs" element={<FaqsPage />} />
            <Route path="/admin/house-rules" element={<HouseRulesAdminPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
            <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Route>

        <Route element={<ProtectedCaretakerRoute />}>
          <Route element={<CaretakerLayout />}>
            <Route path="/caretaker" element={<CaretakerHomePage />} />
            <Route path="/caretaker/boarders" element={<CaretakerBoardersPage />} />
            <Route path="/caretaker/rooms" element={<CaretakerRoomsPage />} />
            <Route path="/caretaker/collections" element={<CaretakerCollectionsPage />} />
            <Route path="/caretaker/messages" element={<CaretakerMessagesPage />} />
            <Route path="/caretaker/maintenance" element={<CaretakerMaintenancePage />} />
            <Route path="/caretaker/*" element={<Navigate to="/caretaker" replace />} />
          </Route>
        </Route>

        <Route element={<ProtectedPendingBoarderRoute />}>
          <Route path="/boarder/pending" element={<PendingBoarderPage />} />
        </Route>

        <Route element={<ProtectedBoarderRoute />}>
          <Route element={<BoarderLayout />}>
            <Route path="/boarder" element={<BoarderHomePage />} />
            <Route path="/boarder/bills" element={<BoarderBillsPage />} />
            <Route path="/boarder/pay" element={<BoarderPayPage />} />
            <Route path="/boarder/history" element={<BoarderHistoryPage />} />
            <Route path="/boarder/profile" element={<BoarderProfilePage />} />
            <Route path="/boarder/notices" element={<BoarderNoticesPage />} />
            <Route path="/boarder/messages" element={<BoarderMessagesPage />} />
            <Route path="/boarder/maintenance" element={<BoarderMaintenancePage />} />
            <Route path="/boarder/*" element={<Navigate to="/boarder" replace />} />
          </Route>
        </Route>

        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<Navigate to="/?register=1" replace />} />
          <Route path="/register/status/:ref" element={<RegisterStatusPage />} />
          <Route path="/register/status" element={<RegisterStatusPage />} />
          <Route path="/rooms" element={<Navigate to="/#rooms" replace />} />
          <Route path="/house-rules" element={<Navigate to="/#house-rules" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
      <RegistrationModal />
    </RegistrationModalProvider>
  )
}
