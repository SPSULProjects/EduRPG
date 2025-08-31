"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog"
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import { ItemRarity, ItemType } from "@/app/lib/generated"
import { Coins, AlertTriangle } from "lucide-react"

interface BuyItemDialogProps {
  item: {
    id: string
    name: string
    description: string
    price: number
    rarity: ItemRarity
    type: ItemType
  }
  userBalance: number
  onBuy: (itemId: string) => Promise<void>
  onClose: () => void
  loading: boolean
}

export function BuyItemDialog({ item, userBalance, onBuy, onClose, loading }: BuyItemDialogProps) {
  const [error, setError] = useState<string | null>(null)

  const handleBuy = async () => {
    try {
      setError(null)
      await onBuy(item.id)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to purchase item")
    }
  }

  const canAfford = userBalance >= item.price

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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Koupit předmět</DialogTitle>
          <DialogDescription>
            Potvrďte nákup tohoto předmětu
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg">{item.name}</h3>
              <div className="flex items-center space-x-1">
                <Badge className={getRarityColor(item.rarity)}>
                  {item.rarity}
                </Badge>
                <Badge className={getTypeColor(item.type)}>
                  {item.type}
                </Badge>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-3">{item.description}</p>
            <div className="flex items-center space-x-1">
              <Coins className="w-4 h-4 text-yellow-600" />
              <span className="font-semibold">{item.price} mincí</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span>Váš zůstatek:</span>
            <div className="flex items-center space-x-1">
              <Coins className="w-4 h-4 text-yellow-600" />
              <span className="font-semibold">{userBalance} mincí</span>
            </div>
          </div>

          {!canAfford && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-red-600 text-sm">
                Nedostatek mincí. Potřebujete ještě {item.price - userBalance} mincí.
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-red-600 text-sm">{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Zrušit
          </Button>
          <Button 
            onClick={handleBuy} 
            disabled={!canAfford || loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? "Nakupuji..." : "Koupit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
