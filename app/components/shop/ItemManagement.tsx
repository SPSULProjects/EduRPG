"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import { ItemRarity, ItemType } from "@/app/lib/generated"
import { Eye, EyeOff } from "lucide-react"

interface ItemManagementProps {
  onItemUpdated: () => void
}

interface Item {
  id: string
  name: string
  description: string
  price: number
  rarity: ItemRarity
  type: ItemType
  imageUrl?: string
  isActive: boolean
}

export function ItemManagement({ onItemUpdated }: ItemManagementProps) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingItem, setTogglingItem] = useState<string | null>(null)

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      setError(null)
      const response = await fetch("/api/items")
      
      if (!response.ok) {
        throw new Error(`Failed to fetch items: ${response.statusText}`)
      }
      
      const data = await response.json()
      setItems(data.items || [])
    } catch (error) {
      console.error("Error fetching items:", error)
      setError(error instanceof Error ? error.message : "Failed to load items")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleItem = async (itemId: string) => {
    try {
      setTogglingItem(itemId)
      setError(null)
      
      const response = await fetch(`/api/items/${itemId}/toggle`, {
        method: "POST"
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to toggle item")
      }
      
      await fetchItems()
      onItemUpdated()
    } catch (error) {
      console.error("Error toggling item:", error)
      setError(error instanceof Error ? error.message : "Failed to toggle item")
    } finally {
      setTogglingItem(null)
    }
  }

  const getRarityColor = (rarity: ItemRarity) => {
    switch (rarity) {
      case ItemRarity.COMMON: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      case ItemRarity.UNCOMMON: return "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200"
      case ItemRarity.RARE: return "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
      case ItemRarity.EPIC: return "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200"
      case ItemRarity.LEGENDARY: return "bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const getTypeColor = (type: ItemType) => {
    switch (type) {
      case ItemType.COSMETIC: return "bg-pink-100 text-pink-800 dark:bg-pink-800 dark:text-pink-200"
      case ItemType.BOOST: return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200"
      case ItemType.COLLECTIBLE: return "bg-indigo-100 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-200"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  if (loading) {
    return <div className="text-center py-8">Načítání předmětů...</div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Správa předmětů</h2>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <Card key={item.id} className={!item.isActive ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <div className="flex items-center space-x-1">
                  <Badge className={getRarityColor(item.rarity)}>
                    {item.rarity}
                  </Badge>
                  <Badge className={getTypeColor(item.type)}>
                    {item.type}
                  </Badge>
                </div>
              </div>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{item.price} mincí</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleItem(item.id)}
                  disabled={togglingItem === item.id}
                >
                  {togglingItem === item.id ? (
                    "Načítání..."
                  ) : item.isActive ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-1" />
                      Deaktivovat
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-1" />
                      Aktivovat
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
