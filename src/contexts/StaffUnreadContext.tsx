import { createContext, useContext, type ReactNode } from 'react'
import { useStaffMessageUnreadsState } from '@/hooks/useStaffMessageUnreads'

type StaffUnreadValue = ReturnType<typeof useStaffMessageUnreadsState>

const StaffUnreadContext = createContext<StaffUnreadValue | null>(null)

export function StaffUnreadProvider({ children }: { children: ReactNode }) {
  const value = useStaffMessageUnreadsState()
  return <StaffUnreadContext.Provider value={value}>{children}</StaffUnreadContext.Provider>
}

export function useStaffMessageUnreads() {
  const value = useContext(StaffUnreadContext)
  if (!value) {
    return { total: 0, byConversation: {} as Record<string, number>, refresh: async () => {} }
  }
  return value
}
