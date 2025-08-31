import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import { UserRole } from "./generated"
import { z } from "zod"
import { loginToBakalariAndFetchUserData, BakalariUserData } from "./bakalari/bakalari"
import { logEvent } from "./utils"

// Validation schema for credentials
const credentialsSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
})

// Helper function to map Bakalari user type to our UserRole
const mapBakalariUserTypeToRole = (userType: string): UserRole => {
  switch (userType.toLowerCase()) {
    case "student":
      return UserRole.STUDENT
    case "teacher":
      return UserRole.TEACHER
    case "operator":
    case "admin":
      return UserRole.OPERATOR
    default:
      return UserRole.STUDENT // Default fallback
  }
}

// Helper function to create or update user from Bakalari data
const upsertUserFromBakalari = async (bakalariData: BakalariUserData, bakalariToken: string) => {
  try {
    // Use transaction for atomicity and performance
    return await prisma.$transaction(async (tx) => {
      // Find or create class if user is a student
      let classId: string | undefined
      if (bakalariData.userType.toLowerCase() === "student" && bakalariData.classAbbrev) {
        const existingClass = await tx.class.findFirst({
          where: { name: bakalariData.classAbbrev }
        })
        
        if (existingClass) {
          classId = existingClass.id
        } else {
          const newClass = await tx.class.create({
            data: {
              name: bakalariData.classAbbrev,
              grade: extractGradeFromClass(bakalariData.classAbbrev)
            }
          })
          classId = newClass.id
        }
      }

      // Create or update user
      const user = await tx.user.upsert({
        where: { bakalariId: bakalariData.userID },
        update: {
          name: bakalariData.fullUserName,
          bakalariToken: bakalariToken,
          classId: classId,
          updatedAt: new Date()
        },
        create: {
          email: `${bakalariData.userID}@bakalari.local`, // Generate email from Bakalari ID
          name: bakalariData.fullUserName,
          role: mapBakalariUserTypeToRole(bakalariData.userType),
          bakalariId: bakalariData.userID,
          bakalariToken: bakalariToken,
          classId: classId
        }
      })

      return user
    })
  } catch (error) {
    console.error("Error upserting user from Bakalari:", error)
    throw error
  }
}

// Helper function to extract grade from class abbreviation
const extractGradeFromClass = (classAbbrev: string): number => {
  const match = classAbbrev.match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : 1
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Bakaláři",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          // Validate input
          const validatedCredentials = credentialsSchema.parse(credentials)
          
          // Log authentication attempt (without PII)
          await logEvent("INFO", "Authentication attempt", {
            metadata: {
              hasUsername: !!validatedCredentials.username
            }
          })

          // Authenticate with Bakalari API
          const bakalariResult = await loginToBakalariAndFetchUserData(
            validatedCredentials.username,
            validatedCredentials.password
          )

          if (!bakalariResult.status.success) {
            // Log failed authentication (without PII)
            await logEvent("WARN", "Authentication failed", {
              metadata: {
                loginFailed: bakalariResult.status.loginFailed,
                userDataFailed: bakalariResult.status.userDataFailed
              }
            })
            
            // Return user-friendly error message
            throw new Error(
              bakalariResult.status.loginFailed 
                ? "Invalid username or password" 
                : "Unable to fetch user data. Please try again."
            )
          }

          if (!bakalariResult.data) {
            await logEvent("WARN", "Authentication failed - no user data", {
              metadata: {}
            })
            throw new Error("Unable to retrieve user information. Please try again.")
          }

          // Get the access token from the login response
          const bakalariToken = bakalariResult.accessToken
          if (!bakalariToken) {
            await logEvent("WARN", "Authentication failed - no token", {
              metadata: {}
            })
            throw new Error("Authentication service unavailable. Please try again later.")
          }

          // Create or update user in our database
          const user = await upsertUserFromBakalari(bakalariResult.data, bakalariToken)

          // Log successful authentication
          await logEvent("INFO", "Authentication successful", {
            userId: user.id,
            metadata: {
              bakalariId: bakalariResult.data.userID,
              role: user.role
            }
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            classId: user.classId || undefined,
          }
        } catch (error) {
          await logEvent("ERROR", "Authentication error", {
            metadata: {
              error: error instanceof Error ? error.message : "Unknown error"
            }
          })
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.classId = user.classId
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as UserRole
        session.user.classId = token.classId as string | undefined
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error"
  },
  // Security settings
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development"
}

// Type augmentation for NextAuth
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      classId?: string
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: UserRole
    classId?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    classId?: string
  }
}
