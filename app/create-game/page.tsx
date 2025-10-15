"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Users, Layers, Play, Copy, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// URL de la API
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

async function crearJuego(config: { maxPlayers: number; playCount: number }) {
  const response = await fetch(`${API_URL}/api/juegos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al crear juego")
  }
  return response.json()
}

async function unirseJuego(codigo: string, jugadorId: string) {
  const response = await fetch(`${API_URL}/api/juegos/${codigo}/unirse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jugadorId }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al unirse al juego")
  }
  return response.json()
}

export default function CreateGamePage() {
  const [playerName, setPlayerName] = useState("")
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [cardsPerPlayer, setCardsPerPlayer] = useState(4)
  const [gameCode, setGameCode] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [gameCreated, setGameCreated] = useState(false)
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const name = localStorage.getItem("nombreJugador") || localStorage.getItem("playerName")
    if (!name) {
      router.push("/")
      return
    }
    setPlayerName(name)
  }, [router])

  const handleCreateGame = async () => {
    const jugadorId = localStorage.getItem("jugadorId") || localStorage.getItem("playerId")
    
    if (!jugadorId || !playerName.trim()) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión primero",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      // Crear el juego con los parámetros configurados
      const nuevoJuego = await crearJuego({ 
        maxPlayers: maxPlayers, 
        playCount: cardsPerPlayer 
      })
      
      const codigo = nuevoJuego.codigo

      // Unir al jugador creador automáticamente
      await unirseJuego(codigo, jugadorId)

      // Guardar el código y mostrar pantalla de éxito
      setGameCode(codigo)
      setGameCreated(true)

      toast({
        title: "Partida creada!",
        description: `Código: ${codigo}`,
      })
    } catch (error) {
      console.error("Error al crear juego:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear la partida",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gameCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({
      title: "Código copiado!",
      description: "Comparte el código con otros jugadores",
    })
  }

  const handleJoinGame = () => {
    router.push(`/game/${gameCode}`)
  }

  if (gameCreated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto p-4 bg-accent/10 rounded-2xl border border-accent/20 w-fit mb-4">
              <Check className="w-12 h-12 text-accent" />
            </div>
            <CardTitle className="text-2xl">Partida Creada!</CardTitle>
            <CardDescription>Comparte el código con otros jugadores</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 bg-secondary/50 rounded-xl border border-border/50 text-center space-y-2">
              <p className="text-sm text-muted-foreground">Código de Partida</p>
              <p className="text-4xl font-bold text-primary tracking-wider">{gameCode}</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                <span className="text-muted-foreground">Jugadores máximos:</span>
                <span className="font-semibold">{maxPlayers}</span>
              </div>
              <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                <span className="text-muted-foreground">Cartas por jugador:</span>
                <span className="font-semibold">{cardsPerPlayer}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Button className="w-full bg-transparent" size="lg" variant="outline" onClick={handleCopyCode}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Código
                  </>
                )}
              </Button>

              <Button
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                size="lg"
                onClick={handleJoinGame}
              >
                <Play className="mr-2 h-4 w-4" />
                Entrar a la Partida
              </Button>
            </div>

            <Button variant="ghost" className="w-full" onClick={() => router.push("/lobby")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => router.push("/lobby")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Lobby
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-balance">Crear Nueva Partida</h1>
            <p className="text-muted-foreground text-pretty">Configura los parámetros de tu batalla</p>
          </div>

          <Card className="border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle>Configuración de Partida</CardTitle>
              <CardDescription>Ajusta la cantidad de jugadores y cartas para la batalla</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Max Players */}
              <div className="space-y-3">
                <Label htmlFor="maxPlayers" className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Cantidad de Jugadores
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="maxPlayers"
                    type="number"
                    min={2}
                    max={8}
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="bg-secondary/50"
                  />
                  <div className="flex gap-2">
                    {[2, 4, 6, 8].map((num) => (
                      <Button
                        key={num}
                        variant={maxPlayers === num ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMaxPlayers(num)}
                      >
                        {num}
                      </Button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Mínimo 2, máximo 8 jugadores</p>
              </div>

              {/* Cards Per Player */}
              <div className="space-y-3">
                <Label htmlFor="cardsPerPlayer" className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-accent" />
                  Cartas por Jugador
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="cardsPerPlayer"
                    type="number"
                    min={3}
                    max={10}
                    value={cardsPerPlayer}
                    onChange={(e) => setCardsPerPlayer(Number(e.target.value))}
                    className="bg-secondary/50"
                  />
                  <div className="flex gap-2">
                    {[3, 4, 5, 6].map((num) => (
                      <Button
                        key={num}
                        variant={cardsPerPlayer === num ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCardsPerPlayer(num)}
                      >
                        {num}
                      </Button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cada jugador jugará con {cardsPerPlayer} cartas en batalla
                </p>
              </div>

              {/* Summary */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-primary">Resumen de Configuración</p>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p>• Hasta {maxPlayers} jugadores pueden unirse</p>
                  <p>• Cada jugador jugará con {cardsPerPlayer} cartas</p>
                  <p>• Tú serás el anfitrión de la partida</p>
                  <p>• Se generará un código único para compartir</p>
                </div>
              </div>

              <Button
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                size="lg"
                onClick={handleCreateGame}
                disabled={isCreating}
              >
                {isCreating ? "Creando Partida..." : "Crear Partida"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}