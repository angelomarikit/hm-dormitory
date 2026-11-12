import { Modal } from '@/components/ui/Modal'
import { RegistrationForm } from '@/components/public/RegistrationForm'
import { useRegistrationModal } from '@/contexts/RegistrationModalContext'

export function RegistrationModal() {
  const { open, closeRegister } = useRegistrationModal()

  return (
    <Modal open={open} title="Boarder registration" onClose={closeRegister} wide>
      <RegistrationForm onClose={closeRegister} />
    </Modal>
  )
}
