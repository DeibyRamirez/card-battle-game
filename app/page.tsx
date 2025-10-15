"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Swords, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// URL de la API
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

// Funciones de API
async function registrarJugador(nombre: string) {
  const response = await fetch(`${API_URL}/jugadores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al registrar jugador")
  }
  return response.json()
}

async function buscarJugador(nombre: string) {
  const response = await fetch(`${API_URL}/jugadores/nombre/${encodeURIComponent(nombre)}`) // Esta puta API sirve para buscar por nombre del jugador
  if (response.status === 404) {
    return null // Jugador no existe
  }
  if (!response.ok) {
    throw new Error("Error al buscar jugador")
  }
  return response.json()
}

export default function LoginPage() {
  const [playerName, setPlayerName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [jugadorEncontrado, setJugadorEncontrado] = useState<any>(null)
  const [modoConfirmacion, setModoConfirmacion] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleBuscarJugador = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!playerName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un nombre de jugador",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Buscar si el jugador existe
      const jugadorExistente = await buscarJugador(playerName.trim())

      if (jugadorExistente) {
        // Jugador encontrado - solicitar confirmación
        setJugadorEncontrado(jugadorExistente)
        setModoConfirmacion(true)
        toast({
          title: "Jugador encontrado",
          description: `Se encontró un perfil con el nombre "${jugadorExistente.nombre}"`,
        })
      } else {
        // Jugador no existe - crear nuevo perfil automáticamente
        const nuevoJugador = await registrarJugador(playerName.trim())

        localStorage.setItem("jugadorId", nuevoJugador._id)
        localStorage.setItem("nombreJugador", nuevoJugador.nombre)
        localStorage.setItem("playerId", nuevoJugador._id)
        localStorage.setItem("playerName", nuevoJugador.nombre)

        toast({
          title: "Registro exitoso!",
          description: `Bienvenido ${nuevoJugador.nombre}, tu perfil ha sido creado`,
        })

        router.push("/lobby")
      }
    } catch (error) {
      console.error("Error en buscar jugador:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo conectar con el servidor",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmarPerfil = () => {
    if (jugadorEncontrado) {
      localStorage.setItem("jugadorId", jugadorEncontrado._id)
      localStorage.setItem("nombreJugador", jugadorEncontrado.nombre)
      localStorage.setItem("playerId", jugadorEncontrado._id)
      localStorage.setItem("playerName", jugadorEncontrado.nombre)

      toast({
        title: "Bienvenido de nuevo!",
        description: `Hola ${jugadorEncontrado.nombre}`,
      })

      router.push("/lobby")
    }
  }

  const handleCambiarNombre = () => {
    setModoConfirmacion(false)
    setJugadorEncontrado(null)
    setPlayerName("")
    toast({
      title: "Cambia tu nombre",
      description: "Ingresa un nombre diferente para crear tu perfil",
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
              <Swords className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-balance">Battle Cards</h1>
          <p className="text-muted-foreground text-pretty">Ingresa tu nombre para comenzar la batalla</p>
        </div>

        <Card className="border-border/50 shadow-2xl">
          <CardHeader>
            <CardTitle>
              {modoConfirmacion ? "Confirmar Perfil" : "Iniciar Sesión"}
            </CardTitle>
            <CardDescription>
              {modoConfirmacion
                ? "¿Este es tu perfil?"
                : "Ingresa tu nombre. Si no existes, se creará tu perfil automáticamente."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!modoConfirmacion ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="playerName">Nombre de Jugador</Label>
                  <Input
                    id="playerName"
                    type="text"
                    placeholder="Ingresa tu nombre"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    disabled={isLoading}
                    className="bg-secondary/50"
                    autoComplete="off"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleBuscarJugador(e as any)
                      }
                    }}
                  />
                </div>

                <Button
                  onClick={handleBuscarJugador}
                  className="w-full"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    "Entrar al Juego"
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert className="border-primary/50 bg-primary/5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Ya existe un jugador con el nombre <strong>"{jugadorEncontrado?.nombre}"</strong>
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Button
                    onClick={handleConfirmarPerfil}
                    className="w-full"
                    size="lg"
                    variant="default"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Sí, este es mi perfil
                  </Button>

                  <Button
                    onClick={handleCambiarNombre}
                    className="w-full"
                    size="lg"
                    variant="outline"
                  >
                    No, usar otro nombre
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          {modoConfirmacion
            ? "Si este no es tu perfil, elige otro nombre"
            : "Si eres nuevo, tu perfil se creará automáticamente"}
        </p>
      </div>
    </div>
  )
}