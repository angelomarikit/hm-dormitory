import { Banknote, Building2, Home, MessageSquare, Users, Wrench } from 'lucide-react'
import { PortalShell } from '@/layouts/PortalShell'

const items = [
  { to: '/caretaker', label: 'Home', icon: Home, end: true },
  { to: '/caretaker/boarders', label: 'Boarders', icon: Users },
  { to: '/caretaker/rooms', label: 'Rooms', icon: Building2 },
  { to: '/caretaker/collections', label: 'Cash', icon: Banknote },
  { to: '/caretaker/messages', label: 'Messages', icon: MessageSquare },
  { to: '/caretaker/maintenance', label: 'Maintenance', icon: Wrench },
]

export function CaretakerLayout() {
  return <PortalShell eyebrow="Caretaker" items={items} homeTo="/caretaker" />
}
