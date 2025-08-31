"use client"

import { useState, useEffect } from "react"
import { SessionProvider } from "next-auth/react"
import { AppLayout } from "@/app/components/layout/AppLayout"
import { PolicyModal } from "@/app/components/PolicyModal"
import { usePolicyAcknowledgment } from "@/app/hooks/use-policy-acknowledgment"
import { Session } from "next-auth"

interface AppLayoutWrapperProps {
  children: React.ReactNode
  session: Session | null
}

export function AppLayoutWrapper({ children, session }: AppLayoutWrapperProps) {
  const [mounted, setMounted] = useState(false)
  const { shouldShowModal } = usePolicyAcknowledgment()
  const [showPolicyModal, setShowPolicyModal] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (shouldShowModal) {
      setShowPolicyModal(true)
    }
  }, [shouldShowModal])

  if (!mounted) {
    return null
  }

  return (
    <SessionProvider session={session}>
      <AppLayout>
        {children}
        <PolicyModal 
          isOpen={showPolicyModal} 
          onClose={() => setShowPolicyModal(false)} 
        />
      </AppLayout>
    </SessionProvider>
  )
}
