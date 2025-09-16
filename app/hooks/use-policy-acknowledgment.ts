"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

export function usePolicyAcknowledgment() {
  const session = useSession()
  const [hasAcknowledged, setHasAcknowledged] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkPolicyAcknowledgment = async () => {
      if (session.status === "loading") {
        return
      }
      
      if (!session.data?.user?.id) {
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/policy/check?userId=${session.data.user.id}`)
        
        if (response.ok) {
          const data = await response.json()
          setHasAcknowledged(data.hasAcknowledged)
        } else {
          // If API fails, assume not acknowledged to be safe
          setHasAcknowledged(false)
        }
      } catch (error) {
        console.error("Error checking policy acknowledgment:", error)
        // If error, assume not acknowledged to be safe
        setHasAcknowledged(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkPolicyAcknowledgment()
  }, [session.status, session.data?.user?.id])

  return {
    hasAcknowledged,
    isLoading,
    shouldShowModal: !isLoading && !hasAcknowledged
  }
}
