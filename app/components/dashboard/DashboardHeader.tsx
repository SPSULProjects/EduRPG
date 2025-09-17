"use client"

import { Button } from "@/app/components/ui/button"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { UserRole } from "@/app/lib/generated"
import { LogOut, Home } from "lucide-react"

interface DashboardHeaderProps {
  userName: string
  userRole?: UserRole
}

export function DashboardHeader({ userName, userRole }: DashboardHeaderProps) {
  const router = useRouter()

  const handleLogout = () => {
    signOut({ callbackUrl: "/" })
  }

  const handleBackToMain = () => {
    router.push("/")
  }

  const getRoleDisplayName = (role?: UserRole) => {
    switch (role) {
      case UserRole.STUDENT:
        return "Student"
      case UserRole.TEACHER:
        return "Učitel"
      case UserRole.OPERATOR:
        return "Operátor"
      default:
        return "Uživatel"
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Vítejte, {userName}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Role: {getRoleDisplayName(userRole)}
        </p>
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center space-x-3">
        <Button
          variant="outline"
          onClick={handleBackToMain}
          className="flex items-center space-x-2"
        >
          <Home className="w-4 h-4" />
          <span>Zpět na hlavní stránku</span>
        </Button>
        
        <Button
          variant="outline"
          onClick={handleLogout}
          className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
        >
          <LogOut className="w-4 h-4" />
          <span>Odhlásit se</span>
        </Button>
      </div>
    </div>
  )
}
