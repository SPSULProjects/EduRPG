"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import { Progress } from "@/app/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { formatXP, calculateLevel } from "@/app/lib/utils"
import { Sword, Trophy, Coins, Target } from "lucide-react"

interface StudentDashboardProps {
  userId: string
  classId?: string
}

interface Job {
  id: string
  title: string
  description: string
  xpReward: number
  moneyReward: number
  status: string
  subject: {
    name: string
  }
  teacher: {
    name: string
  }
  assignments: Array<{
    id: string
    status: string
  }>
}

export function StudentDashboard({ userId, classId }: StudentDashboardProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [xp, setXp] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [jobsResponse, xpResponse] = await Promise.all([
        fetch("/api/jobs"),
        fetch("/api/xp/student")
      ])
      
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json()
        setJobs(jobsData.jobs || [])
      }
      
      if (xpResponse.ok) {
        const xpData = await xpResponse.json()
        setXp(xpData.totalXP || 0)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const applyForJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: "POST"
      })
      
      if (response.ok) {
        // Refresh jobs to show updated status
        fetchDashboardData()
      }
    } catch (error) {
      console.error("Error applying for job:", error)
    }
  }

  const { level, progress } = calculateLevel(xp)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
              <Target className="w-4 h-4 mr-2" />
              Úroveň
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{level}</div>
            <Progress value={progress} className="mt-2" />
            <p className="text-xs text-blue-600 mt-1">{progress}% k další úrovni</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center">
              <Trophy className="w-4 h-4 mr-2" />
              Celkové XP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{formatXP(xp)}</div>
            <p className="text-xs text-green-600">Získané zkušenosti</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700 flex items-center">
              <Coins className="w-4 h-4 mr-2" />
              Peníze
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900">0 Kč</div>
            <p className="text-xs text-yellow-600">Dostupné prostředky</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center">
              <Sword className="w-4 h-4 mr-2" />
              Aktivní úkoly
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {jobs.filter(job => job.assignments.length > 0).length}
            </div>
            <p className="text-xs text-purple-600">Probíhající mise</p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Section */}
      <Tabs defaultValue="available" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available">Dostupné úkoly</TabsTrigger>
          <TabsTrigger value="active">Moje úkoly</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.filter(job => job.assignments.length === 0).map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{job.title}</CardTitle>
                  <CardDescription>
                    <Badge variant="outline" className="mb-2">
                      {job.subject.name}
                    </Badge>
                    <p className="text-sm text-gray-600 mt-2">{job.description}</p>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 font-medium">
                      {formatXP(job.xpReward)}
                    </span>
                    <span className="text-yellow-600 font-medium">
                      {job.moneyReward} Kč
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Učitel: {job.teacher.name}
                  </div>
                  <Button 
                    onClick={() => applyForJob(job.id)}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    Přihlásit se
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.filter(job => job.assignments.length > 0).map((job) => (
              <Card key={job.id} className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="text-lg">{job.title}</CardTitle>
                  <CardDescription>
                    <Badge 
                      variant={job.assignments[0].status === "APPROVED" ? "default" : "secondary"}
                      className="mb-2"
                    >
                      {job.assignments[0].status === "APPROVED" ? "Schváleno" : "Čeká na schválení"}
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-green-600 font-medium">
                      {formatXP(job.xpReward)}
                    </span>
                    <span className="text-yellow-600 font-medium">
                      {job.moneyReward} Kč
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Předmět: {job.subject.name}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
