import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/lib/auth"
import { UserRole } from "@/app/lib/generated"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Only operators can trigger backup
    if (session.user.role !== UserRole.OPERATOR) {
      return NextResponse.json({ error: "Forbidden - Only operators can trigger backup" }, { status: 403 })
    }
    
    // Trigger database backup
    try {
      const { stdout, stderr } = await execAsync("npm run backup")
      
      if (stderr) {
        console.warn("Backup stderr:", stderr)
      }
      
      return NextResponse.json({
        success: true,
        message: "Backup completed successfully",
        output: stdout
      })
    } catch (backupError) {
      console.error("Backup execution error:", backupError)
      return NextResponse.json({ 
        error: "Backup execution failed", 
        details: backupError instanceof Error ? backupError.message : "Unknown error" 
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Admin backup error:", error)
    return NextResponse.json({ 
      error: "Backup failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}
