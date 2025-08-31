"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/app/components/ui/button"
import { Card } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/app/components/ui/sheet"
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarTrigger 
} from "@/app/components/ui/sidebar"
import { 
  Home, 
  BookOpen, 
  Users, 
  Settings, 
  Trophy, 
  ShoppingCart, 
  Award, 
  Calendar,
  Menu,
  LogOut,
  User,
  Shield,
  Database,
  Activity
} from "lucide-react"
import { UserRole } from "@/app/lib/generated"
import { signOut } from "next-auth/react"
import { formatXP, calculateLevel } from "@/app/lib/utils"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!session?.user) {
    return <div>{children}</div>
  }

  const { level } = calculateLevel(0) // TODO: Get actual XP from session or context

  const getNavigationItems = () => {
    const baseItems = [
      {
        title: "Dashboard",
        icon: Home,
        href: "/dashboard",
        active: true
      }
    ]

    switch (session.user.role) {
      case UserRole.STUDENT:
        return [
          ...baseItems,
          {
            title: "Moje třída",
            icon: Users,
            href: "/class",
            active: false
          },
          {
            title: "Předměty",
            icon: BookOpen,
            href: "/subjects",
            active: false
          },
          {
            title: "Úspěchy",
            icon: Trophy,
            href: "/achievements",
            active: false
          },
          {
            title: "Obchod",
            icon: ShoppingCart,
            href: "/shop",
            active: false
          }
        ]
      
      case UserRole.TEACHER:
        return [
          ...baseItems,
          {
            title: "Moje třídy",
            icon: Users,
            href: "/classes",
            active: false
          },
          {
            title: "Předměty",
            icon: BookOpen,
            href: "/subjects",
            active: false
          },
          {
            title: "Úkoly",
            icon: Award,
            href: "/jobs",
            active: false
          },
          {
            title: "Události",
            icon: Calendar,
            href: "/events",
            active: false
          }
        ]
      
      case UserRole.OPERATOR:
        return [
          ...baseItems,
          {
            title: "Synchronizace",
            icon: Database,
            href: "/sync",
            active: false
          },
          {
            title: "Aktivita",
            icon: Activity,
            href: "/activity",
            active: false
          },
          {
            title: "Nastavení",
            icon: Settings,
            href: "/settings",
            active: false
          }
        ]
      
      default:
        return baseItems
    }
  }

  const navigationItems = getNavigationItems()

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden lg:flex">
        <SidebarHeader className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 p-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900 dark:text-white">EduRPG</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Gamifikace vzdělávání</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navigationItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild 
                  isActive={item.active}
                  className="w-full justify-start"
                >
                  <a href={item.href}>
                    <item.icon className="w-4 h-4 mr-3" />
                    {item.title}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="border-b border-gray-200 dark:border-gray-700 p-4">
            <SheetTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">EduRPG</h1>
                <p className="text-xs text-gray-500">Gamifikace vzdělávání</p>
              </div>
            </SheetTitle>
          </SheetHeader>
          <div className="p-4">
            <nav className="space-y-2">
              {navigationItems.map((item) => (
                <Button
                  key={item.title}
                  variant={item.active ? "default" : "ghost"}
                  className="w-full justify-start"
                  asChild
                >
                  <a href={item.href} onClick={() => setSidebarOpen(false)}>
                    <item.icon className="w-4 h-4 mr-3" />
                    {item.title}
                  </a>
                </Button>
              ))}
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                  <span className="sr-only">Otevřít menu</span>
                </Button>
              </SheetTrigger>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Dashboard
              </h2>
            </div>

            <div className="flex items-center space-x-4">
              {/* User Stats */}
              <div className="hidden md:flex items-center space-x-4">
                <Card className="px-3 py-2">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium">Úroveň {level}</span>
                  </div>
                </Card>
                <Card className="px-3 py-2">
                  <div className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">0 XP</span>
                  </div>
                </Card>
              </div>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {session.user.role === UserRole.STUDENT && "Student"}
                    {session.user.role === UserRole.TEACHER && "Učitel"}
                    {session.user.role === UserRole.OPERATOR && "Operátor"}
                  </p>
                </div>
                <Avatar className="w-8 h-8">
                  <AvatarImage src="" alt={session.user.name} />
                  <AvatarFallback>
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="sr-only">Odhlásit se</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
