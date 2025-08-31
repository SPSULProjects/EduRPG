"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/app/components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/app/components/ui/dialog"
import { Card, CardContent } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { Shield, CheckCircle, AlertTriangle, BookOpen, Users, Trophy } from "lucide-react"
import { acknowledgePolicy } from "@/app/actions/policy"

interface PolicyModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PolicyModal({ isOpen, onClose }: PolicyModalProps) {
  const session = useSession()
  const [isAcknowledging, setIsAcknowledging] = useState(false)
  const [hasAcknowledged, setHasAcknowledged] = useState(false)

  const handleAcknowledge = async () => {
    if (!session.data?.user?.id) return

    try {
      setIsAcknowledging(true)
      await acknowledgePolicy(session.data.user.id)
      setHasAcknowledged(true)
      onClose()
    } catch (error) {
      console.error("Error acknowledging policy:", error)
    } finally {
      setIsAcknowledging(false)
    }
  }

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setHasAcknowledged(false)
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-xl">
            <Shield className="w-6 h-6 text-blue-600" />
            <span>Vítejte v EduRPG!</span>
          </DialogTitle>
          <DialogDescription className="text-base">
            Před začátkem používání platformy si prosím přečtěte následující pravidla a podmínky.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Platform Overview */}
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                <BookOpen className="w-5 h-5 mr-2" />
                O platformě EduRPG
              </h3>
              <p className="text-blue-800 mb-4">
                EduRPG je gamifikační platforma, která přináší RPG prvky do vzdělávání. 
                Získejte XP za úkoly, sbírejte úspěchy a rozvíjejte své dovednosti v bezpečném prostředí.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-blue-700">XP a úrovně</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-blue-700">Spolupráce</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-blue-700">Bezpečnost</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rules and Guidelines */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
              Pravidla a pokyny
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900">Respektujte ostatní</h4>
                  <p className="text-sm text-gray-600">
                    Chovejte se k ostatním uživatelům s respektem a slušností. 
                    Žádné obtěžování, šikana nebo nevhodné chování.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900">Férové hraní</h4>
                  <p className="text-sm text-gray-600">
                    Nepoužívejte podvody, hacky nebo jiné nefér výhody. 
                    Všechny úkoly plňte samostatně a poctivě.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900">Ochrana soukromí</h4>
                  <p className="text-sm text-gray-600">
                    Nesdílejte osobní údaje ostatních uživatelů. 
                    Vaše data jsou chráněna a používána pouze pro vzdělávací účely.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900">Odpovědné používání</h4>
                  <p className="text-sm text-gray-600">
                    Platforma je určena pro vzdělávání. Používejte ji zodpovědně 
                    a v souladu s pokyny vašich učitelů.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Data and Privacy */}
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <h3 className="font-medium text-orange-900 mb-2 flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Ochrana osobních údajů
              </h3>
              <p className="text-sm text-orange-800">
                Vaše data jsou synchronizována z Bakaláři a používána pouze pro vzdělávací účely. 
                Máte právo na přístup, opravu a výmaz svých údajů. Více informací najdete v našich 
                zásadách ochrany osobních údajů.
              </p>
            </CardContent>
          </Card>

          {/* Role-specific information */}
          {session.data?.user?.role && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <h3 className="font-medium text-blue-900 mb-2">
                  Vaše role: {
                    session.data.user.role === "STUDENT" ? "Student" :
                    session.data.user.role === "TEACHER" ? "Učitel" :
                    "Operátor"
                  }
                </h3>
                <p className="text-sm text-blue-800">
                  {session.data.user.role === "STUDENT" && 
                    "Můžete se přihlašovat k úkolům, získávat XP a účastnit se událostí."
                  }
                  {session.data.user.role === "TEACHER" && 
                    "Můžete vytvářet úkoly, udělovat XP a spravovat své třídy."
                  }
                  {session.data.user.role === "OPERATOR" && 
                    "Máte přístup ke všem systémovým funkcím a můžete spravovat platformu."
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Zavřít
          </Button>
          <Button
            onClick={handleAcknowledge}
            disabled={isAcknowledging}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {isAcknowledging ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Potvrzuji...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Rozumím a souhlasím
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
