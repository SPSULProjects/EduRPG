"use client"

import { Button } from "@/app/components/ui/button"
import { useRouter } from "next/navigation"

export function CTAButton() {
  const router = useRouter()

  const handleGetStarted = () => {
    router.push("/auth/signin")
  }

  return (
    <Button 
      size="lg" 
      variant="secondary" 
      className="bg-white text-blue-600 hover:bg-gray-100"
      onClick={handleGetStarted}
    >
      Začít nyní
    </Button>
  )
}
