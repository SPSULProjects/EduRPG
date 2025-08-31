import { PrismaClient } from './generated'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Graceful shutdown - only in Node.js environment
if (typeof process !== 'undefined' && process.on) {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

export default prisma