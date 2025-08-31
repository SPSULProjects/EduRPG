import { PrismaClient } from './generated/';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Configure connection pool size
if (process.env.DATABASE_CONNECTION_LIMIT) {
  prisma.$connect()
    .then(() => {
      console.log('Database connection pool configured successfully');
    })
    .catch((error) => {
      console.error('Error configuring database connection pool:', error);
    });
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;