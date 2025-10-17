"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Carta {
  _id: string;
  nombre: string;
  imagen: string;
  atributos: {
    fuerza: number;
    velocidad: number;
    inteligencia: number;
    rareza: number;
  };
}

interface Jugador {
  _id: string;
  nombre: string;
  mano: Carta[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function CardsPage() {
  const [cards, setCards] = useState<Carta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playerName, setPlayerName] = useState("");
  const router = useRouter();

  useEffect(() => {
    const name =
      localStorage.getItem("nombreJugador") || localStorage.getItem("playerName");
    const jugadorId =
      localStorage.getItem("jugadorId") || localStorage.getItem("playerId");

    if (!name || !jugadorId) {
      router.push("/");
      return;
    }

    setPlayerName(name);
    fetchPlayerCards(name);
  }, [router]);

  const fetchPlayerCards = async (name: string) => {
    try {
      const res = await fetch(`${API_URL}/api/jugadores/nombre/${name}`);
      if (!res.ok) throw new Error("Error al obtener el jugador");

      const jugador: Jugador = await res.json();

      // ✅ Gracias al populate, ya tenemos todas las cartas completas en jugador.mano
      if (jugador.mano && jugador.mano.length > 0) {
        setCards(jugador.mano);
      } else {
        setCards([]);
      }
    } catch (error) {
      console.error("Error al cargar las cartas del jugador:", error);
      setCards([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push("/lobby")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Lobby
          </Button>
          <div className="text-sm text-muted-foreground">
            Jugador: <span className="font-semibold text-foreground">{playerName}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Mi Mano</h1>
            <p className="text-muted-foreground">
              {cards.length > 0
                ? `Tienes ${cards.length} carta${cards.length !== 1 ? "s" : ""} en tu mano`
                : "No tienes cartas en tu mano"}
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="p-6 bg-secondary/20 rounded-full">
                <svg
                  className="w-16 h-16 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">No tienes cartas</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Aún no tienes cartas en tu mano. Únete a una partida para recibir cartas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {cards.map((card) => (
                <Card
                  key={card._id}
                  className="border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10 overflow-hidden group"
                >
                  <CardContent className="p-0">
                    <div className="aspect-[3/4] bg-gradient-to-br from-secondary to-secondary/50 relative overflow-hidden">
                      {card.imagen ? (
                        <img
                          src={
                            card.imagen.startsWith("http://localhost:3000")
                              ? card.imagen.replace(
                                  "http://localhost:3000",
                                  "http://localhost:4000"
                                )
                              : card.imagen
                          }
                          alt={card.nombre}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <p className="text-4xl font-bold text-muted-foreground/20">
                            {card.nombre.charAt(0)}
                          </p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-3 space-y-2">
                      <h3 className="font-semibold text-sm truncate">{card.nombre}</h3>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {Object.entries(card.atributos).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex justify-between p-1 bg-secondary/50 rounded"
                          >
                            <span className="text-muted-foreground capitalize">{key}:</span>
                            <span className="font-semibold text-primary">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
