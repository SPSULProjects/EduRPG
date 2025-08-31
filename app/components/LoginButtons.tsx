"use client"

import { Button } from "@/app/components/ui/button"
import { useRouter } from "next/navigation"

export function LoginButtons() {
  const router = useRouter()

  const handleLogin = () => {
    router.push("/auth/signin")
  }

  const handleLearnMore = () => {
    // Scroll to features section or navigate to a learn more page
    const featuresSection = document.getElementById("features")
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <Button 
        size="lg" 
        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        onClick={handleLogin}
      >
        Přihlásit se
      </Button>
      <Button 
        size="lg" 
        variant="outline"
        onClick={handleLearnMore}
      >
        Zjistit více
      </Button>
    </div>
  )
}
