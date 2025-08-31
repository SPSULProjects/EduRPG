import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/app/lib/auth"
import { StudentDashboard } from "@/app/components/dashboard/StudentDashboard"
import { TeacherDashboard } from "@/app/components/dashboard/TeacherDashboard"
import { OperatorDashboard } from "@/app/components/dashboard/OperatorDashboard"
import { UserRole } from "@/app/lib/generated"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect("/auth/signin")
  }
  
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Vítejte, {session.user.name}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Role: {
              session.user.role === UserRole.STUDENT ? "Student" :
              session.user.role === UserRole.TEACHER ? "Učitel" :
              "Operátor"
            }
          </p>
        </div>
      </div>
      
      {/* Role-specific Dashboard */}
      {session.user.role === UserRole.STUDENT && (
        <StudentDashboard userId={session.user.id} classId={session.user.classId} />
      )}
      
      {session.user.role === UserRole.TEACHER && (
        <TeacherDashboard userId={session.user.id} />
      )}
      
      {session.user.role === UserRole.OPERATOR && (
        <OperatorDashboard userId={session.user.id} />
      )}
    </div>
  )
}