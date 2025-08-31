import { prisma } from "@/app/lib/prisma"
import { ItemRarity, ItemType, MoneyTxType } from "@/app/lib/generated"

export interface ShopItem {
  id: string
  name: string
  description: string
  price: number
  rarity: ItemRarity
  type: ItemType
  imageUrl?: string
  isActive: boolean
}

export interface PurchaseResult {
  purchase: {
    id: string
    userId: string
    itemId: string
    price: number
    createdAt: Date
  }
  item: ShopItem
  userBalance: number
}

export class ShopService {
  /**
   * Get all active items available for purchase
   */
  static async getShopItems(): Promise<ShopItem[]> {
    const items = await prisma.item.findMany({
      where: { isActive: true },
      orderBy: [
        { rarity: 'asc' },
        { price: 'asc' },
        { name: 'asc' }
      ]
    })

    return items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      rarity: item.rarity,
      type: item.type,
      imageUrl: item.imageUrl,
      isActive: item.isActive
    }))
  }

  /**
   * Purchase an item for a user
   */
  static async purchaseItem(userId: string, itemId: string, requestId?: string): Promise<PurchaseResult> {
    return await prisma.$transaction(async (tx) => {
      // Get the item
      const item = await tx.item.findUnique({
        where: { id: itemId, isActive: true }
      })

      if (!item) {
        throw new Error('Item not found or not available')
      }

      // Get user's current balance
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: {
          moneyTxs: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Calculate current balance
      const currentBalance = user.moneyTxs.length > 0 ? user.moneyTxs[0].amount : 0

      if (currentBalance < item.price) {
        throw new Error('Insufficient funds')
      }

      // Create purchase record
      const purchase = await tx.purchase.create({
        data: {
          userId,
          itemId,
          price: item.price
        }
      })

      // Create money transaction (deduct price)
      const moneyTx = await tx.moneyTx.create({
        data: {
          userId,
          amount: currentBalance - item.price,
          type: MoneyTxType.PURCHASE,
          reason: `Purchased ${item.name}`,
          requestId
        }
      })

      // Log the purchase
      await tx.systemLog.create({
        data: {
          level: 'INFO',
          message: 'item_purchased',
          metadata: {
            userId,
            itemId,
            itemName: item.name,
            price: item.price,
            requestId
          }
        }
      })

      return {
        purchase: {
          id: purchase.id,
          userId: purchase.userId,
          itemId: purchase.itemId,
          price: purchase.price,
          createdAt: purchase.createdAt
        },
        item: {
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          rarity: item.rarity,
          type: item.type,
          imageUrl: item.imageUrl,
          isActive: item.isActive
        },
        userBalance: moneyTx.amount
      }
    })
  }

  /**
   * Get user's purchase history
   */
  static async getUserPurchases(userId: string): Promise<Array<{
    id: string
    item: ShopItem
    price: number
    purchasedAt: Date
  }>> {
    const purchases = await prisma.purchase.findMany({
      where: { userId },
      include: {
        item: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return purchases.map(purchase => ({
      id: purchase.id,
      item: {
        id: purchase.item.id,
        name: purchase.item.name,
        description: purchase.item.description,
        price: purchase.item.price,
        rarity: purchase.item.rarity,
        type: purchase.item.type,
        imageUrl: purchase.item.imageUrl,
        isActive: purchase.item.isActive
      },
      price: purchase.price,
      purchasedAt: purchase.createdAt
    }))
  }

  /**
   * Get user's current balance
   */
  static async getUserBalance(userId: string): Promise<number> {
    const latestTx = await prisma.moneyTx.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    return latestTx?.amount || 0
  }
}
