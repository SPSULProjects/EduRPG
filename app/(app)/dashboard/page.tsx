import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/app/lib/auth"
import { StudentDashboardModern } from "@/app/components/dashboard/StudentDashboardModern"
import { TeacherDashboard } from "@/app/components/dashboard/TeacherDashboard"
import { OperatorDashboard } from "@/app/components/dashboard/OperatorDashboard"
import { UserRole } from "@/app/lib/generated"
import { DashboardHeader } from "@/app/components/dashboard/DashboardHeader"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect("/auth/signin")
  }
  
  return (
    <div className="space-y-6">
      {/* Welcome Header with Action Buttons */}
      <DashboardHeader 
        userName={session.user?.name || "Uživateli"}
        userRole={session.user?.role}
      />
      
      {/* Role-specific Dashboard */}
      {session.user?.role === UserRole.STUDENT && session.user?.id && (
        <StudentDashboardModern userId={session.user.id} classId={session.user.classId} />
      )}
      
      {session.user?.role === UserRole.TEACHER && session.user?.id && (
        <TeacherDashboard userId={session.user.id} />
      )}
      
      {session.user?.role === UserRole.OPERATOR && session.user?.id && (
        <OperatorDashboard userId={session.user.id} />
      )}
      
      {/* Fallback for unknown roles or missing user data */}
      {(!session.user?.role || !session.user?.id) && (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading user information...</p>
        </div>
      )}
    </div>
  )
}