"use server"

import { prisma } from "@/app/lib/prisma"
import { logEvent } from "@/app/lib/utils"
import { revalidatePath } from "next/cache"

export async function acknowledgePolicy(userId: string) {
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error("User not found")
    }

    // Create system log entry for policy acknowledgment
    await prisma.systemLog.create({
      data: {
        level: "INFO",
        message: "Policy acknowledged by user",
        userId: userId,
        metadata: {
          type: "policy_ack",
          timestamp: new Date().toISOString(),
          userRole: user.role
        }
      }
    })

    // Log the event using the utility function
    await logEvent("INFO", "Policy acknowledged", {
      userId: userId,
      metadata: {
        type: "policy_ack",
        userRole: user.role
      }
    })

    // Revalidate the dashboard page
    revalidatePath("/dashboard")

    return { success: true }
  } catch (error) {
    console.error("Error acknowledging policy:", error)
    
    // Log the error
    await logEvent("ERROR", "Policy acknowledgment failed", {
      userId: userId,
      metadata: {
        error: error instanceof Error ? error.message : "Unknown error"
      }
    })

    throw new Error("Failed to acknowledge policy")
  }
}
