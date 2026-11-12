import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'

export default function PendingBoarderPage() {
  const { signOut, boarderProfile } = useAuth()
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="text-xs tracking-[0.22em] text-gold uppercase">HM Dormitory</p>
      <h1 className="mt-4 font-display text-4xl">Application under review</h1>
      <p className="mt-4 text-muted">
        Status: {boarderProfile?.status ?? 'pending'}. You will be able to use the boarder dashboard after an
        administrator approves your application and assigns a room.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to="/register/status">
          <Button variant="outline">Check status</Button>
        </Link>
        <Button onClick={() => void signOut()}>Log out</Button>
      </div>
    </div>
  )
}
