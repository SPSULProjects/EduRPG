"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { UserRole, ItemRarity, ItemType } from "@/app/lib/generated"
import { Coins, Package, ShoppingCart } from "lucide-react"
import { BuyItemDialog } from "./BuyItemDialog"
import { ItemManagement } from "./ItemManagement"

interface ShopInterfaceProps {
  userId: string
  userRole: UserRole
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

interface ShopData {
  items: Item[]
  userBalance?: number
  userPurchases?: any[]
}

export function ShopInterface({ userId, userRole }: ShopInterfaceProps) {
  const [shopData, setShopData] = useState<ShopData>({ items: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [buyingItem, setBuyingItem] = useState<string | null>(null)

  useEffect(() => {
    fetchShopData()
  }, [])

  const fetchShopData = async () => {
    try {
      setError(null)
      const response = await fetch("/api/shop?active=true")
      
      if (!response.ok) {
        throw new Error(`Failed to fetch shop data: ${response.statusText}`)
      }
      
      const data = await response.json()
      setShopData(data.data || data)
    } catch (error) {
      console.error("Error fetching shop data:", error)
      setError(error instanceof Error ? error.message : "Failed to load shop data")
    } finally {
      setLoading(false)
    }
  }

  const handleBuyItem = async (itemId: string) => {
    try {
      setBuyingItem(itemId)
      setError(null)
      
      const response = await fetch("/api/shop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ itemId })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to purchase item")
      }
      
      // Refresh shop data to update balance and purchases
      await fetchShopData()
      setSelectedItem(null)
    } catch (error) {
      console.error("Error buying item:", error)
      setError(error instanceof Error ? error.message : "Failed to purchase item")
    } finally {
      setBuyingItem(null)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Načítání obchodu...</div>
  }

  if (error) {
    return <div className="text-red-600 text-center py-8">Chyba: {error}</div>
  }

  return (
    <div className="space-y-6">
      {userRole === UserRole.STUDENT && shopData.userBalance !== undefined && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Coins className="w-5 h-5 text-yellow-600" />
              <span className="text-lg font-semibold">
                Zůstatek: {shopData.userBalance} mincí
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="shop" className="space-y-4">
        <TabsList>
          <TabsTrigger value="shop" className="flex items-center space-x-2">
            <ShoppingCart className="w-4 h-4" />
            <span>Obchod</span>
          </TabsTrigger>
          {userRole === UserRole.STUDENT && (
            <TabsTrigger value="inventory" className="flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span>Inventář</span>
            </TabsTrigger>
          )}
          {(userRole === UserRole.OPERATOR || userRole === UserRole.TEACHER) && (
            <TabsTrigger value="management" className="flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span>Správa předmětů</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="shop" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shopData.items.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <Coins className="w-4 h-4 text-yellow-600" />
                      <span className="font-semibold">{item.price}</span>
                    </div>
                    {userRole === UserRole.STUDENT && (
                      <Button 
                        size="sm" 
                        onClick={() => setSelectedItem(item)}
                        disabled={buyingItem === item.id}
                      >
                        {buyingItem === item.id ? "Nakupuji..." : "Koupit"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {userRole === UserRole.STUDENT && (
          <TabsContent value="inventory" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shopData.userPurchases?.map((purchase) => (
                <Card key={purchase.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{purchase.item.name}</CardTitle>
                    <CardDescription>{purchase.item.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-500">
                      Zakoupeno: {new Date(purchase.createdAt).toLocaleDateString('cs-CZ')}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!shopData.userPurchases || shopData.userPurchases.length === 0) && (
                <div className="col-span-full text-center text-gray-500 py-8">
                  Zatím nemáte žádné zakoupené předměty
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {(userRole === UserRole.OPERATOR || userRole === UserRole.TEACHER) && (
          <TabsContent value="management">
            <ItemManagement onItemUpdated={fetchShopData} />
          </TabsContent>
        )}
      </Tabs>

      {/* Buy Item Dialog */}
      {selectedItem && (
        <BuyItemDialog
          item={selectedItem}
          userBalance={shopData.userBalance || 0}
          onBuy={handleBuyItem}
          onClose={() => setSelectedItem(null)}
          loading={buyingItem === selectedItem.id}
        />
      )}
    </div>
  )
}
