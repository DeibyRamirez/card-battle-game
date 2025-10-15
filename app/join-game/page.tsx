"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Search, Users, Layers, Play, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Juego {
  _id: string
  codigo: string
  maxPlayers: number
  playCount: number
  estado: string
  jugadores?: Array<{ jugadorId: string; activo: boolean }>
}

// URL de la API
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

async function listarJuegos() {
  const response = await fetch(`${API_URL}/juegos`)
  if (!response.ok) {
    throw new Error("Error al listar juegos")
  }
  return response.json()
}

async function obtenerJuegoPorCodigo(codigo: string) {
  const response = await fetch(`${API_URL}/juegos/${codigo}`)
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error("Error al buscar juego")
  }
  return response.json()
}

async function unirseJuego(codigo: string, jugadorId: string) {
  const response = await fetch(`${API_URL}/juegos/${codigo}/unirse`, {
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

export default function JoinGamePage() {
  const [playerName, setPlayerName] = useState("")
  const [gameCode, setGameCode] = useState("")
  const [availableGames, setAvailableGames] = useState<Juego[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const name = localStorage.getItem("nombreJugador") || localStorage.getItem("playerName")
    if (!name) {
      router.push("/")
      return
    }
    setPlayerName(name)
    fetchAvailableGames()
  }, [router])

  const fetchAvailableGames = async () => {
    setIsLoading(true)
    try {
      const juegos = await listarJuegos()
      // Filtrar solo juegos en estado "esperando"
      const juegosDisponibles = juegos.filter((j: Juego) => j.estado === "esperando")
      setAvailableGames(juegosDisponibles)
    } catch (error) {
      console.error("Error al cargar juegos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las partidas disponibles",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinByCode = async () => {
    if (!gameCode.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un código de partida",
        variant: "destructive",
      })
      return
    }

    const jugadorId = localStorage.getItem("jugadorId") || localStorage.getItem("playerId")
    if (!jugadorId) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión primero",
        variant: "destructive",
      })
      return
    }

    setIsSearching(true)
    try {
      // Buscar el juego por código
      const juego = await obtenerJuegoPorCodigo(gameCode.toUpperCase())

      if (!juego) {
        toast({
          title: "Partida no encontrada",
          description: "Verifica el código e intenta nuevamente",
          variant: "destructive",
        })
        setIsSearching(false)
        return
      }

      // Unirse al juego
      await unirseJuego(gameCode.toUpperCase(), jugadorId)
      
      toast({
        title: "Éxito",
        description: "Te has unido a la partida",
      })

      router.push(`/game/${gameCode.toUpperCase()}`)
    } catch (error) {
      console.error("Error al unirse:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo unir a la partida",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleJoinGame = async (codigo: string) => {
    const jugadorId = localStorage.getItem("jugadorId") || localStorage.getItem("playerId")
    if (!jugadorId) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión primero",
        variant: "destructive",
      })
      return
    }

    try {
      await unirseJuego(codigo, jugadorId)
      
      toast({
        title: "Éxito",
        description: "Te has unido a la partida",
      })

      router.push(`/game/${codigo}`)
    } catch (error) {
      console.error("Error al unirse:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo unir a la partida",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => router.push("/lobby")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Lobby
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-balance">Unirse a Partida</h1>
            <p className="text-muted-foreground text-pretty">Ingresa un código o elige una partida disponible</p>
          </div>

          {/* Join by Code */}
          <Card className="border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle>Ingresar con Código</CardTitle>
              <CardDescription>Si tienes un código de partida, ingrésalo aquí</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gameCode">Código de Partida</Label>
                <div className="flex gap-2">
                  <Input
                    id="gameCode"
                    type="text"
                    placeholder="Ej: ABC123"
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                    className="bg-secondary/50 uppercase"
                    maxLength={6}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleJoinByCode()
                      }
                    }}
                  />
                  <Button onClick={handleJoinByCode} disabled={isSearching} className="min-w-[120px]">
                    {isSearching ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Buscar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Games */}
          <Card className="border-border/50 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Partidas Disponibles</CardTitle>
                <CardDescription>Únete a una partida que esté esperando jugadores</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchAvailableGames} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar"}
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : availableGames.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <p className="text-muted-foreground">No hay partidas disponibles</p>
                  <p className="text-sm text-muted-foreground">Crea una nueva partida o intenta más tarde</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {availableGames.map((game) => (
                    <div
                      key={game._id}
                      className="p-4 bg-secondary/30 border border-border/50 rounded-lg hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <p className="text-2xl font-bold text-primary">{game.codigo}</p>
                            <span className="px-2 py-1 bg-accent/20 text-accent text-xs rounded-full capitalize">
                              {game.estado}
                            </span>
                          </div>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {game.jugadores?.length || 0}/{game.maxPlayers} jugadores
                            </span>
                            <span className="flex items-center gap-1">
                              <Layers className="w-4 h-4" />
                              {game.playCount} cartas por jugador
                            </span>
                          </div>
                        </div>
                        <Button onClick={() => handleJoinGame(game.codigo)}>
                          <Play className="mr-2 h-4 w-4" />
                          Unirse
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}