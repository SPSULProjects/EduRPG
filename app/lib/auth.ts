import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import { UserRole } from "../lib/generated"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Bakaláři",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        try {
          // TODO: Implement Bakaláři DataConnector integration
          // For now, we'll use a mock authentication
          const user = await prisma.user.findUnique({
            where: { email: credentials.username }
          })

          if (!user) {
            return null
          }

          // In production, validate against Bakaláři API
          // const bakalariToken = await validateBakalariCredentials(
          //   credentials.username,
          //   credentials.password
          // )

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            classId: user.classId,
            // bakalariToken: bakalariToken
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.classId = user.classId
        // token.bakalariToken = user.bakalariToken
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as UserRole
        session.user.classId = token.classId as string | undefined
        // session.user.bakalariToken = token.bakalariToken as string
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error"
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
      // bakalariToken?: string
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: UserRole
    classId?: string
    // bakalariToken?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    classId?: string
    // bakalariToken?: string
  }
}
