"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import { Progress } from "@/app/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { formatXP } from "@/app/lib/utils"
import { 
  Users, 
  Settings, 
  Database, 
  Activity, 
  Shield, 
  RefreshCw,
  TrendingUp,
  AlertTriangle
} from "lucide-react"

interface OperatorDashboardProps {
  userId: string
}

interface SystemStats {
  totalUsers: number
  totalJobs: number
  activeJobs: number
  totalXP: number
  systemHealth: {
    database: boolean
    lastBackup: string
  }
}

interface RecentActivity {
  id: string
  type: string
  message: string
  timestamp: string
  level: string
}

export function OperatorDashboard({ userId }: OperatorDashboardProps) {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [activity, setActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, activityResponse] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/activity")
      ])
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }
      
      if (activityResponse.ok) {
        const activityData = await activityResponse.json()
        setActivity(activityData.activity || [])
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const triggerSync = async () => {
    try {
      const response = await fetch("/api/admin/sync", {
        method: "POST"
      })
      
      if (response.ok) {
        // Show success message
        console.log("Sync triggered successfully")
      }
    } catch (error) {
      console.error("Error triggering sync:", error)
    }
  }

  const triggerBackup = async () => {
    try {
      const response = await fetch("/api/admin/backup", {
        method: "POST"
      })
      
      if (response.ok) {
        console.log("Backup triggered successfully")
      }
    } catch (error) {
      console.error("Error triggering backup:", error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Celkem uživatelů
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {stats?.totalUsers || 0}
            </div>
            <p className="text-xs text-blue-600">Registrovaní hráči</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Aktivní úkoly
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {stats?.activeJobs || 0}
            </div>
            <p className="text-xs text-green-600">Probíhající mise</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Celkové XP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {formatXP(stats?.totalXP || 0)}
            </div>
            <p className="text-xs text-purple-600">Rozdané zkušenosti</p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${
          stats?.systemHealth.database 
            ? "from-green-50 to-green-100 border-green-200" 
            : "from-red-50 to-red-100 border-red-200"
        }`}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium flex items-center ${
              stats?.systemHealth.database ? "text-green-700" : "text-red-700"
            }`}>
              <Database className="w-4 h-4 mr-2" />
              Databáze
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              stats?.systemHealth.database ? "text-green-900" : "text-red-900"
            }`}>
              {stats?.systemHealth.database ? "Online" : "Offline"}
            </div>
            <p className={`text-xs ${
              stats?.systemHealth.database ? "text-green-600" : "text-red-600"
            }`}>
              {stats?.systemHealth.database ? "Systém funkční" : "Problém s připojením"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Systémové akce</CardTitle>
          <CardDescription>
            Rychlé operace pro správu systému
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={triggerSync}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Synchronizace Bakaláři
            </Button>
            
            <Button 
              onClick={triggerBackup}
              variant="outline"
              className="border-green-500 text-green-600 hover:bg-green-50"
            >
              <Database className="w-4 h-4 mr-2" />
              Záloha databáze
            </Button>
            
            <Button variant="outline">
              <Shield className="w-4 h-4 mr-2" />
              Bezpečnostní audit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Overview */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Přehled systému</TabsTrigger>
          <TabsTrigger value="activity">Aktivita</TabsTrigger>
          <TabsTrigger value="settings">Nastavení</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-4 h-4 mr-2" />
                  Stav systému
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Databáze</span>
                  <Badge variant={stats?.systemHealth.database ? "default" : "destructive"}>
                    {stats?.systemHealth.database ? "Online" : "Offline"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Poslední záloha</span>
                  <span className="text-sm text-gray-500">
                    {stats?.systemHealth.lastBackup || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Celkem úkolů</span>
                  <span className="text-sm font-medium">{stats?.totalJobs || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* User Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Distribuce uživatelů
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Studenti</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={75} className="w-20 h-2" />
                      <span className="text-sm font-medium">75%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Učitelé</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={20} className="w-20 h-2" />
                      <span className="text-sm font-medium">20%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Operátoři</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={5} className="w-20 h-2" />
                      <span className="text-sm font-medium">5%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Poslední aktivita</CardTitle>
              <CardDescription>
                Logy systémových událostí
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      item.level === "ERROR" ? "bg-red-500" :
                      item.level === "WARN" ? "bg-yellow-500" :
                      "bg-green-500"
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.message}</p>
                      <p className="text-xs text-gray-500">{item.timestamp}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {item.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Systémová nastavení</CardTitle>
              <CardDescription>
                Konfigurace EduRPG platformy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Výchozí XP rozpočet</label>
                  <input 
                    type="number" 
                    defaultValue="1000"
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Interval synchronizace (min)</label>
                  <input 
                    type="number" 
                    defaultValue="15"
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              </div>
              <Button className="w-full">
                Uložit nastavení
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
