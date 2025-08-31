import { prisma } from "@/app/lib/prisma"
import { ItemRarity, ItemType } from "@/app/lib/generated"

export interface CreateItemData {
  name: string
  description: string
  price: number
  rarity: ItemRarity
  type: ItemType
  imageUrl?: string
}

export interface Item {
  id: string
  name: string
  description: string
  price: number
  rarity: ItemRarity
  type: ItemType
  imageUrl?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export class ItemsService {
  /**
   * Create a new item (Operator only)
   */
  static async createItem(data: CreateItemData): Promise<Item> {
    const item = await prisma.item.create({
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
    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        message: 'item_created',
        metadata: {
          itemId: item.id,
          itemName: item.name,
          price: item.price,
          rarity: item.rarity,
          type: item.type
        }
      }
    })

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      rarity: item.rarity,
      type: item.type,
      imageUrl: item.imageUrl || undefined,
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }
  }

  /**
   * Get all items (for operator management)
   */
  static async getAllItems(): Promise<Item[]> {
    const items = await prisma.item.findMany({
      orderBy: [
        { isActive: 'desc' },
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
      imageUrl: item.imageUrl || undefined,
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }))
  }

  /**
   * Toggle item active status (Operator only)
   */
  static async toggleItemStatus(itemId: string): Promise<Item> {
    const item = await prisma.item.findUnique({
      where: { id: itemId }
    })

    if (!item) {
      throw new Error('Item not found')
    }

    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: { isActive: !item.isActive }
    })

    // Log status change
    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        message: 'item_status_toggled',
        metadata: {
          itemId: item.id,
          itemName: item.name,
          oldStatus: item.isActive,
          newStatus: updatedItem.isActive
        }
      }
    })

    return {
      id: updatedItem.id,
      name: updatedItem.name,
      description: updatedItem.description,
      price: updatedItem.price,
      rarity: updatedItem.rarity,
      type: updatedItem.type,
      imageUrl: updatedItem.imageUrl || undefined,
      isActive: updatedItem.isActive,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt
    }
  }

  /**
   * Update item details (Operator only)
   */
  static async updateItem(itemId: string, data: Partial<CreateItemData>): Promise<Item> {
    const item = await prisma.item.findUnique({
      where: { id: itemId }
    })

    if (!item) {
      throw new Error('Item not found')
    }

    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        rarity: data.rarity,
        type: data.type,
        imageUrl: data.imageUrl
      }
    })

    // Log item update
    await prisma.systemLog.create({
      data: {
        level: 'INFO',
        message: 'item_updated',
        metadata: {
          itemId: item.id,
          itemName: item.name,
          changes: Object.keys(data)
        }
      }
    })

    return {
      id: updatedItem.id,
      name: updatedItem.name,
      description: updatedItem.description,
      price: updatedItem.price,
      rarity: updatedItem.rarity,
      type: updatedItem.type,
      imageUrl: updatedItem.imageUrl || undefined,
      isActive: updatedItem.isActive,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt
    }
  }

  /**
   * Get item statistics
   */
  static async getItemStats(): Promise<{
    totalItems: number
    activeItems: number
    inactiveItems: number
    totalPurchases: number
    revenue: number
  }> {
    const [totalItems, activeItems, totalPurchases, revenue] = await Promise.all([
      prisma.item.count(),
      prisma.item.count({ where: { isActive: true } }),
      prisma.purchase.count(),
      prisma.purchase.aggregate({
        _sum: { price: true }
      })
    ])

    return {
      totalItems,
      activeItems,
      inactiveItems: totalItems - activeItems,
      totalPurchases,
      revenue: revenue._sum.price || 0
    }
  }
}
