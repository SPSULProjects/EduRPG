"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import { Progress } from "@/app/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { formatXP } from "@/app/lib/utils"
import { BookOpen, Users, Award, TrendingUp, Plus } from "lucide-react"

interface TeacherDashboardProps {
  userId: string
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
  assignments: Array<{
    id: string
    status: string
    student: {
      name: string
      email: string
    }
  }>
}

interface DailyBudget {
  subject: {
    name: string
    code: string
  }
  budget: number
  used: number
  remaining: number
}

export function TeacherDashboard({ userId }: TeacherDashboardProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [budgets, setBudgets] = useState<DailyBudget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [jobsResponse, budgetsResponse] = await Promise.all([
        fetch("/api/jobs"),
        fetch("/api/teacher/budget/today")
      ])
      
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json()
        setJobs(jobsData.data?.jobs || [])
      }
      
      if (budgetsResponse.ok) {
        const budgetsData = await budgetsResponse.json()
        setBudgets(budgetsData.budgets || [])
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const approveAssignment = async (assignmentId: string) => {
    try {
      const response = await fetch(`/api/jobs/assignments/${assignmentId}/approve`, {
        method: "POST"
      })
      
      if (response.ok) {
        fetchDashboardData()
      }
    } catch (error) {
      console.error("Error approving assignment:", error)
    }
  }

  const completeJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/complete`, {
        method: "POST"
      })
      
      if (response.ok) {
        fetchDashboardData()
      }
    } catch (error) {
      console.error("Error completing job:", error)
    }
  }

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

  const totalJobs = jobs.length
  const activeJobs = jobs.filter(job => job.status === "OPEN").length
  const pendingAssignments = jobs.reduce((total, job) => 
    total + job.assignments.filter(a => a.status === "APPLIED").length, 0
  )

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
              <BookOpen className="w-4 h-4 mr-2" />
              Celkem úkolů
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{totalJobs}</div>
            <p className="text-xs text-blue-600">Vytvořené mise</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Aktivní úkoly
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{activeJobs}</div>
            <p className="text-xs text-green-600">Otevřené pro přihlášení</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700 flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Čekající přihlášky
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900">{pendingAssignments}</div>
            <p className="text-xs text-yellow-600">K schválení</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center">
              <Award className="w-4 h-4 mr-2" />
              Dnešní XP rozpočet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {budgets.reduce((total, budget) => total + budget.remaining, 0)}
            </div>
            <p className="text-xs text-purple-600">Zbývá k rozdání</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Budgets */}
      <Card>
        <CardHeader>
          <CardTitle>Denní XP rozpočty</CardTitle>
          <CardDescription>
            Zbývající XP pro dnešní den podle předmětů
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map((budget) => (
              <div key={budget.subject.code} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{budget.subject.name}</span>
                  <Badge variant="outline">
                    {budget.remaining}/{budget.budget}
                  </Badge>
                </div>
                <Progress 
                  value={(budget.used / budget.budget) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-gray-500">
                  Použito: {budget.used} XP
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Jobs Management */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Aktivní úkoly</TabsTrigger>
          <TabsTrigger value="pending">Čekající schválení</TabsTrigger>
          <TabsTrigger value="completed">Dokončené</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Aktivní úkoly</h3>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Nový úkol
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.filter(job => job.status === "OPEN").map((job) => (
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
                    Přihlášení: {job.assignments.length} studentů
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                    >
                      Upravit
                    </Button>
                    <Button 
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => completeJob(job.id)}
                    >
                      Dokončit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <h3 className="text-lg font-semibold">Čekající na schválení</h3>
          <div className="space-y-4">
            {jobs
              .filter(job => job.assignments.some(a => a.status === "APPLIED"))
              .map((job) => (
                <Card key={job.id} className="border-l-4 border-l-yellow-500">
                  <CardHeader>
                    <CardTitle className="text-lg">{job.title}</CardTitle>
                    <CardDescription>
                      <Badge variant="outline" className="mb-2">
                        {job.subject.name}
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {job.assignments
                        .filter(a => a.status === "APPLIED")
                        .map((assignment) => (
                          <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">{assignment.student.name}</p>
                              <p className="text-sm text-gray-500">{assignment.student.email}</p>
                            </div>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={() => approveAssignment(assignment.id)}
                              >
                                Schválit
                              </Button>
                              <Button 
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                Odmítnout
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <h3 className="text-lg font-semibold">Dokončené úkoly</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.filter(job => job.status === "CLOSED").map((job) => (
              <Card key={job.id} className="border-l-4 border-l-green-500">
                <CardHeader>
                  <CardTitle className="text-lg">{job.title}</CardTitle>
                  <CardDescription>
                    <Badge variant="outline" className="mb-2">
                      {job.subject.name}
                    </Badge>
                    <p className="text-sm text-gray-600 mt-2">{job.description}</p>
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
                    Dokončeno: {job.assignments.filter(a => a.status === "COMPLETED").length} studentů
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
