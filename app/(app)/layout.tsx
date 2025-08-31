import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { AppLayoutWrapper } from "@/app/components/layout/AppLayoutWrapper"

interface AppLayoutProps {
  children: React.ReactNode
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await getServerSession(authOptions)
  
  return (
    <AppLayoutWrapper session={session}>
      {children}
    </AppLayoutWrapper>
  )
}
