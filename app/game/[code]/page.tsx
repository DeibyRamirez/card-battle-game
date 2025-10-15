"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Users, CheckCircle, Wifi, WifiOff, Play, Swords, Shield, Zap, Brain, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { io, Socket } from "socket.io-client"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

export const socket: Socket = io(API_URL, {
  autoConnect: false,
  transports: ["websocket"],
})

interface Player {
  id: string
  nombre: string
  cartas: number
  isHost: boolean
  isCurrentTurn: boolean
  activo: boolean
}

interface GameCard {
  _id: string
  nombre: string
  ataque: number
  defensa: number
  velocidad: number
  inteligencia: number
  rareza: number
  imagen?: string
}

interface CartaEnBatalla {
  jugadorId: string
  cartaId: string
  carta?: GameCard
}

async function obtenerJuego(codigo: string) {
  const res = await fetch(`${API_URL}/api/juegos/${codigo}`)
  if (!res.ok) throw new Error("Error al obtener el juego")
  return await res.json()
}

async function obtenerJugador(id: string) {
  const res = await fetch(`${API_URL}/api/jugadores/${id}`)
  if (!res.ok) throw new Error("Error al obtener jugador")
  return await res.json()
}

async function obtenerCarta(id: string) {
  const res = await fetch(`${API_URL}/api/cartas/${id}`)
  if (!res.ok) throw new Error("Error al obtener carta")
  return await res.json()
}

const ATTRIBUTE_ICONS = {
  fuerza: <Swords className="w-4 h-4" />,
  velocidad: <Zap className="w-4 h-4" />,
  inteligencia: <Brain className="w-4 h-4" />,
  rareza: <Sparkles className="w-4 h-4" />,
}

const ATTRIBUTE_LABELS = {
  fuerza: "Fuerza",
  velocidad: "Velocidad",
  inteligencia: "Inteligencia",
  rareza: "Rareza",
}

export default function GameRoomPage() {
  const params = useParams()
  const gameCode = (params.code as string).toUpperCase()
  const [playerName, setPlayerName] = useState("")
  const [playerId, setPlayerId] = useState("")
  const [gameState, setGameState] = useState<"waiting" | "selecting" | "playing" | "finished">("waiting")
  const [players, setPlayers] = useState<Player[]>([])
  const [myCards, setMyCards] = useState<GameCard[]>([])
  const [selectedCards, setSelectedCards] = useState<string[]>([])
  const [maxCardsToSelect, setMaxCardsToSelect] = useState(4)
  const [isHost, setIsHost] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [mensaje, setMensaje] = useState("")
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0)
  const [hasConfirmedCards, setHasConfirmedCards] = useState(false)

  // Estados para el juego
  const [selectedAttribute, setSelectedAttribute] = useState<"fuerza" | "velocidad" | "inteligencia" | "rareza" | null>(null)
  const [cartasEnMesa, setCartasEnMesa] = useState<CartaEnBatalla[]>([])
  const [miCartaJugada, setMiCartaJugada] = useState<GameCard | null>(null)
  const [esperandoResultado, setEsperandoResultado] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  // ==========================================
  // CONFIGURAR SOCKET Y EVENT HANDLERS
  // ==========================================
  useEffect(() => {
    const name = localStorage.getItem("nombreJugador") || localStorage.getItem("playerName")
    const id = localStorage.getItem("jugadorId") || localStorage.getItem("playerId")

    if (!name || !id) {
      router.push("/")
      return
    }

    setPlayerName(name)
    setPlayerId(id)

    if (!socket.connected) {
      socket.connect()
    }

    const handleConnect = () => {
      console.log('✅ Socket conectado:', socket.id)
      setIsConnected(true)
      socket.emit('unirseJuego', { codigo: gameCode, jugadorId: id })
    }

    const handleDisconnect = () => {
      console.log('❌ Socket desconectado')
      setIsConnected(false)
      toast({
        title: "Desconectado",
        description: "Se perdió la conexión con el servidor",
        variant: "destructive",
      })
    }

    const handleJugadorUnido = async (data: any) => {
      console.log('👤 Jugador unido:', data)
      setMensaje(`Jugador conectado`)
      setTimeout(() => setMensaje(""), 3000)
      await loadPlayers()
    }

    const handleUnidoExitoso = (data: any) => {
      console.log('✅ Unido exitosamente:', data)
      toast({
        title: "Conectado a la partida",
        description: `${data.jugadores.length}/${data.maxPlayers} jugadores`,
      })
    }

    const handleJuegoIniciandose = (data: any) => {
      console.log('🎮 Juego iniciando:', data)
      setGameState('selecting')
      setMaxCardsToSelect(data.playCount)
      toast({
        title: "¡Juego iniciado!",
        description: data.mensaje,
      })
    }

    const handleJuegoIniciado = (data: any) => {
      console.log('▶️ Juego iniciado:', data)
      setGameState('playing')
      setCurrentTurnIdx(data.turnoIdx)
      setCartasEnMesa([])
      setMiCartaJugada(null)
      setSelectedAttribute(null)
      toast({
        title: "¡A jugar!",
        description: data.mensaje,
      })
    }

    const handleCartasSeleccionadas = (data: any) => {
      console.log('🎴 Cartas seleccionadas:', data)
      if (data.jugadorId === id) {
        setHasConfirmedCards(true)
        setMensaje(`Tus cartas confirmadas`)
      } else {
        setMensaje(`Jugador confirmó ${data.cantidad} cartas`)
      }
      setTimeout(() => setMensaje(""), 3000)
    }

    const handleCartaJugada = async (data: any) => {
      console.log('🃏 Carta jugada:', data)

      try {
        const carta = await obtenerCarta(data.cartaId)
        setCartasEnMesa(prev => [...prev, {
          jugadorId: data.jugadorId,
          cartaId: data.cartaId,
          carta
        }])
      } catch (error) {
        setCartasEnMesa(prev => [...prev, {
          jugadorId: data.jugadorId,
          cartaId: data.cartaId
        }])
      }

      if (data.jugadorId !== id) {
        setMensaje(`Un jugador jugó su carta`)
        setTimeout(() => setMensaje(""), 2000)
      }
    }

    const handleSiguienteTurno = (data: any) => {
      console.log('⏭️ Siguiente turno:', data)
      setCurrentTurnIdx(data.turnoIdx)
      setSelectedAttribute(null)

      if (data.jugadorId === id) {
        setMensaje('¡Es tu turno!')
        toast({
          title: "Tu turno",
          description: "Elige un atributo y juega tu carta",
        })
      } else {
        setMensaje(`Esperando jugador...`)
      }
      setTimeout(() => setMensaje(""), 3000)
    }

    const handleResultadoRonda = async (data: any) => {
      console.log('🏆 Resultado:', data)
      setEsperandoResultado(true)

      if (data.ganadorId === id) {
        toast({
          title: "¡Ganaste la ronda!",
          description: `+${data.cartasGanadas.length} cartas`,
          duration: 5000,
        })
      } else {
        toast({
          title: "Ronda perdida",
          description: "Otro jugador ganó",
          variant: "destructive",
          duration: 3000,
        })
      }

      await new Promise(resolve => setTimeout(resolve, 3000))

      setCartasEnMesa([])
      setMiCartaJugada(null)
      setSelectedAttribute(null)
      setEsperandoResultado(false)

      await loadMyCards(id)
      await loadPlayers()
    }

    const handleEmpate = (data: any) => {
      console.log('🤝 Empate:', data)
      toast({
        title: "¡Empate!",
        description: `Desempate con: ${ATTRIBUTE_LABELS[data.atributo as keyof typeof ATTRIBUTE_LABELS]}`,
        duration: 4000,
      })
      setMensaje(`EMPATE - Desempate: ${ATTRIBUTE_LABELS[data.atributo as keyof typeof ATTRIBUTE_LABELS]}`)
    }

    const handleJugadorRendido = async (data: any) => {
      console.log('🏳️ Rendido:', data)
      setMensaje(`Un jugador se rindió`)
      setTimeout(() => setMensaje(""), 3000)
      await loadPlayers()
    }

    const handleJuegoFinalizado = (data: any) => {
      console.log('🏁 Finalizado:', data)
      setGameState('finished')
      const esGanador = data.ganadorId === id
      toast({
        title: esGanador ? "🎉 ¡GANASTE!" : "Juego finalizado",
        description: data.mensaje,
        variant: esGanador ? "default" : "destructive",
        duration: 10000,
      })
    }

    const handleError = (data: any) => {
      console.error('❌ Error:', data.message)
      toast({
        title: "Error",
        description: data.message,
        variant: "destructive",
      })
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('jugadorUnido', handleJugadorUnido)
    socket.on('unidoExitoso', handleUnidoExitoso)
    socket.on('juegoIniciandose', handleJuegoIniciandose)
    socket.on('juegoIniciado', handleJuegoIniciado)
    socket.on('cartasSeleccionadas', handleCartasSeleccionadas)
    socket.on('cartaJugada', handleCartaJugada)
    socket.on('siguienteTurno', handleSiguienteTurno)
    socket.on('resultadoRonda', handleResultadoRonda)
    socket.on('empate', handleEmpate)
    socket.on('jugadorRendido', handleJugadorRendido)
    socket.on('juegoFinalizado', handleJuegoFinalizado)
    socket.on('errorEvento', handleError)

    if (socket.connected) {
      setIsConnected(true)
      socket.emit('unirseJuego', { codigo: gameCode, jugadorId: id })
    }

    loadGameData(id)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('jugadorUnido', handleJugadorUnido)
      socket.off('unidoExitoso', handleUnidoExitoso)
      socket.off('juegoIniciandose', handleJuegoIniciandose)
      socket.off('juegoIniciado', handleJuegoIniciado)
      socket.off('cartasSeleccionadas', handleCartasSeleccionadas)
      socket.off('cartaJugada', handleCartaJugada)
      socket.off('siguienteTurno', handleSiguienteTurno)
      socket.off('resultadoRonda', handleResultadoRonda)
      socket.off('empate', handleEmpate)
      socket.off('jugadorRendido', handleJugadorRendido)
      socket.off('juegoFinalizado', handleJuegoFinalizado)
      socket.off('errorEvento', handleError)
    }
  }, [router, gameCode, toast])

  // ==========================================
  // FUNCIONES DE CARGA
  // ==========================================

  const loadGameData = async (id: string) => {
    try {
      const juego = await obtenerJuego(gameCode)
      if (!juego) return

      setGameState(
        juego.estado === "esperando" ? "waiting" :
          juego.estado === "seleccionando" ? "selecting" :
            juego.estado === "jugando" ? "playing" : "finished"
      )
      setMaxCardsToSelect(juego.playCount || 4)
      setCurrentTurnIdx(juego.turnoIdx || 0)

      await loadPlayers()
      await loadMyCards(id)

      if (juego.jugadores.length > 0) {
        const primerJugador = juego.jugadores[0].jugadorId._id || juego.jugadores[0].jugadorId
        setIsHost(primerJugador === id)
      }
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const loadPlayers = async () => {
    try {
      const juego = await obtenerJuego(gameCode)
      const playersData = juego.jugadores.map((j: any, index: number) => ({
        id: j.jugadorId._id || j.jugadorId,
        nombre: j.jugadorId.nombre || `Jugador ${index + 1}`,
        cartas: j.selectedCards?.length || 0,
        isHost: index === 0,
        isCurrentTurn: index === juego.turnoIdx,
        activo: j.activo !== false,
      }))
      setPlayers(playersData)
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const loadMyCards = async (id: string) => {
    try {
      const jugador = await obtenerJugador(id)
      if (jugador.mano && jugador.mano.length > 0) {
        const cartasAdaptadas = jugador.mano.map((carta: any) => ({
          _id: carta._id,
          nombre: carta.nombre,
          ataque: carta.atributos?.fuerza || 0,
          defensa: carta.atributos?.rareza || 0,
          velocidad: carta.atributos?.velocidad || 0,
          inteligencia: carta.atributos?.inteligencia || 0,
          rareza: carta.atributos?.rareza || 0,
          imagen: carta.imagen || "/placeholder.png",
        }))
        setMyCards(cartasAdaptadas)
      }
    } catch (error) {
      console.error("Error:", error)
    }
  }

  // ==========================================
  // FUNCIONES DE JUEGO
  // ==========================================

  const handleCardSelection = (cardId: string) => {
    if (gameState !== "waiting" && gameState !== "selecting") return
    if (selectedCards.includes(cardId)) {
      setSelectedCards(selectedCards.filter((id) => id !== cardId))
    } else if (selectedCards.length < maxCardsToSelect) {
      setSelectedCards([...selectedCards, cardId])
    }
  }

  const handleConfirmSelection = useCallback(() => {
    if (selectedCards.length !== maxCardsToSelect) {
      toast({
        title: "Selección incompleta",
        description: `Debes seleccionar ${maxCardsToSelect} cartas`,
        variant: "destructive",
      })
      return
    }

    // Puedes agregar aquí logs útiles si lo deseas, por ejemplo:
    console.log('Cartas seleccionadas:', selectedCards);

    socket.emit('seleccionarCartas', {
      codigo: gameCode,
      jugadorId: playerId,
      cartas: selectedCards
    })

    setHasConfirmedCards(true)
    toast({
      title: "Cartas confirmadas!",
      description: "Esperando...",
    })
  }, [selectedCards, maxCardsToSelect, gameCode, playerId, toast])

  const handleStartGame = useCallback(() => {
    if (!isHost) return
    if (players.length < 2) {
      toast({
        title: "Jugadores insuficientes",
        description: "Mínimo 2 jugadores",
        variant: "destructive",
      })
      return
    }

    socket.emit('iniciarJuego', {
      codigo: gameCode,
      jugadorId: playerId
    })
  }, [isHost, players.length, gameCode, playerId, toast])

  const handlePlayCard = (card: GameCard) => {
    if (!selectedAttribute) {
      toast({
        title: "Selecciona un atributo",
        description: "Primero elige con qué atributo jugarás",
        variant: "destructive",
      })
      return
    }

    if (players[currentTurnIdx]?.id !== playerId) {
      toast({
        title: "No es tu turno",
        variant: "destructive",
      })
      return
    }

    console.log('🎯 Jugando carta:', {
      cartaId: card._id,
      atributo: selectedAttribute
    })

    socket.emit('jugarCarta', {
      codigo: gameCode,
      jugadorId: playerId,
      cartaId: card._id,
      atributo: selectedAttribute
    })

    setMiCartaJugada(card)
    setSelectedCards(prev => prev.filter(id => id !== card._id))

    toast({
      title: "Carta jugada!",
      description: `${ATTRIBUTE_LABELS[selectedAttribute]}: ${card[selectedAttribute as keyof GameCard]}`,
    })
  }

  const handleSurrender = useCallback(() => {
    if (!window.confirm('¿Rendirte?')) return
    socket.emit('rendirse', {
      codigo: gameCode,
      jugadorId: playerId
    })
  }, [gameCode, playerId])

  const esMiTurno = players[currentTurnIdx]?.id === playerId

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push("/lobby")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Salir
          </Button>

          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-4 py-1">
              {gameCode}
            </Badge>
            <Badge variant={gameState === "waiting" ? "secondary" : "default"}>
              {gameState === "waiting" && "Esperando"}
              {gameState === "selecting" && "Seleccionando"}
              {gameState === "playing" && "En Batalla"}
              {gameState === "finished" && "Finalizado"}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <Users className="w-4 h-4" />
            <span className="text-sm font-semibold">{players.length}</span>
          </div>
        </div>
      </header>

      {/* Mensaje */}
      {mensaje && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 py-2">
          <p className="text-center text-sm text-amber-300 font-medium">{mensaje}</p>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        {/* ESTADO: ESPERANDO */}
        {gameState === "waiting" && (
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold text-white">Esperando jugadores...</h2>
            <p className="text-slate-400">Mínimo 2 jugadores</p>
            <p className="text-sm text-slate-500">
              Código: <span className="font-mono font-bold text-primary">{gameCode}</span>
            </p>

            {/* Lista de jugadores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
              {players.map((player) => (
                <Card key={player.id} className={player.id === playerId ? "border-primary" : ""}>
                  <CardContent className="p-4">
                    <p className="font-semibold truncate">{player.nombre}</p>
                    {player.isHost && <Badge variant="outline" className="mt-1">Host</Badge>}
                  </CardContent>
                </Card>
              ))}
            </div>

            {isHost && players.length >= 2 && (
              <Button size="lg" onClick={handleStartGame}>
                <Play className="mr-2" />
                Iniciar Partida
              </Button>
            )}
          </div>
        )}

        {/* ESTADO: SELECCIONANDO */}
        {gameState === "selecting" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-white">
              Selecciona {maxCardsToSelect} cartas ({selectedCards.length}/{maxCardsToSelect})
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {myCards.map((card) => {
                const selected = selectedCards.includes(card._id)
                return (
                  <div
                    key={card._id}
                    onClick={() => handleCardSelection(card._id)}
                    className={`cursor-pointer relative border-2 rounded-xl p-3 transition-all bg-slate-800 ${selected
                      ? "border-primary scale-105 shadow-lg shadow-primary/50"
                      : "border-slate-600 hover:border-primary/50"
                      }`}
                  >
                    <img
                      src={card.imagen}
                      alt={card.nombre}
                      className="w-full h-32 object-cover rounded-lg mb-2"
                    />
                    <h3 className="font-bold text-xs text-white truncate">{card.nombre}</h3>
                    <div className="text-[10px] text-slate-400 mt-1">
                      <p>⚔️ {card.ataque}</p>
                      <p>⚡ {card.velocidad}</p>
                      <p>🧠 {card.inteligencia}</p>
                      <p>✨ {card.rareza}</p>
                    </div>
                    {selected && (
                      <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleConfirmSelection}
              >
                {hasConfirmedCards ? "✓ Confirmado" : `Confirmar (${selectedCards.length}/${maxCardsToSelect})`}
              </Button>
            </div>
          </div>
        )}

        {/* ESTADO: JUGANDO */}
        {gameState === "playing" && (
          <div className="space-y-6">
            {/* Mesa de juego - Estilo Poker */}
            <div className="relative bg-gradient-to-br from-green-800 to-green-900 rounded-3xl p-8 border-8 border-yellow-900 shadow-2xl min-h-[400px]">
              {/* Indicador de turno */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2">
                <Badge className={esMiTurno ? "bg-green-500" : "bg-slate-500"}>
                  {esMiTurno ? "TU TURNO" : `Turno de ${players[currentTurnIdx]?.nombre}`}
                </Badge>
              </div>

              {/* Jugadores alrededor de la mesa */}
              <div className="absolute top-8 right-8">
                {players.filter(p => p.id !== playerId).map((player, idx) => (
                  <Card key={player.id} className={`mb-2 ${player.isCurrentTurn ? "ring-2 ring-green-500" : ""}`}>
                    <CardContent className="p-3">
                      <p className="text-xs font-semibold">{player.nombre}</p>
                      <p className="text-xs text-slate-500">{player.cartas} cartas</p>
                      {cartasEnMesa.find(c => c.jugadorId === player.id) && (
                        <Badge variant="secondary" className="mt-1 text-[10px]">Jugó</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Centro: Cartas en batalla */}
              <div className="flex items-center justify-center min-h-[300px]">
                <div className="flex gap-4 flex-wrap justify-center">
                  {cartasEnMesa.map((item, idx) => {
                    const esLaMia = item.jugadorId === playerId
                    return (
                      <div
                        key={idx}
                        className={`relative ${esLaMia ? "scale-110" : ""}`}
                      >
                        {item.carta ? (
                          <div className="w-32 bg-slate-800 border-2 border-yellow-600 rounded-lg p-2 shadow-xl">
                            <img
                              src={item.carta.imagen}
                              alt={item.carta.nombre}
                              className="w-full h-24 object-cover rounded mb-1"
                            />
                            <p className="text-[10px] text-white font-bold truncate">{item.carta.nombre}</p>
                            {selectedAttribute && (
                              <p className="text-xs text-yellow-400 font-bold mt-1">
                                {ATTRIBUTE_ICONS[selectedAttribute]} {
                                  (() => {
                                    switch (selectedAttribute) {
                                      case "fuerza": return item.carta.ataque;
                                      case "velocidad": return item.carta.velocidad;
                                      case "inteligencia": return item.carta.inteligencia;
                                      case "rareza": return item.carta.rareza;
                                      default: return "";
                                    }
                                  })()
                                }
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="w-32 h-40 bg-slate-700 border-2 border-slate-600 rounded-lg flex items-center justify-center">
                            <p className="text-slate-500 text-xs">Carta oculta</p>
                          </div>
                        )}
                        {esLaMia && (
                          <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500">
                            TÚ
                          </Badge>
                        )}
                      </div>
                    )
                  })}

                  {cartasEnMesa.length === 0 && !esperandoResultado && (
                    <p className="text-white/50 text-lg">Esperando cartas...</p>
                  )}

                  {esperandoResultado && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-400 animate-pulse">
                        ⚔️ Resolviendo batalla...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Selección de atributo (solo en tu turno) */}
            {esMiTurno && !miCartaJugada && (
              <div className="bg-slate-800 rounded-xl p-4">
                <p className="text-center text-white mb-3 font-semibold">Elige el atributo de batalla:</p>
                <div className="grid grid-cols-4 gap-3 max-w-2xl mx-auto">
                  {(["fuerza", "velocidad", "inteligencia", "rareza"] as const).map((attr) => (
                    <Button
                      key={attr}
                      variant={selectedAttribute === attr ? "default" : "outline"}
                      onClick={() => setSelectedAttribute(attr)}
                      className="flex-col h-auto py-3"
                    >
                      {ATTRIBUTE_ICONS[attr]}
                      <span className="mt-1 text-xs">{ATTRIBUTE_LABELS[attr]}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Tus cartas (solo las seleccionadas en batalla) */}
            <div className="bg-slate-800 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-3">Tus cartas</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {myCards
                  .filter((card) => selectedCards.includes(card._id))
                  .map((card) => (
                    <div
                      key={card._id}
                      onClick={() => esMiTurno && !miCartaJugada && handlePlayCard(card)}
                      className={`relative border-2 rounded-xl p-3 transition-all bg-slate-800 ${esMiTurno && !miCartaJugada
                        ? "cursor-pointer hover:border-primary/50 hover:scale-105"
                        : "opacity-50 cursor-not-allowed"
                        } ${miCartaJugada?._id === card._id ? "border-green-500" : "border-slate-600"}`}
                    >
                      <img
                        src={card.imagen}
                        alt={card.nombre}
                        className="w-full h-32 object-cover rounded-lg mb-2"
                      />
                      <h3 className="font-bold text-xs text-white truncate">{card.nombre}</h3>
                      <div className="text-[10px] text-slate-400 mt-1">
                        <p>⚔️ {card.ataque}</p>
                        <p>⚡ {card.velocidad}</p>
                        <p>🧠 {card.inteligencia}</p>
                        <p>✨ {card.rareza}</p>
                      </div>
                      {miCartaJugada?._id === card._id && (
                        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500">
                          Jugada
                        </Badge>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Botón de rendirse */}
            <div className="flex justify-center">
              <Button
                variant="destructive"
                size="lg"
                onClick={handleSurrender}
                disabled={gameState !== "playing"}
              >
                Rendirse
              </Button>
            </div>
          </div>
        )}

        {/* ESTADO: FINALIZADO */}
        {gameState === "finished" && (
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold text-white">¡Juego terminado!</h2>
            <p className="text-slate-400">
              {players.find(p => p.id === playerId)?.cartas === 0
                ? "¡Te quedaste sin cartas!"
                : "El juego ha finalizado."}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
              {players.map((player) => (
                <Card key={player.id} className={player.id === playerId ? "border-primary" : ""}>
                  <CardContent className="p-4">
                    <p className="font-semibold truncate">{player.nombre}</p>
                    <p className="text-xs text-slate-500">{player.cartas} cartas</p>
                    {player.isHost && <Badge variant="outline" className="mt-1">Host</Badge>}
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button size="lg" onClick={() => router.push("/lobby")}>
              Volver al Lobby
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}