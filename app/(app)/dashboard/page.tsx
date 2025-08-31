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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Vítejte, {session.user.name}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Role: {session.user.role}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Úroveň</p>
            <p className="text-lg font-semibold">1</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">XP</p>
            <p className="text-lg font-semibold text-green-600">0</p>
          </div>
        </div>
      </div>
      
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