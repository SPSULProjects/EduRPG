import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/app/lib/auth"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Sword, Trophy, Users, Target } from "lucide-react"

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  
  if (session?.user) {
    redirect("/dashboard")
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            EduRPG
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
            Transformujte vzdělávání pomocí gamifikace. Úkoly, XP, úspěchy a RPG zážitek pro studenty i učitele.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
              Přihlásit se
            </Button>
            <Button size="lg" variant="outline">
              Zjistit více
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Sword className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>Úkoly a mise</CardTitle>
              <CardDescription>
                Učitelé vytvářejí zajímavé úkoly, studenti se přihlašují a plní mise
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Trophy className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle>XP a úrovně</CardTitle>
              <CardDescription>
                Získávejte zkušenosti, stoupejte v úrovních a sledujte svůj pokrok
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle>Spolupráce</CardTitle>
              <CardDescription>
                Spolupracujte s ostatními studenty na společných úkolech
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle>Úspěchy</CardTitle>
              <CardDescription>
                Odemykejte úspěchy a sbírejte odznaky za své výkony
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-6 py-16">
        <Card className="text-center bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardHeader>
            <CardTitle className="text-3xl">Připraveni začít dobrodružství?</CardTitle>
            <CardDescription className="text-blue-100">
              Připojte se k EduRPG a transformujte způsob, jakým se učíte a učíte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100">
              Začít nyní
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-6 text-center">
          <p>&copy; 2024 EduRPG. Všechna práva vyhrazena.</p>
          <p className="text-gray-400 text-sm mt-2">
            Gamifikační platforma pro moderní vzdělávání
          </p>
        </div>
      </footer>
    </div>
  )
}
