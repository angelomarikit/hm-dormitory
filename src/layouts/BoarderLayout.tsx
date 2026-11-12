import { Bell, FileText, Home, MessageSquare, User, Wallet, Wrench } from 'lucide-react'
import { PortalShell } from '@/layouts/PortalShell'

const items = [
  { to: '/boarder', label: 'Home', icon: Home, end: true },
  { to: '/boarder/bills', label: 'Bills', icon: FileText },
  { to: '/boarder/pay', label: 'Pay', icon: Wallet },
  { to: '/boarder/notices', label: 'Notices', icon: Bell },
  { to: '/boarder/messages', label: 'Messages', icon: MessageSquare },
  { to: '/boarder/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/boarder/history', label: 'History', icon: FileText },
  { to: '/boarder/profile', label: 'Profile', icon: User },
]

export function BoarderLayout() {
  return <PortalShell eyebrow="Boarder" items={items} homeTo="/boarder" />
}
