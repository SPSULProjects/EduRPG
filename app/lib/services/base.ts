import { PrismaClient, Prisma } from "@prisma/client"
import { prisma } from "../prisma"

export interface PaginationOptions {
  page?: number
  limit?: number
  orderBy?: Record<string, "asc" | "desc">
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export abstract class BaseService {
  protected static prisma: PrismaClient = prisma

  protected static async paginate<T>(
    model: any,
    args: Prisma.Args<T, "findMany">,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<T>> {
    const { page = 1, limit = 20, orderBy } = options
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      model.findMany({
        ...args,
        skip,
        take: limit,
        orderBy: orderBy || { createdAt: "desc" },
      }),
      model.count({ where: args.where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  }

  protected static async findManyOptimized<T>(
    model: any,
    args: Prisma.Args<T, "findMany">,
    includeRelations: boolean = true
  ): Promise<T[]> {
    // Optimize includes to prevent over-fetching
    const optimizedArgs = {
      ...args,
      include: includeRelations ? args.include : undefined,
    }

    return model.findMany(optimizedArgs)
  }

  protected static async findUniqueOptimized<T>(
    model: any,
    args: Prisma.Args<T, "findUnique">,
    includeRelations: boolean = true
  ): Promise<T | null> {
    const optimizedArgs = {
      ...args,
      include: includeRelations ? args.include : undefined,
    }

    return model.findUnique(optimizedArgs)
  }

  protected static async executeInTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(callback, {
      maxWait: 10000, // 10 seconds
      timeout: 30000, // 30 seconds
    })
  }

  protected static async batchUpsert<T>(
    model: any,
    data: Array<{ where: any; update: any; create: any }>
  ): Promise<T[]> {
    const results: T[] = []
    
    // Process in batches to avoid overwhelming the database
    const batchSize = 100
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(item => model.upsert(item))
      )
      results.push(...batchResults)
    }
    
    return results
  }

  protected static async softDelete<T>(
    model: any,
    where: any
  ): Promise<T> {
    return model.update({
      where,
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    })
  }

  protected static async restore<T>(
    model: any,
    where: any
  ): Promise<T> {
    return model.update({
      where,
      data: {
        deletedAt: null,
        updatedAt: new Date(),
      },
    })
  }

  protected static async bulkUpdate<T>(
    model: any,
    updates: Array<{ where: any; data: any }>
  ): Promise<T[]> {
    return this.executeInTransaction(async (tx) => {
      const results: T[] = []
      for (const update of updates) {
        const result = await (tx as any)[model.name].update(update)
        results.push(result)
      }
      return results
    })
  }

  protected static async bulkDelete<T>(
    model: any,
    where: any
  ): Promise<{ count: number }> {
    return model.deleteMany({ where })
  }

  protected static async exists<T>(
    model: any,
    where: any
  ): Promise<boolean> {
    const count = await model.count({ where })
    return count > 0
  }

  protected static async findFirstOrThrow<T>(
    model: any,
    args: Prisma.Args<T, "findFirst">
  ): Promise<T> {
    const result = await model.findFirst(args)
    if (!result) {
      throw new Error("Record not found")
    }
    return result
  }

  protected static async findUniqueOrThrow<T>(
    model: any,
    args: Prisma.Args<T, "findUnique">
  ): Promise<T> {
    const result = await model.findUnique(args)
    if (!result) {
      throw new Error("Record not found")
    }
    return result
  }
}
