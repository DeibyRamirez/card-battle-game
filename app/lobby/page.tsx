"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Library, Plus, User, LogOut, Users, Trophy } from "lucide-react"


import io from "socket.io-client";

const socket = io("http://localhost:4000"); // o tu URL en producción

socket.on("connect", () => {
  console.log("✅ Conectado al servidor socket con id:", socket.id);
});

socket.on("disconnect", () => {
  console.log("❌ Desconectado del servidor socket");
});

// Tipos para TypeScript
interface Jugador {
  _id: string
  nombre: string
  mano: any[]
  conectado: boolean
  eliminado: boolean
  ganadas: number
}

// Funciones de API (ajusta la URL según tu backend)
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

async function obtenerJugador(id: string) {
  const response = await fetch(`${API_URL}/api/jugadores/${id}`)
  if (!response.ok) {
    throw new Error("Error al obtener jugador")
  }
  return response.json()
}

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
  return { data: await response.json() }
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
  return { data: await response.json() }
}

export default function LobbyPage() {
  const [playerName, setPlayerName] = useState("")
  const [jugadorData, setJugadorData] = useState<Jugador | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const cargarDatosJugador = async () => {
      // Verificar autenticación
      const name = localStorage.getItem("nombreJugador") || localStorage.getItem("playerName")
      const jugadorId = localStorage.getItem("jugadorId") || localStorage.getItem("playerId")

      if (!name || !jugadorId) {
        router.push("/")
        return
      }

      setPlayerName(name)

      try {
        // Obtener datos completos del jugador desde el backend
        const datosJugador = await obtenerJugador(jugadorId)
        setJugadorData(datosJugador)
      } catch (error) {
        console.error("Error al cargar datos del jugador:", error)
      }
    }

    cargarDatosJugador()
  }, [router])


  const handleBuscarPartidas = () => {
    router.push(`/join-game`)
  }

  const handleLogout = () => {
    localStorage.removeItem("playerId")
    localStorage.removeItem("playerName")
    localStorage.removeItem("jugadorId")
    localStorage.removeItem("nombreJugador")
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Jugador</p>
              <p className="font-semibold">{playerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {jugadorData && (
              <div className="flex items-center gap-2 px-3 py-1 bg-accent/10 rounded-lg border border-accent/20">
                <Trophy className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold">{jugadorData.ganadas} victorias</span>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-balance">🔥 Batalla de Cartas 🔥</h1>
            <p className="text-muted-foreground text-pretty">Bienvenido, <span className="text-primary font-semibold">{playerName}</span> 👋</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1: Ver Cartas */}
            <Card className="border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 group">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 w-fit mb-2 group-hover:bg-primary/20 transition-colors">
                  <Library className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Mi Mano</CardTitle>
                <CardDescription>Cartas en tu poder actualmente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-secondary/50 rounded-lg border border-border/50">
                  <p className="text-3xl font-bold text-primary">
                    {jugadorData?.mano?.length ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Cartas en mano</p>
                </div>
                <Button className="w-full" variant="outline" onClick={() => router.push("/cards")}>
                  Ver Mi Mano
                </Button>
              </CardContent>
            </Card>

            {/* Card 2: Crear Partida */}
            <Card className="border-border/50 hover:border-accent/50 transition-all hover:shadow-lg hover:shadow-accent/5 group">
              <CardHeader>
                <div className="p-3 bg-accent/10 rounded-xl border border-accent/20 w-fit mb-2 group-hover:bg-accent/20 transition-colors">
                  <Plus className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Crear Partida</CardTitle>
                <CardDescription>Configura y crea una nueva batalla</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Máximo 6 jugadores</p>
                  <p>• 4 cartas por jugador</p>
                  <p>• Código automático</p>
                </div>
                <Button
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  onClick={() => router.push("/create-game")}
                  disabled={loading}
                >
                  {loading ? "Creando..." : "Crear Nueva Partida"}
                </Button>
              </CardContent>
            </Card>

            {/* Card 3: Unirse a Partida */}
            <Card className="border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 group">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 w-fit mb-2 group-hover:bg-primary/20 transition-colors">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Unirse a Partida</CardTitle>
                <CardDescription>
                  Busca y únete a partidas disponibles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Buscar por código</p>
                  <p>• Ver partidas activas</p>
                  <p>• Únete rápidamente</p>
                </div>
                <Button className="w-full" onClick={handleBuscarPartidas}>
                  Buscar Partidas
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Estadísticas del Jugador */}
          {jugadorData && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Tus Estadísticas</CardTitle>
                <CardDescription>Tu rendimiento en el juego</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-secondary/30 rounded-lg border border-border/50 text-center">
                    <p className="text-2xl font-bold text-primary">{jugadorData.ganadas}</p>
                    <p className="text-sm text-muted-foreground">Victorias</p>
                  </div>
                  <div className="p-4 bg-secondary/30 rounded-lg border border-border/50 text-center">
                    <p className="text-2xl font-bold text-primary">{jugadorData.mano?.length ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Cartas en mano</p>
                  </div>
                  <div className="p-4 bg-secondary/30 rounded-lg border border-border/50 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${jugadorData.conectado ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <p className="text-sm font-semibold">{jugadorData.conectado ? 'En línea' : 'Desconectado'}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Estado</p>
                  </div>
                  <div className="p-4 bg-secondary/30 rounded-lg border border-border/50 text-center">
                    <p className="text-2xl font-bold text-primary">{jugadorData.nombre}</p>
                    <p className="text-sm text-muted-foreground">Tu nombre</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}