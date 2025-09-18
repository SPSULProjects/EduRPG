"use client"

import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import { Progress } from "@/app/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { formatXP, calculateLevel } from "@/app/lib/utils"
import { Sword, Trophy, Coins, Target, AlertCircle } from "lucide-react"
import { useApi, useApiMutation } from "@/app/hooks/use-api"

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

interface DashboardData {
  jobs: Job[]
  totalXP: number
}

export function StudentDashboardModern({ userId, classId }: StudentDashboardProps) {
  const { data: dashboardData, loading, error, execute: fetchData } = useApi<DashboardData>()
  
  const { 
    mutate: applyForJob, 
    loading: applying, 
    error: applyError 
  } = useApiMutation<string, { jobId: string }>(
    async ({ jobId }) => {
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: "POST"
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || "Failed to apply for job")
      }
      
      const result = await response.json()
      return result.assignment.id
    },
    {
      onSuccess: () => {
        // Refresh dashboard data after successful application
        fetchData(async () => {
          const [jobsResponse, xpResponse] = await Promise.all([
            fetch("/api/jobs"),
            fetch("/api/xp/student")
          ])
          
          if (!jobsResponse.ok || !xpResponse.ok) {
            throw new Error("Failed to fetch dashboard data")
          }
          
          const jobsData = await jobsResponse.json()
          const xpData = await xpResponse.json()
          
          return {
            jobs: jobsData.data?.jobs || [],
            totalXP: xpData.totalXP || 0
          }
        })
      }
    }
  )

  useEffect(() => {
    fetchData(async () => {
      const [jobsResponse, xpResponse] = await Promise.all([
        fetch("/api/jobs"),
        fetch("/api/xp/student")
      ])
      
      if (!jobsResponse.ok || !xpResponse.ok) {
        throw new Error("Failed to fetch dashboard data")
      }
      
      const jobsData = await jobsResponse.json()
      const xpData = await xpResponse.json()
      
      return {
        jobs: jobsData.data?.jobs || [],
        totalXP: xpData.totalXP || 0
      }
    })
  }, [fetchData])

  const handleApplyForJob = (jobId: string) => {
    applyForJob({ jobId })
  }

  const levelData = calculateLevel(dashboardData?.totalXP || 0)
  const xpToNextLevel = (levelData.level + 1) * 100 - (dashboardData?.totalXP || 0)
  const xpProgress = levelData.progress

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Dashboard</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => fetchData} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const availableJobs = dashboardData?.jobs.filter(job => 
    job.status === "OPEN" && 
    !job.assignments.some(assignment => assignment.status === "APPLIED")
  ) || []

  const myApplications = dashboardData?.jobs.filter(job => 
    job.assignments.some(assignment => assignment.status === "APPLIED")
  ) || []

  return (
    <div className="space-y-6">
      {/* XP and Level Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total XP</CardTitle>
            <Sword className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatXP(dashboardData?.totalXP || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Level {levelData.level}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">XP to Next Level</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatXP(xpToNextLevel)}</div>
            <Progress value={xpProgress * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Applications</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myApplications.length}</div>
            <p className="text-xs text-muted-foreground">
              Jobs applied for
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Tabs */}
      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available">Available Jobs</TabsTrigger>
          <TabsTrigger value="applications">My Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          {availableJobs.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No available jobs at the moment.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {availableJobs.map((job) => (
                <Card key={job.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {job.description}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">{job.subject.name}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Sword className="h-4 w-4" />
                          <span>{formatXP(job.xpReward)} XP</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Coins className="h-4 w-4" />
                          <span>{job.moneyReward} coins</span>
                        </div>
                        <span>by {job.teacher.name}</span>
                      </div>
                      <Button
                        onClick={() => handleApplyForJob(job.id)}
                        disabled={applying}
                        size="sm"
                      >
                        {applying ? "Applying..." : "Apply"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          {myApplications.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>You haven&apos;t applied for any jobs yet.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {myApplications.map((job) => {
                const myAssignment = job.assignments.find(assignment => assignment.status === "APPLIED")
                return (
                  <Card key={job.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{job.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {job.description}
                          </CardDescription>
                        </div>
                        <Badge variant="outline">Applied</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Sword className="h-4 w-4" />
                            <span>{formatXP(job.xpReward)} XP</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Coins className="h-4 w-4" />
                            <span>{job.moneyReward} coins</span>
                          </div>
                          <span>by {job.teacher.name}</span>
                        </div>
                        <Badge variant="secondary">
                          {myAssignment?.status || "Unknown"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {applyError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{applyError}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
