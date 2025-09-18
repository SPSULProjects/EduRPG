import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import { UserRole } from "./generated"
import { z } from "zod"
import { loginToBakalariAndFetchUserData, BakalariUserData } from "./bakalari"
import { logEvent, getRequestIdFromRequest } from "./utils"
import { loginRateLimit } from "./security/rate-limiting"

// Validation schema for credentials
const credentialsSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
})

// Helper function to map Bakalari user type to our UserRole
const mapBakalariUserTypeToRole = (userType: string, username?: string): UserRole => {
  // Special override for specific usernames that should always be Operator
  if (username === "kucaba") {
    return UserRole.OPERATOR
  }
  
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
const upsertUserFromBakalari = async (bakalariData: BakalariUserData, bakalariToken: string, username?: string) => {
  try {
    console.log("Starting user upsert with bakalariId:", bakalariData.userID)
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
      console.log("Upserting user with bakalariId:", bakalariData.userID)
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
          role: mapBakalariUserTypeToRole(bakalariData.userType, username),
          bakalariId: bakalariData.userID,
          bakalariToken: bakalariToken,
          classId: classId
        }
      })

      console.log("User upsert successful:", { id: user.id, name: user.name, role: user.role })
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
  return match && match[1] ? parseInt(match[1], 10) : 1
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
        console.log("Auth attempt with credentials:", { 
          hasUsername: !!credentials?.username,
          hasPassword: !!credentials?.password 
        })
        try {
          // Validate input
          const validatedCredentials = credentialsSchema.parse(credentials)
          
          // Check rate limit for login attempts
          const rateLimitKey = `login:${validatedCredentials.username}`
          const rateLimitResult = loginRateLimit.checkRateLimit(rateLimitKey)
          
          if (!rateLimitResult.allowed) {
            // Log rate limit exceeded
            try {
              await logEvent("WARN", "Login rate limit exceeded", {
                metadata: {
                  username: validatedCredentials.username,
                  blocked: rateLimitResult.blocked,
                  remaining: rateLimitResult.remaining,
                  resetTime: rateLimitResult.resetTime
                }
              })
            } catch (logError) {
              console.warn("Failed to log rate limit exceeded:", logError)
            }
            
            throw new Error(
              rateLimitResult.blocked 
                ? "Too many login attempts. Please try again later."
                : "Too many login attempts. Please slow down."
            )
          }
          
          // Log authentication attempt (without PII)
          try {
            await logEvent("INFO", "Authentication attempt", {
              metadata: {
                hasUsername: !!validatedCredentials.username
              }
            })
          } catch (logError) {
            console.warn("Failed to log authentication attempt:", logError)
          }

          // Authenticate with Bakalari API
          console.log("Calling Bakalari authentication...")
          const bakalariResult = await loginToBakalariAndFetchUserData(
            validatedCredentials.username,
            validatedCredentials.password
          )
          console.log("Bakalari result:", {
            success: bakalariResult.status.success,
            loginFailed: bakalariResult.status.loginFailed,
            userDataFailed: bakalariResult.status.userDataFailed,
            hasData: !!bakalariResult.data,
            hasToken: !!bakalariResult.accessToken
          })

          if (!bakalariResult.status.success) {
            // Log failed authentication (without PII)
            try {
              await logEvent("WARN", "Authentication failed", {
                metadata: {
                  loginFailed: bakalariResult.status.loginFailed,
                  userDataFailed: bakalariResult.status.userDataFailed
                }
              })
            } catch (logError) {
              console.warn("Failed to log authentication failure:", logError)
            }
            
            // Return user-friendly error message
            throw new Error(
              bakalariResult.status.loginFailed 
                ? "Invalid username or password" 
                : "Unable to fetch user data. Please try again."
            )
          }

          if (!bakalariResult.data) {
            try {
              await logEvent("WARN", "Authentication failed - no user data", {
                metadata: {}
              })
            } catch (logError) {
              console.warn("Failed to log no user data error:", logError)
            }
            throw new Error("Unable to retrieve user information. Please try again.")
          }

          // Get the access token from the login response
          const bakalariToken = bakalariResult.accessToken
          if (!bakalariToken) {
            try {
              await logEvent("WARN", "Authentication failed - no token", {
                metadata: {}
              })
            } catch (logError) {
              console.warn("Failed to log no token error:", logError)
            }
            throw new Error("Authentication service unavailable. Please try again later.")
          }

          // Create or update user in our database
          console.log("Creating/updating user in database with data:", {
            userID: bakalariResult.data.userID,
            fullUserName: bakalariResult.data.fullUserName,
            userType: bakalariResult.data.userType,
            classAbbrev: bakalariResult.data.classAbbrev
          })
          const user = await upsertUserFromBakalari(bakalariResult.data, bakalariToken, validatedCredentials.username)
          console.log("User created/updated:", user)

          // Log successful authentication
          try {
            await logEvent("INFO", "Authentication successful", {
              userId: user.id,
              metadata: {
                bakalariId: bakalariResult.data.userID,
                role: user.role
              }
            })
          } catch (logError) {
            console.warn("Failed to log successful authentication:", logError)
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            classId: user.classId || undefined,
          }
        } catch (error) {
          try {
            await logEvent("ERROR", "Authentication error", {
              metadata: {
                error: error instanceof Error ? error.message : "Unknown error"
              }
            })
          } catch (logError) {
            console.warn("Failed to log authentication error:", logError)
          }
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
      if (token && session.user) {
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
  debug: process.env.NODE_ENV === "development",
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  }
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
