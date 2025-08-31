import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/app/lib/auth"
import { ShopInterface } from "@/app/components/shop/ShopInterface"
import { UserRole } from "@/app/lib/generated"

export default async function ShopPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect("/auth/signin")
  }
  
  return (
    <div className="space-y-6">
      {/* Shop Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Obchod
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Nakupujte kosmetické předměty a sbírejte odznaky
          </p>
        </div>
      </div>
      
      {/* Shop Interface */}
      <ShopInterface userId={session.user.id} userRole={session.user.role} />
    </div>
  )
}
