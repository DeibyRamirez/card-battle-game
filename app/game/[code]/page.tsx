"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Users,
  CheckCircle,
  Wifi,
  WifiOff,
  Play,
  Dices,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

let socket: Socket;

if (typeof window !== "undefined") {
  socket = io(API_URL, {
    autoConnect: false,
    transports: ["websocket"],
  });
}

interface Player {
  id: string;
  nombre: string;
  cartas: number;
  isHost: boolean;
  activo: boolean;
}

interface GameCard {
  _id: string;
  nombre: string;
  ataque: number;
  velocidad: number;
  inteligencia: number;
  rareza: number;
  imagen?: string;
}

interface Apuesta {
  jugadorId: string;
  cartaId: string;
  numero: number;
  carta?: GameCard;
}

async function obtenerJuego(codigo: string) {
  const res = await fetch(`${API_URL}/api/juegos/${codigo}`);
  if (!res.ok) throw new Error("Error al obtener el juego");
  return await res.json();
}

async function obtenerJugador(id: string) {
  const res = await fetch(`${API_URL}/api/jugadores/${id}`);
  if (!res.ok) throw new Error("Error al obtener jugador");
  return await res.json();
}

export default function GameRoomPage() {
  const params = useParams();
  const gameCode = (params.code as string).toUpperCase();
  const router = useRouter();
  const { toast } = useToast();

  const [playerName, setPlayerName] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [gameState, setGameState] = useState<
    "waiting" | "selecting" | "playing" | "finished"
  >("waiting");
  const [players, setPlayers] = useState<Player[]>([]);
  const [myCards, setMyCards] = useState<GameCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [maxCardsToSelect, setMaxCardsToSelect] = useState(4);
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [hasConfirmedCards, setHasConfirmedCards] = useState(false);

  // Estados para el sistema de apuestas
  const [apuestas, setApuestas] = useState<Apuesta[]>([]);
  const [miApuesta, setMiApuesta] = useState<{ carta: GameCard; numero: number } | null>(null);
  const [numeroSeleccionado, setNumeroSeleccionado] = useState<number>(1);
  const [cartaSeleccionada, setCartaSeleccionada] = useState<GameCard | null>(null);
  const [numeroGanador, setNumeroGanador] = useState<number | null>(null);
  const [esperandoResultado, setEsperandoResultado] = useState(false);

  const myCardsRef = useRef(myCards);
  const playersRef = useRef(players);

  useEffect(() => {
    myCardsRef.current = myCards;
  }, [myCards]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Función para manejar las manos actualizadas
  const handleManosActualizadas = (manosActualizadas: any) => {
    console.log("🎴 Manos actualizadas:", manosActualizadas);
    if (manosActualizadas[playerId]) {
      // Mapear las IDs de cartas a objetos completos
      const actualizarCartas = async () => {
        const jugador = await obtenerJugador(playerId);
        setMyCards(jugador.mano.map((c: any) => ({
          _id: c._id,
          nombre: c.nombre,
          ataque: c.atributos?.fuerza || 0,
          velocidad: c.atributos?.velocidad || 0,
          inteligencia: c.atributos?.inteligencia || 0,
          rareza: c.atributos?.rareza || 0,
          imagen: c.imagen || "/placeholder.png",
        })));
      };
      actualizarCartas();
    } else {
      // Si no hay cambios específicos para este jugador, recarga manualmente para seguridad
      loadMyCards(playerId);
    }
  };

  const loadPlayers = useCallback(async () => {
    try {
      const juego = await obtenerJuego(gameCode);
      const playersData = juego.jugadores.map((j: any, index: number) => ({
        id: j.jugadorId._id || j.jugadorId,
        nombre: j.jugadorId.nombre || `Jugador ${index + 1}`,
        cartas: j.selectedCards?.length || 0,
        isHost: index === 0,
        activo: j.activo !== false,
      }));
      setPlayers(playersData);
    } catch (error) {
      console.error("Error al cargar jugadores:", error);
    }
  }, [gameCode]);

  const loadMyCards = useCallback(async (id: string) => {
    try {
      const jugador = await obtenerJugador(id);
      if (jugador.mano && jugador.mano.length > 0) {
        const uniqueCartas = Array.from(
          new Map(jugador.mano.map((carta: any) => [carta._id, carta])).values()
        );
        const cartasAdaptadas = uniqueCartas.map((carta: any) => ({
          _id: carta._id,
          nombre: carta.nombre,
          ataque: carta.atributos?.fuerza || 0,
          velocidad: carta.atributos?.velocidad || 0,
          inteligencia: carta.atributos?.inteligencia || 0,
          rareza: carta.atributos?.rareza || 0,
          imagen: carta.imagen
            ? carta.imagen.startsWith("http://localhost:3000")
              ? carta.imagen.replace("http://localhost:3000", "http://localhost:4000")
              : carta.imagen
            : "/placeholder.png",
        }));
        setMyCards(cartasAdaptadas);
      } else {
        setMyCards([]);
      }
    } catch (error) {
      console.error("Error al cargar cartas:", error);
    }
  }, []);

  const loadGameData = useCallback(async (id: string) => {
    try {
      const juego = await obtenerJuego(gameCode);
      if (!juego) return;

      setGameState(
        juego.estado === "esperando"
          ? "waiting"
          : juego.estado === "seleccionando"
            ? "selecting"
            : juego.estado === "jugando"
              ? "playing"
              : "finished"
      );
      setMaxCardsToSelect(juego.playCount || 4);

      await loadPlayers();
      await loadMyCards(id);

      if (juego.jugadores.length > 0) {
        const primerJugador = juego.jugadores[0].jugadorId._id || juego.jugadores[0].jugadorId;
        setIsHost(primerJugador === id);
      }
    } catch (error) {
      console.error("Error al cargar datos del juego:", error);
    }
  }, [gameCode, loadPlayers, loadMyCards]);

  useEffect(() => {
    const name = localStorage.getItem("nombreJugador") || localStorage.getItem("playerName");
    const id = localStorage.getItem("jugadorId") || localStorage.getItem("playerId");

    if (!name || !id) {
      router.push("/");
      return;
    }

    setPlayerName(name);
    setPlayerId(id);

    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => {
      console.log("✅ Socket conectado:", socket.id);
      setIsConnected(true);
      socket.emit("unirseJuego", { codigo: gameCode, jugadorId: id });
    };

    const handleDisconnect = () => {
      console.log("❌ Socket desconectado");
      setIsConnected(false);
      toast({
        title: "Desconectado",
        description: "Se perdió la conexión con el servidor",
        variant: "destructive",
      });
    };

    const handleJugadorActualizado = (jugador: any) => {
      console.log("👤 Jugador actualizado:", jugador);
      setPlayerName(jugador.nombre);
      localStorage.setItem("nombreJugador", jugador.nombre);
      localStorage.setItem("playerName", jugador.nombre);
      loadMyCards(jugador._id);
    };

    const handleJugadorUnido = (data: any) => {
      console.log("👤 Jugador unido:", data);
      setMensaje("Jugador conectado");
      setTimeout(() => setMensaje(""), 3000);
      loadPlayers();
    };

    const handleUnidoExitoso = (data: any) => {
      console.log("✅ Unido exitosamente:", data);
      toast({
        title: "Conectado a la partida",
        description: `${data.jugadores.length}/${data.maxPlayers} jugadores`,
      });
    };

    const handleJuegoIniciandose = (data: any) => {
      console.log("🎮 Juego iniciando:", data);
      setGameState("selecting");
      setMaxCardsToSelect(data.playCount);
      toast({
        title: "¡Juego iniciado!",
        description: data.mensaje,
      });
    };

    const handleJuegoIniciado = (data: any) => {
      console.log("▶️ Juego iniciado:", data);
      setGameState("playing");
      setApuestas([]);
      setMiApuesta(null);
      setCartaSeleccionada(null);
      setNumeroGanador(null);

      toast({
        title: "¡A jugar!",
        description: data.mensaje,
      });
    };

    const handleCartasSeleccionadas = (data: any) => {
      console.log("🎴 Cartas seleccionadas:", data);
      if (data.jugadorId === id) {
        setHasConfirmedCards(true);
        setMensaje("Tus cartas confirmadas");
      } else {
        setMensaje(`Jugador confirmó ${data.cantidad} cartas`);
      }
      setTimeout(() => setMensaje(""), 3000);
      loadPlayers();
    };

    const handleCartaApostada = (data: any) => {
      console.log("🎲 Carta apostada:", data);
      setApuestas((prev) => {
        const existe = prev.find((a) => a.jugadorId === data.jugadorId);
        if (existe) return prev;
        return [...prev, { jugadorId: data.jugadorId, cartaId: data.cartaId, numero: 0 }];
      });
    };

    const handleRondaResuelta = (data: any) => {
      console.log("🏆 Ronda resuelta:", data);
      setNumeroGanador(data.numeroGanador);
      setEsperandoResultado(true);

      const esGanador = data.ganadores.some((g: any) => g.jugadorId === playerId);
      if (esGanador) {
        const ganador = data.ganadores.find((g: any) => g.jugadorId === playerId);
        toast({
          title: "🎉 ¡ACERTASTE!",
          description: `Número ganador: ${data.numeroGanador}. Ganaste ${ganador.cartasGanadas} carta(s)`,
          duration: 5000,
        });
      } else {
        toast({
          title: `Número ganador: ${data.numeroGanador}`,
          description: data.mensaje,
          variant: "destructive",
          duration: 3000,
        });
      }

      setTimeout(async () => {
        setApuestas([]);
        setMiApuesta(null);
        setCartaSeleccionada(null);
        setNumeroGanador(null);
        setEsperandoResultado(false);
        setHasConfirmedCards(false); // Permitir nueva confirmación
        setSelectedCards([]); // Limpiar selección anterior para nueva ronda

        await loadMyCards(playerId);
        await loadPlayers();
        await loadGameData(playerId); // Refresca estado del juego (debería ir a "selecting" si backend lo setea)

        if (data.juegoFinalizado) {
          setGameState("finished");
        }
      }, 4000);
    };

    const handleJugadorRendido = async (data: any) => {
      console.log("🏳️ Rendido:", data);
      setMensaje("Un jugador se rindió");
      setTimeout(() => setMensaje(""), 3000);
      await loadPlayers();
    };

    const handleJuegoFinalizado = (data: any) => {
      console.log("🏁 Finalizado:", data);
      setGameState("finished");
      const esGanador = data.ganadorId === id;
      toast({
        title: esGanador ? "🎉 ¡GANASTE!" : "Juego finalizado",
        description: data.mensaje,
        variant: esGanador ? "default" : "destructive",
        duration: 10000,
      });
    };

    const handleError = (data: any) => {
      console.error("❌ Error:", data.message);
      toast({
        title: "Error",
        description: data.message,
        variant: "destructive",
      });
    };

    const handleNuevaRonda = (data: any) => {
      console.log("🔁 Nueva ronda iniciada:", data.mensaje);
      setSelectedCards([]);
      setGameState("selecting");
      setHasConfirmedCards(false);
      setApuestas([]);
      setMiApuesta(null);
      setCartaSeleccionada(null);
      setNumeroGanador(null);
      setEsperandoResultado(false);
      loadGameData(playerId); // Asegura sync con backend
      toast({
        title: "Nueva ronda",
        description: data.mensaje,
      });
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("jugadorActualizado", handleJugadorActualizado);
    socket.on("jugadorUnido", handleJugadorUnido);
    socket.on("unidoExitoso", handleUnidoExitoso);
    socket.on("juegoIniciandose", handleJuegoIniciandose);
    socket.on("juegoIniciado", handleJuegoIniciado);
    socket.on("cartasSeleccionadas", handleCartasSeleccionadas);
    socket.on("cartaApostada", handleCartaApostada);
    socket.on("rondaResuelta", handleRondaResuelta);
    socket.on("jugadorRendido", handleJugadorRendido);
    socket.on("juegoFinalizado", handleJuegoFinalizado);
    socket.on("errorEvento", handleError);
    socket.on("manosActualizadas", handleManosActualizadas);
    socket.on("nuevaRonda", handleNuevaRonda); // Movido aquí para que esté siempre activo

    if (socket.connected) {
      setIsConnected(true);
      socket.emit("unirseJuego", { codigo: gameCode, jugadorId: id });
    }

    loadGameData(id);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("jugadorActualizado", handleJugadorActualizado);
      socket.off("jugadorUnido", handleJugadorUnido);
      socket.off("unidoExitoso", handleUnidoExitoso);
      socket.off("juegoIniciandose", handleJuegoIniciandose);
      socket.off("juegoIniciado", handleJuegoIniciado);
      socket.off("cartasSeleccionadas", handleCartasSeleccionadas);
      socket.off("cartaApostada", handleCartaApostada);
      socket.off("rondaResuelta", handleRondaResuelta);
      socket.off("jugadorRendido", handleJugadorRendido);
      socket.off("juegoFinalizado", handleJuegoFinalizado);
      socket.off("errorEvento", handleError);
      socket.off("manosActualizadas", handleManosActualizadas);
      socket.off("nuevaRonda", handleNuevaRonda); // Cleanup
      socket.disconnect();
    };
  }, [router, gameCode, toast, loadGameData, loadPlayers, loadMyCards, playerId]);

  // Comenta o elimina este useEffect para evitar races con socket resolution
  // useEffect(() => { ... auto-resolver ... });

  const handleResultadoRonda = async (data: any) => {
    console.log("🏆 Resultado:", data);
    setEsperandoResultado(true);
    setNumeroGanador(data.numeroGanador);

    const esGanador = data.ganadores.some((g: any) => g.jugadorId === playerId);

    if (esGanador) {
      const ganador = data.ganadores.find((g: any) => g.jugadorId === playerId);
      toast({
        title: "🎉 ¡ACERTASTE!",
        description: `Número ganador: ${data.numeroGanador}. Ganaste ${ganador.cartasGanadas} carta(s)`,
        duration: 5000,
      });
    } else {
      toast({
        title: `Número ganador: ${data.numeroGanador}`,
        description: data.mensaje,
        variant: "destructive",
        duration: 3000,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 4000));

    if (data.juegoFinalizado) {
      setGameState("finished");
      return;
    }

    setApuestas([]);
    setMiApuesta(null);
    setCartaSeleccionada(null);
    setNumeroGanador(null);
    setEsperandoResultado(false);
    setHasConfirmedCards(false);
    setSelectedCards([]);

    try {
      await loadMyCards(playerId);
      await loadPlayers();
      await loadGameData(playerId);
    } catch (error) {
      console.error("Error recargando datos:", error);
    }
  };

  const handleCardSelection = (cardId: string) => {
    if (gameState !== "waiting" && gameState !== "selecting") return;
    if (selectedCards.includes(cardId)) {
      setSelectedCards(selectedCards.filter((id) => id !== cardId));
    } else if (selectedCards.length < maxCardsToSelect) {
      setSelectedCards([...selectedCards, cardId]);
    }
  };

  const handleConfirmSelection = useCallback(() => {
    if (selectedCards.length !== maxCardsToSelect) {
      toast({
        title: "Selección incompleta",
        description: `Debes seleccionar ${maxCardsToSelect} cartas`,
        variant: "destructive",
      });
      return;
    }

    socket.emit("seleccionarCartas", {
      codigo: gameCode,
      jugadorId: playerId,
      cartas: selectedCards,
    });

    // Removido socket.on de aquí; ahora está en el useEffect principal

    setHasConfirmedCards(true);
    toast({
      title: "Cartas confirmadas!",
      description: "Esperando otros jugadores...",
    });
  }, [selectedCards, maxCardsToSelect, gameCode, playerId, toast]);

  const handleStartGame = useCallback(() => {
    if (!isHost) return;
    if (players.length < 2) {
      toast({
        title: "Jugadores insuficientes",
        description: "Mínimo 2 jugadores",
        variant: "destructive",
      });
      return;
    }

    socket.emit("iniciarJuego", {
      codigo: gameCode,
      jugadorId: playerId,
    });
  }, [isHost, players.length, gameCode, playerId, toast]);

  const handleSelectCardToBet = (card: GameCard) => {
    if (miApuesta) {
      toast({
        title: "Ya apostaste",
        description: "Ya hiciste tu apuesta en esta ronda",
        variant: "destructive",
      });
      return;
    }
    setCartaSeleccionada(card);
  };

  const handleConfirmBet = async () => {
    if (!cartaSeleccionada) {
      toast({
        title: "Selecciona una carta",
        description: "Debes elegir una carta para apostar",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/juegos/${gameCode}/apostar-carta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jugadorId: playerId,
          cartaId: cartaSeleccionada._id,
          numero: numeroSeleccionado,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMiApuesta({ carta: cartaSeleccionada, numero: numeroSeleccionado });

        socket.emit("apostarCarta", {
          codigo: gameCode,
          jugadorId: playerId,
          cartaId: cartaSeleccionada._id,
          numero: numeroSeleccionado,
        });

        toast({
          title: "Apuesta registrada!",
          description: `${cartaSeleccionada.nombre} - Número: ${numeroSeleccionado}`,
        });
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar la apuesta",
        variant: "destructive",
      });
    }
  };

  const handleSurrender = useCallback(() => {
    if (!window.confirm("¿Rendirte?")) return;
    socket.emit("rendirse", {
      codigo: gameCode,
      jugadorId: playerId,
    });
  }, [gameCode, playerId]);

  const isFinished = gameState === "finished";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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
              {gameState === "playing" && "Apostando"}
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
              {players.map((player) => (
                <Card key={player.id} className={player.id === playerId ? "border-primary" : ""}>
                  <CardContent className="p-4">
                    <p className="font-semibold truncate">{player.nombre}</p>
                    {player.isHost && (
                      <Badge variant="outline" className="mt-1">
                        Host
                      </Badge>
                    )}
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

        {/* ESTADO: SELECCIONANDO CARTAS */}
        {gameState === "selecting" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-white">
              Selecciona {maxCardsToSelect} cartas ({selectedCards.length}/{maxCardsToSelect})
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {myCards.map((card) => {
                const selected = selectedCards.includes(card._id);
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
                );
              })}
            </div>

            <div className="flex justify-center">
              <Button size="lg" onClick={handleConfirmSelection} disabled={hasConfirmedCards}>
                {hasConfirmedCards
                  ? "✓ Confirmado"
                  : `Confirmar (${selectedCards.length}/${maxCardsToSelect})`}
              </Button>
            </div>
          </div>
        )}

        {/* ESTADO: JUGANDO (APOSTANDO) */}
        {gameState === "playing" && (
          <div className="space-y-6">
            {/* Mesa de Juego */}
            <div className="relative bg-gradient-to-br from-green-800 to-green-900 rounded-3xl p-8 border-8 border-yellow-900 shadow-2xl min-h-[400px]">
              <div className="absolute top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-yellow-500 text-black text-lg px-6 py-2">
                  <Dices className="w-5 h-5 mr-2" />
                  {numeroGanador ? `Número Ganador: ${numeroGanador}` : "Apuesta del 1 al 10"}
                </Badge>
              </div>

              {/* Jugadores que ya apostaron */}
              <div className="absolute top-8 right-8 space-y-2">
                {players
                  .filter((p) => p.id !== playerId)
                  .map((player) => (
                    <Card key={player.id} className="w-48">
                      <CardContent className="p-3">
                        <p className="text-xs font-semibold truncate">{player.nombre}</p>
                        <p className="text-xs text-slate-500">{player.cartas} cartas</p>
                        {apuestas.find((a) => a.jugadorId === player.id) && (
                          <Badge variant="secondary" className="mt-1 text-[10px]">
                            ✓ Apostó
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>

              {/* Apuestas en mesa */}
              <div className="flex items-center justify-center min-h-[300px]">
                <div className="flex gap-4 flex-wrap justify-center">
                  {apuestas.map((apuesta, idx) => {
                    const esLaMia = apuesta.jugadorId === playerId;
                    const mostrarNumero = numeroGanador !== null;

                    return (
                      <div key={idx} className={`relative ${esLaMia ? "scale-110" : ""}`}>
                        <div className="w-32 bg-slate-800 border-2 border-yellow-600 rounded-lg p-2 shadow-xl">
                          {esLaMia && miApuesta ? (
                            <>
                              <img
                                src={miApuesta.carta.imagen}
                                alt={miApuesta.carta.nombre}
                                className="w-full h-24 object-cover rounded mb-1"
                              />
                              <p className="text-[10px] text-white font-bold truncate">
                                {miApuesta.carta.nombre}
                              </p>
                              <p className="text-xs text-yellow-400 font-bold mt-1">
                                {mostrarNumero ? `Número: ${miApuesta.numero}` : "???"}
                              </p>
                            </>
                          ) : (
                            <div className="h-36 flex items-center justify-center">
                              <p className="text-slate-500 text-xs">Carta oculta</p>
                            </div>
                          )}
                        </div>
                        {esLaMia && (
                          <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500">
                            TÚ
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Panel de apuesta */}
            {!miApuesta && !esperandoResultado && (
              <div className="bg-slate-800 rounded-xl p-6 border-2 border-slate-700">
                <h3 className="text-xl font-bold text-white text-center mb-4">
                  Haz tu apuesta
                </h3>

                {/* Selector de número */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-300 mb-3 text-center">
                    Selecciona un número del 1 al 10
                  </label>
                  <div className="flex gap-2 justify-center flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <Button
                        key={num}
                        variant={numeroSeleccionado === num ? "default" : "outline"}
                        size="lg"
                        onClick={() => setNumeroSeleccionado(num)}
                        className="w-14 h-14 text-lg font-bold"
                      >
                        {num}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Selección de carta */}
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3 text-center">
                    Selecciona una carta para apostar
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {myCards.map((card) => {
                      const isSelected = cartaSeleccionada?._id === card._id;
                      return (
                        <div
                          key={card._id}
                          onClick={() => handleSelectCardToBet(card)}
                          className={`cursor-pointer relative border-2 rounded-xl p-2 transition-all bg-slate-700 ${isSelected
                            ? "border-primary scale-105 shadow-lg shadow-primary/50"
                            : "border-slate-600 hover:border-primary/50"
                            }`}
                        >
                          <img
                            src={card.imagen}
                            alt={card.nombre}
                            className="w-full h-24 object-cover rounded-lg mb-1"
                          />
                          <h3 className="font-bold text-[10px] text-white truncate">
                            {card.nombre}
                          </h3>
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-primary rounded-full p-1">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 flex justify-center">
                  <Button
                    size="lg"
                    onClick={handleConfirmBet}
                    disabled={!cartaSeleccionada}
                    className="px-8"
                  >
                    <Dices className="mr-2" />
                    Confirmar Apuesta
                  </Button>
                </div>
              </div>
            )}

            {miApuesta && (
              <div className="text-center">
                <Badge variant="secondary" className="text-lg px-6 py-2">
                  ✓ Apuesta confirmada - Esperando otros jugadores...
                </Badge>
              </div>
            )}

            <div className="flex justify-center mt-6">
              <Button variant="destructive" onClick={handleSurrender} disabled={isFinished}>
                Rendirse
              </Button>
            </div>
          </div>
        )}

        {/* ESTADO: FINALIZADO */}
        {gameState === "finished" && (
          <div className="text-center space-y-6">
            <h2 className="text-4xl font-bold text-white">🎉 Juego Finalizado</h2>
            <p className="text-slate-400">La partida ha terminado</p>
            <Button size="lg" onClick={() => router.push("/lobby")}>
              Volver al Lobby
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function handleManosActualizadas(...args: any[]): void {
  throw new Error("Function not implemented.");
}