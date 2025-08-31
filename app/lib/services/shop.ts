import { prisma } from "../prisma"
import { UserRole, ItemRarity, ItemType, MoneyTxType } from "../generated"
import { generateRequestId, sanitizeForLog } from "../utils"

export class ShopService {
  static async getItems(isActive?: boolean) {
    const where = isActive !== undefined ? { isActive } : {}
    
    return await prisma.item.findMany({
      where,
      orderBy: [
        { rarity: "asc" },
        { price: "asc" },
        { name: "asc" }
      ]
    })
  }

  static async getItemById(itemId: string) {
    return await prisma.item.findUnique({
      where: { id: itemId }
    })
  }

  static async createItem(data: {
    name: string
    description: string
    price: number
    rarity: ItemRarity
    type: ItemType
    imageUrl?: string
  }, requestId?: string) {
    const reqId = requestId || generateRequestId()
    
    return await prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          name: data.name,
          description: data.description,
          price: data.price,
          rarity: data.rarity,
          type: data.type,
          imageUrl: data.imageUrl,
          isActive: true
        }
      })
      
      // Log item creation
      await tx.systemLog.create({
        data: {
          level: "INFO",
          message: sanitizeForLog(`Item created: ${data.name}`),
          requestId: reqId,
          metadata: {
            itemId: item.id,
            price: data.price,
            rarity: data.rarity,
            type: data.type
          }
        }
      })
      
      return item
    })
  }

  static async toggleItem(itemId: string, requestId?: string) {
    const reqId = requestId || generateRequestId()
    
    return await prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({
        where: { id: itemId }
      })
      
      if (!item) {
        throw new Error("Item not found")
      }
      
      const updatedItem = await tx.item.update({
        where: { id: itemId },
        data: { isActive: !item.isActive }
      })
      
      // Log item toggle
      await tx.systemLog.create({
        data: {
          level: "INFO",
          message: sanitizeForLog(`Item ${updatedItem.isActive ? 'activated' : 'deactivated'}: ${item.name}`),
          requestId: reqId,
          metadata: {
            itemId: item.id,
            previousState: item.isActive,
            newState: updatedItem.isActive
          }
        }
      })
      
      return updatedItem
    })
  }

  static async buyItem(itemId: string, userId: string, requestId?: string) {
    const reqId = requestId || generateRequestId()
    
    return await prisma.$transaction(async (tx) => {
      // Get item details
      const item = await tx.item.findUnique({
        where: { id: itemId }
      })
      
      if (!item) {
        throw new Error("Item not found")
      }
      
      if (!item.isActive) {
        throw new Error("Item is not available for purchase")
      }
      
      // Get user's current balance
      const moneyTransactions = await tx.moneyTx.findMany({
        where: { userId }
      })
      
      const currentBalance = moneyTransactions.reduce((balance, tx) => {
        if (tx.type === MoneyTxType.EARNED) return balance + tx.amount
        if (tx.type === MoneyTxType.SPENT) return balance - tx.amount
        if (tx.type === MoneyTxType.REFUND) return balance + tx.amount
        return balance
      }, 0)
      
      if (currentBalance < item.price) {
        throw new Error(`Insufficient funds. Required: ${item.price}, Available: ${currentBalance}`)
      }
      
      // Check for idempotency (prevent duplicate purchases)
      const existingPurchase = await tx.purchase.findFirst({
        where: {
          userId,
          itemId,
          price: item.price,
          createdAt: {
            gte: new Date(Date.now() - 60000) // Within last minute
          }
        }
      })
      
      if (existingPurchase) {
        return existingPurchase // Return existing purchase if same requestId
      }
      
      // Create purchase record
      const purchase = await tx.purchase.create({
        data: {
          userId,
          itemId,
          price: item.price
        }
      })
      
      // Deduct money from user
      await tx.moneyTx.create({
        data: {
          userId,
          amount: item.price,
          type: MoneyTxType.SPENT,
          reason: `Purchase: ${item.name}`,
          requestId: reqId
        }
      })
      
      // Log purchase
      await tx.systemLog.create({
        data: {
          level: "INFO",
          message: sanitizeForLog(`Item purchased: ${item.name} for ${item.price} coins`),
          userId,
          requestId: reqId,
          metadata: {
            itemId: item.id,
            purchaseId: purchase.id,
            price: item.price,
            itemName: item.name
          }
        }
      })
      
      return purchase
    })
  }

  static async getUserPurchases(userId: string) {
    return await prisma.purchase.findMany({
      where: { userId },
      include: {
        item: true
      },
      orderBy: { createdAt: "desc" }
    })
  }

  static async getUserBalance(userId: string) {
    const moneyTransactions = await prisma.moneyTx.findMany({
      where: { userId }
    })
    
    return moneyTransactions.reduce((balance, tx) => {
      if (tx.type === MoneyTxType.EARNED) return balance + tx.amount
      if (tx.type === MoneyTxType.SPENT) return balance - tx.amount
      if (tx.type === MoneyTxType.REFUND) return balance + tx.amount
      return balance
    }, 0)
  }

  static async getShopStats() {
    const [totalItems, activeItems, totalPurchases] = await Promise.all([
      prisma.item.count(),
      prisma.item.count({ where: { isActive: true } }),
      prisma.purchase.count()
    ])
    
    return {
      totalItems,
      activeItems,
      totalPurchases
    }
  }
}
